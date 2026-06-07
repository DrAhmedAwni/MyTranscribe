import { useState, useRef, useEffect } from 'react'
import HomePage from './components/HomePage'
import Header from './components/Header'
import FileDisplay from './components/FileDisplay'
import Information from './components/Information'
import Transcribing from './components/Transcribing'
import { MessageTypes, ModelNames } from './utils/presets'

function App() {
  const [file, setFile] = useState(null)
  const [audioStream, setAudioStream] = useState(null)
  const [languageHint, setLanguageHint] = useState('auto')
  const [output, setOutput] = useState(null)
  const [stage, setStage] = useState('idle')
  const [downloadProgress, setDownloadProgress] = useState(null)
  const [transcriptionProgress, setTranscriptionProgress] = useState(null)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [transcriptionStartedAt, setTranscriptionStartedAt] = useState(null)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState(null)

  const isAudioAvailable = file || audioStream

  function handleAudioReset() {
    setFile(null)
    setAudioStream(null)
    setLanguageHint('auto')
    setOutput(null)
    setStage('idle')
    setDownloadProgress(null)
    setTranscriptionProgress(null)
    setLiveTranscript('')
    setElapsedSeconds(0)
    setTranscriptionStartedAt(null)
    setFinished(false)
    setError(null)
  }

  const worker = useRef(null)

  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(new URL('./utils/whisper.worker.js', import.meta.url), {
        type: 'module'
      })
    }

    const onMessageReceived = async (e) => {
      switch (e.data.type) {
        case 'DOWNLOADING':
          setStage('downloading')
          setDownloadProgress({
            file: e.data.file,
            progress: e.data.progress,
            loaded: e.data.loaded,
            total: e.data.total
          })
          break;
        case 'LOADING':
          if (e.data.status === 'success') {
            setStage('processing')
          } else {
            setStage('loading')
          }
          break;
        case 'RESULT':
          setOutput(e.data.results)
          break;
        case 'RESULT_PARTIAL':
          setTranscriptionProgress({
            current: e.data.current,
            total: e.data.total,
            percent: e.data.total > 0 ? Math.round((e.data.current / e.data.total) * 100) : 0
          })
          setLiveTranscript(prev => {
            const nextChunk = (e.data.text || '').trim()
            if (!nextChunk) {
              return prev
            }
            return prev ? `${prev} ${nextChunk}`.replace(/\s+/g, ' ').trim() : nextChunk
          })
          break;
        case 'INFERENCE_DONE':
          setFinished(true)
          setStage('done')
          break;
        case 'ERROR':
          setError(e.data.message)
          setStage('idle')
          break;
      }
    }

    worker.current.addEventListener('message', onMessageReceived)

    return () => worker.current.removeEventListener('message', onMessageReceived)
  })

  useEffect(() => {
    if (!transcriptionStartedAt || stage === 'idle' || stage === 'done' || error || output) {
      return
    }

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - transcriptionStartedAt) / 1000)))
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [transcriptionStartedAt, stage, error, output])

  async function readAudioFrom(file) {
    const sampling_rate = 16000
    const audioCTX = new AudioContext({ sampleRate: sampling_rate })
    const response = await file.arrayBuffer()

    try {
      const decoded = await audioCTX.decodeAudioData(response)
      return {
        audio: prepareAudioChannels(decoded),
        duration: decoded.duration
      }
    } catch (err) {
      console.warn('Direct decode failed, using media element fallback:', err.message)
      await audioCTX.close()
      return await extractAudioViaMediaElement(file, sampling_rate)
    }
  }

  async function extractAudioViaMediaElement(file, sampleRate) {
    return new Promise((resolve, reject) => {
      const audioEl = new Audio()
      const url = URL.createObjectURL(file)

      audioEl.onloadedmetadata = async () => {
        const duration = audioEl.duration
        const audioCtx = new AudioContext({ sampleRate })
        const source = audioCtx.createMediaElementSource(audioEl)
        const dest = audioCtx.createMediaStreamDestination()
        source.connect(dest)

        const chunks = []
        const mediaRecorder = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' })

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data)
        }

        mediaRecorder.onstop = async () => {
          try {
            const audioBlob = new Blob(chunks, { type: 'audio/webm' })
            const ab = await audioBlob.arrayBuffer()
            const decoded = await audioCtx.decodeAudioData(ab)
            source.disconnect()
            await audioCtx.close()
            URL.revokeObjectURL(url)
            resolve({
              audio: prepareAudioChannels(decoded),
              duration: duration
            })
          } catch {
            source.disconnect()
            await audioCtx.close()
            URL.revokeObjectURL(url)
            reject(new Error('Failed to decode extracted audio. Try converting the file to MP3 or WAV.'))
          }
        }

        const stop = () => {
          if (mediaRecorder.state === 'recording') mediaRecorder.stop()
          audioEl.pause()
        }

        audioEl.onended = stop
        audioEl.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('Failed to extract audio from media file. Try converting to MP3 or WAV.'))
        }

        mediaRecorder.start()
        audioEl.play().catch(() => {
          URL.revokeObjectURL(url)
          reject(new Error('Failed to play the media file for audio extraction. Try converting it to MP3 or WAV.'))
        })

        setTimeout(() => { stop() }, (duration + 5) * 1000)
      }

      audioEl.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load media file. Try converting to MP3 or WAV.'))
      }

      audioEl.src = url
      audioEl.load()
    })
  }

  async function handleFormSubmission() {
    if (!file && !audioStream) { return }

    setStage('decoding')
    setTranscriptionStartedAt(Date.now())
    setElapsedSeconds(0)
    setTranscriptionProgress(null)
    setLiveTranscript('')

    let audioData
    try {
      audioData = await readAudioFrom(file ? file : audioStream)
    } catch (err) {
      setError(err.message || 'Failed to decode this audio file. Try converting it to MP3 or WAV.')
      setStage('idle')
      return
    }

    const duration = audioData.duration || 0
    const longRecording = duration >= 600
    const model_name = longRecording ? ModelNames.WHISPER_SMALL : ModelNames.WHISPER_BASE
    const transcriptionSettings = longRecording
      ? { chunk_length_s: 15, stride_length_s: 3, no_repeat_ngram_size: 4, repetition_penalty: 1.2 }
      : { chunk_length_s: 20, stride_length_s: 4, no_repeat_ngram_size: 3, repetition_penalty: 1.15 }
    const estimatedChunks = estimateChunkCount(duration, transcriptionSettings.chunk_length_s, transcriptionSettings.stride_length_s)

    worker.current.postMessage({
      type: MessageTypes.INFERENCE_REQUEST,
      audio: audioData.audio,
      model_name,
      transcription_settings: transcriptionSettings,
      estimated_chunks: estimatedChunks,
      language: languageHint === 'auto' ? null : languageHint
    })
  }

  function prepareAudioChannels(audioBuffer) {
    const channels = audioBuffer.numberOfChannels
    const samples = audioBuffer.length
    const audio = new Float32Array(samples)

    for (let channel = 0; channel < channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel)
      for (let i = 0; i < samples; i++) {
        audio[i] += channelData[i] / channels
      }
    }

    let peak = 0
    for (let i = 0; i < audio.length; i++) {
      peak = Math.max(peak, Math.abs(audio[i]))
    }

    if (peak > 0 && peak < 0.95) {
      const gain = Math.min(0.95 / peak, 10)
      for (let i = 0; i < audio.length; i++) {
        audio[i] *= gain
      }
    }

    return audio
  }

  function estimateChunkCount(duration, chunkLength, strideLength) {
    if (!duration || duration <= chunkLength) {
      return 1
    }

    const jump = chunkLength - (2 * strideLength)
    if (jump <= 0) {
      return 1
    }

    return Math.ceil((duration - chunkLength) / jump) + 1
  }

  const showTranscribing = stage !== 'idle' && stage !== 'done' && !output

  return (
    <div className='flex flex-col max-w-[1000px] mx-auto w-full min-h-screen'>
      {error && (
        <div className='mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl'>
          <div className='flex items-start gap-3'>
            <i className="fa-solid fa-circle-exclamation text-red-400 mt-0.5"></i>
            <div className='flex-1'>
              <p className='text-sm font-semibold text-red-700'>Something went wrong</p>
              <p className='text-sm text-red-600 mt-1'>{error}</p>
              <button
                onClick={() => { setError(null); handleAudioReset(); }}
                className='mt-2 text-sm font-medium text-red-600 hover:text-red-700 underline'
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
      <Header />
      {output ? (
        <Information output={output} finished={finished} />
      ) : showTranscribing ? (
        <Transcribing
          stage={stage}
          downloadProgress={downloadProgress}
          transcriptionProgress={transcriptionProgress}
          liveTranscript={liveTranscript}
          elapsedSeconds={elapsedSeconds}
        />
      ) : isAudioAvailable && !error ? (
        <FileDisplay
          handleFormSubmission={handleFormSubmission}
          handleAudioReset={handleAudioReset}
          file={file}
          audioStream={audioStream}
          languageHint={languageHint}
          setLanguageHint={setLanguageHint}
        />
      ) : (
        <HomePage setFile={setFile} setAudioStream={setAudioStream} />
      )}
    </div>
  )
}

export default App

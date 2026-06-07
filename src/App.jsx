import { useState, useRef, useEffect } from 'react'
import HomePage from './components/HomePage'
import Header from './components/Header'
import FileDisplay from './components/FileDisplay'
import Information from './components/Information'
import Transcribing from './components/Transcribing'
import { MessageTypes } from './utils/presets'

function App() {
  const [file, setFile] = useState(null)
  const [audioStream, setAudioStream] = useState(null)
  const [output, setOutput] = useState(null)
  const [stage, setStage] = useState('idle')
  const [downloadProgress, setDownloadProgress] = useState(null)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState(null)

  const isAudioAvailable = file || audioStream

  function handleAudioReset() {
    setFile(null)
    setAudioStream(null)
    setOutput(null)
    setStage('idle')
    setDownloadProgress(null)
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

  async function readAudioFrom(file) {
    const sampling_rate = 16000
    const audioCTX = new AudioContext({ sampleRate: sampling_rate })
    const response = await file.arrayBuffer()

    try {
      const decoded = await audioCTX.decodeAudioData(response)
      return decoded.getChannelData(0)
    } catch (err) {
      console.warn('Direct decode failed, using media element fallback:', err.message)
      audioCTX.close()
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
          const audioBlob = new Blob(chunks, { type: 'audio/webm' })
          const ab = await audioBlob.arrayBuffer()
          const decoded = await audioCtx.decodeAudioData(ab)
          source.disconnect()
          audioCtx.close()
          URL.revokeObjectURL(url)
          resolve(decoded.getChannelData(0))
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
        audioEl.play()

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

    let audio = await readAudioFrom(file ? file : audioStream)
    const model_name = `Xenova/whisper-base`

    worker.current.postMessage({
      type: MessageTypes.INFERENCE_REQUEST,
      audio,
      model_name
    })
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
        <Transcribing stage={stage} downloadProgress={downloadProgress} />
      ) : isAudioAvailable && !error ? (
        <FileDisplay handleFormSubmission={handleFormSubmission} handleAudioReset={handleAudioReset} file={file} audioStream={audioStream} />
      ) : (
        <HomePage setFile={setFile} setAudioStream={setAudioStream} />
      )}
    </div>
  )
}

export default App

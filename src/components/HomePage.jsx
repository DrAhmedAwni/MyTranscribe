import React, { useState, useEffect, useRef, useCallback } from 'react'

export default function HomePage(props) {
    const { setAudioStream, setFile } = props

    const [recordingStatus, setRecordingStatus] = useState('inactive')
    const [audioChunks, setAudioChunks] = useState([])
    const [duration, setDuration] = useState(0)
    const [isDragging, setIsDragging] = useState(false)

    const mediaRecorder = useRef(null)
    const fileInputRef = useRef(null)
    const mimeType = 'audio/webm'

    async function startRecording() {
        let tempStream
        try {
            const streamData = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            })
            tempStream = streamData
        } catch (err) {
            console.log(err.message)
            return
        }
        setRecordingStatus('recording')

        const media = new MediaRecorder(tempStream, { type: mimeType })
        mediaRecorder.current = media

        mediaRecorder.current.start()
        let localAudioChunks = []
        mediaRecorder.current.ondataavailable = (event) => {
            if (typeof event.data === 'undefined') { return }
            if (event.data.size === 0) { return }
            localAudioChunks.push(event.data)
        }
        setAudioChunks(localAudioChunks)
    }

    async function stopRecording() {
        setRecordingStatus('inactive')
        mediaRecorder.current.stop()
        mediaRecorder.current.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: mimeType })
            setAudioStream(audioBlob)
            setAudioChunks([])
            setDuration(0)
        }
    }

    useEffect(() => {
        if (recordingStatus === 'inactive') { return }

        const interval = setInterval(() => {
            setDuration(curr => curr + 1)
        }, 1000)

        return () => clearInterval(interval)
    })

    const formatTime = (sec) => {
        const m = Math.floor(sec / 60)
        const s = sec % 60
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const handleDrag = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
    }, [])

    const handleDragIn = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }, [])

    const handleDragOut = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile) {
            const validTypes = ['audio/', 'video/']
            if (validTypes.some(t => droppedFile.type.startsWith(t))) {
                setFile(droppedFile)
            }
        }
    }, [setFile])

    const handleFileSelect = (e) => {
        const tempFile = e.target.files[0]
        if (tempFile) setFile(tempFile)
    }

    return (
        <main className='flex-1 flex flex-col items-center justify-center px-4 pb-20 pt-2'>
            <div className='text-center mb-8 sm:mb-10'>
                <div className='inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100'>
                    <div className='relative'>
                        <span className='w-2 h-2 rounded-full bg-blue-500'></span>
                        <span className='w-2 h-2 rounded-full bg-blue-500 absolute inset-0 animate-ping'></span>
                    </div>
                    <span className='text-xs font-semibold text-blue-600 tracking-wide uppercase'>AI-Powered</span>
                </div>

                <h1 className='font-bold text-5xl sm:text-6xl md:text-7xl tracking-tight leading-tight'>
                    Free<span className='gradient-text'>Script</span>
                </h1>
                <p className='mt-3 sm:mt-4 text-slate-500 text-base sm:text-lg max-w-md mx-auto leading-relaxed'>
                    Record or upload audio. Get instant transcription and translation in seconds.
                </p>
            </div>

            <div className='w-full max-w-md card p-5 sm:p-8 space-y-5'>
                {recordingStatus === 'recording' ? (
                    <div className='text-center space-y-4'>
                        <div className='inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 recording-pulse'>
                            <i className="fa-solid fa-microphone text-red-500 text-2xl"></i>
                        </div>
                        <div>
                            <p className='text-lg font-semibold text-slate-800'>Recording...</p>
                            <p className='text-3xl font-bold text-red-500 tabular-nums mt-1'>{formatTime(duration)}</p>
                        </div>
                        <button onClick={stopRecording} className='btn-outline border-red-200 text-red-500 hover:border-red-400 hover:text-red-600 hover:bg-red-50 w-full'>
                            <i className="fa-solid fa-stop mr-2"></i>Stop Recording
                        </button>
                    </div>
                ) : (
                    <button onClick={startRecording} className='w-full flex items-center justify-center gap-3 btn-primary'>
                        <i className="fa-solid fa-microphone text-lg"></i>
                        <span>Start Recording</span>
                    </button>
                )}

                <div className='relative'>
                    <div className='absolute inset-0 flex items-center'>
                        <div className='w-full border-t border-slate-100'></div>
                    </div>
                    <div className='relative flex justify-center'>
                        <span className='px-4 bg-white text-xs font-medium text-slate-400 uppercase tracking-wider'>or</span>
                    </div>
                </div>

                <div
                    className={`drop-zone ${isDragging ? 'active' : ''}`}
                    onDragEnter={handleDragIn}
                    onDragLeave={handleDragOut}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className='flex flex-col items-center gap-3'>
                        <div className='w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center'>
                            <i className="fa-solid fa-cloud-arrow-up text-blue-500 text-xl"></i>
                        </div>
                        <div>
                            <p className='text-sm font-semibold text-slate-700'>
                                {isDragging ? 'Drop your file here' : 'Upload a file'}
                            </p>
                            <p className='text-xs text-slate-400 mt-0.5'>
                                MP3, WAV, MP4, M4A, WebM, OGG
                            </p>
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className='hidden'
                        type='file'
                        accept='.mp3,.wav,.mp4,.m4a,.webm,.ogg'
                    />
                </div>
            </div>

            <p className='mt-6 text-xs text-slate-400'>
                All processing happens on your device. Nothing is uploaded to a server.
            </p>
        </main>
    )
}

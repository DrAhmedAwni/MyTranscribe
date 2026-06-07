import React, { useRef, useEffect } from 'react'

export default function FileDisplay(props) {
    const { handleAudioReset, file, audioStream, handleFormSubmission } = props
    const audioRef = useRef()

    useEffect(() => {
        if (!file && !audioStream) { return }
        if (file) {
            audioRef.current.src = URL.createObjectURL(file)
        } else {
            audioRef.current.src = URL.createObjectURL(audioStream)
        }
    }, [audioStream, file])

    return (
        <main className='flex-1 flex flex-col items-center justify-center px-4 pb-20'>
            <div className='w-full max-w-md card p-5 sm:p-8 space-y-5'>
                <div className='text-center'>
                    <h1 className='font-bold text-3xl sm:text-4xl tracking-tight'>
                        Your <span className='gradient-text'>File</span>
                    </h1>
                </div>

                <div className='bg-slate-50 rounded-xl p-4'>
                    <p className='text-xs font-medium text-slate-400 uppercase tracking-wider mb-1'>File Name</p>
                    <p className='text-sm font-semibold text-slate-700 truncate'>
                        {file ? file.name : 'Recorded Audio'}
                    </p>
                </div>

                <audio ref={audioRef} className='w-full' controls>
                    Your browser does not support the audio element.
                </audio>

                <div className='flex items-center justify-between gap-4'>
                    <button onClick={handleAudioReset} className='text-sm text-slate-400 hover:text-slate-600 transition-colors duration-200'>
                        Choose another file
                    </button>
                    <button onClick={handleFormSubmission} className='btn-primary text-sm px-5 py-2.5'>
                        <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>
                        Transcribe
                    </button>
                </div>
            </div>
        </main>
    )
}

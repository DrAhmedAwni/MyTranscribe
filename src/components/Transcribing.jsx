export default function Transcribing(props) {
    const { stage, downloadProgress, transcriptionProgress, liveTranscript, elapsedSeconds } = props

    const stageMessages = {
        decoding: { title: 'Preparing', subtitle: 'Decoding audio file...' },
        downloading: { title: 'Downloading', subtitle: 'Fetching AI model (one-time)' },
        loading: { title: 'Loading', subtitle: 'Loading model into memory...' },
        processing: { title: 'Processing', subtitle: 'Transcribing your audio...' },
    }

    const msg = stageMessages[stage] || stageMessages.loading

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 KB'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const pct = downloadProgress
        ? (typeof downloadProgress.progress === 'number' ? downloadProgress.progress
            : downloadProgress.total > 0 ? Math.round((downloadProgress.loaded / downloadProgress.total) * 100)
            : 0)
        : 0

    const hasTotal = downloadProgress && downloadProgress.total > 0
    const transcriptionPct = transcriptionProgress?.percent || 0
    const transcriptionHasTotal = transcriptionProgress && transcriptionProgress.total > 0

    const formatElapsed = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        if (mins === 0) return `${secs}s`
        return `${mins}m ${secs.toString().padStart(2, '0')}s`
    }

    return (
        <div className='flex items-center flex-1 flex-col justify-center gap-8 text-center pb-24 p-4'>
            <div className='flex flex-col gap-3'>
                <div className='inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mx-auto mb-2'>
                    <i className="fa-solid fa-spinner animate-spin text-blue-500 text-2xl"></i>
                </div>
                <h1 className='font-bold text-3xl sm:text-4xl tracking-tight'>
                    <span className='gradient-text'>{msg.title}</span>
                </h1>
                <p className='text-slate-400 text-sm'>{msg.subtitle}</p>
            </div>

            {stage === 'downloading' && downloadProgress && (
                <div className='w-full max-w-[320px] mx-auto space-y-2'>
                    <div className='h-2.5 bg-slate-100 rounded-full overflow-hidden'>
                        <div
                            className='h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-500 ease-out'
                            style={{ width: `${Math.max(pct, 2)}%` }}
                        ></div>
                    </div>
                    <div className='flex justify-between text-xs text-slate-400 font-medium'>
                        <span>{pct}%</span>
                        <span>{formatBytes(downloadProgress.loaded)}{hasTotal ? ' / ' + formatBytes(downloadProgress.total) : ''}</span>
                    </div>
                    <p className='text-xs text-slate-300 truncate max-w-full'>
                        {downloadProgress.file || ''}
                    </p>
                    <p className='text-xs text-slate-300 mt-2'>
                        This download happens once and is cached for future use.
                    </p>
                </div>
            )}

            {stage === 'processing' && (
                <div className='w-full max-w-2xl space-y-4'>
                    <div className='space-y-2'>
                        <div className='flex items-center justify-between text-xs text-slate-400 font-medium'>
                            <span>{transcriptionProgress ? `${transcriptionPct}% complete` : 'Working...'}</span>
                            <span>{formatElapsed(elapsedSeconds)}</span>
                        </div>
                        <div className='h-2.5 bg-slate-100 rounded-full overflow-hidden'>
                            <div
                                className='h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-300 ease-out'
                                style={{ width: `${Math.max(transcriptionPct, 3)}%` }}
                            ></div>
                        </div>
                        {transcriptionHasTotal && (
                            <p className='text-xs text-slate-300'>
                                Chunk {transcriptionProgress.current} / {transcriptionProgress.total}
                            </p>
                        )}
                    </div>

                    <div className='rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left'>
                        <p className='text-xs font-medium text-slate-400 uppercase tracking-wider mb-2'>Live draft</p>
                        <p className='text-sm text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[5rem]'>
                            {liveTranscript || 'Waiting for the first chunk...'}
                        </p>
                    </div>
                </div>
            )}

            {stage !== 'downloading' && stage !== 'processing' && (
                <div className='flex flex-col gap-2 sm:gap-3 w-full max-w-[300px] mx-auto'>
                    {[0, 1, 2].map(val => (
                        <div key={val} className={'rounded-full h-2 bg-gradient-to-r from-blue-400 to-indigo-500 loading loading' + val}></div>
                    ))}
                </div>
            )}
        </div>
    )
}

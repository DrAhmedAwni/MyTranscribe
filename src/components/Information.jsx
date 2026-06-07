import React, { useState, useEffect, useRef } from 'react'
import Transcription from './Transcription'
import Translation from './Translation'

export default function Information(props) {
    const { output, finished } = props
    const [tab, setTab] = useState('transcription')
    const [translation, setTranslation] = useState(null)
    const [translationError, setTranslationError] = useState(null)
    const [toLanguage, setToLanguage] = useState('eng_Latn')
    const [fromLanguage, setFromLanguage] = useState('arb_Arab')
    const [translating, setTranslating] = useState(null)

    const worker = useRef()

    useEffect(() => {
        if (!worker.current) {
            worker.current = new Worker(new URL('../utils/translate.worker.js', import.meta.url), {
                type: 'module'
            })
        }

        const onMessageReceived = async (e) => {
            switch (e.data.status) {
                case 'initiate':
                    setTranslationError(null)
                    break;
                case 'progress':
                    break;
                case 'update':
                    setTranslationError(null)
                    setTranslation(e.data.output)
                    break;
                case 'complete':
                    setTranslating(false)
                    break;
                case 'error':
                    setTranslating(false)
                    setTranslationError(e.data.message || 'Translation failed.')
                    break;
            }
        }

        worker.current.addEventListener('message', onMessageReceived)

        return () => worker.current.removeEventListener('message', onMessageReceived)
    })

    useEffect(() => {
        if (translation) {
            setTab('translation')
        }
    }, [translation])

    const textElement = tab === 'transcription' ? output.map(val => val.text).join(' ') : translation || ''

    function handleCopy() {
        navigator.clipboard.writeText(textElement)
    }

    function handleDownload() {
        const element = document.createElement("a")
        const file = new Blob([textElement], { type: 'text/plain' })
        element.href = URL.createObjectURL(file)
        element.download = `Freescribe_${new Date().toString()}.txt`
        document.body.appendChild(element)
        element.click()
    }

    function generateTranslation() {
        if (translating || toLanguage === 'Select language') {
            return
        }

        setTranslating(true)
        setTranslationError(null)

        worker.current.postMessage({
            text: output.map(val => val.text),
            src_lang: fromLanguage,
            tgt_lang: toLanguage
        })
    }

    return (
        <main className='flex-1 flex flex-col items-center px-4 pb-20 pt-2'>
            <div className='w-full max-w-2xl'>
                <div className='text-center mb-6'>
                    <h1 className='font-bold text-3xl sm:text-4xl tracking-tight'>
                        Your <span className='gradient-text'>Result</span>
                    </h1>
                </div>

                <div className='card overflow-hidden'>
                    <div className='grid grid-cols-2 bg-slate-50 p-1 rounded-t-2xl'>
                        <button
                            onClick={() => setTab('transcription')}
                            className={'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ' +
                                (tab === 'transcription'
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700')}
                        >
                            Transcription
                        </button>
                        <button
                            onClick={() => setTab('translation')}
                            className={'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ' +
                                (tab === 'translation'
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700')}
                        >
                            Translation
                        </button>
                    </div>

                    <div className='p-5 sm:p-6'>
                        {tab === 'transcription' ? (
                            <Transcription {...props} textElement={textElement} />
                        ) : translating ? (
                            <div className='flex items-center justify-center py-12'>
                                <div className='flex flex-col items-center gap-3 text-center'>
                                    <i className="fa-solid fa-spinner animate-spin text-blue-400 text-xl"></i>
                                    <p className='text-sm text-slate-400'>Translating to English...</p>
                                    {translationError && (
                                        <p className='text-sm text-red-500 max-w-sm'>{translationError}</p>
                                    )}
                                </div>
                            </div>
                        ) : translationError ? (
                            <div className='text-center py-8'>
                                <p className='text-sm text-red-500'>{translationError}</p>
                            </div>
                        ) : (
                            <Translation
                                {...props}
                                toLanguage={toLanguage}
                                fromLanguage={fromLanguage}
                                translating={translating}
                                textElement={textElement}
                                setTranslating={setTranslating}
                                setTranslation={setTranslation}
                                setToLanguage={setToLanguage}
                                setFromLanguage={setFromLanguage}
                                generateTranslation={generateTranslation}
                            />
                        )}
                    </div>

                    {finished && !translating && textElement && (
                        <div className='flex items-center justify-center gap-2 p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl'>
                            <button onClick={handleCopy} className='flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200'>
                                <i className="fa-solid fa-copy"></i>
                                Copy
                            </button>
                            <button onClick={handleDownload} className='flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200'>
                                <i className="fa-solid fa-download"></i>
                                Download
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}

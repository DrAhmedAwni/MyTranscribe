import { LANGUAGES } from '../utils/presets'

export default function Translation(props) {
    const { textElement, toLanguage, fromLanguage, translating, setToLanguage, setFromLanguage, generateTranslation } = props

    const selectClass = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200'

    return (
        <div className='space-y-4'>
            {textElement && !translating && (
                <div className='text-left whitespace-pre-wrap text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4'>
                    {textElement}
                </div>
            )}

            {!translating && (
                <div className='space-y-3'>
                    <div>
                        <label className='block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider'>From</label>
                        <select value={fromLanguage} className={selectClass} onChange={(e) => setFromLanguage(e.target.value)}>
                            {Object.entries(LANGUAGES).map(([key, value]) => (
                                <option key={key} value={value}>{key}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className='block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider'>To</label>
                        <div className='flex gap-3'>
                            <select value={toLanguage} className={selectClass} onChange={(e) => setToLanguage(e.target.value)}>
                                <option value={'Select language'}>Select language</option>
                                {Object.entries(LANGUAGES).map(([key, value]) => (
                                    <option key={key} value={value}>{key}</option>
                                ))}
                            </select>
                            <button onClick={generateTranslation} className='btn-primary text-sm px-4 py-2.5 whitespace-nowrap'>
                                Translate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

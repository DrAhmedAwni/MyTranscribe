export default function Transcription(props) {
    const { textElement } = props

    return (
        <div className='text-left whitespace-pre-wrap text-slate-700 leading-relaxed'>
            {textElement || (
                <p className='text-slate-400 text-center py-8'>No transcription yet.</p>
            )}
        </div>
    )
}

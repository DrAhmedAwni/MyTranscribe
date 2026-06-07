export default function Header() {
    return (
        <header className='flex items-center justify-center p-5 sm:p-6'>
            <a href="/" className='flex items-center gap-2.5 group'>
                <div className='w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-200'>
                    <i className="fa-solid fa-microphone text-white text-sm"></i>
                </div>
                <h1 className='font-bold text-xl tracking-tight'>
                    Free<span className='gradient-text'>Script</span>
                </h1>
            </a>
        </header>
    )
}

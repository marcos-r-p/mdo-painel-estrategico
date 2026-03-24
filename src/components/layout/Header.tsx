import { useTheme } from '../../hooks/useTheme'
import { ResultBadge, PeriodSelector, SourceToggle, DbStatusIndicator, UserMenu } from './header'

interface HeaderProps {
  onToggleSidebar: () => void
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { toggleDarkMode, darkMode } = useTheme()

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 border-b transition-colors bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700 backdrop-blur-sm">
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Hamburger - mobile only */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Abrir menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Brand name */}
        <h1 className="text-base font-semibold hidden sm:block text-gray-800 dark:text-white">
          Mundo dos Oleos
        </h1>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <ResultBadge />
        <PeriodSelector />
        <SourceToggle />

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg transition-colors text-gray-500 hover:bg-gray-100 dark:text-yellow-400 dark:hover:bg-gray-800"
          aria-label="Alternar modo escuro"
        >
          {darkMode ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
          )}
        </button>

        {/* Print button */}
        <button
          onClick={() => window.print()}
          className="hidden sm:flex p-2 rounded-lg transition-colors text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Imprimir"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
          </svg>
        </button>

        <DbStatusIndicator />

        {/* Separator */}
        <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700" />

        <UserMenu />
      </div>
    </header>
  )
}

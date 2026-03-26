import { ResultBadge, PeriodSelector, SourceToggle, DbStatusIndicator, UserMenu } from './header/index'
import { Menu } from 'lucide-react'

interface HeaderProps {
  onToggleSidebar: () => void
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b transition-colors bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700 backdrop-blur-sm">
      {/* Left: hamburger mobile */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <ResultBadge />
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        <PeriodSelector />
        <SourceToggle />

        <DbStatusIndicator />

        <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700" />

        <UserMenu />
      </div>
    </header>
  )
}

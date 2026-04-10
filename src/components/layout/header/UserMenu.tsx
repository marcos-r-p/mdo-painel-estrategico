import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useTheme } from '../../../hooks/useTheme'
import { Sun, Moon, Printer, Users as UsersIcon, LogOut } from 'lucide-react'

export default function UserMenu() {
  const { user, userProfile, isAdmin, logout } = useAuth()
  const { toggleDarkMode, darkMode } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
          <span className="text-white text-xs font-semibold">
            {(userProfile?.nome || user?.email || '?')[0].toUpperCase()}
          </span>
        </div>
        <span className="hidden md:inline text-xs font-medium max-w-[100px] truncate text-gray-700 dark:text-gray-300">
          {userProfile?.nome || user?.email || 'Usuario'}
        </span>
        <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-lg shadow-xl border z-50 py-1 bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {userProfile?.nome || 'Usuario'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user?.email || ''}
            </p>
            {userProfile?.role_nome && (
              <span
                className={`
                  inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium
                  ${userProfile.role_nome === 'admin'
                    ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }
                `}
              >
                {userProfile.role_nome}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="py-1">
            {/* Dark mode toggle */}
            <button
              onClick={() => {
                toggleDarkMode()
              }}
              className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm transition-colors text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {darkMode ? 'Modo claro' : 'Modo escuro'}
            </button>

            {/* Print */}
            <button
              onClick={() => {
                window.print()
                setOpen(false)
              }}
              className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm transition-colors text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700" />

          {/* Admin: User management */}
          {isAdmin && (
            <button
              onClick={() => {
                navigate('/app/admin/usuarios')
                setOpen(false)
              }}
              className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm transition-colors text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <UsersIcon className="w-4 h-4" />
              Gerenciar Usuarios
            </button>
          )}

          {/* Logout */}
          <button
            onClick={() => {
              logout()
              setOpen(false)
            }}
            className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm transition-colors text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-700"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}

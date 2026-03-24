import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'

export default function UserMenu() {
  const { user, userProfile, isAdmin, logout } = useAuth()
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
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
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
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }
                `}
              >
                {userProfile.role_nome}
              </span>
            )}
          </div>

          {/* Admin: User management */}
          {isAdmin && (
            <button
              onClick={() => {
                navigate('/app/admin/usuarios')
                setOpen(false)
              }}
              className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm transition-colors text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
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
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            Sair
          </button>
        </div>
      )}
    </div>
  )
}

import { useState, useRef, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { usePeriodo } from '../../services/queries/usePeriodoQueries'
import { useConnectionStatus } from '../../services/queries/useDashboardQueries'
import { formatMesLabel, formatCurrency } from '../../lib/formatters'

interface HeaderProps {
  onToggleSidebar: () => void
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { user, userProfile, isAdmin, logout } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const fonteAtiva = searchParams.get('fonte') ?? 'bling'

  const { mesesDisponiveis, mesSelecionado, setMesSelecionado, resumoMensal } = usePeriodo()
  const { data: connectionStatus } = useConnectionStatus()

  const resultado = useMemo(() => {
    const resumoAtual = resumoMensal?.find((r) => r.mes === mesSelecionado)
    if (!resumoAtual) return null
    return (resumoAtual.receita_total || 0) - (resumoAtual.custo_total || 0)
  }, [resumoMensal, mesSelecionado])

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [periodOpen, setPeriodOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const periodRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) {
        setPeriodOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Derive dbStatus from connectionStatus
  const dbStatus = connectionStatus
    ? (connectionStatus.bling || connectionStatus.shopify ? 'online' : 'offline')
    : 'conectando'

  const dbStatusColor = dbStatus === 'online'
    ? 'bg-green-500'
    : dbStatus === 'offline'
      ? 'bg-red-500'
      : 'bg-yellow-500'

  const isLucro = resultado != null && resultado >= 0

  function setFonteAtiva(fonte: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('fonte', fonte)
      return next
    })
  }

  return (
    <header
      className={`
        sticky top-0 z-40
        flex items-center justify-between h-16 px-4
        border-b transition-colors
        ${darkMode
          ? 'bg-gray-900/95 border-gray-700 backdrop-blur-sm'
          : 'bg-white/95 border-gray-200 backdrop-blur-sm'
        }
      `}
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Hamburger - mobile only */}
        <button
          onClick={onToggleSidebar}
          className={`
            lg:hidden p-2 rounded-lg transition-colors
            ${darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}
          `}
          aria-label="Abrir menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Brand name */}
        <h1
          className={`
            text-base font-semibold hidden sm:block
            ${darkMode ? 'text-white' : 'text-gray-800'}
          `}
        >
          Mundo dos Oleos
        </h1>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Result badge */}
        {resultado != null && (
          <span
            className={`
              hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
              ${isLucro
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
              }
            `}
          >
            {isLucro ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
              </svg>
            )}
            {formatCurrency(resultado)}
          </span>
        )}

        {/* Period selector */}
        {mesesDisponiveis.length > 0 && (
          <div className="relative" ref={periodRef}>
            <button
              onClick={() => setPeriodOpen(!periodOpen)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <span className="hidden sm:inline">{mesSelecionado ? formatMesLabel(mesSelecionado) : 'Periodo'}</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {periodOpen && (
              <div
                className={`
                  absolute right-0 mt-1 w-36 max-h-56 overflow-y-auto rounded-lg shadow-xl border z-50
                  ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                `}
              >
                {mesesDisponiveis.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMesSelecionado(m)
                      setPeriodOpen(false)
                    }}
                    className={`
                      w-full text-left px-3 py-2 text-xs transition-colors
                      ${m === mesSelecionado
                        ? 'bg-green-500/15 text-green-600 dark:text-green-400 font-medium'
                        : darkMode
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {formatMesLabel(m)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bling / Shopify toggle */}
        <div
          className={`
            flex items-center rounded-lg overflow-hidden border text-xs font-medium
            ${darkMode ? 'border-gray-700' : 'border-gray-200'}
          `}
        >
          <button
            onClick={() => setFonteAtiva('bling')}
            className={`
              px-2.5 py-1.5 transition-colors
              ${fonteAtiva === 'bling'
                ? 'bg-blue-500 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  : 'bg-gray-50 text-gray-500 hover:text-gray-700'
              }
            `}
          >
            Bling
          </button>
          <button
            onClick={() => setFonteAtiva('shopify')}
            className={`
              px-2.5 py-1.5 transition-colors
              ${fonteAtiva === 'shopify'
                ? 'bg-green-500 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  : 'bg-gray-50 text-gray-500 hover:text-gray-700'
              }
            `}
          >
            Shopify
          </button>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className={`
            p-2 rounded-lg transition-colors
            ${darkMode ? 'text-yellow-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}
          `}
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
          className={`
            hidden sm:flex p-2 rounded-lg transition-colors
            ${darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}
          `}
          aria-label="Imprimir"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
          </svg>
        </button>

        {/* DB status indicator */}
        <div className="flex items-center gap-1.5" title={`Banco: ${dbStatus || 'desconhecido'}`}>
          <div className={`w-2 h-2 rounded-full ${dbStatusColor}`} />
          <span
            className={`
              hidden md:inline text-xs
              ${darkMode ? 'text-gray-500' : 'text-gray-400'}
            `}
          >
            DB
          </span>
        </div>

        {/* Separator */}
        <div className={`hidden sm:block w-px h-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`
              flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors
              ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}
            `}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <span className="text-white text-xs font-semibold">
                {(userProfile?.nome || user?.email || '?')[0].toUpperCase()}
              </span>
            </div>
            <span
              className={`
                hidden md:inline text-xs font-medium max-w-[100px] truncate
                ${darkMode ? 'text-gray-300' : 'text-gray-700'}
              `}
            >
              {userProfile?.nome || user?.email || 'Usuario'}
            </span>
            <svg className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {userMenuOpen && (
            <div
              className={`
                absolute right-0 mt-1 w-56 rounded-lg shadow-xl border z-50 py-1
                ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
              `}
            >
              {/* User info */}
              <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {userProfile?.nome || 'Usuario'}
                </p>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user?.email || ''}
                </p>
                {userProfile?.role && (
                  <span
                    className={`
                      inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium
                      ${userProfile.role === 'admin'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }
                    `}
                  >
                    {userProfile.role}
                  </span>
                )}
              </div>

              {/* Admin: User management */}
              {isAdmin && (
                <button
                  onClick={() => {
                    navigate('/app/usuarios')
                    setUserMenuOpen(false)
                  }}
                  className={`
                    w-full text-left flex items-center gap-2 px-4 py-2 text-sm transition-colors
                    ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}
                  `}
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
                  setUserMenuOpen(false)
                }}
                className={`
                  w-full text-left flex items-center gap-2 px-4 py-2 text-sm transition-colors
                  ${darkMode
                    ? 'text-red-400 hover:bg-gray-700'
                    : 'text-red-600 hover:bg-red-50'
                  }
                `}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { NAVIGATION_GROUPS, ADMIN_NAVIGATION } from '../../lib/constants'
import { usePermissions } from '../../hooks/usePermissions'
import { useAuth } from '../../hooks/useAuth'
import type { NavigationItem } from '../../types/domain'

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

function NavItem({
  section,
  expanded,
  onNavigate,
  activeColor = 'green',
}: {
  section: NavigationItem
  expanded: boolean
  onNavigate: () => void
  activeColor?: 'green' | 'purple'
}) {
  const activeBg = activeColor === 'green' ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400' : 'bg-accent-500/15 text-accent-600 dark:text-accent-400'
  const activeBar = activeColor === 'green' ? 'bg-brand-500' : 'bg-accent-500'

  return (
    <NavLink
      to={section.path}
      onClick={onNavigate}
      title={section.label}
      aria-label={section.ariaLabel ?? section.label}
      className={({ isActive }) => `
        w-full flex items-center rounded-lg px-3 py-2
        transition-colors duration-150 group relative
        ${isActive
          ? `${activeBg} font-medium`
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
        }
      `}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full ${activeBar}`} />
          )}
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            <section.icon className="w-[18px] h-[18px]" />
          </span>
          <span
            className={`
              ml-3 text-sm whitespace-nowrap overflow-hidden transition-all duration-200
              ${expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 lg:opacity-0 lg:w-0'}
            `}
          >
            {section.label}
          </span>
          {!expanded && (
            <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 hidden lg:block bg-gray-800 text-white dark:bg-gray-700 dark:text-gray-200 shadow-lg z-50">
              {section.label}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { hasAccess } = usePermissions()
  const { isAdmin } = useAuth()
  const [hovered, setHovered] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, setIsOpen])

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [setIsOpen])

  const expanded = hovered || isOpen
  const closeOnNav = () => setIsOpen(false)

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`
          fixed top-0 left-0 h-full z-50
          flex flex-col
          transition-all duration-300 ease-in-out
          bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700
          border-r shadow-lg
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${expanded ? 'w-60' : 'w-16'}
        `}
      >
        {/* Brand */}
        <div className="flex items-center h-14 px-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white font-bold text-xs tracking-tight">MdO</span>
          </div>
          <span
            className={`
              ml-3 font-display text-xl whitespace-nowrap overflow-hidden transition-opacity duration-200
              text-brand-600 dark:text-brand-400
              ${expanded ? 'opacity-100' : 'opacity-0 lg:opacity-0'}
            `}
          >
            Mundo dos Óleos
          </span>
        </div>

        <div className="mx-3 border-t border-gray-200 dark:border-gray-700" />

        {/* Navigation groups */}
        <nav aria-label="Menu principal" className="flex-1 overflow-y-auto py-2 px-2 space-y-1 scrollbar-thin">
          {NAVIGATION_GROUPS.map((group, groupIdx) => {
            const visibleItems = group.items.filter((item) => {
              const pageKey = item.path.replace('/app/', '')
              return hasAccess(pageKey)
            })
            if (visibleItems.length === 0) return null

            return (
              <div key={group.groupLabel}>
                {/* Group separator (not on first group) */}
                {groupIdx > 0 && (
                  <div className="mx-1 my-1.5 border-t border-gray-100 dark:border-gray-800" />
                )}

                {/* Group label */}
                <div
                  className={`
                    px-3 py-1 transition-all duration-200
                    ${expanded ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}
                  `}
                >
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">
                    {group.groupLabel}
                  </span>
                </div>

                {/* Group items */}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavItem
                      key={item.id}
                      section={item}
                      expanded={expanded}
                      onNavigate={closeOnNav}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="mx-1 my-1.5 border-t border-gray-200 dark:border-gray-700" />
              <div
                className={`
                  px-3 py-1 transition-all duration-200
                  ${expanded ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}
                `}
              >
                <span className="text-[10px] uppercase tracking-wider font-semibold text-accent-500 dark:text-accent-400">
                  Administração
                </span>
              </div>
              <div className="space-y-0.5">
                {ADMIN_NAVIGATION.map((section) => (
                  <NavItem
                    key={section.id}
                    section={section}
                    expanded={expanded}
                    onNavigate={closeOnNav}
                    activeColor="purple"
                  />
                ))}
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="mx-3 border-t border-gray-200 dark:border-gray-700" />
        <div className="px-3 py-2.5 flex-shrink-0">
          <div className="flex items-center rounded-lg px-2 py-1.5 text-gray-400 dark:text-gray-500 text-xs">
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.212-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </span>
            <span
              className={`
                ml-3 whitespace-nowrap overflow-hidden transition-opacity duration-200
                ${expanded ? 'opacity-100' : 'opacity-0'}
              `}
            >
              v1.0
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}

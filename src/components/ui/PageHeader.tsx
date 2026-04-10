import { useLocation } from 'react-router-dom'
import { NAVIGATION_SECTIONS } from '../../lib/constants'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title?: string
  description?: string
  actions?: ReactNode
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  const { pathname } = useLocation()

  const currentSection = NAVIGATION_SECTIONS.find((s) => pathname.startsWith(s.path))
  const pageTitle = title || currentSection?.label || 'Painel'
  const PageIcon = currentSection?.icon

  return (
    <div className="mb-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-1">
        <span>Painel</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-600 dark:text-gray-300 font-medium">{pageTitle}</span>
      </nav>

      {/* Title row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {PageIcon && (
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center">
              <PageIcon className="w-4.5 h-4.5 text-brand-600 dark:text-brand-400" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {pageTitle}
            </h1>
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

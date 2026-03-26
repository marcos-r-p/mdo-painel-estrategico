import type { ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'

interface PageFiltersProps {
  children: ReactNode
  label?: string
}

export default function PageFilters({ children, label = 'Filtros' }: PageFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-800/50 dark:border-gray-700 mb-4">
      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        <SlidersHorizontal className="w-3.5 h-3.5" />
        {label}
      </span>
      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
      <div className="flex flex-wrap items-center gap-2">
        {children}
      </div>
    </div>
  )
}

import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: LucideIcon
  title?: string
  message: string
  action?: ReactNode
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
      </div>
      {title && (
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {title}
        </h3>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        {message}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

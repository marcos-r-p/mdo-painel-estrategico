import { useQueryClient } from '@tanstack/react-query'
import { useConnectionStatus } from '../../../services/queries/useDashboardQueries'
import { resetSupabaseClient } from '../../../services/supabase'

export default function DbStatusIndicator() {
  const queryClient = useQueryClient()
  const { data: connectionStatus, isLoading: connectionLoading, isError: connectionError } = useConnectionStatus()

  const dbStatus = connectionError
    ? 'erro'
    : connectionLoading
      ? 'conectando'
      : connectionStatus
        ? (connectionStatus.bling || connectionStatus.shopify || connectionStatus.rdstation ? 'online' : 'offline')
        : 'conectando'

  const dbStatusColor = dbStatus === 'online'
    ? 'bg-brand-500'
    : dbStatus === 'erro'
      ? 'bg-red-500'
      : dbStatus === 'offline'
        ? 'bg-red-500'
        : 'bg-yellow-500'

  return (
    <button
      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
      title={dbStatus === 'online' ? 'Banco conectado' : 'Clique para reconectar'}
      onClick={() => {
        if (dbStatus !== 'online') {
          resetSupabaseClient()
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'connection-status'] })
        }
      }}
    >
      <div className={`w-2 h-2 rounded-full ${dbStatusColor} ${dbStatus === 'conectando' ? 'animate-pulse' : ''}`} />
      <span className="hidden md:inline text-xs text-gray-400 dark:text-gray-500">
        DB
      </span>
    </button>
  )
}

import { useState } from 'react'
import { useAccessLogs, useLogStats } from '../../services/queries/useAccessLogsQueries'
import { useUsers } from '../../services/queries/useUserManagementQueries'
import type { AccessLogFilters } from '../../types/userManagement'

type PeriodOption = '7d' | '30d' | 'all'

function getFromDate(period: PeriodOption): string | undefined {
  if (period === '7d') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  if (period === '30d') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  return undefined
}

function EventBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    login: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    logout: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    page_view: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  }
  const cls = styles[type] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {type}
    </span>
  )
}

export default function LogsAcessoPage() {
  const [period, setPeriod] = useState<PeriodOption>('7d')
  const [filters, setFilters] = useState<AccessLogFilters>({
    page: 1,
    per_page: 50,
    from_date: getFromDate('7d'),
  })

  const { data: statsData, isLoading: statsLoading } = useLogStats()
  const { data: logsData, isLoading: logsLoading } = useAccessLogs(filters)
  const { data: usersData } = useUsers()

  const logs = logsData?.data ?? []
  const total = logsData?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / filters.per_page))
  const currentPage = filters.page

  function updateFilter(partial: Partial<AccessLogFilters>) {
    setFilters(prev => ({ ...prev, ...partial, page: 1 }))
  }

  function handleUserChange(e: React.ChangeEvent<HTMLSelectElement>) {
    updateFilter({ user_id: e.target.value || undefined })
  }

  function handleEventTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    updateFilter({ event_type: e.target.value || undefined })
  }

  function handlePeriodChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as PeriodOption
    setPeriod(val)
    updateFilter({ from_date: getFromDate(val) })
  }

  function goToPrevPage() {
    if (currentPage > 1) {
      setFilters(prev => ({ ...prev, page: prev.page - 1 }))
    }
  }

  function goToNextPage() {
    if (currentPage < totalPages) {
      setFilters(prev => ({ ...prev, page: prev.page + 1 }))
    }
  }

  const selectClass =
    'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ' +
    'text-gray-900 dark:text-gray-100 text-sm px-3 py-2 focus:outline-none focus:ring-2 ' +
    'focus:ring-blue-500'

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Logs de Acesso</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 text-center shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Acessos hoje</p>
          {statsLoading ? (
            <div className="h-8 w-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {statsData?.today_count ?? 0}
            </p>
          )}
        </div>

        {/* Card 2 */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 text-center shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Usuários ativos (7d)</p>
          {statsLoading ? (
            <div className="h-8 w-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {statsData?.active_users_7d ?? 0}
            </p>
          )}
        </div>

        {/* Card 3 */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 text-center shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Página mais acessada</p>
          {statsLoading ? (
            <div className="h-8 w-32 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <p className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {statsData?.top_page ?? '—'}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* User filter */}
        <select className={selectClass} onChange={handleUserChange} defaultValue="">
          <option value="">Todos os usuários</option>
          {(usersData ?? []).map((u: { id: string; email: string; nome?: string }) => (
            <option key={u.id} value={u.id}>
              {u.nome ? `${u.nome} (${u.email})` : u.email}
            </option>
          ))}
        </select>

        {/* Event type filter */}
        <select className={selectClass} onChange={handleEventTypeChange} defaultValue="">
          <option value="">Todos</option>
          <option value="login">login</option>
          <option value="logout">logout</option>
          <option value="page_view">page_view</option>
        </select>

        {/* Period filter */}
        <select className={selectClass} value={period} onChange={handlePeriodChange}>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="all">Tudo</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800 text-left">
              <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Data/Hora
              </th>
              <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Usuário
              </th>
              <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Evento
              </th>
              <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Página
              </th>
              <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                IP
              </th>
            </tr>
          </thead>
          <tbody>
            {logsLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-gray-500 dark:text-gray-400"
                >
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              logs.map((log, i) => (
                <tr
                  key={log.id}
                  className={
                    i % 2 === 0
                      ? 'bg-white dark:bg-gray-900'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                  }
                >
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {log.user_nome
                      ? `${log.user_nome}`
                      : log.user_email ?? log.user_id}
                  </td>
                  <td className="px-4 py-3">
                    <EventBadge type={log.event_type} />
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {log.page_key ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                    {log.ip_address ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {total > 0
            ? `${total} registro${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`
            : ''}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium
              text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800
              hover:bg-gray-50 dark:hover:bg-gray-700
              disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium
              text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800
              hover:bg-gray-50 dark:hover:bg-gray-700
              disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Próxima →
          </button>
        </div>
      </div>
    </div>
  )
}

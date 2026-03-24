import { useQuery } from '@tanstack/react-query'
import { fetchLogs, fetchLogStats } from '../api/accessLogs'
import type { AccessLogFilters } from '../../types/userManagement'

export function useAccessLogs(filters: AccessLogFilters) {
  return useQuery({
    queryKey: ['access-logs', filters],
    queryFn: () => fetchLogs(filters),
    staleTime: 30 * 1000,
  })
}

export function useLogStats() {
  return useQuery({
    queryKey: ['access-logs', 'stats'],
    queryFn: fetchLogStats,
    staleTime: 60 * 1000,
  })
}

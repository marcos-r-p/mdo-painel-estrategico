// ─── Dashboard TanStack Query Hooks ──────────────────────────
// Wraps dashboard service functions with caching and state management.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchResumoMensal, fetchDadosMes, fetchConnectionStatus, refreshViews } from '../api/dashboard'

export function useResumoMensal(fonte: string) {
  return useQuery({
    queryKey: ['dashboard', 'resumo-mensal', fonte],
    queryFn: () => fetchResumoMensal(fonte),
  })
}

export function useDadosMes(mes: string | null, fonte: string) {
  return useQuery({
    queryKey: ['dashboard', 'dados-mes', mes, fonte],
    queryFn: () => fetchDadosMes(mes!, fonte),
    enabled: !!mes,
  })
}

/** Connection status refreshes more frequently (30s) since it's lightweight */
export function useConnectionStatus() {
  return useQuery({
    queryKey: ['dashboard', 'connection-status'],
    queryFn: fetchConnectionStatus,
    staleTime: 30 * 1000,
  })
}

/** Mutation to manually refresh all materialized views and invalidate cached queries. */
export function useRefreshViews() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: refreshViews,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['financial'] })
      queryClient.invalidateQueries({ queryKey: ['crm'] })
      queryClient.invalidateQueries({ queryKey: ['shopify'] })
    },
  })
}

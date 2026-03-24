// ─── Dashboard TanStack Query Hooks ──────────────────────────
// Wraps dashboard service functions with caching and state management.

import { useQuery } from '@tanstack/react-query'
import { fetchResumoMensal, fetchDadosMes, fetchConnectionStatus } from '../api/dashboard'

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

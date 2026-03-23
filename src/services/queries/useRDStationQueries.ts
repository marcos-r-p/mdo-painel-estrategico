// ─── RD Station TanStack Query Hooks ─────────────────────────
// Wraps RD Station service functions with caching and state management.

import { useQuery } from '@tanstack/react-query'
import { fetchAllRDStationData, fetchCRMDashboard } from '../api/rdstation'

export function useAllRDStationData() {
  return useQuery({
    queryKey: ['rdstation', 'all'],
    queryFn: fetchAllRDStationData,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCRMDashboard(periodo?: string, rdToken?: string) {
  return useQuery({
    queryKey: ['rdstation', 'crm-dashboard', periodo ?? 'default'],
    queryFn: () => fetchCRMDashboard(periodo, rdToken),
    staleTime: 5 * 60 * 1000,
  })
}

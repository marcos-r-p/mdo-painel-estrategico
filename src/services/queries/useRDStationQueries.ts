// src/services/queries/useRDStationQueries.ts
import { useQuery } from '@tanstack/react-query'
import { fetchAllRDStationData, fetchCRMDashboard } from '../api/rdstation'
import {
  fetchCrmFunil, fetchCrmEvolucao, fetchCrmPerdas,
  fetchCrmResponsaveis, fetchCrmOrigens, fetchCrmDealsParados,
} from '../api/crm-views'

const STALE_TIME = 5 * 60 * 1000
const GC_TIME = 30 * 60 * 1000
const OPTS = { staleTime: STALE_TIME, gcTime: GC_TIME, refetchOnWindowFocus: false }

// ── Existing hooks (preserved) ───────────────────────────────

export function useAllRDStationData() {
  return useQuery({
    queryKey: ['rdstation', 'all'],
    queryFn: fetchAllRDStationData,
  })
}

export function useCRMDashboard(periodo?: string, rdToken?: string) {
  return useQuery({
    queryKey: ['rdstation', 'crm-dashboard', periodo ?? 'default'],
    queryFn: () => fetchCRMDashboard(periodo, rdToken),
  })
}

// ── New CRM view hooks ───────────────────────────────────────

export function useCrmFunil() {
  return useQuery({ queryKey: ['crm', 'funil'], queryFn: fetchCrmFunil, ...OPTS })
}

export function useCrmEvolucao() {
  return useQuery({ queryKey: ['crm', 'evolucao'], queryFn: fetchCrmEvolucao, ...OPTS })
}

export function useCrmPerdas() {
  return useQuery({ queryKey: ['crm', 'perdas'], queryFn: fetchCrmPerdas, ...OPTS })
}

export function useCrmResponsaveis() {
  return useQuery({ queryKey: ['crm', 'responsaveis'], queryFn: fetchCrmResponsaveis, ...OPTS })
}

export function useCrmOrigens() {
  return useQuery({ queryKey: ['crm', 'origens'], queryFn: fetchCrmOrigens, ...OPTS })
}

export function useCrmDealsParados() {
  return useQuery({ queryKey: ['crm', 'deals-parados'], queryFn: fetchCrmDealsParados, ...OPTS })
}

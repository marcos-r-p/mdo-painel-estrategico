// src/services/queries/useFinancialQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchFluxoCaixa, fetchDRE, fetchAging,
  fetchMargemProduto, fetchMargemCanal,
  fetchComparativo, fetchReceitaPorUF,
  fetchLastSync, triggerBlingSync,
  fetchBlingCategorias,
} from '../api/financial'

const STALE_TIME = 5 * 60 * 1000
const GC_TIME = 30 * 60 * 1000
const OPTS = { staleTime: STALE_TIME, gcTime: GC_TIME, refetchOnWindowFocus: false }

export function useFluxoCaixa() {
  return useQuery({ queryKey: ['financial', 'fluxo-caixa'], queryFn: fetchFluxoCaixa, ...OPTS })
}

export function useDRE() {
  return useQuery({ queryKey: ['financial', 'dre'], queryFn: fetchDRE, ...OPTS })
}

export function useAging() {
  return useQuery({ queryKey: ['financial', 'aging'], queryFn: fetchAging, ...OPTS })
}

export function useMargemProduto() {
  return useQuery({ queryKey: ['financial', 'margem-produto'], queryFn: fetchMargemProduto, ...OPTS })
}

export function useMargemCanal() {
  return useQuery({ queryKey: ['financial', 'margem-canal'], queryFn: fetchMargemCanal, ...OPTS })
}

export function useComparativo() {
  return useQuery({ queryKey: ['financial', 'comparativo'], queryFn: fetchComparativo, ...OPTS })
}

export function useReceitaPorUF() {
  return useQuery({ queryKey: ['financial', 'receita-uf'], queryFn: fetchReceitaPorUF, ...OPTS })
}

export function useLastSync() {
  return useQuery({ queryKey: ['financial', 'last-sync'], queryFn: fetchLastSync, staleTime: 30_000 })
}

export function useBlingCategorias() {
  return useQuery({ queryKey: ['financial', 'categorias'], queryFn: fetchBlingCategorias, ...OPTS })
}

export function useTriggerSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: triggerBlingSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial'] })
    },
  })
}

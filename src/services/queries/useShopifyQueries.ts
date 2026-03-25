// src/services/queries/useShopifyQueries.ts
import { useQuery } from '@tanstack/react-query'
import { fetchAllShopifyData } from '../api/shopify'
import {
  fetchShopifyVendasMensal, fetchShopifyRecorrencia,
  fetchShopifyProdutosRank, fetchShopifyCohort,
} from '../api/shopify-views'

const STALE_TIME = 5 * 60 * 1000
const GC_TIME = 30 * 60 * 1000
const OPTS = { staleTime: STALE_TIME, gcTime: GC_TIME, refetchOnWindowFocus: false }

// ── Existing hooks (preserved) ───────────────────────────────

export function useAllShopifyData() {
  return useQuery({
    queryKey: ['shopify', 'all'],
    queryFn: fetchAllShopifyData,
  })
}

// ── New Shopify view hooks ───────────────────────────────────

export function useShopifyVendasMensal() {
  return useQuery({ queryKey: ['shopify', 'vendas-mensal'], queryFn: fetchShopifyVendasMensal, ...OPTS })
}

export function useShopifyRecorrencia() {
  return useQuery({ queryKey: ['shopify', 'recorrencia'], queryFn: fetchShopifyRecorrencia, ...OPTS })
}

export function useShopifyProdutosRank() {
  return useQuery({ queryKey: ['shopify', 'produtos-rank'], queryFn: fetchShopifyProdutosRank, ...OPTS })
}

export function useShopifyCohort() {
  return useQuery({ queryKey: ['shopify', 'cohort'], queryFn: fetchShopifyCohort, ...OPTS })
}

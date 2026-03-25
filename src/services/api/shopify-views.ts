// src/services/api/shopify-views.ts
import { supabase } from '../supabase'
import type {
  ShopifyVendasMensal, ShopifyRecorrencia,
  ShopifyProdutoRank, ShopifyCohort,
} from '../../types/shopify-views'

export async function fetchShopifyVendasMensal(): Promise<ShopifyVendasMensal[]> {
  const { data, error } = await supabase
    .from('mv_shopify_vendas_mensal')
    .select('*')
    .order('mes')
  if (error) throw new Error(`fetchShopifyVendasMensal: ${error.message}`)
  return (data ?? []) as ShopifyVendasMensal[]
}

export async function fetchShopifyRecorrencia(): Promise<ShopifyRecorrencia[]> {
  const { data, error } = await supabase
    .from('mv_shopify_recorrencia')
    .select('*')
    .order('mes')
  if (error) throw new Error(`fetchShopifyRecorrencia: ${error.message}`)
  return (data ?? []) as ShopifyRecorrencia[]
}

export async function fetchShopifyProdutosRank(): Promise<ShopifyProdutoRank[]> {
  const { data, error } = await supabase
    .from('mv_shopify_produtos_rank')
    .select('*')
    .order('receita_total', { ascending: false })
    .limit(50)
  if (error) throw new Error(`fetchShopifyProdutosRank: ${error.message}`)
  return (data ?? []) as ShopifyProdutoRank[]
}

export async function fetchShopifyCohort(): Promise<ShopifyCohort[]> {
  const { data, error } = await supabase
    .from('mv_shopify_cohort')
    .select('*')
    .order('cohort_mes')
  if (error) throw new Error(`fetchShopifyCohort: ${error.message}`)
  return (data ?? []) as ShopifyCohort[]
}

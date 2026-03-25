// src/services/api/financial.ts
import { supabase } from '../supabase'
import type {
  FluxoCaixaMensal, DREMensal, ContasVencer,
  MargemProduto, MargemCanal, ComparativoMensal,
  ReceitaPorUF, BlingSyncLog, BlingCategoria,
} from '../../types/financial'

export async function fetchFluxoCaixa(): Promise<FluxoCaixaMensal[]> {
  const { data, error } = await supabase
    .from('mv_fluxo_caixa_mensal')
    .select('*')
    .order('ano_mes')
  if (error) throw new Error(`fetchFluxoCaixa: ${error.message}`)
  return (data ?? []) as FluxoCaixaMensal[]
}

export async function fetchDRE(): Promise<DREMensal[]> {
  const { data, error } = await supabase
    .from('mv_dre_mensal')
    .select('*')
    .order('ano_mes')
  if (error) throw new Error(`fetchDRE: ${error.message}`)
  return (data ?? []) as DREMensal[]
}

export async function fetchAging(): Promise<ContasVencer[]> {
  const { data, error } = await supabase
    .from('mv_contas_vencer')
    .select('*')
    .order('ordem')
  if (error) throw new Error(`fetchAging: ${error.message}`)
  return (data ?? []) as ContasVencer[]
}

export async function fetchMargemProduto(): Promise<MargemProduto[]> {
  const { data, error } = await supabase
    .from('mv_margem_produto')
    .select('*')
    .order('receita', { ascending: false })
    .limit(50)
  if (error) throw new Error(`fetchMargemProduto: ${error.message}`)
  return (data ?? []) as MargemProduto[]
}

export async function fetchMargemCanal(): Promise<MargemCanal[]> {
  const { data, error } = await supabase
    .from('mv_margem_canal')
    .select('*')
    .order('receita', { ascending: false })
  if (error) throw new Error(`fetchMargemCanal: ${error.message}`)
  return (data ?? []) as MargemCanal[]
}

export async function fetchComparativo(): Promise<ComparativoMensal[]> {
  const { data, error } = await supabase
    .from('mv_comparativo_mensal')
    .select('*')
    .order('ano_mes', { ascending: false })
  if (error) throw new Error(`fetchComparativo: ${error.message}`)
  return (data ?? []) as ComparativoMensal[]
}

export async function fetchReceitaPorUF(): Promise<ReceitaPorUF[]> {
  const { data, error } = await supabase
    .from('mv_receita_por_uf')
    .select('*')
    .order('receita', { ascending: false })
  if (error) throw new Error(`fetchReceitaPorUF: ${error.message}`)
  return (data ?? []) as ReceitaPorUF[]
}

export async function fetchBlingCategorias(): Promise<BlingCategoria[]> {
  const { data, error } = await supabase
    .from('bling_categorias')
    .select('*')
    .order('descricao')
  if (error) throw new Error(`fetchBlingCategorias: ${error.message}`)
  return (data ?? []) as BlingCategoria[]
}

export async function updateCategoriaDRE(id: string, dre_classificacao: string): Promise<void> {
  const { error } = await supabase
    .from('bling_categorias')
    .update({ dre_classificacao })
    .eq('id', id)
  if (error) throw new Error(`updateCategoriaDRE: ${error.message}`)
}

export async function fetchLastSync(): Promise<BlingSyncLog | null> {
  const { data, error } = await supabase
    .from('bling_sync_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(`fetchLastSync: ${error.message}`)
  return data as BlingSyncLog | null
}

export async function triggerBlingSync(): Promise<{ success: boolean; message: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch('/api/sync/bling', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` },
  })
  if (!response.ok) throw new Error(`Sync failed: ${response.statusText}`)
  return response.json()
}

// ─── Dashboard API Service ──────────────────────────────────
// Data-fetching functions extracted from usePeriodoGlobal and DashboardPage.

import { supabase } from '../supabase'
import type { VwResumoMensal, VwClientesMes, VwUfMensal } from '../../types/database'
import type { ConnectionStatus, DadosMes } from '../../types/api'

/** Fetch all rows from vw_resumo_mensal, ordered by month descending. */
export async function fetchResumoMensal(): Promise<VwResumoMensal[]> {
  const { data, error } = await supabase
    .from('vw_resumo_mensal')
    .select('*')
    .order('mes', { ascending: false })

  if (error) {
    throw new Error(`Erro ao carregar resumo mensal: ${error.message}`)
  }

  return data ?? []
}

/** Fetch clients and state-level sales for a given month in parallel. */
export async function fetchDadosMes(mes: string): Promise<DadosMes> {
  const [clientesRes, ufRes] = await Promise.all([
    supabase.from('vw_clientes_mes').select('*').eq('mes', mes),
    supabase.from('vw_uf_mensal').select('*').eq('mes', mes),
  ])

  if (clientesRes.error) {
    throw new Error(`Erro ao carregar clientes do mês: ${clientesRes.error.message}`)
  }
  if (ufRes.error) {
    throw new Error(`Erro ao carregar UFs do mês: ${ufRes.error.message}`)
  }

  return {
    clientes: (clientesRes.data ?? []) as VwClientesMes[],
    estados: (ufRes.data ?? []) as VwUfMensal[],
  }
}

/** Check which platforms have tokens / data in Supabase. */
export async function fetchConnectionStatus(): Promise<ConnectionStatus> {
  const [blingRes, shopifyRes, rdRes] = await Promise.all([
    supabase.from('bling_tokens').select('id').eq('id', 1).maybeSingle(),
    supabase.from('shopify_tokens').select('id').eq('id', 1).maybeSingle(),
    supabase.from('rdstation_deals').select('id').limit(1),
  ])

  return {
    bling: !!blingRes.data,
    shopify: !!shopifyRes.data,
    rdstation: !rdRes.error && (rdRes.data?.length ?? 0) > 0,
  }
}

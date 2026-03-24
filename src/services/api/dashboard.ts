// ─── Dashboard API Service ──────────────────────────────────
// Data-fetching functions extracted from usePeriodoGlobal and DashboardPage.

import { supabase } from '../supabase'
import type { VwResumoMensal, VwClientesMes, VwUfMensal } from '../../types/database'
import type { ConnectionStatus, DadosMes } from '../../types/api'
import { throwApiError } from './errors'

/** Fetch monthly summary for the given source (bling or shopify). */
export async function fetchResumoMensal(fonte: string): Promise<VwResumoMensal[]> {
  const { data, error } = await supabase
    .rpc('fn_resumo_mensal_por_fonte', { p_fonte: fonte })

  if (error) {
    throwApiError('fetchResumoMensal', error)
  }

  // RPC returns ascending; reverse so newest month comes first
  return (data ?? []).reverse() as VwResumoMensal[]
}

/** Fetch clients and state-level sales for a given month and source in parallel. */
export async function fetchDadosMes(mes: string, fonte: string): Promise<DadosMes> {
  const [clientesRes, ufRes] = await Promise.all([
    supabase.rpc('fn_clientes_mes_por_fonte', { p_fonte: fonte, p_mes: mes }),
    supabase.rpc('fn_uf_mensal_por_fonte', { p_fonte: fonte, p_mes: mes }),
  ])

  if (clientesRes.error) {
    throwApiError('fetchDadosMes.clientes', clientesRes.error)
  }
  if (ufRes.error) {
    throwApiError('fetchDadosMes.ufs', ufRes.error)
  }

  return {
    clientes: (clientesRes.data ?? []) as VwClientesMes[],
    estados: (ufRes.data ?? []) as VwUfMensal[],
  }
}

/** Check which platforms have tokens / data in Supabase. */
export async function fetchConnectionStatus(): Promise<ConnectionStatus> {
  try {
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
  } catch {
    // If Supabase is unreachable, return all disconnected
    return { bling: false, shopify: false, rdstation: false }
  }
}

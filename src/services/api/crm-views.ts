// src/services/api/crm-views.ts
import { supabase } from '../supabase'
import type {
  CrmFunilPeriodo, CrmEvolucaoMensal, CrmPerda,
  CrmResponsavel, CrmOrigem, CrmDealParado,
} from '../../types/crm'

export async function fetchCrmFunil(): Promise<CrmFunilPeriodo[]> {
  const { data, error } = await supabase
    .from('mv_crm_funil_periodo')
    .select('*')
    .order('mes', { ascending: false })
  if (error) throw new Error(`fetchCrmFunil: ${error.message}`)
  return (data ?? []) as CrmFunilPeriodo[]
}

export async function fetchCrmEvolucao(): Promise<CrmEvolucaoMensal[]> {
  const { data, error } = await supabase
    .from('mv_crm_evolucao_mensal')
    .select('*')
    .order('mes')
  if (error) throw new Error(`fetchCrmEvolucao: ${error.message}`)
  return (data ?? []) as CrmEvolucaoMensal[]
}

export async function fetchCrmPerdas(): Promise<CrmPerda[]> {
  const { data, error } = await supabase
    .from('mv_crm_perdas')
    .select('*')
    .order('qtd', { ascending: false })
  if (error) throw new Error(`fetchCrmPerdas: ${error.message}`)
  return (data ?? []) as CrmPerda[]
}

export async function fetchCrmResponsaveis(): Promise<CrmResponsavel[]> {
  const { data, error } = await supabase
    .from('mv_crm_responsaveis')
    .select('*')
    .order('valor_total_vendas', { ascending: false })
  if (error) throw new Error(`fetchCrmResponsaveis: ${error.message}`)
  return (data ?? []) as CrmResponsavel[]
}

export async function fetchCrmOrigens(): Promise<CrmOrigem[]> {
  const { data, error } = await supabase
    .from('mv_crm_origens')
    .select('*')
    .order('total', { ascending: false })
  if (error) throw new Error(`fetchCrmOrigens: ${error.message}`)
  return (data ?? []) as CrmOrigem[]
}

export async function fetchCrmDealsParados(): Promise<CrmDealParado[]> {
  const { data, error } = await supabase
    .from('mv_crm_deals_parados')
    .select('*')
    .order('dias_parado', { ascending: false })
  if (error) throw new Error(`fetchCrmDealsParados: ${error.message}`)
  return (data ?? []) as CrmDealParado[]
}

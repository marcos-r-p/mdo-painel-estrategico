// ─── RD Station API Service ─────────────────────────────────
// Data-fetching functions extracted from useRDStationData and CRMPage.

import { supabase } from '../supabase'
import type {
  RDStationDeal,
  RDStationContact,
  RDStationStage,
  RDStationTask,
} from '../../types/database'
import type { CRMData, FunilEtapa } from '../../types/domain'
import { throwApiError } from './errors'

// ── Individual table fetchers ────────────────────────────────

/** Result shape for all RD Station table data. */
export interface RDStationData {
  deals: RDStationDeal[]
  contacts: RDStationContact[]
  stages: RDStationStage[]
  tasks: RDStationTask[]
  connected: boolean
}

/** Fetch RD Station deals (up to 5 000 rows). */
export async function fetchRDStationDeals(): Promise<RDStationDeal[]> {
  const { data, error } = await supabase
    .from('rdstation_deals')
    .select('*')
    .limit(5000)

  if (error) {
    throwApiError('fetchRDStationDeals', error)
  }

  return (data ?? []) as RDStationDeal[]
}

/** Fetch RD Station contacts (up to 5 000 rows). */
export async function fetchRDStationContacts(): Promise<RDStationContact[]> {
  const { data, error } = await supabase
    .from('rdstation_contacts')
    .select('*')
    .limit(5000)

  if (error) {
    throwApiError('fetchRDStationContacts', error)
  }

  return (data ?? []) as RDStationContact[]
}

/** Fetch RD Station pipeline stages, ordered by stage_order (up to 500 rows). */
export async function fetchRDStationStages(): Promise<RDStationStage[]> {
  const { data, error } = await supabase
    .from('rdstation_stages')
    .select('*')
    .order('stage_order')
    .limit(500)

  if (error) {
    throwApiError('fetchRDStationStages', error)
  }

  return (data ?? []) as RDStationStage[]
}

/** Fetch RD Station tasks (up to 5 000 rows). */
export async function fetchRDStationTasks(): Promise<RDStationTask[]> {
  const { data, error } = await supabase
    .from('rdstation_tasks')
    .select('*')
    .limit(5000)

  if (error) {
    throwApiError('fetchRDStationTasks', error)
  }

  return (data ?? []) as RDStationTask[]
}

/**
 * Fetch all RD Station data in parallel, with a connected flag.
 * Uses individual fetchers but catches errors gracefully (treats as disconnected).
 */
export async function fetchAllRDStationData(): Promise<RDStationData> {
  const results = await Promise.allSettled([
    fetchRDStationDeals(),
    fetchRDStationContacts(),
    fetchRDStationStages(),
    fetchRDStationTasks(),
  ])

  const deals = results[0].status === 'fulfilled' ? results[0].value : []
  const contacts = results[1].status === 'fulfilled' ? results[1].value : []
  const stages = results[2].status === 'fulfilled' ? results[2].value : []
  const tasks = results[3].status === 'fulfilled' ? results[3].value : []

  return {
    deals,
    contacts,
    stages,
    tasks,
    connected: deals.length > 0,
  }
}

// ── CRM Dashboard (RPC + REST API fallback) ─────────────────

const RD_BASE = 'https://crm.rdstation.com/api/v1'

/** RPC response shape from rdstation_dashboard_periodo. */
interface RPCDashboardResponse {
  total_criadas?: number
  totalNegociacoes?: number
  [key: string]: unknown
}

/** REST API deal shape. */
interface RESTDeal {
  id: string
  name: string
  amount?: number
  win?: boolean
  closed?: boolean
  deal_lost?: boolean
  deal_stage?: { id: string; name: string }
}

/** REST API stage shape. */
interface RESTStage {
  id?: string
  _id?: string
  name: string
}

/**
 * Fetch CRM dashboard data.
 *
 * Strategy: try Supabase RPC first (`rdstation_dashboard_periodo`).
 * If the RPC returns no data, fall back to the RD Station REST API
 * using the provided token.
 *
 * Returns `null` when neither path yields results (caller should
 * use its own fallback / seed data).
 */
export async function fetchCRMDashboard(
  periodo?: string,
  rdToken?: string,
): Promise<Partial<CRMData> | null> {
  // ── Path 1: Supabase RPC ──────────────────────────────────
  try {
    const { data, error } = await supabase.rpc('rdstation_dashboard_periodo', periodo ? { periodo } : undefined)
    const rpcData = data as RPCDashboardResponse | null

    if (!error && rpcData && (rpcData.total_criadas ?? 0) > 0) {
      return rpcData as Partial<CRMData>
    }
  } catch {
    // RPC unavailable — fall through to REST
  }

  // ── Path 2: RD Station REST API ───────────────────────────
  if (!rdToken) return null

  // NOTE: RD Station CRM API v1 requires the token as a query parameter.
  // Bearer header auth is not supported by this API version.
  // The token will appear in server access logs — ensure HTTPS is used
  // and avoid logging full URLs on the client side.
  const [dealsRes, stagesRes] = await Promise.all([
    fetch(`${RD_BASE}/deals?page=1&limit=200&token=${rdToken}`),
    fetch(`${RD_BASE}/deal_stages?token=${rdToken}`),
  ])

  if (!dealsRes.ok) {
    throwApiError('fetchCRMDashboard', new Error(`RD Station auth failed: HTTP ${dealsRes.status}`))
  }

  const dealsData = await dealsRes.json()
  const stagesData: RESTStage[] = await stagesRes.json()

  const deals: RESTDeal[] = dealsData.deals || dealsData || []
  const ganhas = deals.filter((d) => d.win === true)
  const perdidas = deals.filter((d) => d.win === false && (d.closed || d.deal_lost))
  const abertas = deals.filter((d) => !d.win && !d.closed)

  const etapas: FunilEtapa[] = (Array.isArray(stagesData) ? stagesData : []).map((s) => {
    const stageId = s.id || s._id
    const dealsEtapa = deals.filter((d) => d.deal_stage?.id === stageId)
    return {
      nome: s.name,
      qtd: dealsEtapa.length,
      valor: dealsEtapa.reduce((a, d) => a + (d.amount || 0), 0),
      taxaAvanco: 0,
      perdas: dealsEtapa.filter((d) => d.win === false).length,
      vendas: dealsEtapa.filter((d) => d.win === true).length,
    }
  })

  return {
    totalNegociacoes: deals.length,
    valorPipeline: abertas.reduce((a, d) => a + (d.amount || 0), 0),
    taxaConversaoGeral:
      ganhas.length > 0
        ? Math.round((ganhas.length / (ganhas.length + perdidas.length)) * 100)
        : 0,
    ticketMedioMesAtual:
      ganhas.length > 0
        ? Math.round(ganhas.reduce((a, d) => a + (d.amount || 0), 0) / ganhas.length)
        : 0,
    etapas,
  }
}

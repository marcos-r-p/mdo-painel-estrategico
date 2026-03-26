import { supabase } from '../supabase'

export interface CohortClient {
  nome_cliente: string | null
  email: string | null
  uf: string | null
  pedidos: number
  receita: number
}

/**
 * Fetches clients belonging to a specific cohort that purchased in a given month.
 * - cohortMes: first purchase month (YYYY-MM-DD date format from materialized view)
 * - mesCompra: the purchase month to inspect (YYYY-MM-DD date format)
 */
export async function fetchCohortDetail(
  cohortMes: string,
  mesCompra: string,
): Promise<CohortClient[]> {
  // cohortMes and mesCompra come as YYYY-MM-DD (first day of month) from the matview
  const cohortStart = cohortMes.slice(0, 10)
  const cohortEndDate = new Date(cohortStart)
  cohortEndDate.setMonth(cohortEndDate.getMonth() + 1)
  const cohortEnd = cohortEndDate.toISOString().slice(0, 10)

  const purchaseStart = mesCompra.slice(0, 10)
  const purchaseEndDate = new Date(purchaseStart)
  purchaseEndDate.setMonth(purchaseEndDate.getMonth() + 1)
  const purchaseEnd = purchaseEndDate.toISOString().slice(0, 10)

  // DB columns: data (timestamptz), cliente_email, cliente_nome, valor_total, uf

  // Step 1: get all unique customer emails from the cohort month (their first purchase month)
  const { data: cohortPedidos } = await supabase
    .from('shopify_pedidos')
    .select('cliente_email, cliente_nome')
    .gte('data', cohortStart)
    .lt('data', cohortEnd)
    .not('cliente_nome', 'is', null)

  if (!cohortPedidos || cohortPedidos.length === 0) return []

  // Build a set of unique customer identifiers (prefer email, fallback to name)
  const cohortCustomers = new Map<string, string>() // key -> nome
  for (const p of cohortPedidos) {
    const key = p.cliente_email || p.cliente_nome || ''
    if (key && !cohortCustomers.has(key)) {
      cohortCustomers.set(key, p.cliente_nome || '')
    }
  }

  if (cohortCustomers.size === 0) return []

  // For M0 (same month), just aggregate the cohort itself
  if (cohortStart === purchaseStart) {
    return aggregatePedidos(cohortStart, cohortEnd, cohortCustomers)
  }

  // For other months, find which cohort customers also purchased in mesCompra
  return aggregatePedidos(purchaseStart, purchaseEnd, cohortCustomers)
}

async function aggregatePedidos(
  dateStart: string,
  dateEnd: string,
  customerKeys: Map<string, string>,
): Promise<CohortClient[]> {
  // Get emails that are not empty
  const emails = [...customerKeys.keys()].filter((k) => k.includes('@'))
  // Get names for customers without email
  const namesOnly = [...customerKeys.keys()].filter((k) => !k.includes('@'))

  const allResults: Array<{ cliente_nome: string | null; cliente_email: string | null; uf: string | null; valor_total: number }> = []

  // Query by email in batches
  const batchSize = 100
  for (let i = 0; i < Math.min(emails.length, 500); i += batchSize) {
    const batch = emails.slice(i, i + batchSize)
    const { data } = await supabase
      .from('shopify_pedidos')
      .select('cliente_nome, cliente_email, uf, valor_total')
      .gte('data', dateStart)
      .lt('data', dateEnd)
      .in('cliente_email', batch)

    if (data) allResults.push(...data)
  }

  // Query by name for those without email
  for (let i = 0; i < Math.min(namesOnly.length, 200); i += batchSize) {
    const batch = namesOnly.slice(i, i + batchSize)
    const { data } = await supabase
      .from('shopify_pedidos')
      .select('cliente_nome, cliente_email, uf, valor_total')
      .gte('data', dateStart)
      .lt('data', dateEnd)
      .in('cliente_nome', batch)

    if (data) allResults.push(...data)
  }

  // Aggregate by customer
  const map = new Map<string, CohortClient>()
  for (const p of allResults) {
    const key = p.cliente_email || p.cliente_nome || 'unknown'
    const existing = map.get(key)
    if (existing) {
      existing.pedidos++
      existing.receita += Number(p.valor_total) || 0
    } else {
      map.set(key, {
        nome_cliente: p.cliente_nome,
        email: p.cliente_email,
        uf: p.uf,
        pedidos: 1,
        receita: Number(p.valor_total) || 0,
      })
    }
  }

  return [...map.values()].sort((a, b) => b.receita - a.receita).slice(0, 50)
}

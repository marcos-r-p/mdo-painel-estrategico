// =============================================================
// Edge Function: rdstation-sync
// Deploy via Supabase Dashboard > Edge Functions
// Env var necessária: RDSTATION_API_TOKEN
// =============================================================
// Uso: GET /functions/v1/rdstation-sync?tipo=all
//      tipo = all | deals | contacts | stages | tasks
// =============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RD_BASE = 'https://crm.rdstation.com/api/v1'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const token = Deno.env.get('RDSTATION_API_TOKEN')
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'RDSTATION_API_TOKEN não configurado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const url = new URL(req.url)
  const tipo = url.searchParams.get('tipo') || 'all'

  const results: Record<string, unknown> = {}

  try {
    // ─── STAGES ──────────────────────────────────────────
    if (tipo === 'all' || tipo === 'stages') {
      const stagesRes = await fetch(`${RD_BASE}/deal_stages?token=${token}`)
      const stagesData = await stagesRes.json()

      // RD Station may return { deal_stages: [...] } or plain array
      const stagesList = Array.isArray(stagesData) ? stagesData : (stagesData.deal_stages || stagesData.stages || [])

      if (Array.isArray(stagesList) && stagesList.length > 0) {
        const rows = stagesList.map((s: any, i: number) => ({
          rdstation_id: s.id || s._id,
          name: s.name || s.nickname,
          stage_order: s.order ?? s.position ?? i,
          deals_count: s.deals_count ?? 0,
          synced_at: new Date().toISOString(),
        }))

        const { error } = await supabase
          .from('rdstation_stages')
          .upsert(rows, { onConflict: 'rdstation_id' })

        results.stages = error ? { error: error.message } : { synced: rows.length }
      } else {
        // Fallback: derive stages from deals
        const { data: stageRows } = await supabase.rpc('_noop', {}).maybeSingle()  // no-op
        const { data: derivedStages } = await supabase
          .from('rdstation_deals')
          .select('stage_name')

        if (derivedStages) {
          const stageMap: Record<string, number> = {}
          derivedStages.forEach((d: any) => {
            if (d.stage_name) stageMap[d.stage_name] = (stageMap[d.stage_name] || 0) + 1
          })
          const STAGE_ORDER: Record<string, number> = {
            'Sem Contato': 1, 'Contato Feito': 2, 'Negociação Iniciada': 3,
            'Orçamento Realizado': 4, 'Aguardando Pagamento': 5, 'Pagamento Efetuado': 6,
          }
          const rows = Object.entries(stageMap).map(([name, count], i) => ({
            rdstation_id: `derived_${name.replace(/\s/g, '_').toLowerCase()}`,
            name,
            stage_order: STAGE_ORDER[name] ?? (10 + i),
            deals_count: count,
            synced_at: new Date().toISOString(),
          }))

          await supabase.from('rdstation_stages').upsert(rows, { onConflict: 'rdstation_id' })
          results.stages = { synced: rows.length, source: 'derived_from_deals' }
        }
      }
    }

    // ─── DEALS (paginado) ────────────────────────────────
    if (tipo === 'all' || tipo === 'deals') {
      let page = 1
      let allDeals: any[] = []
      const limit = 200

      while (true) {
        const dealsRes = await fetch(
          `${RD_BASE}/deals?token=${token}&page=${page}&limit=${limit}`
        )
        const dealsData = await dealsRes.json()
        const deals = dealsData.deals || dealsData

        if (!Array.isArray(deals) || deals.length === 0) break

        allDeals = allDeals.concat(deals)
        if (deals.length < limit) break
        page++

        // Rate limit safety
        await new Promise(r => setTimeout(r, 200))
      }

      if (allDeals.length > 0) {
        // Process in batches of 500
        for (let i = 0; i < allDeals.length; i += 500) {
          const batch = allDeals.slice(i, i + 500)
          const rows = batch.map((d: any) => {
            // RD Station API: deal_lost is truthy when deal was lost
            const hasLossReason = !!(d.deal_lost_reason || d.deal_lost?.name || d.loss_reason)
            const isWon = d.win === true
            const isClosed = isWon || hasLossReason || d.closed === true

            return {
              rdstation_id: d.id || d._id,
              name: d.name,
              amount: d.amount_montly_recurring_revenue ?? d.amount_unique ?? d.amount_total ?? d.deal_value ?? d.amount ?? 0,
              stage_id: d.deal_stage?.id || d.deal_stage_id || null,
              stage_name: d.deal_stage?.name || d.stage_name || null,
              win: isWon,
              closed: isClosed,
              user_name: d.user?.name || d.user_name || null,
              deal_source: d.deal_source?.name || d.campaign?.name || d.deal_source || null,
              contact_name: d.contacts?.[0]?.name || d.contact_name || null,
              contact_email: d.contacts?.[0]?.emails?.[0]?.email || d.contacts?.[0]?.email || d.contact_email || null,
              loss_reason: (typeof d.deal_lost_reason === 'object' ? d.deal_lost_reason?.name : d.deal_lost_reason) || d.deal_lost?.name || d.loss_reason || null,
              created_at: d.created_at,
              closed_at: d.closed_at || (isClosed ? d.last_activity_at : null),
              synced_at: new Date().toISOString(),
            }
          })

          await supabase
            .from('rdstation_deals')
            .upsert(rows, { onConflict: 'rdstation_id' })
        }

        results.deals = { synced: allDeals.length }
      } else {
        results.deals = { synced: 0 }
      }
    }

    // ─── CONTACTS (paginado) ─────────────────────────────
    if (tipo === 'all' || tipo === 'contacts') {
      let page = 1
      let allContacts: any[] = []
      const limit = 200

      while (true) {
        const contactsRes = await fetch(
          `${RD_BASE}/contacts?token=${token}&page=${page}&limit=${limit}`
        )
        const contactsData = await contactsRes.json()
        const contacts = contactsData.contacts || contactsData

        if (!Array.isArray(contacts) || contacts.length === 0) break

        allContacts = allContacts.concat(contacts)
        if (contacts.length < limit) break
        page++

        await new Promise(r => setTimeout(r, 200))
      }

      if (allContacts.length > 0) {
        for (let i = 0; i < allContacts.length; i += 500) {
          const batch = allContacts.slice(i, i + 500)
          const rows = batch.map((c: any) => ({
            rdstation_id: c.id || c._id,
            name: c.name,
            email: c.emails?.[0]?.email || c.email || null,
            phone: c.phones?.[0]?.phone || c.phone || null,
            tags: c.tags || [],
            synced_at: new Date().toISOString(),
          }))

          await supabase
            .from('rdstation_contacts')
            .upsert(rows, { onConflict: 'rdstation_id' })
        }

        results.contacts = { synced: allContacts.length }
      } else {
        results.contacts = { synced: 0 }
      }
    }

    // ─── TASKS (paginado) ────────────────────────────────
    if (tipo === 'all' || tipo === 'tasks') {
      let page = 1
      let allTasks: any[] = []
      const limit = 200

      while (true) {
        const tasksRes = await fetch(
          `${RD_BASE}/tasks?token=${token}&page=${page}&limit=${limit}`
        )
        const tasksData = await tasksRes.json()
        const tasks = tasksData.tasks || tasksData

        if (!Array.isArray(tasks) || tasks.length === 0) break

        allTasks = allTasks.concat(tasks)
        if (tasks.length < limit) break
        page++

        await new Promise(r => setTimeout(r, 200))
      }

      if (allTasks.length > 0) {
        for (let i = 0; i < allTasks.length; i += 500) {
          const batch = allTasks.slice(i, i + 500)
          const rows = batch.map((t: any) => ({
            rdstation_id: t.id || t._id,
            subject: t.subject || t.name || null,
            deal_id: t.deal_id || null,
            due_date: t.due_date || null,
            done: t.done ?? t.completed ?? false,
            synced_at: new Date().toISOString(),
          }))

          await supabase
            .from('rdstation_tasks')
            .upsert(rows, { onConflict: 'rdstation_id' })
        }

        results.tasks = { synced: allTasks.length }
      } else {
        results.tasks = { synced: 0 }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

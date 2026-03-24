import { supabase } from '../supabase'
import type { AccessLog, AccessLogFilters, AccessLogStats } from '../../types/userManagement'
import { throwApiError } from './errors'

/** Shape returned by Supabase join: access_logs + user_profiles. */
interface AccessLogWithProfile {
  id: string
  user_id: string
  event_type: string
  page_key: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user_profiles: { email: string; nome: string | null } | null
}

/**
 * Log an access event (login, logout, page_view).
 * This is the single entry point for all access_logs insertions.
 */
export async function logEvent(eventType: string, pageKey?: string, userId?: string) {
  try {
    const uid = userId ?? (await supabase.auth.getUser()).data.user?.id
    if (!uid) return

    const { error } = await supabase.from('access_logs').insert({
      user_id: uid,
      event_type: eventType,
      page_key: pageKey ?? null,
      user_agent: navigator.userAgent,
    })

    if (error) {
      console.error(`[logEvent] Failed to insert access log:`, error.message)
    }
  } catch (err) {
    console.error(`[logEvent] Unexpected error:`, err)
  }
}

export async function fetchLogs(filters: AccessLogFilters) {
  let query = supabase
    .from('access_logs')
    .select('*, user_profiles!inner(email, nome)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(
      (filters.page - 1) * filters.per_page,
      filters.page * filters.per_page - 1,
    )

  if (filters.user_id) query = query.eq('user_id', filters.user_id)
  if (filters.event_type) query = query.eq('event_type', filters.event_type)
  if (filters.from_date) query = query.gte('created_at', filters.from_date)
  if (filters.to_date) query = query.lte('created_at', filters.to_date)

  const { data, error, count } = await query
  if (error) throwApiError('fetchLogs', error)

  return {
    logs: (data ?? []).map((d) => {
      const row = d as unknown as AccessLogWithProfile
      return {
        ...d,
        user_email: row.user_profiles?.email,
        user_nome: row.user_profiles?.nome,
        user_profiles: undefined,
      }
    }) as AccessLog[],
    total: count ?? 0,
  }
}

export async function fetchLogStats(): Promise<AccessLogStats> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { count: todayCount } = await supabase
    .from('access_logs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  const { data: activeUsers } = await supabase
    .from('access_logs')
    .select('user_id')
    .gte('created_at', sevenDaysAgo.toISOString())
    .eq('event_type', 'login')

  const uniqueUsers = new Set(activeUsers?.map((u) => u.user_id) ?? [])

  const { data: topPages } = await supabase
    .from('access_logs')
    .select('page_key')
    .eq('event_type', 'page_view')
    .gte('created_at', sevenDaysAgo.toISOString())
    .not('page_key', 'is', null)

  const pageCounts: Record<string, number> = {}
  topPages?.forEach((p) => {
    if (p.page_key) pageCounts[p.page_key] = (pageCounts[p.page_key] || 0) + 1
  })
  const topPage = Object.entries(pageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return {
    today_count: todayCount ?? 0,
    active_users_7d: uniqueUsers.size,
    top_page: topPage,
  }
}

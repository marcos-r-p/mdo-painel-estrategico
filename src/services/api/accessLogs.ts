import { supabase } from '../supabase'
import type { AccessLog, AccessLogFilters, AccessLogStats } from '../../types/userManagement'

export async function logEvent(eventType: string, pageKey?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('access_logs').insert({
    user_id: user.id,
    event_type: eventType,
    page_key: pageKey ?? null,
    user_agent: navigator.userAgent,
  })
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
  if (error) throw error

  return {
    logs: (data ?? []).map((d) => ({
      ...d,
      user_email: (d as any).user_profiles?.email,
      user_nome: (d as any).user_profiles?.nome,
      user_profiles: undefined,
    })) as AccessLog[],
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

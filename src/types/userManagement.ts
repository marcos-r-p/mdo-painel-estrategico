export interface Role {
  id: string
  nome: string
  descricao: string | null
  is_system: boolean
  created_at: string
}

export interface RolePermission {
  id: string
  role_id: string
  page_key: string
  created_at: string
}

export interface RoleWithPermissions extends Role {
  permissions: string[] // page_keys
  user_count: number
}

export interface AccessLog {
  id: string
  user_id: string
  event_type: 'login' | 'logout' | 'page_view'
  page_key: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user_email?: string
  user_nome?: string
}

export interface AccessLogStats {
  today_count: number
  active_users_7d: number
  top_page: string | null
}

export interface InviteUserPayload {
  email: string
  nome?: string
  role_id: string
  send_email: boolean
  password?: string
}

export interface UpdateUserPayload {
  user_id: string
  nome?: string
  role_id?: string
}

export interface AccessLogFilters {
  user_id?: string
  event_type?: string
  from_date?: string
  to_date?: string
  page: number
  per_page: number
}

import { supabase, supabaseUrl } from '../supabase'
import type { InviteUserPayload, UpdateUserPayload } from '../../types/userManagement'

const FUNCTION_URL = `${supabaseUrl}/functions/v1/user-management`

async function callEdgeFunction(action: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(`${FUNCTION_URL}/${action}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      ...options.headers,
    },
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function listUsers(includeDeleted = false) {
  return callEdgeFunction(`list?include_deleted=${includeDeleted}`, { method: 'GET' })
}

export async function inviteUser(payload: InviteUserPayload) {
  return callEdgeFunction('invite', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateUser(payload: UpdateUserPayload) {
  return callEdgeFunction('update', { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function deactivateUser(userId: string) {
  return callEdgeFunction('deactivate', { method: 'POST', body: JSON.stringify({ user_id: userId }) })
}

export async function reactivateUser(userId: string) {
  return callEdgeFunction('reactivate', { method: 'POST', body: JSON.stringify({ user_id: userId }) })
}

export async function deleteUser(userId: string) {
  return callEdgeFunction('delete', { method: 'DELETE', body: JSON.stringify({ user_id: userId }) })
}

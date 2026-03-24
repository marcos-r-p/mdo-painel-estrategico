import { supabase } from '../supabase'
import type { RoleWithPermissions } from '../../types/userManagement'

export async function listRoles(): Promise<RoleWithPermissions[]> {
  const { data: roles, error } = await supabase
    .from('roles')
    .select('*, role_permissions(page_key)')
    .order('is_system', { ascending: false })
    .order('nome')

  if (error) throw error

  const { data: counts, error: countError } = await supabase
    .from('user_profiles')
    .select('role_id')
    .is('deleted_at', null)

  if (countError) throw countError

  const countMap = counts.reduce<Record<string, number>>((acc, u) => {
    acc[u.role_id] = (acc[u.role_id] || 0) + 1
    return acc
  }, {})

  return roles.map((r) => ({
    ...r,
    permissions: r.role_permissions.map((p: { page_key: string }) => p.page_key),
    user_count: countMap[r.id] || 0,
    role_permissions: undefined,
  })) as RoleWithPermissions[]
}

export async function createRole(nome: string, descricao: string | null, pageKeys: string[]) {
  const { data: role, error } = await supabase
    .from('roles')
    .insert({ nome, descricao })
    .select()
    .single()

  if (error) throw error

  if (pageKeys.length > 0) {
    const { error: permError } = await supabase
      .from('role_permissions')
      .insert(pageKeys.map((pk) => ({ role_id: role.id, page_key: pk })))
    if (permError) throw permError
  }

  return role
}

export async function updateRole(roleId: string, nome: string, descricao: string | null, pageKeys: string[]) {
  const { error: updateError } = await supabase
    .from('roles')
    .update({ nome, descricao })
    .eq('id', roleId)

  if (updateError) throw updateError

  const { error: deleteError } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)

  if (deleteError) throw deleteError

  if (pageKeys.length > 0) {
    const { error: insertError } = await supabase
      .from('role_permissions')
      .insert(pageKeys.map((pk) => ({ role_id: roleId, page_key: pk })))
    if (insertError) throw insertError
  }
}

export async function deleteRole(roleId: string) {
  const { count, error: countError } = await supabase
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role_id', roleId)
    .is('deleted_at', null)

  if (countError) throw countError
  if (count && count > 0) throw new Error('Não é possível deletar role com usuários atribuídos')

  const { error } = await supabase.from('roles').delete().eq('id', roleId)
  if (error) throw error
}

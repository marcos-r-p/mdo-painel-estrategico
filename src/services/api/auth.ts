// ─── Auth API Service ───────────────────────────────────────
// Wraps Supabase Auth. Extracted from AuthContext.

import { supabase } from '../supabase'
import type { UserProfile } from '../../types/database'
import type { AuthResponse } from '@supabase/supabase-js'
import { throwApiError } from './errors'

/** Shape returned by Supabase join: user_profiles + roles. */
type ProfileWithRole = UserProfile & { roles: { nome: string } | null }

/** Sign in with email and password. */
export async function loginWithEmail(
  email: string,
  password: string,
): Promise<AuthResponse['data']> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  return data
}

/** Sign out the current user. */
export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/** Send a password-reset email. */
export async function resetPasswordForEmail(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

/** Update the authenticated user's password. */
export async function updateUserPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

/**
 * Fetch the user profile from `user_profiles`.
 *
 * Strategy: try by ID first; if not found and an email is provided,
 * fall back to lookup by email (same pattern as AuthContext.jsx).
 */
export async function fetchUserProfile(
  userId: string,
  email?: string,
): Promise<UserProfile> {
  // Try by ID first
  let { data, error } = await supabase
    .from('user_profiles')
    .select('*, roles!inner(nome)')
    .eq('id', userId)
    .is('deleted_at', null)
    .single()

  // Fallback to email if ID lookup failed
  if (error && email) {
    const result = await supabase
      .from('user_profiles')
      .select('*, roles!inner(nome)')
      .eq('email', email)
      .is('deleted_at', null)
      .single()

    data = result.data
    error = result.error
  }

  if (error) {
    throwApiError('fetchUserProfile', error)
  }

  if (data) {
    const profileWithRole = data as ProfileWithRole
    return {
      ...data,
      role_nome: profileWithRole.roles?.nome ?? '',
      roles: undefined,
    } as UserProfile
  }

  throwApiError('fetchUserProfile', new Error('Perfil não encontrado'))
}

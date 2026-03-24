// ─── Sync API Service ───────────────────────────────────────
// Sync logic extracted from DashboardPage.

import { supabase, supabaseUrl } from '../supabase'
import type { SyncResponse } from '../../types/api'

// ── Constants ────────────────────────────────────────────────

/** Map of platform to the ordered list of sync step names. */
export const SYNC_STEPS: Record<string, string[]> = {
  bling: ['contatos', 'produtos', 'pedidos', 'financeiro'],
  shopify: ['pedidos', 'clientes', 'produtos'],
  rdstation: ['all'],
}

// ── Auth helper ──────────────────────────────────────────────

/** Retrieve the current session access token. Throws if not authenticated. */
export async function getAccessToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    throw new Error(`Erro ao obter sessão: ${error.message}`)
  }
  if (!session?.access_token) {
    throw new Error('Usuário não autenticado')
  }

  return session.access_token
}

// ── Sync functions ───────────────────────────────────────────

/**
 * Call a Supabase Edge Function to sync a single step of a platform.
 *
 * Includes both `Authorization` (user JWT) and `apikey` (Supabase anon key)
 * headers. The apikey header is required for Supabase Edge Functions to
 * respond with proper CORS headers.
 */
export async function syncPlatformStep(
  platform: string,
  tipo: string,
): Promise<SyncResponse> {
  const token = await getAccessToken()

  const res = await fetch(
    `${supabaseUrl}/functions/v1/${platform}-sync?tipo=${tipo}&meses=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    },
  )

  if (!res.ok) {
    throw new Error(`Sync ${platform}/${tipo} falhou: HTTP ${res.status}`)
  }

  const data: SyncResponse = await res.json()

  if (data.error) {
    throw new Error(data.error)
  }

  return data
}

// ── OAuth URLs ───────────────────────────────────────────────

/** Return the Bling OAuth authorization URL. */
export function getBlingOAuthURL(): string {
  const clientId = import.meta.env.VITE_BLING_CLIENT_ID ?? '567bba7562d27003649ad247d8bd0baad95d3435'
  return `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${clientId}&state=mdo`
}

/** Return the Shopify OAuth callback URL (via Supabase Edge Function). */
export function getShopifyOAuthURL(): string {
  return `${supabaseUrl}/functions/v1/shopify-callback`
}

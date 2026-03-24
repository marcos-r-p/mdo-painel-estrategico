// ─── Sync API Service ───────────────────────────────────────

import { supabase, supabaseUrl } from '../supabase'
import type { SyncResponse } from '../../types/api'

// ── Constants ────────────────────────────────────────────────

export const SYNC_STEPS: Record<string, string[]> = {
  bling: ['contatos', 'produtos', 'pedidos', 'financeiro'],
  shopify: ['pedidos', 'clientes', 'produtos'],
  rdstation: ['all'],
}

const SYNC_TIMEOUT_MS = 25_000

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
 * - Uses AbortController with 25s timeout to prevent hanging connections
 * - Accepts optional pre-fetched token to avoid repeated getSession() calls
 * - Passes mode=incremental by default
 */
export async function syncPlatformStep(
  platform: string,
  tipo: string,
  token?: string,
): Promise<SyncResponse> {
  const authToken = token ?? await getAccessToken()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS)

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/${platform}-sync?tipo=${tipo}&meses=1&mode=incremental`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        signal: controller.signal,
      },
    )

    clearTimeout(timeout)

    if (!res.ok) {
      throw new Error(`Sync ${platform}/${tipo} falhou: HTTP ${res.status}`)
    }

    const data: SyncResponse = await res.json()

    if (data.error) {
      throw new Error(data.error)
    }

    return data
  } catch (err) {
    clearTimeout(timeout)

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Sync ${platform}/${tipo} timeout (${SYNC_TIMEOUT_MS / 1000}s)`)
    }

    throw err
  }
}

// ── OAuth URLs ───────────────────────────────────────────────

export function getBlingOAuthURL(): string {
  const clientId = import.meta.env.VITE_BLING_CLIENT_ID ?? '567bba7562d27003649ad247d8bd0baad95d3435'
  return `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${clientId}&state=mdo`
}

export function getShopifyOAuthURL(): string {
  return `${supabaseUrl}/functions/v1/shopify-callback`
}

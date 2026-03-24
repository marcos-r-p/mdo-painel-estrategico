// ─── API Response Types ──────────────────────────────────────
// Types for Supabase Edge Function responses and sync operations.

import type { VwClientesMes, VwUfMensal } from './database';

/** Response from bling-sync, shopify-sync, rdstation-sync Edge Functions */
export interface SyncResponse {
  status: 'ok' | 'error';
  error?: string;
  mensagem?: string;
  sincronizados?: Record<string, number | string>;
}

/** Connection status flags for each platform */
export interface ConnectionStatus {
  bling: boolean;
  shopify: boolean;
  rdstation: boolean;
}

/** Period data combining clients and state-level sales for a given month */
export interface DadosMes {
  clientes: VwClientesMes[];
  estados: VwUfMensal[];
}


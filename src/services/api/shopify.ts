// ─── Shopify API Service ────────────────────────────────────
// Data-fetching functions extracted from useShopifyData.

import { supabase } from '../supabase'
import type { ShopifyPedido, ShopifyCliente, ShopifyProduto } from '../../types/database'

/** Result shape for all Shopify data. */
export interface ShopifyData {
  pedidos: ShopifyPedido[]
  clientes: ShopifyCliente[]
  produtos: ShopifyProduto[]
}

/**
 * Generic pagination helper that fetches all rows from a Supabase table,
 * iterating in pages to avoid the default row-limit cap.
 */
async function fetchAllPages<T>(
  table: string,
  select: string,
  pageSize = 1000,
): Promise<T[]> {
  let all: T[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const from = page * pageSize
    const to = from + pageSize - 1

    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, to)

    if (error) {
      throw new Error(`fetch ${table}: ${error.message}`)
    }

    all = all.concat((data ?? []) as T[])
    hasMore = (data?.length ?? 0) === pageSize
    page++
  }

  return all
}

/** Fetch all Shopify orders using paginated requests. */
export async function fetchShopifyPedidos(): Promise<ShopifyPedido[]> {
  return fetchAllPages<ShopifyPedido>('shopify_pedidos', '*')
}

/** Fetch all Shopify customers using paginated requests. */
export async function fetchShopifyClientes(): Promise<ShopifyCliente[]> {
  return fetchAllPages<ShopifyCliente>('shopify_clientes', '*')
}

/** Fetch all Shopify products using paginated requests. */
export async function fetchShopifyProdutos(): Promise<ShopifyProduto[]> {
  return fetchAllPages<ShopifyProduto>('shopify_produtos', '*')
}

/** Fetch all Shopify data in parallel. */
export async function fetchAllShopifyData(): Promise<ShopifyData> {
  const [pedidos, clientes, produtos] = await Promise.all([
    fetchShopifyPedidos(),
    fetchShopifyClientes(),
    fetchShopifyProdutos(),
  ])

  return { pedidos, clientes, produtos }
}

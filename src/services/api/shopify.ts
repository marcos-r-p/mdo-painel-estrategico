// ─── Shopify API Service ────────────────────────────────────
// Data-fetching functions extracted from useShopifyData.

import { supabase } from '../supabase'
import type { ShopifyPedido, ShopifyCliente, ShopifyProduto } from '../../types/database'
import { throwApiError } from './errors'

/** Result shape for all Shopify data. */
export interface ShopifyData {
  pedidos: ShopifyPedido[]
  clientes: ShopifyCliente[]
  produtos: ShopifyProduto[]
}

/** Fetch Shopify orders (up to 5 000 rows). */
export async function fetchShopifyPedidos(): Promise<ShopifyPedido[]> {
  const { data, error } = await supabase
    .from('shopify_pedidos')
    .select('*')
    .limit(5000)

  if (error) {
    throwApiError('fetchShopifyPedidos', error)
  }

  return (data ?? []) as ShopifyPedido[]
}

/** Fetch Shopify customers (up to 5 000 rows). */
export async function fetchShopifyClientes(): Promise<ShopifyCliente[]> {
  const { data, error } = await supabase
    .from('shopify_clientes')
    .select('*')
    .limit(5000)

  if (error) {
    throwApiError('fetchShopifyClientes', error)
  }

  return (data ?? []) as ShopifyCliente[]
}

/** Fetch Shopify products (up to 5 000 rows). */
export async function fetchShopifyProdutos(): Promise<ShopifyProduto[]> {
  const { data, error } = await supabase
    .from('shopify_produtos')
    .select('*')
    .limit(5000)

  if (error) {
    throwApiError('fetchShopifyProdutos', error)
  }

  return (data ?? []) as ShopifyProduto[]
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

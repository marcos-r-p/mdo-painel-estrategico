// ─── Shopify TanStack Query Hooks ────────────────────────────
// Wraps Shopify service functions with caching and state management.

import { useQuery } from '@tanstack/react-query'
import { fetchAllShopifyData } from '../api/shopify'

export function useAllShopifyData() {
  return useQuery({
    queryKey: ['shopify', 'all'],
    queryFn: fetchAllShopifyData,
  })
}

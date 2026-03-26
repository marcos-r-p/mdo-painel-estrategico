// src/services/api/crm-filtered.ts
import { supabase } from '../supabase'
import type { CrmFilteredData } from '../../types/crm-filtered'

export async function fetchCrmFiltered(dateFrom: string, dateTo: string): Promise<CrmFilteredData> {
  const { data, error } = await supabase.rpc('crm_filtered', {
    p_from: dateFrom,
    p_to: dateTo,
  })
  if (error) throw new Error(`fetchCrmFiltered: ${error.message}`)
  if (!data) throw new Error('fetchCrmFiltered: no data returned')
  return data as CrmFilteredData
}

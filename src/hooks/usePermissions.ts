import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { useAuth } from './useAuth'

export function usePermissions() {
  const { userProfile, isAdmin } = useAuth()

  const { data: allowedPages = new Set<string>(), isLoading } = useQuery({
    queryKey: ['permissions', userProfile?.role_id],
    queryFn: async () => {
      if (!userProfile?.role_id) return new Set<string>()

      const { data, error } = await supabase
        .from('role_permissions')
        .select('page_key')
        .eq('role_id', userProfile.role_id)

      if (error) throw error
      return new Set(data.map((r) => r.page_key))
    },
    enabled: !!userProfile?.role_id && !isAdmin,
  })

  return {
    allowedPages: isAdmin ? null : allowedPages,
    isAdmin,
    isLoading,
    hasAccess: (pageKey: string) => {
      if (isAdmin) return true
      if (pageKey === 'dashboard') return true
      return allowedPages.has(pageKey)
    },
  }
}

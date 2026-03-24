// ─── Sync Mutation Hooks ─────────────────────────────────────

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { syncPlatformStep, getAccessToken, SYNC_STEPS } from '../api/sync'
import type { SyncResponse } from '../../types/api'

export interface SyncProgress {
  currentStep: string | null
  results: Record<string, SyncResponse>
  isRunning: boolean
  error: string | null
}

export function usePlatformSync(platform: string) {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<SyncProgress>({
    currentStep: null,
    results: {},
    isRunning: false,
    error: null,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      setProgress({ currentStep: null, results: {}, isRunning: true, error: null })

      // Get token ONCE at the start — avoid repeated getSession() calls per step
      const token = await getAccessToken()
      const steps = SYNC_STEPS[platform] ?? []
      const results: Record<string, SyncResponse> = {}

      for (const step of steps) {
        setProgress((prev) => ({ ...prev, currentStep: step }))
        try {
          results[step] = await syncPlatformStep(platform, step, token)
        } catch (err) {
          results[step] = {
            status: 'error',
            error: err instanceof Error ? err.message : 'Erro desconhecido',
          }
        }
      }

      return results
    },
    onSuccess: () => {
      setProgress((prev) => ({ ...prev, isRunning: false, currentStep: null }))

      // Stagger invalidation to avoid refetch storm
      if (platform === 'shopify') {
        queryClient.invalidateQueries({ queryKey: ['shopify'] })
      } else if (platform === 'rdstation') {
        queryClient.invalidateQueries({ queryKey: ['rdstation'] })
      }

      // Connection status last, after a delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'connection-status'] })
      }, 2000)
    },
  })

  return { ...mutation, progress }
}

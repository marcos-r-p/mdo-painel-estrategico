// ─── Sync Mutation Hooks ─────────────────────────────────────
// Uses useMutation for sync operations with sequential step execution
// and progress tracking.

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { syncPlatformStep, SYNC_STEPS } from '../api/sync'
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
      const steps = SYNC_STEPS[platform] ?? []
      const results: Record<string, SyncResponse> = {}

      for (const step of steps) {
        setProgress((prev) => ({ ...prev, currentStep: step }))
        try {
          results[step] = await syncPlatformStep(platform, step)
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
      if (platform === 'shopify') {
        queryClient.invalidateQueries({ queryKey: ['shopify'] })
      } else if (platform === 'rdstation') {
        queryClient.invalidateQueries({ queryKey: ['rdstation'] })
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'connection-status'] })
    },
  })

  return { ...mutation, progress }
}

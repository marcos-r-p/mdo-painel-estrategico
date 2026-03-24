import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/userManagement'
import type { InviteUserPayload, UpdateUserPayload } from '../../types/userManagement'

export function useUsers(includeDeleted = false) {
  return useQuery({
    queryKey: ['users', { includeDeleted }],
    queryFn: () => api.listUsers(includeDeleted),
    staleTime: 60 * 1000,
  })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InviteUserPayload) => api.inviteUser(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }) },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => api.updateUser(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }) },
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.deactivateUser(userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }) },
  })
}

export function useReactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.reactivateUser(userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }) },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.deleteUser(userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }) },
  })
}

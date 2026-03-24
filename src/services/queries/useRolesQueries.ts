import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/roles'

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: api.listRoles,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nome, descricao, pageKeys }: { nome: string; descricao: string | null; pageKeys: string[] }) =>
      api.createRole(nome, descricao, pageKeys),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }) },
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, nome, descricao, pageKeys }: { roleId: string; nome: string; descricao: string | null; pageKeys: string[] }) =>
      api.updateRole(roleId, nome, descricao, pageKeys),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      qc.invalidateQueries({ queryKey: ['permissions'] })
    },
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (roleId: string) => api.deleteRole(roleId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }) },
  })
}

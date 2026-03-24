import { useState, useEffect } from 'react'
import { NAVIGATION_SECTIONS } from '../../lib/constants'
import { useCreateRole, useUpdateRole } from '../../services/queries/useRolesQueries'
import type { RoleWithPermissions } from '../../types/userManagement'

interface RoleModalProps {
  isOpen: boolean
  onClose: () => void
  role?: RoleWithPermissions | null
}

export default function RoleModal({ isOpen, onClose, role }: RoleModalProps) {
  const isEdit = !!role
  const createMutation = useCreateRole()
  const updateMutation = useUpdateRole()

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    if (role) {
      setNome(role.nome)
      setDescricao(role.descricao ?? '')
      setSelectedPages(new Set(role.permissions))
    } else {
      setNome('')
      setDescricao('')
      setSelectedPages(new Set())
    }
    setError('')
  }, [role, isOpen])

  if (!isOpen) return null

  const togglePage = (pageKey: string) => {
    const next = new Set(selectedPages)
    if (next.has(pageKey)) {
      if (pageKey === 'dashboard') return
      next.delete(pageKey)
    } else {
      next.add(pageKey)
    }
    setSelectedPages(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!nome.trim()) { setError('Nome é obrigatório'); return }
    const pageKeys = [...new Set([...selectedPages, 'dashboard'])]
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ roleId: role!.id, nome, descricao: descricao || null, pageKeys })
      } else {
        await createMutation.mutateAsync({ nome, descricao: descricao || null, pageKeys })
      }
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold dark:text-white mb-4">{isEdit ? 'Editar Role' : 'Novo Role'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">Nome</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Ex: vendas, marketing" />
          </div>
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">Descrição</label>
            <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Descrição opcional" />
          </div>
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Páginas permitidas ({selectedPages.size + (selectedPages.has('dashboard') ? 0 : 1)} de {NAVIGATION_SECTIONS.length})
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {NAVIGATION_SECTIONS.map((section) => {
                const pageKey = section.path.replace('/app/', '')
                const checked = pageKey === 'dashboard' || selectedPages.has(pageKey)
                return (
                  <label key={section.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm
                      ${checked ? 'bg-purple-500/10 dark:bg-purple-500/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                      ${pageKey === 'dashboard' ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <input type="checkbox" checked={checked} disabled={pageKey === 'dashboard'}
                      onChange={() => togglePage(pageKey)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                    <span className="dark:text-gray-300">{section.icon} {section.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
              {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

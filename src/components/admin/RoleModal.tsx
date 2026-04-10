import type React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { NAVIGATION_SECTIONS } from '../../lib/constants'
import { useCreateRole, useUpdateRole } from '../../services/queries/useRolesQueries'
import { useFocusTrap } from '../../hooks/useFocusTrap'
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
  const focusTrapRef = useFocusTrap(isOpen)

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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

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
  const modalTitle = isEdit ? 'Editar Role' : 'Novo Role'
  const titleId = 'role-modal-title'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6"
      >
        <h2 id={titleId} className="text-lg font-semibold dark:text-white mb-4">{modalTitle}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="role-nome" className="block text-sm font-medium dark:text-gray-300 mb-1">Nome</label>
            <input id="role-nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Ex: vendas, marketing" />
          </div>
          <div>
            <label htmlFor="role-descricao" className="block text-sm font-medium dark:text-gray-300 mb-1">Descrição</label>
            <input id="role-descricao" type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Descrição opcional" />
          </div>
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Páginas permitidas ({selectedPages.size + (selectedPages.has('dashboard') ? 0 : 1)} de {NAVIGATION_SECTIONS.length})
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto" role="group" aria-label="Páginas permitidas">
              {NAVIGATION_SECTIONS.map((section) => {
                const pageKey = section.path.replace('/app/', '')
                const checkboxId = `page-${pageKey}`
                const checked = pageKey === 'dashboard' || selectedPages.has(pageKey)
                return (
                  <label key={section.id} htmlFor={checkboxId}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm
                      ${checked ? 'bg-accent-500/10 dark:bg-accent-500/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                      ${pageKey === 'dashboard' ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <input id={checkboxId} type="checkbox" checked={checked} disabled={pageKey === 'dashboard'}
                      onChange={() => togglePage(pageKey)}
                      className="rounded border-gray-300 text-accent-600 focus:ring-accent-500" />
                    <span className="dark:text-gray-300">{section.ariaLabel ?? section.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
          {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm rounded-lg bg-accent-600 text-white hover:bg-accent-700 disabled:opacity-50">
              {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

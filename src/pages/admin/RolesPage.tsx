import { useState } from 'react'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useRoles, useDeleteRole } from '../../services/queries/useRolesQueries'
import RoleModal from '../../components/admin/RoleModal'
import { NAVIGATION_SECTIONS } from '../../lib/constants'
import type { RoleWithPermissions } from '../../types/userManagement'

export default function RolesPage() {
  useDocumentTitle('Roles')
  const { data: roles = [], isLoading } = useRoles()
  const deleteRole = useDeleteRole()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete'; item: RoleWithPermissions } | null>(null)

  const openCreate = () => {
    setEditingRole(null)
    setModalOpen(true)
  }

  const openEdit = (role: RoleWithPermissions) => {
    setEditingRole(role)
    setModalOpen(true)
  }

  const handleDelete = (role: RoleWithPermissions) => {
    if (role.user_count > 0) return
    setConfirmAction({ type: 'delete', item: role })
  }

  const executeConfirmAction = () => {
    if (!confirmAction) return
    deleteRole.mutate(confirmAction.item.id)
    setConfirmAction(null)
  }

  const adminRole = roles.find((r) => r.nome === 'admin')
  const otherRoles = roles.filter((r) => r.nome !== 'admin')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Roles e Permissões</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie os roles e as permissões de acesso às páginas
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          Novo Role
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role cards grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Admin card */}
          {adminRole && <AdminCard role={adminRole} />}

          {/* Custom role cards */}
          {otherRoles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onEdit={() => openEdit(role)}
              onDelete={() => handleDelete(role)}
              isDeleting={deleteRole.isPending && deleteRole.variables === role.id}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && roles.length === 0 && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">Nenhum role encontrado</p>
          <p className="text-sm mt-1">Crie o primeiro role clicando em "+ Novo Role"</p>
        </div>
      )}

      <RoleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        role={editingRole}
      />

      {/* Confirm Delete */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Excluir role
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Tem certeza que deseja excluir o role &quot;{confirmAction.item.nome}&quot;? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={executeConfirmAction}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Admin Card ──────────────────────────────────────────── */

function AdminCard({ role }: { role: RoleWithPermissions }) {
  return (
    <div className="border-2 border-purple-500 dark:border-purple-400 rounded-xl p-5 bg-purple-50 dark:bg-purple-900/10">
      {/* Card header */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔑</span>
          <h3 className="font-semibold text-purple-700 dark:text-purple-300 capitalize">{role.nome}</h3>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300">
          Sistema
        </span>
      </div>

      {/* User count */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {role.user_count} {role.user_count === 1 ? 'usuário' : 'usuários'}
      </p>

      {/* Notice */}
      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-4 italic">
        Acesso total — não editável
      </p>

      {/* All pages shown as granted */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {NAVIGATION_SECTIONS.map((section) => (
          <div key={section.id} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
            <span className="text-green-500 font-bold">✓</span>
            <span>{section.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Custom Role Card ────────────────────────────────────── */

interface RoleCardProps {
  role: RoleWithPermissions
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

function RoleCard({ role, onEdit, onDelete, isDeleting }: RoleCardProps) {
  const canDelete = role.user_count === 0 && !role.is_system

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      {/* Card header */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">🛡️</span>
          <h3 className="font-semibold text-gray-800 dark:text-white capitalize truncate">{role.nome}</h3>
          {role.is_system && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 shrink-0">
              Sistema
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Edit button */}
          <button
            onClick={onEdit}
            title="Editar role"
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <EditIcon />
          </button>

          {/* Delete button */}
          <div className="relative group">
            <button
              onClick={canDelete ? onDelete : undefined}
              disabled={!canDelete || isDeleting}
              title={canDelete ? 'Excluir role' : role.is_system ? 'Role de sistema não pode ser excluído' : 'Tem usuários atribuídos'}
              className={`p-1.5 rounded-lg transition-colors ${
                canDelete
                  ? 'text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 cursor-pointer'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              {isDeleting ? <SpinnerIcon /> : <TrashIcon />}
            </button>
            {/* Tooltip when disabled */}
            {!canDelete && (
              <div className="absolute right-0 top-full mt-1 z-10 hidden group-hover:block">
                <div className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                  {role.is_system ? 'Role de sistema' : 'Tem usuários atribuídos'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {role.descricao && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">{role.descricao}</p>
      )}

      {/* User count */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {role.user_count} {role.user_count === 1 ? 'usuário' : 'usuários'}
      </p>

      {/* Permission list */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {NAVIGATION_SECTIONS.map((section) => {
          const pageKey = section.path.replace('/app/', '')
          const hasAccess = role.permissions.includes(pageKey)
          return (
            <div
              key={section.id}
              className={`flex items-center gap-1.5 text-xs ${
                hasAccess ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              {hasAccess ? (
                <span className="text-green-500 font-bold">✓</span>
              ) : (
                <span className="text-red-400 font-bold">✗</span>
              )}
              <span>{section.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Icons ───────────────────────────────────────────────── */

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

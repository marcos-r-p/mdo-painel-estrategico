import { useState, useMemo } from 'react'
import { useUsers, useDeactivateUser, useReactivateUser, useDeleteUser } from '../../services/queries/useUserManagementQueries'
import { useRoles } from '../../services/queries/useRolesQueries'
import UserModal from '../../components/admin/UserModal'
import DeleteConfirmModal from '../../components/admin/DeleteConfirmModal'
import { useAuth } from '../../hooks/useAuth'
import type { UserProfile } from '../../types/database'

// ─── Avatar helpers ───────────────────────────────────────────

function getInitials(nome: string | null, email: string): string {
  if (nome && nome.trim()) {
    const parts = nome.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0][0].toUpperCase()
  }
  return email[0].toUpperCase()
}

function getAvatarColor(roleNome: string): string {
  const lower = roleNome.toLowerCase()
  if (lower === 'admin') return 'bg-purple-600'
  if (lower === 'leitor') return 'bg-gray-500'
  return 'bg-blue-600'
}

function getRoleBadge(roleNome: string): string {
  const lower = roleNome.toLowerCase()
  if (lower === 'admin') return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
  if (lower === 'leitor') return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
}

// ─── Icons ───────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
}

function BanIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────

type StatusFilter = 'todos' | 'ativo' | 'desativado'

export default function UsuariosPage() {
  const { user: currentUser } = useAuth()

  // Filters state
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ativo')
  const [includeDeleted, setIncludeDeleted] = useState(false)

  // Modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null)

  // Data
  const { data: users = [], isLoading, error } = useUsers(includeDeleted)
  const { data: roles = [] } = useRoles()

  // Mutations
  const deactivateMutation = useDeactivateUser()
  const reactivateMutation = useReactivateUser()
  const deleteMutation = useDeleteUser()

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchNome = u.nome?.toLowerCase().includes(q)
        const matchEmail = u.email.toLowerCase().includes(q)
        if (!matchNome && !matchEmail) return false
      }

      // Role filter
      if (roleFilter && u.role_id !== roleFilter) return false

      // Status filter
      if (statusFilter === 'ativo' && !u.ativo) return false
      if (statusFilter === 'desativado' && u.ativo) return false

      return true
    })
  }, [users, search, roleFilter, statusFilter])

  // Handlers
  function handleEditUser(user: UserProfile) {
    setSelectedUser(user)
    setIsUserModalOpen(true)
  }

  function handleNewUser() {
    setSelectedUser(null)
    setIsUserModalOpen(true)
  }

  function handleCloseUserModal() {
    setIsUserModalOpen(false)
    setSelectedUser(null)
  }

  async function handleDeactivate(user: UserProfile) {
    const confirmed = window.confirm(`Desativar o usuário "${user.nome ?? user.email}"?`)
    if (!confirmed) return
    await deactivateMutation.mutateAsync(user.id)
  }

  async function handleReactivate(user: UserProfile) {
    const confirmed = window.confirm(`Reativar o usuário "${user.nome ?? user.email}"?`)
    if (!confirmed) return
    await reactivateMutation.mutateAsync(user.id)
  }

  function handleDeleteClick(user: UserProfile) {
    setDeleteTarget(user)
  }

  function handleCloseDeleteModal() {
    setDeleteTarget(null)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Usuários</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie os usuários e suas permissões de acesso
          </p>
        </div>
        <button
          onClick={handleNewUser}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          Novo Usuário
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">Todos os roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.nome}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="ativo">Ativos</option>
          <option value="desativado">Desativados</option>
          <option value="todos">Todos</option>
        </select>

        {/* Include deleted toggle — only visible when status = todos */}
        {statusFilter === 'todos' && (
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
            <div
              onClick={() => setIncludeDeleted((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors ${includeDeleted ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${includeDeleted ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </div>
            Incluir deletados
          </label>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400 text-sm">
            Carregando usuários...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-red-500 text-sm">
            Erro ao carregar usuários.
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400 text-sm">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Último acesso</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredUsers.map((u) => {
                  const isCurrentUser = u.id === currentUser?.id
                  const initials = getInitials(u.nome, u.email)
                  const avatarColor = getAvatarColor(u.role_nome)
                  const roleBadge = getRoleBadge(u.role_nome)
                  const isDeactivating = deactivateMutation.isPending
                  const isReactivating = reactivateMutation.isPending

                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors ${u.deleted_at ? 'opacity-50' : ''}`}>
                      {/* Avatar + name + email */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex-shrink-0 w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-white font-semibold text-sm`}>
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium dark:text-white">
                              {u.nome ?? <span className="text-gray-400 italic">Sem nome</span>}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-purple-500 dark:text-purple-400">(você)</span>
                              )}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 text-xs">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role badge */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge}`}>
                          {u.role_nome}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${u.ativo ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className={`text-xs font-medium ${u.ativo ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {u.ativo ? 'Ativo' : 'Desativado'}
                          </span>
                        </div>
                      </td>

                      {/* Último acesso */}
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        —
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit */}
                          <button
                            onClick={() => handleEditUser(u)}
                            title="Editar usuário"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 dark:hover:text-purple-400 transition-colors"
                          >
                            <PencilIcon />
                          </button>

                          {/* Deactivate / Reactivate — hidden for current user */}
                          {!isCurrentUser && !u.deleted_at && (
                            u.ativo ? (
                              <button
                                onClick={() => handleDeactivate(u)}
                                disabled={isDeactivating}
                                title="Desativar usuário"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 dark:hover:text-orange-400 transition-colors disabled:opacity-40"
                              >
                                <BanIcon />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivate(u)}
                                disabled={isReactivating}
                                title="Reativar usuário"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors disabled:opacity-40"
                              >
                                <CheckCircleIcon />
                              </button>
                            )
                          )}

                          {/* Delete — hidden for current user */}
                          {!isCurrentUser && (
                            <button
                              onClick={() => handleDeleteClick(u)}
                              title="Deletar permanentemente"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {!isLoading && !error && filteredUsers.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* UserModal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={handleCloseUserModal}
        user={selectedUser}
      />

      {/* DeleteConfirmModal */}
      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={!!deleteTarget}
          onClose={handleCloseDeleteModal}
          onConfirm={() => deleteMutation.mutateAsync(deleteTarget.id)}
          userEmail={deleteTarget.email}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

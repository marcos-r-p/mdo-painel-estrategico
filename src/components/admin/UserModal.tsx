import { useState, useEffect } from 'react'
import { useRoles } from '../../services/queries/useRolesQueries'
import { useInviteUser, useUpdateUser } from '../../services/queries/useUserManagementQueries'
import type { UserProfile } from '../../types/database'

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  user?: UserProfile | null
}

export default function UserModal({ isOpen, onClose, user }: UserModalProps) {
  const isEdit = !!user
  const { data: roles } = useRoles()
  const inviteMutation = useInviteUser()
  const updateMutation = useUpdateUser()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setNome(user.nome ?? '')
      setEmail(user.email)
      setRoleId(user.role_id)
    } else {
      setNome('')
      setEmail('')
      setRoleId(roles?.[0]?.id ?? '')
      setSendEmail(true)
      setPassword('')
    }
    setError('')
  }, [user, isOpen, roles])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          user_id: user!.id,
          nome: nome || undefined,
          role_id: roleId || undefined,
        })
      } else {
        if (!email) { setError('Email é obrigatório'); return }
        if (!sendEmail && password.length < 6) {
          setError('Senha deve ter pelo menos 6 caracteres'); return
        }
        await inviteMutation.mutateAsync({
          email,
          nome: nome || undefined,
          role_id: roleId,
          send_email: sendEmail,
          password: sendEmail ? undefined : password,
        })
      }
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const isPending = inviteMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold dark:text-white mb-4">
          {isEdit ? 'Editar Usuário' : 'Novo Usuário'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">Nome</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Nome do usuário" />
          </div>
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isEdit}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">Role</label>
            <select value={roleId} onChange={(e) => setRoleId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              {roles?.map((r) => (<option key={r.id} value={r.id}>{r.nome}</option>))}
            </select>
          </div>
          {!isEdit && (
            <>
              <div className="flex items-center gap-3">
                <label className="text-sm dark:text-gray-300">Método:</label>
                <button type="button" onClick={() => setSendEmail(true)}
                  className={`px-3 py-1 text-sm rounded-lg ${sendEmail ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>
                  Convite por email
                </button>
                <button type="button" onClick={() => setSendEmail(false)}
                  className={`px-3 py-1 text-sm rounded-lg ${!sendEmail ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>
                  Senha manual
                </button>
              </div>
              {!sendEmail && (
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 mb-1">Senha</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Mínimo 6 caracteres" />
                </div>
              )}
            </>
          )}
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

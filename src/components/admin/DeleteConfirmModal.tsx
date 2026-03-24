import { useState } from 'react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  userEmail: string
  isPending: boolean
}

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, userEmail, isPending }: DeleteConfirmModalProps) {
  const [typed, setTyped] = useState('')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Deletar permanentemente</h2>
        <p className="text-sm dark:text-gray-300 mb-4">
          Esta ação é irreversível. O usuário e todos os seus dados serão removidos. Digite o email para confirmar:
        </p>
        <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded mb-3 dark:text-gray-300">{userEmail}</p>
        <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white mb-4"
          placeholder="Digite o email para confirmar" />
        <div className="flex justify-end gap-3">
          <button onClick={() => { setTyped(''); onClose() }} className="px-4 py-2 text-sm rounded-lg dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</button>
          <button onClick={async () => { await onConfirm(); setTyped(''); onClose() }}
            disabled={typed !== userEmail || isPending}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
            {isPending ? 'Deletando...' : 'Deletar'}
          </button>
        </div>
      </div>
    </div>
  )
}

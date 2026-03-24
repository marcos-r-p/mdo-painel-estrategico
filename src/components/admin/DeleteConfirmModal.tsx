import { useState, useEffect, useCallback } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  userEmail: string
  isPending: boolean
}

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, userEmail, isPending }: DeleteConfirmModalProps) {
  const [typed, setTyped] = useState('')
  const focusTrapRef = useFocusTrap(isOpen)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTyped('')
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const titleId = 'delete-confirm-modal-title'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" onClick={() => { setTyped(''); onClose() }} />
      <div
        ref={focusTrapRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby="delete-confirm-description"
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6"
      >
        <h2 id={titleId} className="text-lg font-semibold text-red-600 mb-2">Deletar permanentemente</h2>
        <p id="delete-confirm-description" className="text-sm dark:text-gray-300 mb-4">
          Esta ação é irreversível. O usuário e todos os seus dados serão removidos. Digite o email para confirmar:
        </p>
        <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded mb-3 dark:text-gray-300">{userEmail}</p>
        <label htmlFor="delete-confirm-email" className="sr-only">Digite o email para confirmar</label>
        <input id="delete-confirm-email" type="text" value={typed} onChange={(e) => setTyped(e.target.value)}
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

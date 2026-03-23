import { useState } from 'react'

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800 p-3 text-sm text-yellow-800 dark:text-yellow-200 flex items-center justify-between">
      <p>Dados de demonstração — conecte suas integrações para ver dados reais</p>
      <button
        onClick={() => setDismissed(true)}
        className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 text-sm font-medium ml-4"
      >
        Fechar
      </button>
    </div>
  )
}

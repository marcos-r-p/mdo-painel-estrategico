import { useMemo } from 'react'
import { usePeriodo } from '../../../services/queries/usePeriodoQueries'
import { formatCurrency } from '../../../lib/formatters'

export default function ResultBadge() {
  const { resumoMensal, mesSelecionado } = usePeriodo()

  const resultado = useMemo(() => {
    const resumoAtual = resumoMensal?.find((r) => r.mes === mesSelecionado)
    if (!resumoAtual) return null
    return (resumoAtual.receita_total || 0) - (resumoAtual.custo_total || 0)
  }, [resumoMensal, mesSelecionado])

  if (resultado == null) return null

  const isLucro = resultado >= 0

  return (
    <span
      className={`
        hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
        ${isLucro
          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
        }
      `}
    >
      {isLucro ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
        </svg>
      )}
      {formatCurrency(resultado)}
    </span>
  )
}

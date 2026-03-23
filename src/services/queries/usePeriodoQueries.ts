// ─── Periodo Composition Hook ────────────────────────────────
// Composes useResumoMensal + useDadosMes with periodo selection state.

import { useState, useEffect, useMemo } from 'react'
import { useResumoMensal, useDadosMes } from './useDashboardQueries'

export function usePeriodo() {
  const resumo = useResumoMensal()
  const meses = useMemo(() => resumo.data?.map((r) => r.mes) ?? [], [resumo.data])
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null)

  useEffect(() => {
    if (meses.length > 0 && !mesSelecionado) {
      setMesSelecionado(meses[0])
    }
  }, [meses, mesSelecionado])

  const dadosMes = useDadosMes(mesSelecionado)

  return {
    mesesDisponiveis: meses,
    mesSelecionado,
    setMesSelecionado,
    dadosMes: dadosMes.data,
    resumoMensal: resumo.data ?? [],
    isLoading: resumo.isLoading || dadosMes.isLoading,
  }
}

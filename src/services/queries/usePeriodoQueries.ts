// ─── Periodo Composition Hook ────────────────────────────────
// Composes useResumoMensal + useDadosMes with periodo selection state.

import { useState, useEffect, useMemo } from 'react'
import { useResumoMensal, useDadosMes } from './useDashboardQueries'

export function usePeriodo(fonte: string) {
  const resumo = useResumoMensal(fonte)
  const meses = useMemo(() => resumo.data?.map((r) => r.mes) ?? [], [resumo.data])
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null)

  // Reset selected month when fonte changes or when months load
  useEffect(() => {
    if (meses.length > 0) {
      setMesSelecionado(meses[0])
    } else {
      setMesSelecionado(null)
    }
  }, [meses])

  const dadosMes = useDadosMes(mesSelecionado, fonte)

  return {
    mesesDisponiveis: meses,
    mesSelecionado,
    setMesSelecionado,
    dadosMes: dadosMes.data,
    resumoMensal: resumo.data ?? [],
    isLoading: resumo.isLoading || dadosMes.isLoading,
  }
}

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function usePeriodoGlobal() {
  const [mesesDisponiveis, setMesesDisponiveis] = useState([])
  const [mesSelecionado, setMesSelecionado] = useState(null)
  const [dadosMes, setDadosMes] = useState(null)
  const [resumoMensal, setResumoMensal] = useState([])
  const [loadingPeriodo, setLoadingPeriodo] = useState(true)

  const carregarMeses = useCallback(async () => {
    setLoadingPeriodo(true)
    try {
      const { data: resumo, error } = await supabase
        .from('vw_resumo_mensal')
        .select('*')
        .order('mes', { ascending: false })

      if (error) {
        console.error('Erro ao carregar resumo mensal:', error)
        setLoadingPeriodo(false)
        return
      }

      setResumoMensal(resumo || [])

      const meses = (resumo || []).map(r => r.mes)
      setMesesDisponiveis(meses)

      if (meses.length > 0 && !mesSelecionado) {
        setMesSelecionado(meses[0])
      }
    } catch (err) {
      console.error('Erro ao carregar meses:', err)
    }
    setLoadingPeriodo(false)
  }, [mesSelecionado])

  const carregarDadosMes = useCallback(async (mes) => {
    if (!mes) return
    try {
      const [clientesRes, ufRes] = await Promise.all([
        supabase.from('vw_clientes_mes').select('*').eq('mes', mes),
        supabase.from('vw_uf_mensal').select('*').eq('mes', mes),
      ])

      setDadosMes({
        clientes: clientesRes.data || [],
        estados: ufRes.data || [],
      })
    } catch (err) {
      console.error('Erro ao carregar dados do mês:', err)
    }
  }, [])

  useEffect(() => { carregarMeses() }, [carregarMeses])

  useEffect(() => {
    if (mesSelecionado) {
      carregarDadosMes(mesSelecionado)
    }
  }, [mesSelecionado, carregarDadosMes])

  return {
    mesesDisponiveis,
    mesSelecionado,
    setMesSelecionado,
    dadosMes,
    resumoMensal,
    loadingPeriodo,
    recarregarMeses: carregarMeses,
  }
}

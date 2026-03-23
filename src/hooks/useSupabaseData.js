import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'

export function useSupabaseData() {
  const [dbData, setDbData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dbStatus, setDbStatus] = useState('conectando')

  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const [clientes, produtos, vendasEstado, vendasCanal, vendasPeriodo, custos, importacoes] = await Promise.all([
        db.getAll('clientes'), db.getAll('produtos'), db.getAll('vendas_estado'),
        db.getAll('vendas_canal'), db.getAll('vendas_periodo'), db.getAll('custos'), db.getAll('importacoes'),
      ])
      const temDados = clientes.length > 0 || produtos.length > 0
      if (temDados) {
        setDbData({ clientes, produtos, vendasEstado, vendasCanal, vendasPeriodo, custos, importacoes })
        setDbStatus('conectado')
      } else {
        setDbStatus('vazio')
      }
    } catch (err) {
      console.error('Erro ao carregar Supabase:', err)
      setDbStatus('offline')
    }
    setLoading(false)
  }, [])

  useEffect(() => { carregarDados() }, [carregarDados])

  return { dbData, loading, dbStatus, recarregar: carregarDados }
}

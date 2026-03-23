import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useShopifyData() {
  const [pedidos, setPedidos] = useState([])
  const [clientes, setClientes] = useState([])
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      try {
        const [pedidosRes, clientesRes, produtosRes] = await Promise.all([
          supabase.from('shopify_pedidos').select('*').limit(5000),
          supabase.from('shopify_clientes').select('*').limit(5000),
          supabase.from('shopify_produtos').select('*').limit(5000),
        ])

        setPedidos(pedidosRes.data || [])
        setClientes(clientesRes.data || [])
        setProdutos(produtosRes.data || [])
      } catch (err) {
        console.error('Erro ao carregar dados Shopify:', err)
      }
      setLoading(false)
    }

    carregar()
  }, [])

  return { pedidos, clientes, produtos, loading }
}

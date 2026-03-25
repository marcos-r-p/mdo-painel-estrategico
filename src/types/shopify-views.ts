// src/types/shopify-views.ts
// TypeScript interfaces for Shopify materialized view row shapes.

export interface ShopifyVendasMensal {
  mes: string
  pedidos: number
  receita: number
  ticket_medio: number
  descontos_total: number
}

export interface ShopifyRecorrencia {
  mes: string
  clientes_novos: number
  clientes_recorrentes: number
  taxa_recompra: number
}

export interface ShopifyProdutoRank {
  produto: string
  sku: string
  qtd_vendida: number
  receita_total: number
  preco_medio: number
  pedidos_distintos: number
}

export interface ShopifyCohort {
  cohort_mes: string
  mes_compra: string
  clientes: number
  receita: number
}

// src/types/crm.ts
// TypeScript interfaces for CRM materialized view row shapes.

export interface CrmFunilPeriodo {
  mes: string
  etapa: string
  qtd: number
  valor_total: number
  vendas: number
  perdas: number
  valor_vendas: number
}

export interface CrmEvolucaoMensal {
  mes: string
  criados: number
  vendidos: number
  perdidos: number
  valor_criado: number
  valor_vendido: number
  valor_perdido: number
}

export interface CrmPerda {
  motivo: string
  qtd: number
  valor_total: number
  percentual: number
}

export interface CrmResponsavel {
  responsavel: string
  total_deals: number
  vendas: number
  perdas: number
  taxa_conversao: number
  ticket_medio: number
  valor_total_vendas: number
}

export interface CrmOrigem {
  origem: string
  total: number
  convertidos: number
  taxa_conversao: number
  valor_convertido: number
}

export interface CrmDealParado {
  id: number
  deal_nome: string
  etapa: string
  valor: number
  responsavel: string | null
  created_at: string
  synced_at: string | null
  dias_parado: number
}

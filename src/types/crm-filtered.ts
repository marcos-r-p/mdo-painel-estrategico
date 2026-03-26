// src/types/crm-filtered.ts

export interface CrmLeadDiario {
  dia: string
  leads: number
}

export interface CrmLeadMensal {
  mes: string
  leads: number
}

export interface CrmCanal {
  canal: string
  total_leads: number
  vendas: number
  taxa_conversao: number
  valor_vendas: number
  ticket_medio: number | null
}

export interface CrmFunilFiltered {
  mes: string
  etapa: string
  qtd: number
  valor_total: number
  vendas: number
  perdas: number
  valor_vendas: number
}

export interface CrmEvolucaoFiltered {
  mes: string
  criados: number
  vendidos: number
  perdidos: number
  valor_criado: number
  valor_vendido: number
  valor_perdido: number
}

export interface CrmResponsavelFiltered {
  responsavel: string
  total_deals: number
  vendas: number
  perdas: number
  taxa_conversao: number
  ticket_medio: number | null
  valor_total_vendas: number
}

export interface CrmPerdaFiltered {
  motivo: string
  qtd: number
  valor_total: number
  percentual: number | null
}

export interface CrmFilteredData {
  leads_diario: CrmLeadDiario[]
  leads_mensal: CrmLeadMensal[]
  canais: CrmCanal[]
  funil: CrmFunilFiltered[]
  evolucao: CrmEvolucaoFiltered[]
  responsaveis: CrmResponsavelFiltered[]
  perdas: CrmPerdaFiltered[]
}

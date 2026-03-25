// src/lib/insights/types.ts

export type InsightType = 'alerta' | 'oportunidade' | 'tendencia'
export type Severity = 'critico' | 'atencao' | 'info'

export interface Insight {
  id: string
  type: InsightType
  severity: Severity
  titulo: string
  descricao: string
  metrica: {
    atual: number
    anterior?: number
    variacao?: number
  }
  recomendacao: string
  prioridade: number // 1-10, higher = more urgent
}

import { describe, it, expect } from 'vitest'
import { generateCrmInsights } from '../crm-insights'
import type { CrmFunilPeriodo, CrmEvolucaoMensal, CrmDealParado, CrmResponsavel, CrmOrigem, CrmPerda } from '../../../types/crm'

describe('generateCrmInsights', () => {
  it('returns only perdas-sem-motivo alert when all data is empty (empty perdas triggers rule)', () => {
    const result = generateCrmInsights({
      funil: [],
      evolucao: [],
      dealsParados: [],
      responsaveis: [],
      origens: [],
      perdas: [],
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('crm-perdas-sem-motivo')
  })

  it('generates critical alert for deals parados > 5', () => {
    const dealsParados: CrmDealParado[] = Array.from({ length: 8 }, (_, i) => ({
      id: i, deal_nome: `Deal ${i}`, etapa: 'Proposta', valor: 1000,
      responsavel: 'João', created_at: '2026-01-01', synced_at: '2026-01-01', dias_parado: 20,
    }))

    const result = generateCrmInsights({
      funil: [], evolucao: [], dealsParados, responsaveis: [], origens: [], perdas: [],
    })

    const alert = result.find(i => i.id === 'crm-deals-parados')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('critico')
    expect(alert!.metrica.atual).toBe(8)
  })

  it('generates alert when conversion drops > 20%', () => {
    const evolucao: CrmEvolucaoMensal[] = [
      { mes: '2026-02-01', criados: 100, vendidos: 20, perdidos: 30, valor_criado: 100000, valor_vendido: 20000, valor_perdido: 30000 },
      { mes: '2026-01-01', criados: 100, vendidos: 40, perdidos: 20, valor_criado: 100000, valor_vendido: 40000, valor_perdido: 20000 },
    ]

    const result = generateCrmInsights({
      funil: [], evolucao, dealsParados: [], responsaveis: [], origens: [], perdas: [],
    })

    const alert = result.find(i => i.id === 'crm-conversao-queda')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
  })

  it('generates opportunity for high-conversion origin', () => {
    const origens: CrmOrigem[] = [
      { origem: 'Google Ads', total: 50, convertidos: 20, taxa_conversao: 40, valor_convertido: 100000 },
    ]

    const result = generateCrmInsights({
      funil: [], evolucao: [], dealsParados: [], responsaveis: [], origens, perdas: [],
    })

    const opp = result.find(i => i.id === 'crm-origem-alta-conversao-Google Ads')
    expect(opp).toBeDefined()
    expect(opp!.type).toBe('oportunidade')
  })

  it('generates alert for seller with 0 sales', () => {
    const responsaveis: CrmResponsavel[] = [
      { responsavel: 'Maria', total_deals: 10, vendas: 0, perdas: 3, taxa_conversao: 0, ticket_medio: 0, valor_total_vendas: 0 },
    ]

    const result = generateCrmInsights({
      funil: [], evolucao: [], dealsParados: [], responsaveis, origens: [], perdas: [],
    })

    const alert = result.find(i => i.id === 'crm-vendedor-sem-vendas-Maria')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
  })

  it('generates alert for losses without reason (all entries are "Sem motivo")', () => {
    const perdas: CrmPerda[] = [
      { motivo: 'Sem motivo', qtd: 40, valor_total: 40000, percentual: 100 },
    ]

    const result = generateCrmInsights({
      funil: [], evolucao: [], dealsParados: [], responsaveis: [], origens: [], perdas,
    })

    const alert = result.find(i => i.id === 'crm-perdas-sem-motivo')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
    expect(alert!.titulo).toBe('Perdas sem motivo registrado')
  })

  it('does NOT generate perdas alert when real motivos exist alongside "Sem motivo"', () => {
    const perdas: CrmPerda[] = [
      { motivo: 'Sem motivo', qtd: 40, valor_total: 40000, percentual: 40 },
      { motivo: 'Preco', qtd: 60, valor_total: 60000, percentual: 60 },
    ]

    const result = generateCrmInsights({
      funil: [], evolucao: [], dealsParados: [], responsaveis: [], origens: [], perdas,
    })

    const alert = result.find(i => i.id === 'crm-perdas-sem-motivo')
    expect(alert).toBeUndefined()
  })

  it('generates opportunity when pipeline grows > 20%', () => {
    const funil: CrmFunilPeriodo[] = [
      { mes: '2026-01-01', etapa: 'Lead', qtd: 50, valor_total: 50000, vendas: 5, perdas: 2, valor_vendas: 5000 },
      { mes: '2026-01-01', etapa: 'Proposta', qtd: 30, valor_total: 30000, vendas: 3, perdas: 1, valor_vendas: 3000 },
      { mes: '2026-02-01', etapa: 'Lead', qtd: 70, valor_total: 70000, vendas: 7, perdas: 3, valor_vendas: 7000 },
      { mes: '2026-02-01', etapa: 'Proposta', qtd: 40, valor_total: 40000, vendas: 4, perdas: 2, valor_vendas: 4000 },
    ]

    const result = generateCrmInsights({
      funil, evolucao: [], dealsParados: [], responsaveis: [], origens: [], perdas: [],
    })

    const opp = result.find(i => i.id === 'crm-pipeline-crescendo')
    expect(opp).toBeDefined()
    expect(opp!.type).toBe('oportunidade')
  })
})

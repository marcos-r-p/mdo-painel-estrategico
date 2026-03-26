import { describe, it, expect } from 'vitest'
import { generateCrmInsights } from '../crm-insights'

const EMPTY_BASE = {
  funil: [],
  evolucao: [],
  dealsParados: [],
  responsaveis: [],
  origens: [],
  perdas: [],
}

describe('generateCrmInsights — new rules', () => {
  it('generates critico alert when >80% leads have no channel', () => {
    const canais = [
      { canal: 'Sem canal definido', total_leads: 90, vendas: 10, taxa_conversao: 11.1, valor_vendas: 5000, ticket_medio: 500 },
      { canal: 'Google Ads', total_leads: 10, vendas: 5, taxa_conversao: 50, valor_vendas: 3000, ticket_medio: 600 },
    ]
    const result = generateCrmInsights({ ...EMPTY_BASE, canais })
    const alert = result.find(i => i.id === 'crm-canal-sem-id')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('critico')
  })

  it('generates opportunity for high-conversion channel', () => {
    const canais = [
      { canal: 'Google Ads', total_leads: 10, vendas: 5, taxa_conversao: 50, valor_vendas: 5000, ticket_medio: 1000 },
      { canal: 'Sem canal definido', total_leads: 50, vendas: 2, taxa_conversao: 4, valor_vendas: 500, ticket_medio: 250 },
    ]
    const result = generateCrmInsights({ ...EMPTY_BASE, canais })
    const opp = result.find(i => i.id === 'crm-canal-alta-conversao-Google Ads')
    expect(opp).toBeDefined()
    expect(opp!.type).toBe('oportunidade')
  })

  it('generates alert for 3+ consecutive days without leads', () => {
    const leadsDiario = [
      { dia: '2026-03-01', leads: 10 },
      { dia: '2026-03-02', leads: 5 },
      // gap: 03, 04, 05 missing = 3 consecutive days
      { dia: '2026-03-06', leads: 8 },
    ]
    const result = generateCrmInsights({ ...EMPTY_BASE, leadsDiario })
    const alert = result.find(i => i.id === 'crm-leads-gap')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
  })

  it('generates tendencia for lead spike >2x average', () => {
    const leadsDiario = [
      { dia: '2026-03-01', leads: 10 },
      { dia: '2026-03-02', leads: 8 },
      { dia: '2026-03-03', leads: 12 },
      { dia: '2026-03-04', leads: 50 }, // >2x avg of ~20
    ]
    const result = generateCrmInsights({ ...EMPTY_BASE, leadsDiario })
    const trend = result.find(i => i.id === 'crm-leads-pico')
    expect(trend).toBeDefined()
    expect(trend!.type).toBe('tendencia')
  })

  it('generates alert when all perdas have "Sem motivo" (updated rule)', () => {
    const perdas = [
      { motivo: 'Sem motivo', qtd: 30, valor_total: 30000, percentual: 100 },
    ]
    const result = generateCrmInsights({ ...EMPTY_BASE, perdas })
    const alert = result.find(i => i.id === 'crm-perdas-sem-motivo')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
    expect(alert!.titulo).toBe('Perdas sem motivo registrado')
  })

  it('generates alert when perdas array is empty', () => {
    const result = generateCrmInsights({ ...EMPTY_BASE, perdas: [] })
    const alert = result.find(i => i.id === 'crm-perdas-sem-motivo')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
  })

  it('does NOT fire perdas rule when real motivos exist', () => {
    const perdas = [
      { motivo: 'Preço', qtd: 20, valor_total: 20000, percentual: 50 },
      { motivo: 'Sem motivo', qtd: 20, valor_total: 20000, percentual: 50 },
    ]
    const result = generateCrmInsights({ ...EMPTY_BASE, perdas })
    const alert = result.find(i => i.id === 'crm-perdas-sem-motivo')
    expect(alert).toBeUndefined()
  })
})

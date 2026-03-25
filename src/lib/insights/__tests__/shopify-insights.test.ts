import { describe, it, expect } from 'vitest'
import { generateShopifyInsights } from '../shopify-insights'
import type { ShopifyVendasMensal, ShopifyRecorrencia, ShopifyProdutoRank, ShopifyCohort } from '../../../types/shopify-views'

const EMPTY = { vendasMensal: [], recorrencia: [], produtosRank: [], cohort: [] }

describe('generateShopifyInsights', () => {
  it('returns empty array when all data is empty', () => {
    expect(generateShopifyInsights(EMPTY)).toEqual([])
  })

  it('generates alert when ticket medio drops > 15%', () => {
    const vendasMensal: ShopifyVendasMensal[] = [
      { mes: '2026-01-01', pedidos: 100, receita: 50000, ticket_medio: 500, descontos_total: 0 },
      { mes: '2026-02-01', pedidos: 100, receita: 40000, ticket_medio: 400, descontos_total: 0 },
    ]

    const result = generateShopifyInsights({ ...EMPTY, vendasMensal })
    const alert = result.find(i => i.id === 'shopify-ticket-queda')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
  })

  it('generates critical alert when recompra < 10%', () => {
    const recorrencia: ShopifyRecorrencia[] = [
      { mes: '2026-02-01', clientes_novos: 95, clientes_recorrentes: 5, taxa_recompra: 5 },
    ]

    const result = generateShopifyInsights({ ...EMPTY, recorrencia })
    const alert = result.find(i => i.id === 'shopify-recompra-baixa')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('critico')
  })

  it('generates opportunity for record revenue month (needs 3+ months)', () => {
    const vendasMensal: ShopifyVendasMensal[] = [
      { mes: '2025-12-01', pedidos: 70, receita: 30000, ticket_medio: 430, descontos_total: 0 },
      { mes: '2026-01-01', pedidos: 80, receita: 40000, ticket_medio: 500, descontos_total: 0 },
      { mes: '2026-02-01', pedidos: 100, receita: 60000, ticket_medio: 600, descontos_total: 0 },
    ]

    const result = generateShopifyInsights({ ...EMPTY, vendasMensal })
    const opp = result.find(i => i.id === 'shopify-receita-recorde')
    expect(opp).toBeDefined()
    expect(opp!.type).toBe('oportunidade')
  })

  it('generates critical alert when orders drop > 20%', () => {
    const vendasMensal: ShopifyVendasMensal[] = [
      { mes: '2026-01-01', pedidos: 100, receita: 50000, ticket_medio: 500, descontos_total: 0 },
      { mes: '2026-02-01', pedidos: 70, receita: 35000, ticket_medio: 500, descontos_total: 0 },
    ]

    const result = generateShopifyInsights({ ...EMPTY, vendasMensal })
    const alert = result.find(i => i.id === 'shopify-pedidos-queda')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('critico')
  })

  it('generates alert when top products are very close in ranking', () => {
    const produtosRank: ShopifyProdutoRank[] = [
      { produto: 'Camiseta A', sku: 'CA01', qtd_vendida: 100, receita_total: 10000, preco_medio: 100, pedidos_distintos: 90 },
      { produto: 'Camiseta B', sku: 'CB01', qtd_vendida: 98, receita_total: 9800, preco_medio: 100, pedidos_distintos: 88 },
      { produto: 'Camiseta C', sku: 'CC01', qtd_vendida: 50, receita_total: 5000, preco_medio: 100, pedidos_distintos: 45 },
    ]

    const result = generateShopifyInsights({ ...EMPTY, produtosRank })
    const alert = result.find(i => i.id === 'shopify-produto-ranking-apertado')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
  })

  it('generates opportunity for high-retention cohort', () => {
    const cohort: ShopifyCohort[] = [
      { cohort_mes: '2025-10-01', mes_compra: '2025-10-01', clientes: 100, receita: 50000 },
      { cohort_mes: '2025-10-01', mes_compra: '2025-11-01', clientes: 40, receita: 20000 },
      { cohort_mes: '2025-10-01', mes_compra: '2025-12-01', clientes: 30, receita: 15000 },
    ]

    const result = generateShopifyInsights({ ...EMPTY, cohort })
    const opp = result.find(i => i.id.startsWith('shopify-cohort-alta-retencao'))
    expect(opp).toBeDefined()
    expect(opp!.type).toBe('oportunidade')
  })
})

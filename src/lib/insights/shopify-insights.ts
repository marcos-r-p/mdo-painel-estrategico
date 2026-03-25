// src/lib/insights/shopify-insights.ts
import type { Insight } from './types'
import type {
  ShopifyVendasMensal, ShopifyRecorrencia,
  ShopifyProdutoRank, ShopifyCohort,
} from '../../types/shopify-views'

interface ShopifyInsightInput {
  vendasMensal: ShopifyVendasMensal[]
  recorrencia: ShopifyRecorrencia[]
  produtosRank: ShopifyProdutoRank[]
  cohort: ShopifyCohort[]
}

export function generateShopifyInsights(input: ShopifyInsightInput): Insight[] {
  const insights: Insight[] = []
  const sorted = [...input.vendasMensal].sort((a, b) => a.mes.localeCompare(b.mes))

  if (sorted.length >= 2) {
    const atual = sorted[sorted.length - 1]
    const anterior = sorted[sorted.length - 2]

    // Rule 1: Ticket medio drop > 15%
    if (anterior.ticket_medio > 0 && atual.ticket_medio < anterior.ticket_medio * 0.85) {
      insights.push({
        id: 'shopify-ticket-queda',
        type: 'alerta',
        severity: 'atencao',
        titulo: 'Ticket medio em queda',
        descricao: `Ticket medio caiu de R$ ${anterior.ticket_medio.toFixed(0)} para R$ ${atual.ticket_medio.toFixed(0)}.`,
        metrica: { atual: atual.ticket_medio, anterior: anterior.ticket_medio, variacao: atual.ticket_medio - anterior.ticket_medio },
        recomendacao: 'Ticket medio caiu, revisar mix de produtos e estrategia de pricing',
        prioridade: 7,
      })
    }

    // Rule 2: Orders drop > 20%
    if (anterior.pedidos > 0 && atual.pedidos < anterior.pedidos * 0.8) {
      insights.push({
        id: 'shopify-pedidos-queda',
        type: 'alerta',
        severity: 'critico',
        titulo: 'Queda de pedidos',
        descricao: `Pedidos cairam de ${anterior.pedidos} para ${atual.pedidos} (-${((1 - atual.pedidos / anterior.pedidos) * 100).toFixed(0)}%).`,
        metrica: { atual: atual.pedidos, anterior: anterior.pedidos, variacao: atual.pedidos - anterior.pedidos },
        recomendacao: `Pedidos cairam ${((1 - atual.pedidos / anterior.pedidos) * 100).toFixed(0)}%, investigar causa`,
        prioridade: 9,
      })
    }

    // Rule 3: Record revenue
    const maxReceita = Math.max(...sorted.slice(0, -1).map(v => v.receita))
    if (atual.receita > maxReceita && sorted.length >= 3) {
      insights.push({
        id: 'shopify-receita-recorde',
        type: 'oportunidade',
        severity: 'info',
        titulo: 'Receita recorde!',
        descricao: `Receita de R$ ${atual.receita.toFixed(0)} superou o recorde anterior de R$ ${maxReceita.toFixed(0)}.`,
        metrica: { atual: atual.receita, anterior: maxReceita },
        recomendacao: 'Receita recorde! Analisar o que mudou para replicar',
        prioridade: 4,
      })
    }
  }

  // Rule 4: Low repurchase rate (< 10%)
  if (input.recorrencia.length > 0) {
    const sortedRec = [...input.recorrencia].sort((a, b) => b.mes.localeCompare(a.mes))
    const ultimoMes = sortedRec[0]
    if (ultimoMes.taxa_recompra < 10) {
      insights.push({
        id: 'shopify-recompra-baixa',
        type: 'alerta',
        severity: 'critico',
        titulo: `Recompra em ${ultimoMes.taxa_recompra}%`,
        descricao: `Taxa de recompra esta em ${ultimoMes.taxa_recompra}%, abaixo do minimo de 10%.`,
        metrica: { atual: ultimoMes.taxa_recompra },
        recomendacao: 'Taxa de recompra baixa, implementar estrategia de pos-venda e fidelizacao',
        prioridade: 8,
      })
    }
  }

  // Rule 5: Top product losing ranking (close competition)
  if (input.produtosRank.length >= 3) {
    const top = input.produtosRank[0]
    const second = input.produtosRank[1]
    if (top.receita_total > 0 && second.receita_total / top.receita_total > 0.95) {
      insights.push({
        id: 'shopify-produto-ranking-apertado',
        type: 'alerta',
        severity: 'atencao',
        titulo: `${top.produto} quase perdendo #1`,
        descricao: `"${top.produto}" (R$ ${top.receita_total.toFixed(0)}) e "${second.produto}" (R$ ${second.receita_total.toFixed(0)}) estao muito proximos no ranking.`,
        metrica: { atual: top.receita_total, anterior: second.receita_total },
        recomendacao: `Produto "${top.produto}" esta quase perdendo posicao #1, avaliar estrategia`,
        prioridade: 5,
      })
    }
  }

  // Rule 6: Cohort with high retention (> 25%)
  if (input.cohort.length > 0) {
    const cohorts = [...new Set(input.cohort.map(c => c.cohort_mes))].sort()
    for (const cohortMes of cohorts) {
      const cohortRows = input.cohort.filter(c => c.cohort_mes === cohortMes).sort((a, b) => a.mes_compra.localeCompare(b.mes_compra))
      if (cohortRows.length >= 2) {
        const firstMonth = cohortRows[0]
        const lastMonth = cohortRows[cohortRows.length - 1]
        const retention = firstMonth.clientes > 0 ? (lastMonth.clientes / firstMonth.clientes) * 100 : 0
        if (retention > 25 && cohortRows.length >= 3) {
          insights.push({
            id: `shopify-cohort-alta-retencao-${cohortMes}`,
            type: 'oportunidade',
            severity: 'info',
            titulo: `Cohort ${cohortMes.slice(0, 7)} com ${retention.toFixed(0)}% retencao`,
            descricao: `Cohort de ${cohortMes.slice(0, 7)} mantem ${retention.toFixed(0)}% dos clientes apos ${cohortRows.length - 1} meses.`,
            metrica: { atual: retention },
            recomendacao: `Cohort de ${cohortMes.slice(0, 7)} tem ${retention.toFixed(0)}% retencao, analisar o que diferencia estes clientes`,
            prioridade: 4,
          })
          break
        }
      }
    }
  }

  return insights
}

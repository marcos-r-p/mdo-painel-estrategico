// src/lib/insights/crm-insights.ts
import type { Insight } from './types'
import type {
  CrmFunilPeriodo, CrmEvolucaoMensal, CrmDealParado,
  CrmResponsavel, CrmOrigem, CrmPerda,
} from '../../types/crm'

interface CrmInsightInput {
  funil: CrmFunilPeriodo[]
  evolucao: CrmEvolucaoMensal[]
  dealsParados: CrmDealParado[]
  responsaveis: CrmResponsavel[]
  origens: CrmOrigem[]
  perdas: CrmPerda[]
}

export function generateCrmInsights(input: CrmInsightInput): Insight[] {
  const insights: Insight[] = []

  // Rule 1: Deals parados > 5
  if (input.dealsParados.length > 5) {
    const top = input.dealsParados[0]
    insights.push({
      id: 'crm-deals-parados',
      type: 'alerta',
      severity: 'critico',
      titulo: `${input.dealsParados.length} deals parados`,
      descricao: `Existem ${input.dealsParados.length} deals abertos sem movimentacao. O mais antigo esta na etapa "${top?.etapa}" ha ${top?.dias_parado} dias.`,
      metrica: { atual: input.dealsParados.length },
      recomendacao: `Revisar os ${input.dealsParados.length} deals parados, priorizando a etapa "${top?.etapa}"`,
      prioridade: 9,
    })
  }

  // Rule 2: Conversion drop > 20% (needs at least 2 months)
  if (input.evolucao.length >= 2) {
    const sorted = [...input.evolucao].sort((a, b) => b.mes.localeCompare(a.mes))
    const atual = sorted[0]
    const anterior = sorted[1]
    const convAtual = atual.criados > 0 ? (atual.vendidos / atual.criados) * 100 : 0
    const convAnterior = anterior.criados > 0 ? (anterior.vendidos / anterior.criados) * 100 : 0

    if (convAnterior > 0 && convAtual < convAnterior * 0.8) {
      insights.push({
        id: 'crm-conversao-queda',
        type: 'alerta',
        severity: 'atencao',
        titulo: 'Conversao em queda',
        descricao: `Taxa de conversao caiu de ${convAnterior.toFixed(1)}% para ${convAtual.toFixed(1)}%.`,
        metrica: { atual: convAtual, anterior: convAnterior, variacao: convAtual - convAnterior },
        recomendacao: `Conversao caiu de ${convAnterior.toFixed(1)}% para ${convAtual.toFixed(1)}%, verificar qualificacao de leads`,
        prioridade: 8,
      })
    }
  }

  // Rule 3: Seller with 0 sales (only if has deals)
  for (const resp of input.responsaveis) {
    if (resp.vendas === 0 && resp.total_deals > 0) {
      insights.push({
        id: `crm-vendedor-sem-vendas-${resp.responsavel}`,
        type: 'alerta',
        severity: 'atencao',
        titulo: `${resp.responsavel} sem vendas`,
        descricao: `${resp.responsavel} tem ${resp.total_deals} deals mas nenhuma venda fechada.`,
        metrica: { atual: 0 },
        recomendacao: `Vendedor ${resp.responsavel} sem fechamento, avaliar pipeline e suporte`,
        prioridade: 6,
      })
    }
  }

  // Rule 4: High-conversion origin (> 30%)
  for (const origem of input.origens) {
    if (origem.taxa_conversao > 30 && origem.total >= 5) {
      insights.push({
        id: `crm-origem-alta-conversao-${origem.origem}`,
        type: 'oportunidade',
        severity: 'info',
        titulo: `${origem.origem} converte ${origem.taxa_conversao}%`,
        descricao: `Canal "${origem.origem}" tem taxa de conversao de ${origem.taxa_conversao}% com ${origem.total} leads.`,
        metrica: { atual: origem.taxa_conversao },
        recomendacao: `Canal ${origem.origem} converte ${origem.taxa_conversao}%, considerar investir mais`,
        prioridade: 5,
      })
    }
  }

  // Rule 5: Losses without reason > 30%
  const semMotivo = input.perdas.find(p => p.motivo === 'Sem motivo')
  if (semMotivo && semMotivo.percentual > 30) {
    insights.push({
      id: 'crm-perdas-sem-motivo',
      type: 'alerta',
      severity: 'atencao',
      titulo: `${semMotivo.percentual}% perdas sem motivo`,
      descricao: `${semMotivo.percentual}% das perdas nao tem motivo registrado (${semMotivo.qtd} deals).`,
      metrica: { atual: semMotivo.percentual },
      recomendacao: `${semMotivo.percentual}% das perdas sem motivo registrado, treinar equipe para documentar`,
      prioridade: 7,
    })
  }

  // Rule 6: Pipeline crescendo (> 20% more deals than previous month)
  if (input.funil.length > 0) {
    const meses = [...new Set(input.funil.map(f => f.mes))].sort()
    if (meses.length >= 2) {
      const mesAtual = meses[meses.length - 1]
      const mesAnterior = meses[meses.length - 2]
      const qtdAtual = input.funil.filter(f => f.mes === mesAtual).reduce((a, f) => a + f.qtd, 0)
      const qtdAnterior = input.funil.filter(f => f.mes === mesAnterior).reduce((a, f) => a + f.qtd, 0)

      if (qtdAnterior > 0 && qtdAtual > qtdAnterior * 1.2) {
        insights.push({
          id: 'crm-pipeline-crescendo',
          type: 'oportunidade',
          severity: 'info',
          titulo: 'Pipeline em crescimento',
          descricao: `Pipeline cresceu de ${qtdAnterior} para ${qtdAtual} deals (+${((qtdAtual / qtdAnterior - 1) * 100).toFixed(0)}%).`,
          metrica: { atual: qtdAtual, anterior: qtdAnterior, variacao: qtdAtual - qtdAnterior },
          recomendacao: `Pipeline cresceu ${((qtdAtual / qtdAnterior - 1) * 100).toFixed(0)}%, bom momento para acelerar conversoes`,
          prioridade: 5,
        })
      }
    }
  }

  return insights
}

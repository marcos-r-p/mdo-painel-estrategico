// src/lib/insights/crm-insights.ts
import type { Insight } from './types'
import type {
  CrmFunilPeriodo, CrmEvolucaoMensal, CrmDealParado,
  CrmResponsavel, CrmOrigem, CrmPerda,
} from '../../types/crm'
import type { CrmCanal, CrmLeadDiario } from '../../types/crm-filtered'

interface CrmInsightInput {
  funil: CrmFunilPeriodo[]
  evolucao: CrmEvolucaoMensal[]
  dealsParados: CrmDealParado[]
  responsaveis: CrmResponsavel[]
  origens: CrmOrigem[]
  perdas: CrmPerda[]
  canais?: CrmCanal[]
  leadsDiario?: CrmLeadDiario[]
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

  // Rule 5: Perdas sem motivo (updated — fires when array is empty OR all are "Sem motivo")
  const allSemMotivo = input.perdas.length === 0 || input.perdas.every(p => p.motivo === 'Sem motivo')
  if (allSemMotivo) {
    const totalPerdas = input.perdas.reduce((a, p) => a + p.qtd, 0)
    insights.push({
      id: 'crm-perdas-sem-motivo',
      type: 'alerta',
      severity: 'atencao',
      titulo: 'Perdas sem motivo registrado',
      descricao: totalPerdas > 0
        ? `Nenhuma perda possui motivo registrado (${totalPerdas} deals perdidos).`
        : 'Nenhum motivo de perda registrado no periodo.',
      metrica: { atual: 100 },
      recomendacao: 'Configure motivos de perda no RD Station para analisar por que os deals são perdidos',
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

  // Rule 7: Canal sem identificação (>80% leads)
  if (input.canais && input.canais.length > 0) {
    const totalLeads = input.canais.reduce((a, c) => a + c.total_leads, 0)
    const semCanal = input.canais.find(c => c.canal === 'Sem canal definido')
    if (semCanal && totalLeads > 0 && (semCanal.total_leads / totalLeads) * 100 > 80) {
      const pct = Math.round((semCanal.total_leads / totalLeads) * 100)
      insights.push({
        id: 'crm-canal-sem-id',
        type: 'alerta',
        severity: 'critico',
        titulo: `${pct}% dos leads sem canal`,
        descricao: `${pct}% dos leads (${semCanal.total_leads} de ${totalLeads}) nao tem canal de origem identificado.`,
        metrica: { atual: pct },
        recomendacao: 'Configure UTMs obrigatorios no RD Station para rastrear ROI por canal',
        prioridade: 9,
      })
    }

    // Rule 8: Canal com alta conversão (>30%, >=5 leads, not "Sem canal definido")
    for (const canal of input.canais) {
      if (canal.canal !== 'Sem canal definido' && canal.taxa_conversao > 30 && canal.total_leads >= 5) {
        insights.push({
          id: `crm-canal-alta-conversao-${canal.canal}`,
          type: 'oportunidade',
          severity: 'info',
          titulo: `${canal.canal} converte ${canal.taxa_conversao}%`,
          descricao: `Canal "${canal.canal}" tem ${canal.taxa_conversao}% de conversao com ${canal.total_leads} leads.`,
          metrica: { atual: canal.taxa_conversao },
          recomendacao: `Canal ${canal.canal} converte ${canal.taxa_conversao}%, considerar investir mais`,
          prioridade: 5,
        })
      }
    }
  }

  // Rule 9: Dias sem leads (3+ consecutive calendar days without leads)
  if (input.leadsDiario && input.leadsDiario.length >= 2) {
    const sorted = [...input.leadsDiario].sort((a, b) => a.dia.localeCompare(b.dia))
    let maxGap = 0
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].dia)
      const curr = new Date(sorted[i].dia)
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)) - 1
      if (diffDays > maxGap) maxGap = diffDays
    }
    if (maxGap >= 3) {
      insights.push({
        id: 'crm-leads-gap',
        type: 'alerta',
        severity: 'atencao',
        titulo: `${maxGap} dias sem leads`,
        descricao: `Houve um periodo de ${maxGap} dias consecutivos sem nenhum lead no periodo selecionado.`,
        metrica: { atual: maxGap },
        recomendacao: `${maxGap} dias sem leads, verificar se campanhas estavam ativas`,
        prioridade: 6,
      })
    }
  }

  // Rule 10: Pico de leads (dia com >2x a média)
  if (input.leadsDiario && input.leadsDiario.length >= 3) {
    const avg = input.leadsDiario.reduce((a, d) => a + d.leads, 0) / input.leadsDiario.length
    const pico = input.leadsDiario.reduce((best, d) => d.leads > best.leads ? d : best, input.leadsDiario[0])
    if (avg > 0 && pico.leads > avg * 2) {
      insights.push({
        id: 'crm-leads-pico',
        type: 'tendencia',
        severity: 'info',
        titulo: `Pico: ${pico.leads} leads em ${pico.dia}`,
        descricao: `Dia ${pico.dia} teve ${pico.leads} leads, mais de 2x a media de ${avg.toFixed(0)} leads/dia.`,
        metrica: { atual: pico.leads, anterior: avg },
        recomendacao: `Investigar o que causou o pico de ${pico.leads} leads em ${pico.dia}`,
        prioridade: 3,
      })
    }
  }

  return insights
}

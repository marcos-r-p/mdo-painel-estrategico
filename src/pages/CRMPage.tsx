import { useCRMDashboard } from '../services/queries/useRDStationQueries'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { CRM_SEED } from '../data/seed'
import DemoBanner from '../components/ui/DemoBanner'
import Spinner from '../components/ui/Spinner'
import KPICard from '../components/ui/KPICard'
import Badge from '../components/ui/Badge'
import { formatCurrency } from '../lib/formatters'
import type { CRMData } from '../types/domain'

// ── Shared props for all sub-sections ───────────────────────
interface CRMSectionProps {
  crm: CRMData
}

/* ═══════════════════════════════════════════════════════════════
   1. KPIs DO FUNIL
   ═══════════════════════════════════════════════════════════════ */
function SecaoCRMKPIs({ crm }: CRMSectionProps) {
  const etapaOrcamento = crm.etapas?.find(e => e.nome.toLowerCase().includes('orc'))
  const valorOrcamento = etapaOrcamento?.valor ?? 225790.74
  const qtdOrcamento = etapaOrcamento?.qtd ?? 221

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        Snapshot do funil
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <KPICard label="Pipeline total" value={formatCurrency(crm.valorPipeline ?? 473557)}
          subvalue={`${crm.totalNegociacoes ?? 869} negociações`} color="orange" />
        <KPICard label="Conversão geral" value={`${crm.taxaConversaoGeral ?? 39}%`}
          subvalue="histórico completo" trend="down" color="red" />
        <KPICard label="Perdido (6 meses)"
          value={formatCurrency(crm.evolucaoMensal ? crm.evolucaoMensal.reduce((a, m) => a + m.valorPerdido, 0) : 323996)}
          subvalue="490 negociações" trend="down" color="red" />
        <KPICard label="Ticket médio CRM" value={formatCurrency(crm.ticketMedioMesAtual ?? 289)}
          subvalue="vs R$177 no site" trend="up" color="green" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Orçamentos parados"
          value={formatCurrency(valorOrcamento)}
          subvalue={`${qtdOrcamento} negociações`} color="red" />
        <KPICard label="Mar/26 — perdido" value="R$ 151,8k"
          subvalue="149 perdidas em 23 dias" trend="down" color="red" />
        <KPICard label="Mar/26 — vendido" value="R$ 24,3k"
          subvalue="relação 6:1 perda/venda" trend="down" color="red" />
        <KPICard label="Ciclo de venda" value={`${crm.cicloVendaDias ?? 7} dias`}
          subvalue={`vs ${crm.cicloPercaDias ?? 10}d para perder`} color="gray" />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   2. FUNIL VISUAL COM BARRAS PROPORCIONAIS
   ═══════════════════════════════════════════════════════════════ */
function SecaoCRMFunil({ crm }: CRMSectionProps) {
  const etapas = crm.etapas ?? []
  const maxQtd = Math.max(...etapas.map(e => e.qtd), 1)

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        Funil — conversão por etapa
      </h2>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <div className="space-y-3">
          {etapas.map((etapa, i) => {
            const isGargalo = etapa.taxaAvanco != null && etapa.taxaAvanco < 70
            return (
              <div key={i} className={`p-3 rounded-lg ${isGargalo ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${isGargalo ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {etapa.nome}
                    {isGargalo && <span className="ml-2 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">Gargalo</span>}
                  </span>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{etapa.qtd} negociações</span>
                    <span>{formatCurrency(etapa.valor ?? 0)}</span>
                    {etapa.taxaAvanco != null && (
                      <span className={`font-medium ${isGargalo ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {etapa.taxaAvanco}% avançam
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${isGargalo ? 'bg-red-500' : 'bg-green-500'} rounded-full transition-all duration-700`}
                    style={{ width: `${(etapa.qtd / maxQtd) * 100}%` }}
                  />
                </div>
                {(etapa.perdas > 0 || etapa.vendas > 0) && (
                  <div className="flex gap-4 mt-1.5 text-xs">
                    <span className="text-red-500 dark:text-red-400">{etapa.perdas} perdas</span>
                    <span className="text-green-500 dark:text-green-400">{etapa.vendas} vendas</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   3. MOTIVOS DE PERDA
   ═══════════════════════════════════════════════════════════════ */
function SecaoCRMPerdas({ crm }: CRMSectionProps) {
  const motivos = crm.motivosPerda ?? []

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        Motivos de perda — últimos 6 meses
      </h2>

      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
        <p className="text-red-700 dark:text-red-300 text-sm font-medium">
          43% das perdas = &quot;Sem Resposta&quot; — follow-up ausente
        </p>
        <p className="text-red-600 dark:text-red-400 text-xs mt-1">
          211 negociações perdidas nos últimos 6 meses por falta de retorno ativo. Solução: automação D+1 e D+3 no RD Station.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Motivo</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Qtd</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-48">%</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {motivos.map((m, i) => {
              const isCritico = m.percentual >= 20
              const isAlerta = m.percentual >= 5 && m.percentual < 20
              return (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                    {isCritico && <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2" />}
                    {isAlerta && <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2" />}
                    {!isCritico && !isAlerta && <span className="inline-block w-2 h-2 rounded-full bg-gray-300 mr-2" />}
                    {m.motivo}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{m.qtd}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isCritico ? 'bg-red-500' : isAlerta ? 'bg-yellow-500' : 'bg-gray-400'}`}
                          style={{ width: `${m.percentual}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-8">{m.percentual}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {m.motivo.includes('Resposta') && 'Automação follow-up D+1/D+3'}
                    {m.motivo.includes('orçamento') && 'Técnica de fechamento + urgência'}
                    {m.motivo.includes('Duplicada') && 'Deduplicação semanal no RD'}
                    {m.motivo.includes('Telefone') && 'Tornar telefone obrigatório'}
                    {m.motivo.includes('Preço') && 'Reforçar diferencial (laudo + origem)'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   4. EVOLUÇÃO MENSAL
   ═══════════════════════════════════════════════════════════════ */
function SecaoCRMEvolucao({ crm }: CRMSectionProps) {
  const evolucao = crm.evolucaoMensal ?? []

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        Evolução mensal — valor vendido vs perdido
      </h2>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Mês</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Criadas</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendidas</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Perdidas</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendido (R$)</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Perdido (R$)</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ratio P/V</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {evolucao.filter(m => m.vendidas > 0 || m.perdidas > 0).map((m, i) => {
              const ratio = m.vendidas > 0 ? (m.perdidas / m.vendidas).toFixed(1) : '—'
              const ratioNum = parseFloat(ratio)
              const isCritico = !isNaN(ratioNum) && ratioNum > 2.5
              return (
                <tr key={i} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition ${isCritico ? 'bg-red-50 dark:bg-red-950' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{m.mes}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{m.criadas}</td>
                  <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-medium">{m.vendidas}</td>
                  <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-medium">{m.perdidas}</td>
                  <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{formatCurrency(m.valorVendido)}</td>
                  <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{formatCurrency(m.valorPerdido)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isCritico ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                      {ratio}:1
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   5. PERFORMANCE POR RESPONSÁVEL
   ═══════════════════════════════════════════════════════════════ */
function SecaoCRMResponsaveis({ crm }: CRMSectionProps) {
  const responsaveis = crm.responsaveis ?? []

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        Performance por responsável
      </h2>

      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
        <p className="text-red-700 dark:text-red-300 text-sm font-medium">
          100% das negociações — Arnaldo Quagliato (últimos 6 meses)
        </p>
        <p className="text-red-600 dark:text-red-400 text-xs mt-1">
          Risco operacional máximo. Qualquer ausência paralisa completamente as vendas.
          Prioridade: treinar ao menos 1 pessoa para operar o funil do WhatsApp.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Responsável</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Criadas</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendidas</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Conversão</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ticket médio</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Valor vendido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {responsaveis.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{r.nome}</td>
                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{r.criadas}</td>
                <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{r.vendidas}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.taxaConversao >= 40 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : r.taxaConversao > 0 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    {r.taxaConversao > 0 ? `${r.taxaConversao}%` : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                  {r.ticketMedio > 0 ? formatCurrency(r.ticketMedio) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                  {r.valorVendido > 0 ? formatCurrency(r.valorVendido) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   6. ORIGENS DOS LEADS
   ═══════════════════════════════════════════════════════════════ */
function SecaoCRMOrigens({ crm }: CRMSectionProps) {
  const origens = crm.origens ?? []

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        Origem dos leads
      </h2>

      <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-4">
        <p className="text-orange-700 dark:text-orange-300 text-sm font-medium">
          80% das origens = &quot;Desconhecido&quot; — sem ROI mensurável
        </p>
        <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
          Configurar UTMs obrigatórios no WhatsApp, Instagram e Google Ads.
          Sem isso, impossível saber qual canal traz os leads que convertem.
        </p>
      </div>

      <div className="space-y-2">
        {origens.map((o, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-44 flex-shrink-0 text-right">{o.fonte}</span>
            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
              <div
                className={`h-full ${o.fonte === 'Desconhecido' ? 'bg-red-400' : 'bg-blue-400'} flex items-center px-2 transition-all duration-700`}
                style={{ width: `${o.percent}%`, minWidth: '30px' }}
              >
                <span className="text-xs text-white font-medium">{o.qtd}</span>
              </div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 w-8">{o.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   7. SAÚDE DO CRM
   ═══════════════════════════════════════════════════════════════ */
function SecaoCRMSaude({ crm }: CRMSectionProps) {
  const { saude } = crm
  if (!saude) return null

  const statusColor: Record<string, string> = {
    ok: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
    alerta: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
    critico: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
  }

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        Saúde do CRM — score geral: {saude.scoreGeral}/10
      </h2>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <div className="space-y-3">
          {saude.dimensoes.map((d, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">{d.nome}</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${d.status === 'ok' ? 'bg-green-500' : d.status === 'alerta' ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${d.score * 10}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-right">{d.score}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[d.status] ?? ''}`}>
                  {d.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   8. PLANO DE AÇÃO CRM PRIORIZADO
   ═══════════════════════════════════════════════════════════════ */
function SecaoCRMAcoes({ crm }: CRMSectionProps) {
  const acoes = [
    {
      prioridade: 1, urgencia: 'critico' as const, prazo: 'Hoje',
      titulo: 'Automação follow-up em Orçamento Realizado',
      impacto: `R$ 225.790 parados em ${crm.etapas?.find(e => e.nome?.includes('Or'))?.qtd ?? 221} negociações`,
      acao: 'Criar fluxo RD: Orçamento Enviado → sem resposta 24h → mensagem automática. 3 tentativas.',
      responsavel: 'Marcos configura no RD'
    },
    {
      prioridade: 2, urgencia: 'critico' as const, prazo: 'Esta semana',
      titulo: 'Tornar "Fonte" obrigatório no cadastro de lead',
      impacto: '80% dos leads sem origem — Webi fatura R$ 8.850/mês sem ROI rastreável',
      acao: 'Configurações RD → Campos obrigatórios → Fonte. Criar opções: WhatsApp, Instagram, Google, Indicação.',
      responsavel: 'Marcos configura no RD'
    },
    {
      prioridade: 3, urgencia: 'critico' as const, prazo: 'Esta semana',
      titulo: 'Script de recuperação para os 211 "Sem Resposta"',
      impacto: 'Recuperar 15% = +R$ 8.700/mês. Sobre 6 meses acumulado = +R$ 48k',
      acao: 'Filtrar perdas com motivo "Sem Resposta" → campanha WhatsApp de reativação com cupom 10%.',
      responsavel: 'Arnaldo executa'
    },
    {
      prioridade: 4, urgencia: 'alto' as const, prazo: '30 dias',
      titulo: 'Treinar 1 pessoa para operar o funil do WhatsApp',
      impacto: '100% dependência de Arnaldo — risco operacional máximo',
      acao: 'Playbook de atendimento já pronto. Treinar 1 atendente para cobrir etapas iniciais do funil.',
      responsavel: 'Arnaldo + novo atendente'
    },
    {
      prioridade: 5, urgencia: 'alto' as const, prazo: '30 dias',
      titulo: 'Deduplicar 23 negociações com motivo "Duplicada"',
      impacto: 'Ruído nos indicadores de perda — taxa real melhor que os 39% aparentes',
      acao: 'Filtrar motivo "Duplicada" → mesclar ou excluir → recalcular taxa de conversão real.',
      responsavel: 'Marcos / operação'
    },
  ]

  const corUrgencia: Record<string, string> = {
    critico: 'bg-red-500',
    alto: 'bg-orange-500',
    medio: 'bg-yellow-500'
  }

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        Plano de ação CRM — priorizado
      </h2>

      <div className="space-y-3">
        {acoes.map((a, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex gap-4">
            <div className={`w-8 h-8 rounded-full ${corUrgencia[a.urgencia]} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}>
              {a.prioridade}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{a.titulo}</p>
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.urgencia === 'critico' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'}`}>
                    {a.urgencia}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                    {a.prazo}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{a.impacto}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5">{a.acao}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Responsável: {a.responsavel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — CRMPage
   ═══════════════════════════════════════════════════════════════ */
export default function CRMPage() {
  useDocumentTitle('CRM')
  const { data: crmData, isLoading } = useCRMDashboard()

  const crm: CRMData = crmData ?? CRM_SEED
  const isDemoData = !crmData

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header com status */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Performance CRM
          </h1>
          <Badge type={isDemoData ? 'medio' : 'positivo'}>
            {isDemoData ? 'Dados demo' : 'RD Station ao vivo'}
          </Badge>
        </div>
      </div>

      {isDemoData && <DemoBanner />}

      {/* 8 Seções de análise */}
      <SecaoCRMKPIs crm={crm} />
      <SecaoCRMFunil crm={crm} />
      <SecaoCRMPerdas crm={crm} />
      <SecaoCRMEvolucao crm={crm} />
      <SecaoCRMResponsaveis crm={crm} />
      <SecaoCRMOrigens crm={crm} />
      <SecaoCRMSaude crm={crm} />
      <SecaoCRMAcoes crm={crm} />
    </div>
  )
}

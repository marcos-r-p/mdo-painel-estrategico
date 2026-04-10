import { useState, useMemo } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { DADOS } from '../data/seed'
import { formatCurrency, formatNumber, formatPercent } from '../lib/formatters'
import SectionCard from '../components/ui/SectionCard'
import Badge from '../components/ui/Badge'
import type { BadgeType } from '../types/domain'
import Spinner from '../components/ui/Spinner'
import { useShopifyVendasMensal, useShopifyRecorrencia, useShopifyProdutosRank } from '../services/queries/useShopifyQueries'
import { useReceitaPorUF, useComparativo } from '../services/queries/useFinancialQueries'
import { useCRMDashboard } from '../services/queries/useRDStationQueries'

// ─── Types ───
interface CRMInfo {
  criadas: number
  vendidas: number
  perdidas: number
  valorPerdido: number
  valorVendido: number
  ticketCRM: number
  ticketSite: number
  baseClientes: number
  taxaRecompra: number
}

interface ScoreItem {
  nome: string
  score: number
  desc: string
}

interface GapItem {
  urgencia: string
  titulo: string
  impacto: number
  acao: string
  prazo: string
}

interface SimState {
  taxaConversao: number
  recuperacaoCRM: number
  reativacaoBase: number
  clientesB2B: number
  ticketB2B: number
  crescimentoOrganico: number
  [key: string]: number
}

/* ─── Score helpers ─── */
const scoreBg = (v: number): string =>
  v <= 4
    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
    : v <= 6
      ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
      : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
const scoreText = (v: number): string =>
  v <= 4
    ? 'text-red-600 dark:text-red-400'
    : v <= 6
      ? 'text-orange-500 dark:text-orange-400'
      : 'text-green-600 dark:text-green-400'
const scoreBarBg = (v: number): string =>
  v <= 4 ? 'bg-red-500' : v <= 6 ? 'bg-orange-400' : 'bg-green-500'

/* ─── CRM Fallback ─── */
const CRM_FALLBACK: CRMInfo = {
  criadas: 284, vendidas: 132, perdidas: 266,
  valorPerdido: 169000, valorVendido: 58935,
  ticketCRM: 447, ticketSite: 177,
  baseClientes: 49088, taxaRecompra: 44.2
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCRMData(crmDashData: any): CRMInfo {
  if (!crmDashData || !crmDashData.total_criadas) return CRM_FALLBACK
  return {
    criadas: crmDashData.total_criadas as number,
    vendidas: crmDashData.total_vendidas as number,
    perdidas: crmDashData.total_perdidas as number,
    valorPerdido: crmDashData.valor_perdido as number,
    valorVendido: crmDashData.valor_vendido as number,
    ticketCRM: crmDashData.ticket_medio as number,
    ticketSite: 177,
    baseClientes: (crmDashData.total_contatos as number) || 49088,
    taxaRecompra: 44.2
  }
}

/* ─── Live data shape ─── */
interface LiveData {
  receitaBruta: number
  pedidos: number
  ticketMedio: number
  receitaAnterior: number
  pedidosAnterior: number
  variacaoReceita: number
  variacaoPedidos: number
  taxaRecompra: number
  baseClientes: number
  topProdutos: { produto: string; sku: string; qtd: number; receita: number }[]
  regioes: { uf: string; receita: number; percent: number }[]
  mesAtual: string
  isLive: boolean
}

/* ─── 1. PAINEL SINAIS VITAIS ─── */
function PainelSinaisVitais({ live, crm }: { live: LiveData; crm: CRMInfo }) {
  const scores = useMemo<ScoreItem[]>(() => {
    const quedaReceita = Math.abs(live.variacaoReceita)
    const ecommerceScore = quedaReceita > 30 ? 3 : quedaReceita > 15 ? 5 : 7

    const recompraScore = live.taxaRecompra > 40 ? 7 : live.taxaRecompra > 25 ? 5 : 3

    const c = crm
    const crmWinRate = c.vendidas / Math.max(c.vendidas + c.perdidas, 1) * 100
    const crmScore = crmWinRate > 50 ? 7 : crmWinRate > 30 ? 5 : 3

    const concentracaoUF = live.regioes.length > 0 ? live.regioes[0].percent : 0
    const geoScore = concentracaoUF > 50 ? 3 : concentracaoUF > 35 ? 5 : 7

    const ticketVar = live.receitaAnterior > 0
      ? ((live.ticketMedio - (live.receitaAnterior / Math.max(live.pedidosAnterior, 1))) / (live.receitaAnterior / Math.max(live.pedidosAnterior, 1))) * 100
      : 0
    const ticketScore = ticketVar > 5 ? 7 : ticketVar > -10 ? 5 : 3

    const topConcentracao = live.topProdutos.length > 0 && live.receitaBruta > 0
      ? (live.topProdutos.slice(0, 3).reduce((s, p) => s + p.receita, 0) / live.receitaBruta) * 100
      : 0
    const portfolioScore = topConcentracao > 50 ? 4 : topConcentracao > 30 ? 6 : 8

    return [
      { nome: 'Comercial / CRM', score: crmScore, desc: `${formatCurrency(c.valorPerdido)} perdidos vs ${formatCurrency(c.valorVendido)} vendidos` },
      { nome: 'E-commerce', score: ecommerceScore, desc: `Receita ${formatPercent(live.variacaoReceita)} vs mes anterior` },
      { nome: 'Portfolio', score: portfolioScore, desc: `Top 3 produtos = ${topConcentracao.toFixed(0)}% da receita` },
      { nome: 'Base de clientes', score: recompraScore, desc: `${live.taxaRecompra.toFixed(0)}% recompra — ${formatNumber(live.baseClientes)} clientes` },
      { nome: 'Concentracao geografica', score: geoScore, desc: `${live.regioes[0]?.uf ?? 'N/A'} = ${concentracaoUF.toFixed(0)}% da receita` },
      { nome: 'Ticket medio', score: ticketScore, desc: `${formatCurrency(live.ticketMedio)} (${ticketVar >= 0 ? '+' : ''}${ticketVar.toFixed(1)}% vs anterior)` },
    ]
  }, [live, crm])

  return (
    <SectionCard title="Sinais Vitais">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scores.map((s) => (
          <div
            key={s.nome}
            className={`rounded-xl border p-4 animate-fade-in ${scoreBg(s.score)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.nome}</span>
              <span className={`text-xl font-bold ${scoreText(s.score)}`}>{s.score}/10</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${scoreBarBg(s.score)}`}
                style={{ width: `${s.score * 10}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.desc}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

/* ─── 2. RESUMO COMERCIAL ─── */
function ResumoComercial({ live }: { live: LiveData }) {
  const varTicket = live.receitaAnterior > 0
    ? ((live.ticketMedio - (live.receitaAnterior / Math.max(live.pedidosAnterior, 1))) / (live.receitaAnterior / Math.max(live.pedidosAnterior, 1))) * 100
    : 0

  return (
    <SectionCard title={`Resumo Comercial — ${live.mesAtual}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Receita Bruta</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(live.receitaBruta)}</p>
          <p className={`text-xs ${live.variacaoReceita >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatPercent(live.variacaoReceita)} vs anterior
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Pedidos</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatNumber(live.pedidos)}</p>
          <p className={`text-xs ${live.variacaoPedidos >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatPercent(live.variacaoPedidos)} vs anterior
          </p>
        </div>
        <div className="rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Ticket Medio</p>
          <p className="text-lg font-bold text-brand-600 dark:text-brand-400">{formatCurrency(live.ticketMedio)}</p>
          <p className={`text-xs ${varTicket >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {varTicket >= 0 ? '+' : ''}{varTicket.toFixed(1)}% vs anterior
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Recompra</p>
          <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{live.taxaRecompra.toFixed(0)}%</p>
          <p className="text-xs text-gray-500">{formatNumber(live.baseClientes)} clientes</p>
        </div>
      </div>

      {/* Top 10 Produtos */}
      {live.topProdutos.length > 0 && (
        <>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Top 10 Produtos por Receita</h4>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['#', 'Produto', 'SKU', 'Qtd', 'Receita'].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {live.topProdutos.slice(0, 10).map((p, i) => (
                  <tr key={p.sku || i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-1.5 px-2 text-xs text-gray-500 font-medium">{i + 1}</td>
                    <td className="py-1.5 px-2 text-xs text-gray-700 dark:text-gray-300 max-w-[250px] truncate">{p.produto}</td>
                    <td className="py-1.5 px-2 text-xs text-gray-500">{p.sku || '-'}</td>
                    <td className="py-1.5 px-2 text-xs text-gray-700 dark:text-gray-300">{p.qtd}</td>
                    <td className="py-1.5 px-2 text-xs text-green-600 dark:text-green-400">{formatCurrency(p.receita)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Distribuicao Regional */}
      {live.regioes.length > 0 && (
        <>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Distribuicao Regional</h4>
          <div className="space-y-2">
            {live.regioes.slice(0, 10).map(r => (
              <div key={r.uf} className="flex items-center gap-3">
                <span className="w-10 text-xs font-medium text-gray-600 dark:text-gray-400">{r.uf}</span>
                <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                  <div className="h-full bg-brand-500 rounded" style={{ width: `${r.percent}%` }} />
                </div>
                <span className="w-28 text-xs text-right text-gray-600 dark:text-gray-400">
                  {formatCurrency(r.receita)} ({r.percent.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  )
}

/* ─── 3. ANALISE CRM ─── */
function AnaliseCRM({ live, crm: CRM }: { live: LiveData; crm: CRMInfo }) {
  const winRate = CRM.vendidas / Math.max(CRM.vendidas + CRM.perdidas, 1) * 100

  const cenarios = [10, 20, 30, 50].map(pct => ({
    pct,
    acao: `Recuperar ${pct}% das perdas`,
    ganho: CRM.valorPerdido * pct / 100,
    receitaTotal: live.receitaBruta + (CRM.valorPerdido * pct / 100),
  }))

  return (
    <SectionCard title="Analise CRM">
      {/* Funil Visual */}
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Funil de Negociacoes</h4>
      <div className="space-y-3 mb-6">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 dark:text-gray-400">{CRM.criadas} negociacoes criadas</span>
            <span className="text-gray-500">100%</span>
          </div>
          <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-green-600 dark:text-green-400">{CRM.vendidas} vendidas — {formatCurrency(CRM.valorVendido)}</span>
            <span className="text-gray-500">{winRate.toFixed(0)}%</span>
          </div>
          <div className="h-8 bg-green-500/20 rounded-lg overflow-hidden" style={{ width: `${winRate}%` }}>
            <div className="h-full bg-green-500 rounded-lg" style={{ width: '100%' }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-red-600 dark:text-red-400">{CRM.perdidas} perdidas — {formatCurrency(CRM.valorPerdido)}</span>
            <span className="text-gray-500">{(100 - winRate).toFixed(0)}%</span>
          </div>
          <div className="h-8 bg-red-500/20 rounded-lg overflow-hidden" style={{ width: `${100 - winRate}%` }}>
            <div className="h-full bg-red-500 rounded-lg" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Cenarios de Recuperacao */}
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Cenarios de Recuperacao</h4>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Acao</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Ganho</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Receita Total</th>
            </tr>
          </thead>
          <tbody>
            {cenarios.map(c => (
              <tr key={c.pct} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{c.acao}</td>
                <td className="py-2 px-3 text-right text-green-600 dark:text-green-400 font-medium">{formatCurrency(c.ganho)}</td>
                <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(c.receitaTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Comparativo de Ticket */}
      <div className="rounded-xl bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800 p-5">
        <div className="flex items-center justify-center gap-8 mb-3">
          <div className="text-center">
            <p className="text-xs text-gray-500">Ticket CRM</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(CRM.ticketCRM)}</p>
          </div>
          <span className="text-2xl text-gray-400">vs</span>
          <div className="text-center">
            <p className="text-xs text-gray-500">Ticket Site</p>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{formatCurrency(CRM.ticketSite)}</p>
          </div>
        </div>
        <p className="text-sm text-center text-gray-700 dark:text-gray-300 font-medium">
          Cada cliente atendido pelo WhatsApp vale <span className="text-green-600 dark:text-green-400 font-bold">{formatCurrency(CRM.ticketCRM - CRM.ticketSite)}</span> a mais por pedido
        </p>
      </div>
    </SectionCard>
  )
}

/* ─── 4. MATRIZ DE GAPS ─── */
function MatrizGaps({ live, crm }: { live: LiveData; crm: CRMInfo }) {
  const gaps = useMemo<GapItem[]>(() => {
    const result: GapItem[] = []

    if (crm.valorPerdido > crm.valorVendido)
      result.push({ urgencia: 'critico', titulo: 'Perdas CRM maiores que vendas',
        impacto: crm.valorPerdido - crm.valorVendido,
        acao: 'Implementar playbook de follow-up + categorizar motivos de perda', prazo: '15 dias' })

    if (live.variacaoReceita < -20)
      result.push({ urgencia: 'critico', titulo: `Receita caiu ${Math.abs(live.variacaoReceita).toFixed(0)}% vs mes anterior`,
        impacto: live.receitaAnterior - live.receitaBruta,
        acao: 'Campanha reativacao base + push WhatsApp inativos 30+ dias', prazo: '7 dias' })

    if (live.regioes.length > 0 && live.regioes[0].percent > 40)
      result.push({ urgencia: 'alto', titulo: `${live.regioes[0].uf} = ${live.regioes[0].percent.toFixed(0)}% da receita`,
        impacto: live.receitaBruta * 0.15,
        acao: 'Campanhas regionais para diversificar base geografica', prazo: '60 dias' })

    if (live.topProdutos.length > 0 && live.receitaBruta > 0) {
      const top3pct = (live.topProdutos.slice(0, 3).reduce((s, p) => s + p.receita, 0) / live.receitaBruta) * 100
      if (top3pct > 40)
        result.push({ urgencia: 'alto', titulo: `Top 3 produtos = ${top3pct.toFixed(0)}% do faturamento`,
          impacto: live.receitaBruta * 0.1,
          acao: 'Diversificar mix promocional, cross-sell nos top SKUs', prazo: '30 dias' })
    }

    if (crm.vendidas > 0 && crm.vendidas / Math.max(crm.vendidas + crm.perdidas, 1) < 0.5)
      result.push({ urgencia: 'alto', titulo: `Taxa de conversao CRM = ${(crm.vendidas / Math.max(crm.vendidas + crm.perdidas, 1) * 100).toFixed(0)}%`,
        impacto: crm.valorPerdido * 0.2,
        acao: 'Treinar equipe comercial + scripts por persona', prazo: '30 dias' })

    const ordemUrgencia: Record<string, number> = { critico: 0, alto: 1, medio: 2 }
    return result.sort((a, b) => (ordemUrgencia[a.urgencia] ?? 3) - (ordemUrgencia[b.urgencia] ?? 3))
  }, [live, crm])

  const totalPotencial = gaps.reduce((s, g) => s + g.impacto, 0)

  return (
    <SectionCard title="Matriz de Gaps">
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {['#', 'Urgencia', 'Gap', 'Impacto R$', 'Acao', 'Prazo'].map(h => (
                <th key={h} className="text-left py-2 px-2 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gaps.map((g, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 px-2 text-xs text-gray-500 font-medium">{i + 1}</td>
                <td className="py-2 px-2"><Badge type={g.urgencia as BadgeType}>{g.urgencia}</Badge></td>
                <td className="py-2 px-2 text-xs text-gray-700 dark:text-gray-300 font-medium">{g.titulo}</td>
                <td className="py-2 px-2 text-xs text-orange-600 dark:text-orange-400 font-medium">{formatCurrency(g.impacto)}</td>
                <td className="py-2 px-2 text-xs text-gray-600 dark:text-gray-400 max-w-[250px]">{g.acao}</td>
                <td className="py-2 px-2 text-xs text-gray-500">{g.prazo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPotencial > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border border-orange-200 dark:border-orange-800 p-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Potencial total desbloqueavel</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalPotencial)}</p>
        </div>
      )}
    </SectionCard>
  )
}

/* ─── 5. SIMULADOR DE RECEITA ─── */
function SimuladorReceita({ live, crm: crmData }: { live: LiveData; crm: CRMInfo }) {
  const [sim, setSim] = useState<SimState>({
    taxaConversao: 1.8,
    recuperacaoCRM: 20,
    reativacaoBase: 5,
    clientesB2B: 5,
    ticketB2B: 2500,
    crescimentoOrganico: 10
  })

  const resultado = useMemo(() => {
    const sessoes = 24973
    const ticket = live.ticketMedio
    const base = live.receitaBruta

    const cro = Math.max(0, (sim.taxaConversao / 100 - 0.005) * sessoes * ticket)
    const crm = crmData.valorPerdido * sim.recuperacaoCRM / 100
    const reativ = (live.baseClientes * sim.reativacaoBase / 100) * ticket
    const b2b = sim.clientesB2B * sim.ticketB2B
    const org = base * sim.crescimentoOrganico / 100
    const total = base + cro + crm + reativ + b2b + org

    return { base, cro, crm, reativ, b2b, org, total }
  }, [sim, live, crmData])

  const meta = 150000
  const progressPct = Math.min((resultado.total / meta) * 100, 100)

  const sliders = [
    { key: 'taxaConversao', label: 'Taxa Conversao Site (%)', min: 0.5, max: 5, step: 0.1 },
    { key: 'recuperacaoCRM', label: 'Recuperacao CRM (%)', min: 0, max: 100, step: 5 },
    { key: 'reativacaoBase', label: 'Reativacao Base (%)', min: 0, max: 20, step: 1 },
    { key: 'clientesB2B', label: 'Novos Clientes B2B', min: 0, max: 30, step: 1 },
    { key: 'ticketB2B', label: 'Ticket Medio B2B (R$)', min: 500, max: 10000, step: 250 },
    { key: 'crescimentoOrganico', label: 'Crescimento Organico (%)', min: 0, max: 50, step: 5 },
  ]

  const linhasGanho = [
    { label: 'Receita Base', valor: resultado.base },
    { label: '+ CRO (conversao)', valor: resultado.cro },
    { label: '+ CRM (recuperacao)', valor: resultado.crm },
    { label: '+ Reativacao', valor: resultado.reativ },
    { label: '+ B2B', valor: resultado.b2b },
    { label: '+ Organico', valor: resultado.org },
  ]

  return (
    <SectionCard title="Simulador de Receita">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sliders */}
        <div className="space-y-4">
          {sliders.map(s => (
            <div key={s.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">{s.label}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{sim[s.key]}</span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={sim[s.key]}
                onChange={e => setSim(prev => ({ ...prev, [s.key]: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>
          ))}
        </div>

        {/* Resultado */}
        <div>
          <div className="space-y-1.5 mb-4">
            {linhasGanho.map(l => (
              <div key={l.label} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{l.label}</span>
                <span className={l.valor > 0 && l.label !== 'Receita Base' ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                  {formatCurrency(l.valor)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">TOTAL PROJETADO</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(resultado.total)}</span>
            </div>
          </div>

          {/* Progress bar vs meta */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Progresso vs Meta {formatCurrency(meta)}</span>
              <span className="text-gray-600 dark:text-gray-400 font-medium">{progressPct.toFixed(0)}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

/* ─── 6. PLANO DE ACAO ─── */
function PlanoAcao() {
  const acoes = [
    { n: 1, titulo: 'Campanha de reativacao da base', impacto: 'R$ 15-25k em 15 dias',
      custo: 'R$ 0', prazo: 'Esta semana', responsavel: 'Arnaldo + RD', badge: 'maior ROI',
      desc: 'E-mail + WhatsApp para clientes inativos ha mais de 90 dias' },
    { n: 2, titulo: 'Playbook WhatsApp + tags de perda no CRM', impacto: '+R$ 33,8k/mes',
      custo: 'R$ 0', prazo: '7 dias', responsavel: 'Arnaldo + consultor', badge: 'material pronto',
      desc: 'Scripts por persona + categorizar motivos de perda no RD Station' },
    { n: 3, titulo: 'CRO Shopify — otimizacao de conversao', impacto: '+R$ 24k/mes',
      custo: 'R$ 0-2k', prazo: '14 dias', responsavel: 'Dev + Webi', badge: 'pendente',
      desc: 'Checkout, fotos top 3 SKUs, copy de produto' },
    { n: 4, titulo: 'Prospeccao B2B — farmacias DF', impacto: '+R$ 20k/mes em 60 dias',
      custo: 'R$ 500', prazo: '30 dias', responsavel: 'Arnaldo', badge: 'kit pronto',
      desc: '10 farmacias prioritarias no DF. Kit de proposta ja disponivel' },
    { n: 5, titulo: 'Diversificacao regional', impacto: '+15% receita',
      custo: 'R$ 1-3k', prazo: '60 dias', responsavel: 'Marketing', badge: 'pendente',
      desc: 'Campanhas para SP, MG, RJ — clientes ja cadastrados nesses estados' },
  ]

  const badgeColor = (b: string): string => {
    if (b === 'maior ROI') return 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400'
    if (b === 'urgente') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
    if (b === 'material pronto' || b === 'kit pronto') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  }

  return (
    <SectionCard title="Plano de Acao — Proximos Passos">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {acoes.map(a => (
          <div key={a.n} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 animate-fade-in">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold">{a.n}</span>
                <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{a.titulo}</h5>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${badgeColor(a.badge)}`}>{a.badge}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{a.desc}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Impacto:</span>
                <span className="ml-1 text-green-600 dark:text-green-400 font-medium">{a.impacto}</span>
              </div>
              <div>
                <span className="text-gray-400">Custo:</span>
                <span className="ml-1 text-gray-700 dark:text-gray-300">{a.custo}</span>
              </div>
              <div>
                <span className="text-gray-400">Prazo:</span>
                <span className="ml-1 text-gray-700 dark:text-gray-300">{a.prazo}</span>
              </div>
              <div>
                <span className="text-gray-400">Responsavel:</span>
                <span className="ml-1 text-gray-700 dark:text-gray-300">{a.responsavel}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

/* ─── PAGINA PRINCIPAL ─── */
export default function AnaliseIAPage() {
  useDocumentTitle('Analise IA')

  // Live data from Supabase
  const vendasMensal = useShopifyVendasMensal()
  const recorrencia = useShopifyRecorrencia()
  const produtosRank = useShopifyProdutosRank()
  const receitaUF = useReceitaPorUF()
  const comparativo = useComparativo()
  const crmDash = useCRMDashboard()

  const isLoading = vendasMensal.isLoading || produtosRank.isLoading || receitaUF.isLoading

  // Build live data object from Supabase queries, falling back to seed
  const live = useMemo<LiveData>(() => {
    const vendas = vendasMensal.data ?? []
    const recorr = recorrencia.data ?? []
    const prods = produtosRank.data ?? []
    const ufs = receitaUF.data ?? []
    const comp = comparativo.data ?? []

    // Get latest month from Shopify vendas
    const sorted = [...vendas].sort((a, b) => b.mes.localeCompare(a.mes))
    const atual = sorted[0]
    const anterior = sorted[1]

    if (!atual) {
      // Fallback to seed
      return {
        receitaBruta: DADOS.receita.bruta,
        pedidos: DADOS.receita.pedidos,
        ticketMedio: DADOS.receita.ticketMedio,
        receitaAnterior: DADOS.comparativo.receitaAnterior,
        pedidosAnterior: DADOS.comparativo.pedidosAnterior,
        variacaoReceita: DADOS.comparativo.variacaoReceita,
        variacaoPedidos: DADOS.comparativo.variacaoPedidos,
        taxaRecompra: DADOS.empresa.taxaRecompra,
        baseClientes: DADOS.empresa.baseClientes,
        topProdutos: DADOS.topProdutos.map(p => ({ produto: p.nome, sku: p.sku, qtd: p.qtd, receita: p.receita })),
        regioes: DADOS.regioes.map(r => ({ uf: r.uf, receita: 0, percent: r.percent })),
        mesAtual: 'MAR/26 (seed)',
        isLive: false,
      }
    }

    const receitaAtual = Number(atual.receita)
    const receitaAnt = anterior ? Number(anterior.receita) : 0
    const pedidosAtual = atual.pedidos
    const pedidosAnt = anterior ? anterior.pedidos : 0
    const varReceita = receitaAnt > 0 ? ((receitaAtual - receitaAnt) / receitaAnt) * 100 : 0
    const varPedidos = pedidosAnt > 0 ? ((pedidosAtual - pedidosAnt) / pedidosAnt) * 100 : 0

    // Recorrencia: latest month
    const recorrSorted = [...recorr].sort((a, b) => b.mes.localeCompare(a.mes))
    const recorrAtual = recorrSorted[0]
    const taxaRecompra = recorrAtual ? recorrAtual.taxa_recompra : DADOS.empresa.taxaRecompra
    const baseClientes = recorrAtual
      ? recorrAtual.clientes_novos + recorrAtual.clientes_recorrentes
      : DADOS.empresa.baseClientes

    // Comparativo: try to get from mv_comparativo_mensal, else calculate
    const compReceita = comp.find(c => c.metrica === 'receita')
    const varReceitaFinal = compReceita ? compReceita.variacao_percentual_mes : varReceita

    // UFs
    const totalReceitaUF = ufs.reduce((s, u) => s + Number(u.receita), 0)
    const regioes = ufs.map(u => ({
      uf: u.uf,
      receita: Number(u.receita),
      percent: totalReceitaUF > 0 ? (Number(u.receita) / totalReceitaUF) * 100 : 0,
    }))

    // Format month label
    const mesDate = new Date(atual.mes)
    const mesLabel = mesDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase()

    return {
      receitaBruta: receitaAtual,
      pedidos: pedidosAtual,
      ticketMedio: Number(atual.ticket_medio),
      receitaAnterior: receitaAnt,
      pedidosAnterior: pedidosAnt,
      variacaoReceita: varReceitaFinal,
      variacaoPedidos: varPedidos,
      taxaRecompra,
      baseClientes,
      topProdutos: prods.map(p => ({ produto: p.produto, sku: p.sku, qtd: p.qtd_vendida, receita: Number(p.receita_total) })),
      regioes,
      mesAtual: mesLabel,
      isLive: true,
    }
  }, [vendasMensal.data, recorrencia.data, produtosRank.data, receitaUF.data, comparativo.data])

  const CRM = getCRMData(crmDash.data)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Analise Estrategica IA</h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-400">
          Auto-gerado
        </span>
        {live.isLive && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
            Dados ao vivo
          </span>
        )}
        {!live.isLive && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
            Dados seed
          </span>
        )}
        {crmDash.data && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
            CRM ao vivo
          </span>
        )}
      </div>

      <PainelSinaisVitais live={live} crm={CRM} />
      <ResumoComercial live={live} />
      <AnaliseCRM live={live} crm={CRM} />
      <MatrizGaps live={live} crm={CRM} />
      <SimuladorReceita live={live} crm={CRM} />
      <PlanoAcao />
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { supabase } from '../services/supabase'
import { DADOS } from '../data/seed'
import { formatCurrency, formatNumber, formatPercent } from '../lib/formatters'
import SectionCard from '../components/ui/SectionCard'
import Badge from '../components/ui/Badge'

// ─── Types ───
interface DadosType {
  dre: typeof DADOS.dre
  receita: typeof DADOS.receita
  custos: typeof DADOS.custos
  empresa: typeof DADOS.empresa
  estoque: typeof DADOS.estoque
  alertas: typeof DADOS.alertas
  comparativo: typeof DADOS.comparativo
  topProdutos: typeof DADOS.topProdutos
  curvaABC: typeof DADOS.curvaABC
  categorias: typeof DADOS.categorias
  regioes: typeof DADOS.regioes
  fluxoCaixa: typeof DADOS.fluxoCaixa
  aportes: typeof DADOS.aportes
  [key: string]: unknown
}

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

interface AlertaCusto {
  nivel: string
  texto: string
  acao: string
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

/* ─── Breakeven ─── */
const BREAKEVEN: number = DADOS.custos.totalFixo + DADOS.custos.totalVariavel +
  DADOS.custos.totalFinanceiro + DADOS.custos.impostos

/* ─── CRM Fallback + Live Data ─── */
const CRM_FALLBACK: CRMInfo = {
  criadas: 284, vendidas: 132, perdidas: 266,
  valorPerdido: 169000, valorVendido: 58935,
  ticketCRM: 447, ticketSite: 177,
  baseClientes: 49088, taxaRecompra: 44.2
}

function getCRMData(crmDashData: Record<string, unknown> | null): CRMInfo {
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

/* 1. PAINEL SINAIS VITAIS */
function PainelSinaisVitais({ dados, crm }: { dados: DadosType; crm: CRMInfo }) {
  const scores = useMemo<ScoreItem[]>(() => {
    const deficitPercent = Math.abs(dados.dre.resultado) / dados.receita.bruta * 100
    const saudeScore = deficitPercent > 50 ? 2 : deficitPercent > 30 ? 4 : deficitPercent > 10 ? 6 : 8

    const quedaReceita = Math.abs(dados.comparativo.variacaoReceita)
    const ecommerceScore = quedaReceita > 30 ? 3 : quedaReceita > 15 ? 5 : 7

    const rupturaPercent = (dados.estoque.semEstoque / dados.estoque.totalSKUs) * 100
    const portfolioScore = rupturaPercent > 70 ? 5 : rupturaPercent > 50 ? 6 : 8

    const recompraScore = dados.empresa.taxaRecompra > 40 ? 7 : dados.empresa.taxaRecompra > 25 ? 5 : 3

    const alertasCriticos = dados.alertas.filter((a) => a.tipo === 'critico').length
    const gestaoScore = alertasCriticos >= 3 ? 3 : alertasCriticos === 2 ? 4 : alertasCriticos === 1 ? 6 : 8

    const c = crm || CRM_FALLBACK
    const crmWinRate = c.vendidas / (c.vendidas + c.perdidas) * 100
    const crmScore = crmWinRate > 50 ? 7 : crmWinRate > 30 ? 5 : 3

    return [
      { nome: 'Saude financeira', score: saudeScore, desc: `Deficit de ${formatCurrency(Math.abs(dados.dre.resultado))}/mes` },
      { nome: 'Comercial / CRM', score: crmScore, desc: `${formatCurrency(c.valorPerdido)} perdidos vs ${formatCurrency(c.valorVendido)} vendidos/mes` },
      { nome: 'E-commerce', score: ecommerceScore, desc: `Receita ${formatPercent(dados.comparativo.variacaoReceita)} vs mes anterior` },
      { nome: 'Portfolio', score: portfolioScore, desc: `${rupturaPercent.toFixed(0)}% dos SKUs sem estoque` },
      { nome: 'Base de clientes', score: recompraScore, desc: `${dados.empresa.taxaRecompra}% recompra — ${formatNumber(dados.empresa.baseClientes)} clientes` },
      { nome: 'Gestao operacional', score: gestaoScore, desc: `${alertasCriticos} alertas criticos ativos` },
    ]
  }, [dados, crm])

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

/* 2. DIAGNOSTICO FINANCEIRO */
function DiagnosticoFinanceiro({ dados }: { dados: DadosType }) {
  const dre = dados.dre
  const recBruta = dre.receitaBruta

  const linhasDRE = [
    { label: 'Receita Bruta', valor: dre.receitaBruta, tipo: 'positivo' },
    { label: '(-) Impostos', valor: dre.impostos, tipo: 'negativo' },
    { label: '= Receita Liquida', valor: dre.receitaLiquida, tipo: 'subtotal' },
    { label: '(-) CMV', valor: dre.cmv, tipo: 'negativo' },
    { label: '= Lucro Bruto', valor: dre.lucroBruto, tipo: 'subtotal' },
    { label: '(-) Marketing', valor: dre.despesasOp.marketing, tipo: 'negativo' },
    { label: '(-) Ocupacao', valor: dre.despesasOp.ocupacao, tipo: 'negativo' },
    { label: '(-) Logistica', valor: dre.despesasOp.logistica, tipo: 'negativo' },
    { label: '(-) Pessoal', valor: dre.despesasOp.pessoal, tipo: 'negativo' },
    { label: '(-) Financeiras', valor: dre.despesasOp.financeiras, tipo: 'negativo' },
    { label: '(-) Outras', valor: dre.despesasOp.outras, tipo: 'negativo' },
    { label: '= RESULTADO', valor: dre.resultado, tipo: dre.resultado >= 0 ? 'positivo' : 'critico' },
  ]

  const maxVal = Math.max(...linhasDRE.map(l => Math.abs(l.valor)))

  const alertasCusto = useMemo<AlertaCusto[]>(() => {
    return dados.custos.fixos
      .map(c => ({ ...c, percentReceita: (c.valor / recBruta) * 100 }))
      .filter(c => c.percentReceita > 5 || c.criticidade === 'alta')
      .sort((a, b) => b.percentReceita - a.percentReceita)
      .map(c => ({
        nivel: c.percentReceita > 15 ? 'critico' : c.percentReceita > 8 ? 'alto' : 'medio',
        texto: `${c.item}: ${c.percentReceita.toFixed(1)}% da receita (${formatCurrency(c.valor)}/mes)`,
        acao: c.item.includes('Webi') ? 'Exigir relatorio de ROI urgente' :
          c.item.includes('RD') ? 'Renegociar plano' : 'Monitorar'
      }))
  }, [dados, recBruta])

  const gapBreakeven = BREAKEVEN - recBruta
  const mesesAporte = dados.aportes.total4Meses > 0
    ? (gapBreakeven / (dados.aportes.total4Meses / 4)).toFixed(1)
    : '\u2014'

  return (
    <SectionCard title="Diagnostico Financeiro">
      {/* A - Cascata DRE */}
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">DRE - Cascata Visual</h4>
      <div className="space-y-1.5 mb-6">
        {linhasDRE.map((l) => {
          const absVal = Math.abs(l.valor)
          const pct = (absVal / maxVal) * 100
          const pctReceita = ((absVal / recBruta) * 100).toFixed(1)
          const barColor =
            l.tipo === 'positivo' ? 'bg-green-500' :
              l.tipo === 'negativo' ? 'bg-red-400' :
                l.tipo === 'subtotal' ? 'bg-blue-400' :
                  'bg-red-600'
          const isBold = l.tipo === 'subtotal' || l.tipo === 'critico'

          return (
            <div key={l.label} className="flex items-center gap-3">
              <span className={`w-36 text-xs text-right shrink-0 ${isBold ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}>
                {l.label}
              </span>
              <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                <div className={`h-full rounded ${barColor} transition-all duration-500`} style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
              <span className={`w-28 text-xs text-right shrink-0 ${l.tipo === 'critico' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                {formatCurrency(l.valor)} ({pctReceita}%)
              </span>
            </div>
          )
        })}
      </div>

      {/* B - Alertas de Custo */}
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Alertas Automaticos de Custo</h4>
      <div className="space-y-2 mb-6">
        {alertasCusto.map((a, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <Badge type={a.nivel} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 dark:text-gray-200">{a.texto}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Acao: {a.acao}</p>
            </div>
          </div>
        ))}
      </div>

      {/* C - Box Breakeven */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Resultado Atual</p>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(dre.resultado)}</p>
        </div>
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Breakeven Necessario</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(BREAKEVEN)}</p>
        </div>
        <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Gap p/ Breakeven</p>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(gapBreakeven)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Equiv. em Aportes</p>
          <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{mesesAporte} meses</p>
        </div>
      </div>
    </SectionCard>
  )
}

/* 3. ANALISE CRM */
function AnaliseCRM({ dados, crm: CRM }: { dados: DadosType; crm: CRMInfo }) {
  const cenarios = [10, 20, 30, 50].map(pct => ({
    pct,
    acao: `Recuperar ${pct}% das perdas`,
    ganho: CRM.valorPerdido * pct / 100,
    receitaTotal: dados.receita.bruta + (CRM.valorPerdido * pct / 100),
    atingeBreakeven: (dados.receita.bruta + CRM.valorPerdido * pct / 100) >= BREAKEVEN
  }))

  return (
    <SectionCard title="Analise CRM">
      {/* A - Funil Visual */}
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
            <span className="text-gray-500">46%</span>
          </div>
          <div className="h-8 bg-green-500/20 rounded-lg overflow-hidden" style={{ width: '46%' }}>
            <div className="h-full bg-green-500 rounded-lg" style={{ width: '100%' }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-red-600 dark:text-red-400">{CRM.perdidas} perdidas — {formatCurrency(CRM.valorPerdido)}</span>
            <span className="text-gray-500">93%</span>
          </div>
          <div className="h-8 bg-red-500/20 rounded-lg overflow-hidden" style={{ width: '93%' }}>
            <div className="h-full bg-red-500 rounded-lg" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* B - Cenarios de Recuperacao */}
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Cenarios de Recuperacao</h4>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Acao</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Ganho</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Receita Total</th>
              <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Breakeven?</th>
            </tr>
          </thead>
          <tbody>
            {cenarios.map(c => (
              <tr key={c.pct} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{c.acao}</td>
                <td className="py-2 px-3 text-right text-green-600 dark:text-green-400 font-medium">{formatCurrency(c.ganho)}</td>
                <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(c.receitaTotal)}</td>
                <td className="py-2 px-3 text-center">
                  {c.atingeBreakeven
                    ? <span className="text-green-600 font-bold">&#10003;</span>
                    : <span className="text-red-500 font-bold">&#10007;</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* C - Comparativo de Ticket */}
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

/* 4. ANALISE PORTFOLIO */
function AnalisePortfolio({ dados }: { dados: DadosType }) {
  const curva = dados.curvaABC
  const totalABC = curva.classeA + curva.classeB + curva.classeC
  const top10 = dados.topProdutos.slice(0, 10)
  const topEstoque = dados.estoque.topPorValor || []
  const categorias = dados.categorias || []

  const alertasEstoque = [
    {
      nivel: 'critico',
      titulo: `${dados.estoque.semEstoque} SKUs sem estoque (${((dados.estoque.semEstoque / dados.estoque.totalSKUs) * 100).toFixed(0)}% do catalogo)`,
      desc: 'Ruptura em 75% do portfolio gera vendas perdidas diariamente'
    },
    {
      nivel: 'alto',
      titulo: `R$ ${(dados.estoque.valorCusto / 1000000).toFixed(2)}M imobilizado em estoque`,
      desc: `${(dados.estoque.valorCusto / dados.receita.bruta).toFixed(1)}x a receita mensal parado em produto`
    }
  ]

  const maxCat = Math.max(...categorias.map(c => c.percentual))

  return (
    <SectionCard title="Analise de Portfolio">
      {/* A - Curva ABC */}
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Curva ABC</h4>
      <div className="space-y-2 mb-4">
        {[
          { label: 'Classe A', qtd: curva.classeA, color: 'bg-green-500', pct: ((curva.classeA / totalABC) * 100).toFixed(0) },
          { label: 'Classe B', qtd: curva.classeB, color: 'bg-yellow-400', pct: ((curva.classeB / totalABC) * 100).toFixed(0) },
          { label: 'Classe C', qtd: curva.classeC, color: 'bg-red-400', pct: ((curva.classeC / totalABC) * 100).toFixed(0) },
        ].map(c => (
          <div key={c.label} className="flex items-center gap-3">
            <span className="w-20 text-xs font-medium text-gray-600 dark:text-gray-400">{c.label}</span>
            <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
              <div className={`h-full rounded ${c.color}`} style={{ width: `${c.pct}%` }} />
            </div>
            <span className="w-24 text-xs text-right text-gray-600 dark:text-gray-400">{c.qtd} SKUs ({c.pct}%)</span>
          </div>
        ))}
      </div>

      {/* Top 10 Produtos */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {['SKU', 'Nome', 'Categoria', 'Qtd', 'Receita', 'Markup%', '% Fat.', 'Classe'].map(h => (
                <th key={h} className="text-left py-2 px-2 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top10.map((p, i) => (
              <tr key={p.sku} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-1.5 px-2 text-xs text-gray-500">{p.sku}</td>
                <td className="py-1.5 px-2 text-xs text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{p.nome}</td>
                <td className="py-1.5 px-2 text-xs text-gray-500">{p.categoria}</td>
                <td className="py-1.5 px-2 text-xs text-gray-700 dark:text-gray-300">{p.qtd}</td>
                <td className="py-1.5 px-2 text-xs text-green-600 dark:text-green-400">{formatCurrency(p.receita)}</td>
                <td className="py-1.5 px-2 text-xs text-gray-700 dark:text-gray-300">{p.markup.toFixed(0)}%</td>
                <td className="py-1.5 px-2 text-xs text-gray-700 dark:text-gray-300">{p.fatPercent.toFixed(1)}%</td>
                <td className="py-1.5 px-2"><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${i < 3 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>A</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* B - Alertas de Estoque */}
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Alertas de Estoque</h4>
      <div className="space-y-2 mb-4">
        {alertasEstoque.map((a, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <Badge type={a.nivel} />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{a.titulo}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{a.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top 5 estoque por valor */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {['SKU', 'Produto', 'Estoque', 'Custo Unit.', 'Valor Total'].map(h => (
                <th key={h} className="text-left py-2 px-2 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topEstoque.map(p => (
              <tr key={p.sku} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-1.5 px-2 text-xs text-gray-500">{p.sku}</td>
                <td className="py-1.5 px-2 text-xs text-gray-700 dark:text-gray-300">{p.nome}</td>
                <td className="py-1.5 px-2 text-xs text-gray-700 dark:text-gray-300">{p.estoque}</td>
                <td className="py-1.5 px-2 text-xs text-gray-700 dark:text-gray-300">{formatCurrency(p.custo)}</td>
                <td className="py-1.5 px-2 text-xs text-orange-600 dark:text-orange-400 font-medium">{formatCurrency(p.totalValor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* C - Mix de Categorias */}
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mix de Categorias</h4>
      <div className="space-y-2">
        {categorias.map(c => (
          <div key={c.nome} className="flex items-center gap-3">
            <span className="w-40 text-xs text-gray-600 dark:text-gray-400 truncate flex items-center gap-1.5">
              {c.nome}
              {(c.nome.includes('Extrato') && (c.nome.includes('Fluido') || c.nome.includes('Glic'))) && (
                <span className="px-1 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">B2B</span>
              )}
            </span>
            <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
              <div className="h-full bg-green-500 rounded" style={{ width: `${(c.percentual / maxCat) * 100}%` }} />
            </div>
            <span className="w-20 text-xs text-right text-gray-600 dark:text-gray-400">{c.percentual}%</span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

/* 5. MATRIZ DE GAPS */
function MatrizGaps({ dados }: { dados: DadosType }) {
  const gaps = useMemo<GapItem[]>(() => {
    const result: GapItem[] = []

    if (dados.dre.resultado < 0)
      result.push({ urgencia: 'critico', titulo: 'Deficit operacional',
        impacto: Math.abs(dados.dre.resultado),
        acao: 'Reduzir custos fixos + aumentar receita', prazo: '30 dias' })

    const webi = dados.custos.fixos.find(c => c.item.includes('Webi'))
    if (webi && webi.valor / dados.receita.bruta > 0.15)
      result.push({ urgencia: 'critico', titulo: `Webi = ${((webi.valor / dados.receita.bruta) * 100).toFixed(0)}% da receita`,
        impacto: webi.valor * 12,
        acao: 'Exigir ROI ate 31/03. Renegociar para % da receita gerada', prazo: '7 dias' })

    if (dados.regioes[0]?.percent > 40)
      result.push({ urgencia: 'alto', titulo: `${dados.regioes[0].uf} = ${dados.regioes[0].percent}% da receita`,
        impacto: dados.receita.bruta * 0.15,
        acao: 'Campanhas SP, MG, RJ — clientes ja cadastrados nesses estados', prazo: '60 dias' })

    if (dados.estoque.semEstoque / dados.estoque.totalSKUs > 0.5)
      result.push({ urgencia: 'alto', titulo: '75% dos SKUs sem estoque',
        impacto: dados.estoque.valorCusto * 0.1,
        acao: 'Definir estoque minimo para Curva A (top 132 produtos)', prazo: '30 dias' })

    const hist = dados.fluxoCaixa.historico
    const ult = hist[hist.length - 1]
    const pen = hist[hist.length - 2]
    if (ult?.receita && pen?.receita && ult.receita < pen.receita)
      result.push({ urgencia: 'alto', titulo: `Receita caiu ${((pen.receita - ult.receita) / pen.receita * 100).toFixed(0)}% no mes`,
        impacto: pen.receita - ult.receita,
        acao: 'Campanha reativacao base + push WhatsApp inativos 30+ dias', prazo: '15 dias' })

    const ordemUrgencia: Record<string, number> = { critico: 0, alto: 1, medio: 2 }
    return result.sort((a, b) => (ordemUrgencia[a.urgencia] ?? 3) - (ordemUrgencia[b.urgencia] ?? 3))
  }, [dados])

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
                <td className="py-2 px-2"><Badge type={g.urgencia} /></td>
                <td className="py-2 px-2 text-xs text-gray-700 dark:text-gray-300 font-medium">{g.titulo}</td>
                <td className="py-2 px-2 text-xs text-orange-600 dark:text-orange-400 font-medium">{formatCurrency(g.impacto)}</td>
                <td className="py-2 px-2 text-xs text-gray-600 dark:text-gray-400 max-w-[250px]">{g.acao}</td>
                <td className="py-2 px-2 text-xs text-gray-500">{g.prazo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border border-orange-200 dark:border-orange-800 p-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">Potencial total desbloqueavel</p>
        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalPotencial)}</p>
      </div>
    </SectionCard>
  )
}

/* 6. SIMULADOR DE RECEITA */
function SimuladorReceita({ dados, crm: crmData }: { dados: DadosType; crm: CRMInfo }) {
  const [sim, setSim] = useState<SimState>({
    taxaConversao: 1.8,
    recuperacaoCRM: 20,
    reativacaoBase: 5,
    clientesB2B: 5,
    ticketB2B: 2500,
    crescimentoOrganico: 10
  })

  const valorPerdidoCRM = (crmData || CRM_FALLBACK).valorPerdido

  const resultado = useMemo(() => {
    const sessoes = 24973
    const ticket = dados.receita.ticketMedio
    const base = dados.receita.bruta

    const cro = Math.max(0, (sim.taxaConversao / 100 - 0.005) * sessoes * ticket)
    const crm = valorPerdidoCRM * sim.recuperacaoCRM / 100
    const reativ = (dados.empresa.baseClientes * sim.reativacaoBase / 100) * ticket
    const b2b = sim.clientesB2B * sim.ticketB2B
    const org = base * sim.crescimentoOrganico / 100
    const total = base + cro + crm + reativ + b2b + org

    return { base, cro, crm, reativ, b2b, org, total }
  }, [sim, dados, valorPerdidoCRM])

  const meta = 150000
  const progressPct = Math.min((resultado.total / meta) * 100, 100)
  const atingeBreakeven = resultado.total >= BREAKEVEN

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
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
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

          {/* Breakeven badge */}
          <div className={`rounded-lg p-3 text-center mb-4 ${atingeBreakeven ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
            <span className={`text-sm font-semibold ${atingeBreakeven ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {atingeBreakeven
                ? '\u2713 Breakeven atingido'
                : `\u2717 Faltam ${formatCurrency(BREAKEVEN - resultado.total)} para breakeven`}
            </span>
          </div>

          {/* Progress bar vs meta */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Progresso vs Meta {formatCurrency(meta)}</span>
              <span className="text-gray-600 dark:text-gray-400 font-medium">{progressPct.toFixed(0)}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

/* 7. PLANO DE ACAO */
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
      desc: 'Checkout, fotos top 3 SKUs (Uva/Rosa Mosqueta/Jojoba), copy de produto' },
    { n: 4, titulo: 'Auditoria e renegociacao Webi', impacto: 'Economia R$ 5k/mes',
      custo: 'R$ 0', prazo: '7 dias', responsavel: 'Arnaldo', badge: 'urgente',
      desc: 'Exigir relatorio de KPIs marco ate 31/03. Renegociar para % da receita' },
    { n: 5, titulo: 'Prospeccao B2B — farmacias DF', impacto: '+R$ 20k/mes em 60 dias',
      custo: 'R$ 500', prazo: '30 dias', responsavel: 'Arnaldo', badge: 'kit pronto',
      desc: '10 farmacias prioritarias no DF. Kit de proposta ja disponivel' },
    { n: 6, titulo: 'Estoque minimo top 50 SKUs Curva A', impacto: 'Reduzir ruptura',
      custo: 'R$ 0', prazo: '30 dias', responsavel: 'Operacao + Bling', badge: 'pendente',
      desc: 'Definir ponto de reposicao automatico para os 132 produtos Classe A' },
  ]

  const badgeColor = (b: string): string => {
    if (b === 'maior ROI') return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
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
                <span className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">{a.n}</span>
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

/* PAGINA PRINCIPAL */
export default function AnaliseIAPage() {
  useDocumentTitle('Análise IA')
  const dados: DadosType = DADOS as unknown as DadosType

  // Load live CRM data from Supabase RPC (falls back to hardcoded)
  const [crmDash, setCrmDash] = useState<Record<string, unknown> | null>(null)
  useEffect(() => {
    supabase.rpc('rdstation_dashboard_periodo', {
      data_ini: '2020-01-01',
      data_fim: new Date().toISOString().slice(0, 10)
    }).then(({ data }) => { if (data) setCrmDash(data as Record<string, unknown>) }).catch(() => {})
  }, [])
  const CRM = getCRMData(crmDash)

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Analise Estrategica IA</h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
          Auto-gerado
        </span>
        {crmDash && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
            CRM ao vivo
          </span>
        )}
      </div>

      <PainelSinaisVitais dados={dados} crm={CRM} />
      <DiagnosticoFinanceiro dados={dados} />
      <AnaliseCRM dados={dados} crm={CRM} />
      <AnalisePortfolio dados={dados} />
      <MatrizGaps dados={dados} />
      <SimuladorReceita dados={dados} crm={CRM} />
      <PlanoAcao />
    </div>
  )
}

import { useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import Spinner from '../components/ui/Spinner'
import {
  useShopifyVendasMensal, useShopifyRecorrencia,
  useShopifyProdutosRank, useShopifyCohort,
} from '../services/queries/useShopifyQueries'
import { generateShopifyInsights } from '../lib/insights/shopify-insights'
import { processInsights } from '../lib/insights/engine'
import { formatCurrency, formatPercent, formatNumber, formatMesLabel } from '../lib/formatters'
import type { Insight, Severity } from '../lib/insights/types'
import type { ShopifyVendasMensal as VendasMensalRow } from '../types/shopify-views'
import type { ShopifyRecorrencia as RecorrenciaRow } from '../types/shopify-views'
import type { ShopifyProdutoRank } from '../types/shopify-views'
import type { ShopifyCohort } from '../types/shopify-views'

// ─── Recharts dark theme constants ────────────────────────────
const GRID_STROKE = '#374151'
const AXIS_TICK = '#9ca3af'
const TOOLTIP_STYLE = { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }
const GREEN = '#10b981'
const BLUE = '#3b82f6'
const EMERALD = '#10b981'

// ─── Severity color map ──────────────────────────────────────
const SEVERITY_COLORS: Record<Severity, string> = {
  critico: 'bg-red-500/10 border-red-500/30 text-red-400',
  atencao: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
}

const SEVERITY_OPORTUNIDADE = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'

// ─── Card wrapper ────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        {title}
      </h3>
      {children}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────
function EstadoVazio({ mensagem, cta }: { mensagem: string; cta?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <svg className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="text-sm">{mensagem}</p>
      {cta && <p className="text-xs mt-2 text-gray-500">{cta}</p>}
    </div>
  )
}

// ─── Section 1: Insights ─────────────────────────────────────
function SecaoInsights({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null

  return (
    <Card title="Insights">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((ins) => {
          const colorClass = ins.type === 'oportunidade'
            ? SEVERITY_OPORTUNIDADE
            : SEVERITY_COLORS[ins.severity] ?? SEVERITY_COLORS.info

          return (
            <div key={ins.id} className={`rounded-lg border p-4 ${colorClass}`}>
              <p className="text-sm font-semibold">{ins.titulo}</p>
              <p className="mt-1 text-xs opacity-80">{ins.descricao}</p>
              {ins.recomendacao && (
                <p className="mt-2 text-xs italic opacity-70">{ins.recomendacao}</p>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─── Section 2: Vendas (AreaChart) ───────────────────────────
function SecaoVendas({ data }: { data: VendasMensalRow[] }) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => a.mes.localeCompare(b.mes)),
    [data],
  )

  if (sorted.length === 0) {
    return (
      <Card title="Vendas Mensais">
        <EstadoVazio mensagem="Sem dados de vendas mensais." />
      </Card>
    )
  }

  const chartData = sorted.map((r) => ({
    mes: formatMesLabel(r.mes),
    receita: r.receita,
    ticket_medio: r.ticket_medio,
  }))

  return (
    <Card title="Vendas Mensais">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="mes" tick={{ fill: AXIS_TICK, fontSize: 12 }} />
          <YAxis
            yAxisId="left"
            tick={{ fill: AXIS_TICK, fontSize: 12 }}
            tickFormatter={(v: number) => formatCurrency(v)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: AXIS_TICK, fontSize: 12 }}
            tickFormatter={(v: number) => formatCurrency(v)}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === 'receita' ? 'Receita' : 'Ticket Medio',
            ]}
          />
          <Legend />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="receita"
            name="Receita"
            stroke={GREEN}
            fill={GREEN}
            fillOpacity={0.2}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="ticket_medio"
            name="Ticket Medio"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ─── Section 3: Recorrencia (stacked BarChart) ───────────────
function SecaoRecorrencia({ data }: { data: RecorrenciaRow[] }) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => a.mes.localeCompare(b.mes)),
    [data],
  )

  if (sorted.length === 0) {
    return (
      <Card title="Recorrencia de Clientes">
        <EstadoVazio mensagem="Sem dados de recorrencia." />
      </Card>
    )
  }

  const chartData = sorted.map((r) => ({
    mes: formatMesLabel(r.mes),
    clientes_novos: r.clientes_novos,
    clientes_recorrentes: r.clientes_recorrentes,
    taxa_recompra: r.taxa_recompra,
  }))

  return (
    <Card title="Recorrencia de Clientes">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="mes" tick={{ fill: AXIS_TICK, fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fill: AXIS_TICK, fontSize: 12 }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: AXIS_TICK, fontSize: 12 }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number, name: string) => {
              if (name === 'taxa_recompra') return [formatPercent(value), 'Taxa Recompra']
              return [formatNumber(value), name === 'clientes_novos' ? 'Novos' : 'Recorrentes']
            }}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="clientes_novos" name="Novos" stackId="a" fill={BLUE} />
          <Bar yAxisId="left" dataKey="clientes_recorrentes" name="Recorrentes" stackId="a" fill={EMERALD} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="taxa_recompra"
            name="Taxa Recompra"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ─── Section 4: Produtos Top 10 ─────────────────────────────
function SecaoProdutos({ data }: { data: ShopifyProdutoRank[] }) {
  const top10 = useMemo(() => data.slice(0, 10), [data])

  if (top10.length === 0) {
    return (
      <Card title="Top 10 Produtos">
        <EstadoVazio mensagem="Sem dados de produtos." />
      </Card>
    )
  }

  const maxReceita = Math.max(...top10.map((p) => p.receita_total), 1)

  return (
    <Card title="Top 10 Produtos">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 px-2 w-8">#</th>
              <th className="py-2 px-2">Produto</th>
              <th className="py-2 px-2">SKU</th>
              <th className="py-2 px-2 text-right">Qtd</th>
              <th className="py-2 px-2 text-right">Receita</th>
              <th className="py-2 px-2 text-right">Preco Medio</th>
              <th className="py-2 px-2 w-40"></th>
            </tr>
          </thead>
          <tbody>
            {top10.map((p, i) => {
              const barWidth = (p.receita_total / maxReceita) * 100
              return (
                <tr key={p.sku || i} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-2.5 px-2 text-gray-400 font-mono">{i + 1}</td>
                  <td className="py-2.5 px-2 text-gray-700 dark:text-gray-200 font-medium truncate max-w-[200px]">
                    {p.produto}
                  </td>
                  <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400 font-mono text-xs">
                    {p.sku || '-'}
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">
                    {formatNumber(p.qtd_vendida)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">
                    {formatCurrency(p.receita_total)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">
                    {formatCurrency(p.preco_medio)}
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ─── Section 5: Cohort Heatmap ───────────────────────────────
function SecaoCohort({ data }: { data: ShopifyCohort[] }) {
  const { cohortMonths, purchaseOffsets, matrix, baselines } = useMemo(() => {
    if (data.length === 0) return { cohortMonths: [], purchaseOffsets: [], matrix: new Map(), baselines: new Map() }

    // Group by cohort_mes
    const grouped = new Map<string, ShopifyCohort[]>()
    for (const row of data) {
      const arr = grouped.get(row.cohort_mes) || []
      arr.push(row)
      grouped.set(row.cohort_mes, arr)
    }

    const sortedCohorts = [...grouped.keys()].sort()

    // For each cohort, compute month offsets
    let maxOffset = 0
    const mat = new Map<string, Map<number, number>>() // cohort -> offset -> clientes
    const bases = new Map<string, number>() // cohort -> month-0 clientes

    for (const cohort of sortedCohorts) {
      const rows = grouped.get(cohort)!.sort((a, b) => a.mes_compra.localeCompare(b.mes_compra))
      const offsetMap = new Map<number, number>()

      for (let i = 0; i < rows.length; i++) {
        offsetMap.set(i, rows[i].clientes)
      }

      bases.set(cohort, rows[0]?.clientes ?? 0)
      mat.set(cohort, offsetMap)
      if (rows.length - 1 > maxOffset) maxOffset = rows.length - 1
    }

    const offsets = Array.from({ length: maxOffset + 1 }, (_, i) => i)
    return { cohortMonths: sortedCohorts, purchaseOffsets: offsets, matrix: mat, baselines: bases }
  }, [data])

  if (cohortMonths.length === 0) {
    return (
      <Card title="Cohort de Retencao">
        <EstadoVazio mensagem="Sem dados de cohort." />
      </Card>
    )
  }

  return (
    <Card title="Cohort de Retencao">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="py-2 px-2 text-left text-gray-500 dark:text-gray-400 font-semibold">Cohort</th>
              {purchaseOffsets.map((off) => (
                <th key={off} className="py-2 px-2 text-center text-gray-500 dark:text-gray-400 font-semibold">
                  M{off}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohortMonths.map((cohort) => {
              const baseline = baselines.get(cohort) ?? 0
              const offsetMap = matrix.get(cohort)!

              return (
                <tr key={cohort}>
                  <td className="py-1.5 px-2 text-gray-600 dark:text-gray-300 font-mono whitespace-nowrap">
                    {formatMesLabel(cohort)}
                  </td>
                  {purchaseOffsets.map((off) => {
                    const clientes = offsetMap.get(off)
                    if (clientes == null) {
                      return <td key={off} className="py-1.5 px-2" />
                    }
                    const retention = baseline > 0 ? clientes / baseline : 0
                    const pctLabel = off === 0 ? formatNumber(clientes) : `${(retention * 100).toFixed(0)}%`

                    return (
                      <td key={off} className="py-1.5 px-2 text-center">
                        <div
                          className="rounded px-1.5 py-1 text-white font-medium bg-emerald-500"
                          style={{ opacity: off === 0 ? 1 : Math.max(retention, 0.1) }}
                        >
                          {pctLabel}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ─── Main Page ───────────────────────────────────────────────
export default function FunilPage() {
  useDocumentTitle('Funil de Vendas')

  const { data: vendasMensal = [], isLoading: loadingVendas } = useShopifyVendasMensal()
  const { data: recorrencia = [], isLoading: loadingRecorrencia } = useShopifyRecorrencia()
  const { data: produtosRank = [], isLoading: loadingProdutos } = useShopifyProdutosRank()
  const { data: cohort = [], isLoading: loadingCohort } = useShopifyCohort()

  const isLoading = loadingVendas || loadingRecorrencia || loadingProdutos || loadingCohort

  const insights = useMemo(() => {
    if (vendasMensal.length === 0 && recorrencia.length === 0 && produtosRank.length === 0 && cohort.length === 0) {
      return []
    }
    return processInsights(
      generateShopifyInsights({ vendasMensal, recorrencia, produtosRank, cohort }),
    )
  }, [vendasMensal, recorrencia, produtosRank, cohort])

  const hasData = vendasMensal.length > 0 || recorrencia.length > 0 || produtosRank.length > 0 || cohort.length > 0

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Funil de Vendas
        </h2>
        <EstadoVazio
          mensagem="Nenhum dado Shopify encontrado."
          cta="Verifique se as materialized views foram criadas no Supabase."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
        Funil de Vendas
      </h2>

      <SecaoInsights insights={insights} />
      <SecaoVendas data={vendasMensal} />
      <SecaoRecorrencia data={recorrencia} />
      <SecaoProdutos data={produtosRank} />
      <SecaoCohort data={cohort} />
    </div>
  )
}

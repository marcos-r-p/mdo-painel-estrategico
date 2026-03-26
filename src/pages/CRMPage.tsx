import { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  useCrmFiltered, useCrmOrigens, useCrmDealsParados,
} from '../services/queries/useRDStationQueries'
import { generateCrmInsights } from '../lib/insights/crm-insights'
import { processInsights } from '../lib/insights/engine'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import Spinner from '../components/ui/Spinner'
import { formatCurrency, formatPercent, formatNumber, formatMesLabel } from '../lib/formatters'
import type { Insight } from '../lib/insights/types'
import type { CrmOrigem, CrmDealParado } from '../types/crm'
import type {
  CrmFunilFiltered, CrmEvolucaoFiltered, CrmPerdaFiltered,
  CrmResponsavelFiltered, CrmLeadDiario, CrmCanal,
} from '../types/crm-filtered'

// ── Recharts dark theme tokens ───────────────────────────────
const GRID_STROKE = '#374151'
const AXIS_TICK = '#9ca3af'
const TOOLTIP_BG = '#1f2937'
const TOOLTIP_BORDER = '#374151'
const GREEN = '#10b981'
const RED = '#ef4444'
const BLUE = '#3b82f6'
const YELLOW = '#eab308'
const PIE_COLORS = [RED, YELLOW, BLUE, GREEN, '#8b5cf6', '#f97316', '#06b6d4', '#ec4899']

// ── Empty state ──────────────────────────────────────────────
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

// ── Section wrapper ──────────────────────────────────────────
function SecaoCard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        {titulo}
      </h2>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        {children}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 1. INSIGHTS
// ═══════════════════════════════════════════════════════════════
function SecaoInsights({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null

  const severityStyle: Record<string, string> = {
    critico: 'bg-red-500/10 border-red-500/30 text-red-400',
    atencao: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  }
  const typeStyle: Record<string, string> = {
    oportunidade: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        Insights automaticos
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((ins) => {
          const style = typeStyle[ins.type] ?? severityStyle[ins.severity] ?? severityStyle.info
          return (
            <div key={ins.id} className={`border rounded-xl p-4 ${style}`}>
              <p className="text-sm font-semibold mb-1">{ins.titulo}</p>
              <p className="text-xs opacity-80 mb-2">{ins.descricao}</p>
              {ins.metrica.variacao != null && (
                <p className="text-xs font-mono mb-2">
                  {formatNumber(ins.metrica.atual)}
                  {ins.metrica.anterior != null && ` (anterior: ${formatNumber(ins.metrica.anterior)})`}
                  {' '}{formatPercent(ins.metrica.variacao)}
                </p>
              )}
              <p className="text-xs italic opacity-70">{ins.recomendacao}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 2. LEADS DIARIO (bar chart — NEW)
// ═══════════════════════════════════════════════════════════════
function SecaoLeadsDiario({ data }: { data: CrmLeadDiario[] }) {
  if (data.length === 0) {
    return (
      <SecaoCard titulo="Volume de Leads por Dia">
        <p className="text-sm text-gray-500 text-center py-8">Nenhum lead no periodo selecionado</p>
      </SecaoCard>
    )
  }

  const chartData = data.map(d => ({
    dia: new Date(d.dia + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    leads: d.leads,
  }))

  return (
    <SecaoCard titulo="Volume de Leads por Dia">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="dia" tick={{ fill: AXIS_TICK, fontSize: 11 }} interval={Math.max(0, Math.floor(chartData.length / 15))} />
          <YAxis tick={{ fill: AXIS_TICK, fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: TOOLTIP_BG, border: `1px solid ${TOOLTIP_BORDER}`, borderRadius: '8px' }}
            formatter={(v: number) => [v, 'Leads']} />
          <Bar dataKey="leads" fill={BLUE} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </SecaoCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// 3. FUNIL (vertical bar chart)
// ═══════════════════════════════════════════════════════════════
function SecaoFunil({ data }: { data: CrmFunilFiltered[] }) {
  const latestMonth = useMemo(() => {
    if (data.length === 0) return []
    const meses = [...new Set(data.map(d => d.mes))].sort()
    const ultimo = meses[meses.length - 1]
    return data.filter(d => d.mes === ultimo)
  }, [data])

  if (latestMonth.length === 0) {
    return (
      <SecaoCard titulo="Funil de vendas">
        <p className="text-sm text-gray-500 text-center py-8">Nenhum deal no periodo selecionado</p>
      </SecaoCard>
    )
  }

  return (
    <SecaoCard titulo={`Funil de vendas — ${formatMesLabel(latestMonth[0]?.mes)}`}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={latestMonth} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis type="number" tick={{ fill: AXIS_TICK, fontSize: 12 }} />
          <YAxis dataKey="etapa" type="category" tick={{ fill: AXIS_TICK, fontSize: 12 }} width={140} />
          <Tooltip
            contentStyle={{ backgroundColor: TOOLTIP_BG, border: `1px solid ${TOOLTIP_BORDER}`, borderRadius: 8 }}
            labelStyle={{ color: AXIS_TICK }}
            formatter={(value: number, name: string) => {
              if (name === 'valor_total') return [formatCurrency(value), 'Valor total']
              if (name === 'qtd') return [formatNumber(value), 'Quantidade']
              if (name === 'vendas') return [formatNumber(value), 'Vendas']
              if (name === 'perdas') return [formatNumber(value), 'Perdas']
              return [value, name]
            }}
          />
          <Legend />
          <Bar dataKey="qtd" fill={BLUE} name="Quantidade" radius={[0, 4, 4, 0]} />
          <Bar dataKey="vendas" fill={GREEN} name="Vendas" radius={[0, 4, 4, 0]} />
          <Bar dataKey="perdas" fill={RED} name="Perdas" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              <th className="text-left px-3 py-2">Etapa</th>
              <th className="text-right px-3 py-2">Qtd</th>
              <th className="text-right px-3 py-2">Valor total</th>
              <th className="text-right px-3 py-2">Vendas</th>
              <th className="text-right px-3 py-2">Perdas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {latestMonth.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium">{row.etapa}</td>
                <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{formatNumber(row.qtd)}</td>
                <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(row.valor_total)}</td>
                <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">{formatNumber(row.vendas)}</td>
                <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">{formatNumber(row.perdas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SecaoCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// 4. EVOLUCAO MENSAL (line chart)
// ═══════════════════════════════════════════════════════════════
function SecaoEvolucao({ data }: { data: CrmEvolucaoFiltered[] }) {
  const chartData = useMemo(
    () => [...data].sort((a, b) => a.mes.localeCompare(b.mes)).map(d => ({
      ...d,
      label: formatMesLabel(d.mes),
    })),
    [data],
  )

  if (chartData.length === 0) {
    return (
      <SecaoCard titulo="Evolucao mensal">
        <p className="text-sm text-gray-500 text-center py-8">Nenhum deal no periodo selecionado</p>
      </SecaoCard>
    )
  }

  return (
    <SecaoCard titulo="Evolucao mensal — valor vendido vs perdido">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="label" tick={{ fill: AXIS_TICK, fontSize: 12 }} />
          <YAxis tick={{ fill: AXIS_TICK, fontSize: 12 }} tickFormatter={(v: number) => formatCurrency(v)} />
          <Tooltip
            contentStyle={{ backgroundColor: TOOLTIP_BG, border: `1px solid ${TOOLTIP_BORDER}`, borderRadius: 8 }}
            labelStyle={{ color: AXIS_TICK }}
            formatter={(value: number, name: string) => {
              if (name === 'valor_vendido') return [formatCurrency(value), 'Vendido']
              if (name === 'valor_perdido') return [formatCurrency(value), 'Perdido']
              return [formatCurrency(value), name]
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="valor_vendido" stroke={GREEN} name="valor_vendido" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="valor_perdido" stroke={RED} name="valor_perdido" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </SecaoCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// 5. CANAIS (table — NEW)
// ═══════════════════════════════════════════════════════════════
function SecaoCanais({ data }: { data: CrmCanal[] }) {
  if (data.length === 0) {
    return (
      <SecaoCard titulo="Analise por Canal">
        <p className="text-sm text-gray-500 text-center py-8">Nenhum dado de canal no periodo</p>
      </SecaoCard>
    )
  }

  const totalLeads = data.reduce((a, c) => a + c.total_leads, 0)
  const semCanal = data.find(c => c.canal === 'Sem canal definido')
  const pctSemCanal = semCanal && totalLeads > 0 ? Math.round((semCanal.total_leads / totalLeads) * 100) : 0
  const maxLeads = Math.max(...data.map(c => c.total_leads), 1)

  return (
    <SecaoCard titulo="Analise por Canal">
      {pctSemCanal > 80 && (
        <div className="mb-4 rounded-lg border p-4 bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
          <p className="text-sm font-semibold">{pctSemCanal}% dos leads nao tem canal identificado</p>
          <p className="text-xs mt-1 opacity-80">Configure UTMs obrigatorios no RD Station para rastrear ROI por canal</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 px-2">Canal</th>
              <th className="py-2 px-2 text-right">Leads</th>
              <th className="py-2 px-2 text-right">Vendas</th>
              <th className="py-2 px-2 text-right">Conversao</th>
              <th className="py-2 px-2 text-right">Valor Vendas</th>
              <th className="py-2 px-2 text-right">Ticket Medio</th>
              <th className="py-2 px-2 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((c, i) => {
              const isSemCanal = c.canal === 'Sem canal definido'
              return (
                <tr key={i} className={`border-b border-gray-100 dark:border-gray-700/50 ${isSemCanal ? 'bg-yellow-500/10' : ''}`}>
                  <td className="py-2.5 px-2 font-medium text-gray-700 dark:text-gray-200">{c.canal}</td>
                  <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">{formatNumber(c.total_leads)}</td>
                  <td className="py-2.5 px-2 text-right text-green-400">{formatNumber(c.vendas)}</td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.taxa_conversao >= 30 ? 'bg-green-900 text-green-300' : c.taxa_conversao > 0 ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-500'}`}>
                      {c.taxa_conversao}%
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-300">{formatCurrency(c.valor_vendas)}</td>
                  <td className="py-2.5 px-2 text-right text-gray-300">{c.ticket_medio != null ? formatCurrency(c.ticket_medio) : '\u2014'}</td>
                  <td className="py-2.5 px-2">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(c.total_leads / maxLeads) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </SecaoCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// 6. PERDAS (donut + table) — updated with empty-state banner
// ═══════════════════════════════════════════════════════════════
function SecaoPerdas({ data }: { data: CrmPerdaFiltered[] }) {
  const top5 = useMemo(() => data.slice(0, 5), [data])

  const allSemMotivo = data.length === 0 || data.every(p => p.motivo === 'Sem motivo')
  if (allSemMotivo) {
    return (
      <SecaoCard titulo="Motivos de perda">
        <div className="rounded-lg border p-4 bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
          <p className="text-sm font-semibold">Nenhum motivo de perda registrado no RD Station</p>
          <p className="text-xs mt-1 opacity-80">Configure os motivos de perda nas configuracoes do RD Station para habilitar esta analise</p>
        </div>
      </SecaoCard>
    )
  }

  return (
    <SecaoCard titulo="Motivos de perda">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={top5}
              dataKey="qtd"
              nameKey="motivo"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              label={({ motivo, percentual }: { motivo: string; percentual: number | null }) =>
                `${motivo.slice(0, 15)}${motivo.length > 15 ? '...' : ''} (${percentual ?? 0}%)`
              }
            >
              {top5.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: TOOLTIP_BG, border: `1px solid ${TOOLTIP_BORDER}`, borderRadius: 8 }}
              formatter={(value: number) => [formatNumber(value), 'Quantidade']}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                <th className="text-left px-3 py-2">Motivo</th>
                <th className="text-right px-3 py-2">Qtd</th>
                <th className="text-right px-3 py-2">%</th>
                <th className="text-right px-3 py-2">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.map((p, i) => {
                const pct = p.percentual ?? 0
                const isCritico = pct >= 20
                return (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium">
                      {isCritico && <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2" />}
                      {p.motivo}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{formatNumber(p.qtd)}</td>
                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{pct}%</td>
                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(p.valor_total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </SecaoCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// 7. RESPONSAVEIS (table with bar indicators)
// ═══════════════════════════════════════════════════════════════
function SecaoResponsaveis({ data }: { data: CrmResponsavelFiltered[] }) {
  const maxDeals = useMemo(() => Math.max(...data.map(r => r.total_deals), 1), [data])

  if (data.length === 0) {
    return (
      <SecaoCard titulo="Performance por responsavel">
        <p className="text-sm text-gray-500 text-center py-8">Nenhum deal no periodo selecionado</p>
      </SecaoCard>
    )
  }

  return (
    <SecaoCard titulo="Performance por responsavel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              <th className="text-left px-3 py-2">Responsavel</th>
              <th className="text-right px-3 py-2">Total deals</th>
              <th className="text-left px-3 py-2 w-32">Volume</th>
              <th className="text-right px-3 py-2">Vendas</th>
              <th className="text-right px-3 py-2">Conversao</th>
              <th className="text-right px-3 py-2">Ticket medio</th>
              <th className="text-right px-3 py-2">Valor vendas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.map((r, i) => {
              const convColor =
                r.taxa_conversao >= 40 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                r.taxa_conversao >= 20 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              return (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium">{r.responsavel}</td>
                  <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{formatNumber(r.total_deals)}</td>
                  <td className="px-3 py-2">
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(r.total_deals / maxDeals) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">{formatNumber(r.vendas)}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${convColor}`}>
                      {r.taxa_conversao > 0 ? `${r.taxa_conversao}%` : '\u2014'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                    {r.ticket_medio != null && r.ticket_medio > 0 ? formatCurrency(r.ticket_medio) : '\u2014'}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">
                    {r.valor_total_vendas > 0 ? formatCurrency(r.valor_total_vendas) : '\u2014'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </SecaoCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// 8. ORIGENS (horizontal bar chart — unchanged, materialized view)
// ═══════════════════════════════════════════════════════════════
function SecaoOrigens({ data }: { data: CrmOrigem[] }) {
  if (data.length === 0) {
    return (
      <SecaoCard titulo="Origem dos leads">
        <EstadoVazio mensagem="Sem dados de origens disponiveis" />
      </SecaoCard>
    )
  }

  return (
    <SecaoCard titulo="Origem dos leads">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis type="number" tick={{ fill: AXIS_TICK, fontSize: 12 }} />
          <YAxis dataKey="origem" type="category" tick={{ fill: AXIS_TICK, fontSize: 12 }} width={140} />
          <Tooltip
            contentStyle={{ backgroundColor: TOOLTIP_BG, border: `1px solid ${TOOLTIP_BORDER}`, borderRadius: 8 }}
            labelStyle={{ color: AXIS_TICK }}
            formatter={(value: number, name: string) => {
              if (name === 'total') return [formatNumber(value), 'Total leads']
              if (name === 'taxa_conversao') return [`${value}%`, 'Taxa conversao']
              if (name === 'valor_convertido') return [formatCurrency(value), 'Valor convertido']
              return [value, name]
            }}
          />
          <Legend />
          <Bar dataKey="total" fill={BLUE} name="total" radius={[0, 4, 4, 0]} />
          <Bar dataKey="convertidos" fill={GREEN} name="convertidos" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </SecaoCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// 9. DEALS PARADOS (urgency table — unchanged, materialized view)
// ═══════════════════════════════════════════════════════════════
function SecaoDealsParados({ data }: { data: CrmDealParado[] }) {
  if (data.length === 0) {
    return (
      <SecaoCard titulo="Deals parados">
        <EstadoVazio mensagem="Nenhum deal parado encontrado" cta="Otimo! Todos os deals estao em movimento." />
      </SecaoCard>
    )
  }

  return (
    <SecaoCard titulo={`Deals parados (${data.length})`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              <th className="text-left px-3 py-2">Deal</th>
              <th className="text-left px-3 py-2">Etapa</th>
              <th className="text-right px-3 py-2">Valor</th>
              <th className="text-left px-3 py-2">Responsavel</th>
              <th className="text-right px-3 py-2">Dias parado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.map((deal) => {
              const badgeColor =
                deal.dias_parado > 30 ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
                deal.dias_parado > 14 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              return (
                <tr key={deal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium max-w-[200px] truncate">
                    {deal.deal_nome}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{deal.etapa}</td>
                  <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(deal.valor)}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{deal.responsavel ?? '\u2014'}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
                      {deal.dias_parado}d
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </SecaoCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function CRMPage() {
  useDocumentTitle('CRM')

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const { data: filtered, isLoading: loadingFiltered } = useCrmFiltered(dateFrom, dateTo)
  const { data: origens = [], isLoading: loadingOrigens } = useCrmOrigens()
  const { data: dealsParados = [], isLoading: loadingDeals } = useCrmDealsParados()

  const isLoading = loadingFiltered || loadingOrigens || loadingDeals

  const insights = useMemo(() => {
    if (!filtered) return []
    return processInsights(
      generateCrmInsights({
        funil: filtered.funil,
        evolucao: filtered.evolucao,
        responsaveis: filtered.responsaveis,
        perdas: filtered.perdas,
        canais: filtered.canais,
        leadsDiario: filtered.leads_diario,
        dealsParados,
        origens,
      })
    )
  }, [filtered, dealsParados, origens])

  function setQuickRange(days: number) {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)
    setDateFrom(from.toISOString().split('T')[0])
    setDateTo(to.toISOString().split('T')[0])
  }

  if (isLoading) return <Spinner />

  const hasData = (filtered && (
    filtered.funil.length > 0 || filtered.evolucao.length > 0 ||
    filtered.perdas.length > 0 || filtered.responsaveis.length > 0 ||
    filtered.leads_diario.length > 0 || filtered.canais.length > 0
  )) || origens.length > 0 || dealsParados.length > 0

  if (!hasData) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Performance CRM</h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                max={dateTo}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300" />
              <span className="text-gray-500 text-sm">ate</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                min={dateFrom} max={new Date().toISOString().split('T')[0]}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300" />
            </div>
            <div className="flex gap-1">
              {[{ label: '7d', days: 7 }, { label: '30d', days: 30 }, { label: '90d', days: 90 }, { label: '6m', days: 180 }].map(opt => (
                <button key={opt.label} onClick={() => setQuickRange(opt.days)}
                  className="px-2.5 py-1 text-xs rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 transition">
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <EstadoVazio
          mensagem="Nenhum dado de CRM disponivel"
          cta="Verifique a integracao com o RD Station e aguarde a sincronizacao."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Performance CRM</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              max={dateTo}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300" />
            <span className="text-gray-500 text-sm">ate</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              min={dateFrom} max={new Date().toISOString().split('T')[0]}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300" />
          </div>
          <div className="flex gap-1">
            {[{ label: '7d', days: 7 }, { label: '30d', days: 30 }, { label: '90d', days: 90 }, { label: '6m', days: 180 }].map(opt => (
              <button key={opt.label} onClick={() => setQuickRange(opt.days)}
                className="px-2.5 py-1 text-xs rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 transition">
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <SecaoInsights insights={insights} />
      <SecaoLeadsDiario data={filtered?.leads_diario ?? []} />
      <SecaoFunil data={filtered?.funil ?? []} />
      <SecaoEvolucao data={filtered?.evolucao ?? []} />
      <SecaoCanais data={filtered?.canais ?? []} />
      <SecaoPerdas data={filtered?.perdas ?? []} />
      <SecaoResponsaveis data={filtered?.responsaveis ?? []} />
      <SecaoOrigens data={origens} />
      <SecaoDealsParados data={dealsParados} />
    </div>
  )
}

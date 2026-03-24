import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { supabase } from '../services/supabase'
import { DADOS } from '../data/seed'
import { formatCurrency } from '../lib/formatters'
import SectionCard from '../components/ui/SectionCard'
import Badge from '../components/ui/Badge'
import DetailModal from '../components/ui/DetailModal'
import Spinner from '../components/ui/Spinner'

// ----- Types -----
interface RFMCliente {
  nome: string
  valor: number
  pedidos: number
  r_score: number
  f_score: number
  m_score: number
  tipo: string
  uf: string
  ticketMedio: number
  ultimaCompra: string | null
}

interface Segmento {
  key: string
  nome: string
  rMin: number
  rMax: number
  fMin: number
  fMax: number
  cor: string
  badge: string
  acao: string
}

interface SegmentoData extends Segmento {
  clientes: RFMCliente[]
  receita: number
}

interface SegmentSelection {
  nome: string
  clientes: RFMCliente[]
  receita: number
}

// ----- Segment definitions -----
const SEGMENTOS: Segmento[] = [
  { key: 'campeoes', nome: 'Campeoes', rMin: 4, rMax: 5, fMin: 4, fMax: 5, cor: '#10b981', badge: 'positivo', acao: 'Programa VIP, acesso antecipado, upsell premium' },
  { key: 'fieis', nome: 'Clientes Fieis', rMin: 3, rMax: 5, fMin: 3, fMax: 5, cor: '#3b82f6', badge: 'baixo', acao: 'Cross-sell, programa de fidelidade' },
  { key: 'alto_valor', nome: 'Alto Valor', rMin: 3, rMax: 5, fMin: 1, fMax: 3, cor: '#8b5cf6', badge: 'baixo', acao: 'Incentivar recompra, ofertas exclusivas' },
  { key: 'potenciais', nome: 'Potenciais Leais', rMin: 3, rMax: 4, fMin: 2, fMax: 3, cor: '#06b6d4', badge: 'baixo', acao: 'Nutrir relacionamento, segundo pedido' },
  { key: 'novos', nome: 'Novos/Recentes', rMin: 4, rMax: 5, fMin: 1, fMax: 1, cor: '#f59e0b', badge: 'medio', acao: 'Onboarding, cupom segunda compra' },
  { key: 'regulares', nome: 'Regulares', rMin: 2, rMax: 3, fMin: 2, fMax: 3, cor: '#64748b', badge: 'medio', acao: 'Manter engajamento, newsletter' },
  { key: 'em_risco', nome: 'Em Risco', rMin: 2, rMax: 3, fMin: 3, fMax: 5, cor: '#f97316', badge: 'alto', acao: 'Campanha reativacao urgente, desconto especial' },
  { key: 'nao_perder', nome: 'Nao Pode Perder', rMin: 1, rMax: 2, fMin: 4, fMax: 5, cor: '#ef4444', badge: 'critico', acao: 'Contato pessoal, oferta irrecusavel' },
  { key: 'hibernando', nome: 'Hibernando', rMin: 1, rMax: 2, fMin: 2, fMax: 3, cor: '#94a3b8', badge: 'medio', acao: 'Email reativacao, promos sazonais' },
  { key: 'perdidos', nome: 'Perdidos', rMin: 1, rMax: 1, fMin: 1, fMax: 1, cor: '#cbd5e1', badge: 'medio', acao: 'Win-back agressivo ou descartar' },
]

// Color scale for the 5x5 grid cells
const CELL_COLORS: Record<string, string> = {
  high: 'bg-green-500/80 dark:bg-green-600/70',
  medHigh: 'bg-green-300/70 dark:bg-green-500/50',
  med: 'bg-yellow-300/60 dark:bg-yellow-500/40',
  medLow: 'bg-orange-300/60 dark:bg-orange-500/40',
  low: 'bg-red-300/50 dark:bg-red-500/30',
}

function getCellColor(r: number, f: number): string {
  const score = r + f
  if (score >= 9) return CELL_COLORS.high
  if (score >= 7) return CELL_COLORS.medHigh
  if (score >= 5) return CELL_COLORS.med
  if (score >= 3) return CELL_COLORS.medLow
  return CELL_COLORS.low
}

// Assign simulated RFM scores to fallback data
function simulateRFM(clientes: Array<Record<string, unknown>>): RFMCliente[] {
  return clientes.map((c, i) => {
    const rScore = (c.r_score as number) || Math.max(1, Math.min(5, 5 - Math.floor(i / 2)))
    const fScore = (c.f_score as number) || Math.max(1, Math.min(5, Math.min((c.pedidos as number) || 1, 5)))
    const mScore = (c.m_score as number) || Math.max(1, Math.min(5, Math.ceil(((c.valor as number) || 0) / 600)))
    return {
      nome: (c.nome as string) || 'Sem nome',
      valor: (c.valor as number) || 0,
      pedidos: (c.pedidos as number) || 0,
      r_score: rScore,
      f_score: fScore,
      m_score: mScore,
      tipo: (c.tipo as string) || 'B2C',
      uf: (c.uf as string) || '',
      ticketMedio: (c.ticketMedio as number) || 0,
      ultimaCompra: null,
    }
  })
}

function classifySegment(r: number, f: number): Segmento {
  for (const seg of SEGMENTOS) {
    if (r >= seg.rMin && r <= seg.rMax && f >= seg.fMin && f <= seg.fMax) {
      return seg
    }
  }
  return SEGMENTOS[SEGMENTOS.length - 1] // fallback: Perdidos
}

export default function MatrizRFMPage() {
  useDocumentTitle('Matriz RFM')
  const [searchParams] = useSearchParams()
  const fonteAtiva = searchParams.get('fonte')

  const [clientes, setClientes] = useState<RFMCliente[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [viewMode, setViewMode] = useState<string>('matriz')
  const [selectedSegment, setSelectedSegment] = useState<SegmentSelection | null>(null)
  const [selectedCliente, setSelectedCliente] = useState<RFMCliente | null>(null)
  const [expandedSegments, setExpandedSegments] = useState<Record<string, boolean>>({})

  // Load data from Supabase or fallback
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('vw_rfm_clientes')
          .select('*')
          .limit(5000)

        if (!error && data && data.length > 0 && !cancelled) {
          setClientes(data.map((d: Record<string, unknown>) => ({
            nome: (d.nome as string) || (d.cliente_nome as string) || 'Sem nome',
            valor: (d.valor_total as number) || (d.monetary as number) || 0,
            pedidos: (d.total_pedidos as number) || (d.frequency as number) || 0,
            r_score: (d.r_score as number) || 3,
            f_score: (d.f_score as number) || 3,
            m_score: (d.m_score as number) || 3,
            tipo: (d.tipo as string) || 'B2C',
            uf: (d.uf as string) || '',
            ticketMedio: (d.ticket_medio as number) || 0,
            ultimaCompra: (d.ultima_compra as string) || null,
          })))
        } else if (!cancelled) {
          // Fallback
          setClientes(simulateRFM(DADOS.topClientes || []))
        }
      } catch {
        if (!cancelled) setClientes(simulateRFM(DADOS.topClientes || []))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Build 5x5 matrix
  const matrix = useMemo(() => {
    const grid: Record<string, RFMCliente[]> = {}
    for (let r = 1; r <= 5; r++) {
      for (let f = 1; f <= 5; f++) {
        grid[`${r}-${f}`] = []
      }
    }
    clientes.forEach((c) => {
      const r = Math.max(1, Math.min(5, c.r_score || 1))
      const f = Math.max(1, Math.min(5, c.f_score || 1))
      const key = `${r}-${f}`
      if (grid[key]) grid[key].push(c)
    })
    return grid
  }, [clientes])

  // Classify clients into segments
  const segmentosData = useMemo<SegmentoData[]>(() => {
    const map: Record<string, SegmentoData> = {}
    SEGMENTOS.forEach((s) => {
      map[s.key] = { ...s, clientes: [], receita: 0 }
    })
    clientes.forEach((c) => {
      const seg = classifySegment(c.r_score || 1, c.f_score || 1)
      if (map[seg.key]) {
        map[seg.key].clientes.push(c)
        map[seg.key].receita += c.valor || 0
      }
    })
    return Object.values(map)
  }, [clientes])

  // Summary stats
  const totalClientes = clientes.length
  const emRisco = useMemo(
    () => segmentosData.filter((s) => ['em_risco', 'nao_perder', 'hibernando', 'perdidos'].includes(s.key))
      .reduce((sum, s) => sum + s.clientes.length, 0),
    [segmentosData]
  )
  const receitaEmRisco = useMemo(
    () => segmentosData.filter((s) => ['em_risco', 'nao_perder', 'hibernando', 'perdidos'].includes(s.key))
      .reduce((sum, s) => sum + s.receita, 0),
    [segmentosData]
  )

  function toggleSegmentExpand(key: string) {
    setExpandedSegments((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
        <span className="ml-3 text-sm text-gray-500">Carregando dados RFM...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          Matriz RFM
          {fonteAtiva && (
            <span className="ml-2 text-sm font-normal text-gray-500">({fonteAtiva})</span>
          )}
        </h2>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
          {[
            { key: 'matriz', label: 'Matriz 5x5' },
            { key: 'segmentos', label: 'Segmentos' },
            { key: 'todos', label: 'Todos' },
          ].map((v) => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              className={`
                rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                ${viewMode === v.key
                  ? 'bg-white text-blue-700 shadow-sm dark:bg-gray-900 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }
              `}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40">
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Segmentos</p>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {SEGMENTOS.length}
          </p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/40">
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Clientes Analisados</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
            {totalClientes}
          </p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/40">
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Em Risco</p>
          <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">
            {emRisco}
          </p>
          <p className="text-xs text-gray-500">{totalClientes > 0 ? ((emRisco / totalClientes) * 100).toFixed(0) : 0}% da base</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Receita em Risco</p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(receitaEmRisco)}
          </p>
        </div>
      </div>

      {/* ===== MATRIZ VIEW ===== */}
      {viewMode === 'matriz' && (
        <SectionCard title="Matriz RFM 5x5">
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Recencia (R) no eixo Y, Frequencia (F) no eixo X. Clique em uma celula para ver os clientes.
          </p>
          <div className="overflow-x-auto">
            <div className="inline-block">
              {/* Column headers */}
              <div className="mb-1 flex">
                <div className="w-12" />
                {[1, 2, 3, 4, 5].map((f) => (
                  <div key={f} className="w-20 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                    F={f}
                  </div>
                ))}
              </div>
              {/* Rows (R from 5 to 1, top to bottom) */}
              {[5, 4, 3, 2, 1].map((r) => (
                <div key={r} className="flex items-center">
                  <div className="w-12 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 pr-2">
                    R={r}
                  </div>
                  {[1, 2, 3, 4, 5].map((f) => {
                    const key = `${r}-${f}`
                    const cellClientes = matrix[key] || []
                    const count = cellClientes.length
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          if (count > 0) {
                            setSelectedSegment({
                              nome: `R=${r}, F=${f}`,
                              clientes: cellClientes,
                              receita: cellClientes.reduce((s, c) => s + (c.valor || 0), 0),
                            })
                          }
                        }}
                        className={`
                          m-0.5 flex h-16 w-[4.5rem] flex-col items-center justify-center rounded-lg
                          border border-white/50 text-xs font-medium transition-all
                          hover:scale-105 hover:shadow-md
                          ${getCellColor(r, f)}
                          ${count === 0 ? 'opacity-40 cursor-default' : 'cursor-pointer'}
                        `}
                      >
                        <span className="text-base font-bold text-gray-800 dark:text-white">{count}</span>
                        {count > 0 && (
                          <span className="text-[10px] text-gray-600 dark:text-gray-300">clientes</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Segment legend */}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {SEGMENTOS.map((s) => (
              <div key={s.key} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: s.cor }}
                />
                <span className="text-gray-600 dark:text-gray-400">{s.nome}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ===== SEGMENTOS VIEW ===== */}
      {viewMode === 'segmentos' && (
        <div className="space-y-3">
          {segmentosData.map((seg) => (
            <SectionCard key={seg.key} className="!p-0 overflow-hidden">
              <button
                onClick={() => toggleSegmentExpand(seg.key)}
                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block h-4 w-4 rounded-full"
                    style={{ backgroundColor: seg.cor }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {seg.nome}
                    </p>
                    <p className="text-xs text-gray-500">{seg.acao}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {seg.clientes.length} clientes
                    </p>
                    <p className="text-xs text-gray-500">{formatCurrency(seg.receita)}</p>
                  </div>
                  <Badge type={seg.badge}>
                    {seg.badge === 'critico' ? 'Critico' : seg.badge === 'alto' ? 'Alto' : seg.badge === 'positivo' ? 'Top' : 'Medio'}
                  </Badge>
                  <svg
                    className={`h-4 w-4 text-gray-400 transition-transform ${expandedSegments[seg.key] ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedSegments[seg.key] && (
                <div className="border-t border-gray-100 p-4 dark:border-gray-800">
                  {seg.clientes.length === 0 ? (
                    <p className="text-sm text-gray-400">Nenhum cliente neste segmento.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {seg.clientes.slice(0, 20).map((c, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedCliente(c)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{i + 1}.</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{c.nome}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">
                              R{c.r_score} F{c.f_score} M{c.m_score}
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {formatCurrency(c.valor)}
                            </span>
                          </div>
                        </button>
                      ))}
                      {seg.clientes.length > 20 && (
                        <p className="mt-2 text-center text-xs text-gray-400">
                          +{seg.clientes.length - 20} clientes nao exibidos
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          ))}
        </div>
      )}

      {/* ===== TODOS VIEW ===== */}
      {viewMode === 'todos' && (
        <SectionCard title={`Todos os Clientes (${totalClientes})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Nome</th>
                  <th className="pb-3 pr-4 text-center">R</th>
                  <th className="pb-3 pr-4 text-center">F</th>
                  <th className="pb-3 pr-4 text-center">M</th>
                  <th className="pb-3 pr-4 text-right">Valor</th>
                  <th className="pb-3 pr-4 text-right">Pedidos</th>
                  <th className="pb-3 text-center">Segmento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {clientes.slice(0, 100).map((c, i) => {
                  const seg = classifySegment(c.r_score || 1, c.f_score || 1)
                  return (
                    <tr
                      key={i}
                      onClick={() => setSelectedCliente(c)}
                      className="cursor-pointer text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-2.5 pr-4 text-gray-400">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-medium">{c.nome}</td>
                      <td className="py-2.5 pr-4 text-center">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {c.r_score}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-center">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          {c.f_score}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-center">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                          {c.m_score}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold">{formatCurrency(c.valor)}</td>
                      <td className="py-2.5 pr-4 text-right">{c.pedidos}</td>
                      <td className="py-2.5 text-center">
                        <Badge type={seg.badge}>{seg.nome}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {clientes.length > 100 && (
              <p className="mt-3 text-center text-xs text-gray-400">
                Exibindo 100 de {clientes.length} clientes
              </p>
            )}
          </div>
        </SectionCard>
      )}

      {/* Prioritized Actions */}
      <SectionCard title="Acoes Priorizadas">
        <div className="space-y-3">
          {segmentosData
            .filter((s) => s.clientes.length > 0)
            .sort((a, b) => {
              const priority: Record<string, number> = { critico: 0, alto: 1, medio: 2, baixo: 3, positivo: 4 }
              return (priority[a.badge] ?? 5) - (priority[b.badge] ?? 5)
            })
            .slice(0, 6)
            .map((seg, i) => (
              <div
                key={seg.key}
                className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: seg.cor }}
                    />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {seg.nome}
                    </span>
                    <Badge type={seg.badge}>
                      {seg.clientes.length} clientes
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{seg.acao}</p>
                  <p className="mt-0.5 text-xs font-medium text-gray-500">
                    Receita: {formatCurrency(seg.receita)}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </SectionCard>

      {/* Cell Detail Modal (from matrix click) */}
      <DetailModal
        isOpen={!!selectedSegment}
        onClose={() => setSelectedSegment(null)}
        title={selectedSegment?.nome || 'Clientes'}
      >
        {selectedSegment && (
          <div className="space-y-3">
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-gray-500">Clientes:</span>
                <span className="ml-1 font-bold">{selectedSegment.clientes.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Receita:</span>
                <span className="ml-1 font-bold">{formatCurrency(selectedSegment.receita)}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {selectedSegment.clientes.slice(0, 30).map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <span className="text-gray-700 dark:text-gray-300">{c.nome}</span>
                  <span className="font-semibold">{formatCurrency(c.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DetailModal>

      {/* Client Detail Modal */}
      <DetailModal
        isOpen={!!selectedCliente}
        onClose={() => setSelectedCliente(null)}
        title={selectedCliente?.nome || 'Cliente'}
      >
        {selectedCliente && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Recencia (R)', value: selectedCliente.r_score, color: 'blue' },
                { label: 'Frequencia (F)', value: selectedCliente.f_score, color: 'green' },
                { label: 'Monetario (M)', value: selectedCliente.m_score, color: 'purple' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-gray-100 p-3 text-center dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className={`mt-1 text-2xl font-bold text-${s.color}-600 dark:text-${s.color}-400`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Valor Total</p>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {formatCurrency(selectedCliente.valor)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pedidos</p>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {selectedCliente.pedidos}
                </p>
              </div>
              {selectedCliente.ticketMedio > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ticket Medio</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {formatCurrency(selectedCliente.ticketMedio)}
                  </p>
                </div>
              )}
              {selectedCliente.uf && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">UF</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {selectedCliente.uf}
                  </p>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Segmento</p>
              <div className="mt-1 flex items-center gap-2">
                {(() => {
                  const seg = classifySegment(selectedCliente.r_score, selectedCliente.f_score)
                  return (
                    <>
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: seg.cor }} />
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{seg.nome}</span>
                      <Badge type={seg.badge}>{seg.badge}</Badge>
                    </>
                  )
                })()}
              </div>
            </div>
            {(() => {
              const seg = classifySegment(selectedCliente.r_score, selectedCliente.f_score)
              return (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/40">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Acao recomendada</p>
                  <p className="mt-1 text-sm text-blue-600 dark:text-blue-300">{seg.acao}</p>
                </div>
              )
            })()}
          </div>
        )}
      </DetailModal>
    </div>
  )
}

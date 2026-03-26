import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { supabase } from '../services/supabase'
import { formatCurrency, formatMesLabel } from '../lib/formatters'
import { useResumoMensal } from '../services/queries/useDashboardQueries'
import type { VwResumoMensal } from '../types/database'
import SectionCard from '../components/ui/SectionCard'
import ProgressBar from '../components/ui/ProgressBar'
import Spinner from '../components/ui/Spinner'

// ─── types ───
type ResumoMensal = VwResumoMensal

interface UfData {
  uf: string
  receita?: number
  total?: number
}

interface Variacao {
  campo: string
  de: string
  para: string
  variacao: string
  color: string
}

// ─── helpers ───
const yearColor = (ano: string | number): string =>
  ano === '2024' || ano === 2024
    ? 'bg-gray-400 dark:bg-gray-500'
    : ano === '2025' || ano === 2025
      ? 'bg-blue-500 dark:bg-blue-400'
      : 'bg-emerald-500 dark:bg-emerald-400'

const yearLabel = (ano: string | number): string =>
  ano === '2024' || ano === 2024
    ? 'text-gray-600 dark:text-gray-400'
    : ano === '2025' || ano === 2025
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-emerald-600 dark:text-emerald-400'

const fmtVar = (atual: number, anterior: number) => {
  if (!anterior || anterior === 0) return { valor: 0, label: 'N/A', color: 'text-gray-400' }
  const pct = ((atual - anterior) / Math.abs(anterior)) * 100
  const prefix = pct > 0 ? '+' : ''
  return {
    valor: pct,
    label: `${prefix}${pct.toFixed(1)}%`,
    color: pct > 0 ? 'text-green-600 dark:text-green-400' : pct < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500',
  }
}

export default function AnaliseTemporalPage() {
  useDocumentTitle('Análise Temporal')
  const [searchParams] = useSearchParams()
  const fonteAtiva = searchParams.get('fonte')

  const [modo, setModo] = useState<string>('evolucao')
  const [periodosSel, setPeriodosSel] = useState<Array<string | null>>([null, null, null])
  const [ufs, setUfs] = useState<Record<string, UfData[]>>({})
  const [loadingUf, setLoadingUf] = useState<boolean>(false)

  const { data: resumoData, isLoading: resumoLoading, isError: resumoError } = useResumoMensal(fonteAtiva ?? 'bling')
  const resumo: ResumoMensal[] = resumoData ?? []

  /* ─── Dados organizados por mes ─── */
  const meses = useMemo(() => {
    if (!resumo.length) return []
    return [...resumo].sort((a, b) => (a.mes || '').localeCompare(b.mes || ''))
  }, [resumo])

  const mesesOptions = useMemo(() => meses.map((m) => m.mes), [meses])

  /* ─── Evolucao: agrupar por ano ─── */
  const porAno = useMemo(() => {
    const map: Record<string, ResumoMensal[]> = {}
    meses.forEach((m) => {
      if (!m.mes) return
      const ano = m.mes.split('-')[0]
      if (!map[ano]) map[ano] = []
      map[ano].push(m)
    })
    return map
  }, [meses])

  const anos = useMemo(() => Object.keys(porAno).sort(), [porAno])

  /* ─── Maximos para barras ─── */
  const maxReceita = useMemo(() => Math.max(...meses.map((m) => m.receita || 0), 1), [meses])
  const maxPedidos = useMemo(() => Math.max(...meses.map((m) => m.pedidos || 0), 1), [meses])
  const maxTicket = useMemo(() => Math.max(...meses.map((m) => m.ticket_medio || 0), 1), [meses])

  /* ─── Comparar: periodos selecionados ─── */
  const periodosDados = useMemo(() => {
    return periodosSel.map((mes) => {
      if (!mes) return null
      return meses.find((m) => m.mes === mes) || null
    })
  }, [periodosSel, meses])

  /* ─── Atalhos ─── */
  const aplicarAtalho = (tipo: string) => {
    if (mesesOptions.length < 2) return
    const sorted = [...mesesOptions].sort()
    const ultimo = sorted[sorted.length - 1]

    switch (tipo) {
      case 'ultimos3': {
        const last3 = sorted.slice(-3)
        setPeriodosSel([last3[0] || null, last3[1] || null, last3[2] || null])
        break
      }
      case 'trimestreVsAnterior': {
        const q1End = sorted.slice(-3)
        const q0End = sorted.slice(-6, -3)
        setPeriodosSel([q0End[0] || null, q1End[0] || null, ultimo])
        break
      }
      case 'mesmoMesAnoAnterior': {
        if (ultimo) {
          const [y, m] = ultimo.split('-')
          const anoAnt = `${parseInt(y) - 1}-${m}`
          const found = mesesOptions.includes(anoAnt) ? anoAnt : null
          setPeriodosSel([found, ultimo, null])
        }
        break
      }
      case 'melhorVsPior': {
        const byRec = [...meses].sort((a, b) => (b.receita || 0) - (a.receita || 0))
        const melhor = byRec[0]?.mes || null
        const pior = byRec[byRec.length - 1]?.mes || null
        setPeriodosSel([pior, melhor, null])
        break
      }
      default:
        break
    }
  }

  /* ─── Carregar UFs por periodo ─── */
  useEffect(() => {
    const mesesParaCarregar = periodosSel.filter((m): m is string => !!m && !ufs[m])
    if (mesesParaCarregar.length === 0) return

    setLoadingUf(true)
    Promise.all(
      mesesParaCarregar.map(async (mes) => {
        const { data, error } = await supabase
          .from('vw_uf_mensal')
          .select('*')
          .eq('mes', mes)
        if (error) {
          console.error('Erro ao carregar UFs:', error)
          return { mes, data: [] as UfData[] }
        }
        return { mes, data: (data || []) as UfData[] }
      }),
    ).then((results) => {
      setUfs((prev) => {
        const next = { ...prev }
        results.forEach((r) => {
          next[r.mes] = r.data
        })
        return next
      })
      setLoadingUf(false)
    })
  }, [periodosSel]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Variacoes entre periodos ─── */
  const variacoes = useMemo<Variacao[]>(() => {
    const result: Variacao[] = []
    const campos = [
      { key: 'receita' as const, label: 'Receita', fmt: formatCurrency },
      { key: 'pedidos' as const, label: 'Pedidos', fmt: (v: number) => String(v || 0) },
      { key: 'ticket_medio' as const, label: 'Ticket Medio', fmt: formatCurrency },
    ]

    const validos = periodosDados.filter((p): p is ResumoMensal => Boolean(p))
    if (validos.length < 2) return []

    for (let i = 1; i < validos.length; i++) {
      const ant = validos[i - 1]
      const atu = validos[i]
      campos.forEach((c) => {
        const v = fmtVar(atu[c.key] || 0, ant[c.key] || 0)
        result.push({
          campo: c.label,
          de: `${formatMesLabel(ant.mes)}: ${c.fmt(ant[c.key])}`,
          para: `${formatMesLabel(atu.mes)}: ${c.fmt(atu[c.key])}`,
          variacao: v.label,
          color: v.color,
        })
      })
    }
    return result
  }, [periodosDados])

  /* ─── Loading / error states ─── */
  if (resumoLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Carregando dados temporais...</p>
        </div>
      </div>
    )
  }

  if (resumoError) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-red-500 dark:text-red-400">Erro ao carregar dados temporais. Tente novamente.</p>
      </div>
    )
  }

  if (!resumo.length) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dado disponível para o período selecionado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header + Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          Analise Temporal
          {fonteAtiva && (
            <span className="ml-2 text-sm font-normal text-gray-500">({fonteAtiva})</span>
          )}
        </h2>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {[
            { key: 'evolucao', label: 'Evolucao' },
            { key: 'comparar', label: 'Comparar' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setModo(tab.key)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                modo === tab.key
                  ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MODO EVOLUCAO */}
      {modo === 'evolucao' && (
        <>
          {/* Legenda */}
          <div className="flex gap-4 text-xs">
            {anos.map((ano) => (
              <div key={ano} className="flex items-center gap-1.5">
                <div className={`h-3 w-3 rounded-sm ${yearColor(ano)}`} />
                <span className={`font-semibold ${yearLabel(ano)}`}>{ano}</span>
              </div>
            ))}
          </div>

          {/* Receita */}
          <SectionCard title="Receita Mensal">
            <div className="space-y-2">
              {meses.map((m) => {
                const ano = m.mes?.split('-')[0]
                return (
                  <div key={m.mes} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {formatMesLabel(m.mes)}
                    </span>
                    <div className="flex-1">
                      <div className="h-6 w-full overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`flex h-full items-center rounded px-2 text-xs font-bold text-white ${yearColor(ano)}`}
                          style={{ width: `${((m.receita || 0) / maxReceita) * 100}%` }}
                        >
                          {formatCurrency(m.receita)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          {/* Pedidos */}
          <SectionCard title="Pedidos Mensais">
            <div className="space-y-2">
              {meses.map((m) => {
                const ano = m.mes?.split('-')[0]
                return (
                  <div key={m.mes} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {formatMesLabel(m.mes)}
                    </span>
                    <div className="flex-1">
                      <div className="h-6 w-full overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`flex h-full items-center rounded px-2 text-xs font-bold text-white ${yearColor(ano)}`}
                          style={{ width: `${((m.pedidos || 0) / maxPedidos) * 100}%` }}
                        >
                          {m.pedidos || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          {/* Ticket Medio */}
          <SectionCard title="Ticket Medio">
            <div className="space-y-2">
              {meses.map((m) => {
                const ano = m.mes?.split('-')[0]
                return (
                  <div key={m.mes} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {formatMesLabel(m.mes)}
                    </span>
                    <div className="flex-1">
                      <div className="h-6 w-full overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`flex h-full items-center rounded px-2 text-xs font-bold text-white ${yearColor(ano)}`}
                          style={{ width: `${((m.ticket_medio || 0) / maxTicket) * 100}%` }}
                        >
                          {formatCurrency(m.ticket_medio)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          {/* Tabela resumo mensal */}
          <SectionCard title="Resumo Mensal Completo">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="pb-2 pr-4">Mes</th>
                    <th className="pb-2 pr-4 text-right">Receita</th>
                    <th className="pb-2 pr-4 text-right">Pedidos</th>
                    <th className="pb-2 pr-4 text-right">Ticket Medio</th>
                    <th className="pb-2 text-right">Var. Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {meses.map((m, i) => {
                    const prev = i > 0 ? meses[i - 1] : null
                    const v = prev ? fmtVar(m.receita || 0, prev.receita || 0) : null
                    return (
                      <tr key={m.mes} className="text-gray-700 dark:text-gray-300">
                        <td className="py-2 pr-4 font-medium">{formatMesLabel(m.mes)}</td>
                        <td className="py-2 pr-4 text-right font-semibold">{formatCurrency(m.receita)}</td>
                        <td className="py-2 pr-4 text-right">{m.pedidos || 0}</td>
                        <td className="py-2 pr-4 text-right">{formatCurrency(m.ticket_medio)}</td>
                        <td className={`py-2 text-right font-semibold ${v ? v.color : 'text-gray-400'}`}>
                          {v ? v.label : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}

      {/* MODO COMPARAR */}
      {modo === 'comparar' && (
        <>
          {/* Seletores de periodo */}
          <SectionCard title="Selecionar Periodos">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((idx) => (
                <div key={idx}>
                  <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Periodo {idx + 1}
                  </label>
                  <select
                    value={periodosSel[idx] || ''}
                    onChange={(e) => {
                      const next = [...periodosSel]
                      next[idx] = e.target.value || null
                      setPeriodosSel(next)
                    }}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <option value="">Selecione...</option>
                    {mesesOptions.map((m) => (
                      <option key={m} value={m}>
                        {formatMesLabel(m)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Shortcuts */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { key: 'ultimos3', label: 'Ultimos 3 meses' },
                { key: 'trimestreVsAnterior', label: 'Trimestre vs anterior' },
                { key: 'mesmoMesAnoAnterior', label: 'Mesmo mes ano anterior' },
                { key: 'melhorVsPior', label: 'Melhor vs pior' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => aplicarAtalho(s.key)}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </SectionCard>

          {/* KPI Cards */}
          {periodosDados.some(Boolean) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {periodosDados.map((p, pIdx) => {
                if (!p) return null
                return (
                  <SectionCard key={p.mes} title={`Periodo ${pIdx + 1}: ${formatMesLabel(p.mes)}`}>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Receita</div>
                        <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(p.receita)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Pedidos</div>
                        <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{p.pedidos || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Ticket Medio</div>
                        <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(p.ticket_medio)}</div>
                      </div>
                    </div>
                  </SectionCard>
                )
              })}
            </div>
          )}

          {/* Side-by-side bar comparison */}
          {periodosDados.filter(Boolean).length >= 2 && (
            <SectionCard title="Comparacao Visual">
              {(['receita', 'pedidos', 'ticket_medio'] as const).map((campo) => {
                const label = campo === 'receita' ? 'Receita' : campo === 'pedidos' ? 'Pedidos' : 'Ticket Medio'
                const validos = periodosDados.filter((p): p is ResumoMensal => Boolean(p))
                const maxVal = Math.max(...validos.map((p) => p[campo] || 0), 1)
                return (
                  <div key={campo} className="mb-6">
                    <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</h4>
                    <div className="space-y-2">
                      {validos.map((p) => {
                        const ano = p.mes?.split('-')[0]
                        const val = p[campo] || 0
                        return (
                          <div key={p.mes} className="flex items-center gap-3">
                            <span className="w-16 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                              {formatMesLabel(p.mes)}
                            </span>
                            <div className="flex-1">
                              <div className="h-7 w-full overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                                <div
                                  className={`flex h-full items-center rounded px-2 text-xs font-bold text-white ${yearColor(ano)}`}
                                  style={{ width: `${(val / maxVal) * 100}%` }}
                                >
                                  {campo === 'pedidos' ? val : formatCurrency(val)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </SectionCard>
          )}

          {/* Variation table */}
          {variacoes.length > 0 && (
            <SectionCard title="Tabela de Variacoes">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      <th className="pb-2 pr-4">Metrica</th>
                      <th className="pb-2 pr-4">De</th>
                      <th className="pb-2 pr-4">Para</th>
                      <th className="pb-2 text-right">Variacao</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {variacoes.map((v, i) => (
                      <tr key={i} className="text-gray-700 dark:text-gray-300">
                        <td className="py-2 pr-4 font-medium">{v.campo}</td>
                        <td className="py-2 pr-4 text-sm">{v.de}</td>
                        <td className="py-2 pr-4 text-sm">{v.para}</td>
                        <td className={`py-2 text-right font-bold ${v.color}`}>{v.variacao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* Regional distribution */}
          {periodosDados.some(Boolean) && (
            <SectionCard title="Distribuicao Regional por Periodo">
              {loadingUf && (
                <div className="mb-4 text-center text-sm text-gray-500">Carregando dados regionais...</div>
              )}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                {periodosDados.map((p, _idx) => {
                  if (!p) return null
                  const ufData = ufs[p.mes] || []
                  const maxUf = Math.max(...ufData.map((u) => u.receita || u.total || 0), 1)
                  return (
                    <div key={p.mes}>
                      <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {formatMesLabel(p.mes)}
                      </h4>
                      {ufData.length === 0 ? (
                        <p className="text-xs text-gray-400">Sem dados regionais</p>
                      ) : (
                        <div className="space-y-2">
                          {ufData
                            .sort((a, b) => (b.receita || b.total || 0) - (a.receita || a.total || 0))
                            .slice(0, 10)
                            .map((u) => {
                              const val = u.receita || u.total || 0
                              return (
                                <ProgressBar
                                  key={u.uf}
                                  value={val}
                                  max={maxUf}
                                  color="blue"
                                  label={u.uf}
                                  detail={formatCurrency(val)}
                                />
                              )
                            })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}

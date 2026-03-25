import { useState, useMemo } from 'react'
import { formatCurrency } from '../lib/formatters'
import SectionCard from '../components/ui/SectionCard'
import KPICard from '../components/ui/KPICard'
import FluxoCaixaChart from '../components/charts/FluxoCaixaChart'
import AgingChart from '../components/charts/AgingChart'
import DRETable from '../components/financial/DRETable'
import ComparativoCard from '../components/financial/ComparativoCard'
import MargemTable from '../components/financial/MargemTable'
import SyncButton from '../components/financial/SyncButton'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  useFluxoCaixa,
  useDRE,
  useAging,
  useMargemProduto,
  useMargemCanal,
  useComparativo,
} from '../services/queries/useFinancialQueries'

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  )
}

export default function FluxoCaixaPage() {
  useDocumentTitle('Analise Financeira')

  const { data: fluxoCaixa, isLoading: loadingFluxo, isError: errorFluxo } = useFluxoCaixa()
  const { data: dreData, isLoading: loadingDRE, isError: errorDRE } = useDRE()
  const { data: agingData, isLoading: loadingAging, isError: errorAging } = useAging()
  const { data: margemProduto, isLoading: loadingMargProd, isError: errorMargProd } = useMargemProduto()
  const { data: margemCanal, isLoading: loadingMargCanal, isError: errorMargCanal } = useMargemCanal()
  const { data: comparativo, isLoading: loadingComp, isError: errorComp } = useComparativo()

  const availableMonths = useMemo(() => {
    if (!dreData?.length) return []
    const months = [...new Set(dreData.map((d) => d.ano_mes))].sort()
    return months
  }, [dreData])

  const [selectedMonth, setSelectedMonth] = useState<string>('')

  const activeMonth = selectedMonth || availableMonths[availableMonths.length - 1] || ''

  // Derive KPI values from DRE data for the selected month
  const kpis = useMemo(() => {
    if (!dreData?.length || !activeMonth) {
      return { receitaLiquida: 0, despesas: 0, lucroLiquido: 0, margemPct: 0 }
    }
    const monthRows = dreData.filter((d) => d.ano_mes === activeMonth)
    const valueMap = new Map(monthRows.map((r) => [r.linha, r.valor]))

    const receitaLiquida = valueMap.get('receita_liquida') ?? 0
    const despOp = valueMap.get('despesas_operacionais') ?? 0
    const despFin = valueMap.get('despesas_financeiras') ?? 0
    const cmv = valueMap.get('cmv') ?? 0
    const despesas = Math.abs(despOp) + Math.abs(despFin) + Math.abs(cmv)
    const lucroLiquido = valueMap.get('lucro_liquido') ?? 0
    const margemPct = valueMap.get('margem_liquida_pct') ?? 0

    return { receitaLiquida, despesas, lucroLiquido, margemPct }
  }, [dreData, activeMonth])

  const isLoading = loadingFluxo || loadingDRE || loadingAging || loadingMargProd || loadingMargCanal || loadingComp
  const hasError = errorFluxo || errorDRE || errorAging || errorMargProd || errorMargCanal || errorComp
  const hasNoData = !isLoading && !hasError &&
    !fluxoCaixa?.length && !dreData?.length && !agingData?.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          Analise Financeira
        </h2>
        <div className="flex items-center gap-4">
          {availableMonths.length > 0 && (
            <select
              value={activeMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
          <SyncButton />
        </div>
      </div>

      {/* Error state */}
      {hasError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
          Erro ao carregar dados financeiros. Verifique sua conexao e tente novamente.
        </div>
      )}

      {/* Empty state */}
      {hasNoData && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          Nenhum dado financeiro disponivel. Execute a sincronizacao para carregar dados do Bling.
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && !hasError && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-24" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <SkeletonBlock className="col-span-2 h-80" />
            <SkeletonBlock className="h-80" />
          </div>
          <SkeletonBlock className="h-64" />
        </div>
      )}

      {/* Main content */}
      {!isLoading && !hasNoData && !hasError && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard
              label="Receita Liquida"
              value={formatCurrency(kpis.receitaLiquida)}
              color={kpis.receitaLiquida > 0 ? 'green' : 'gray'}
            />
            <KPICard
              label="Despesas"
              value={formatCurrency(kpis.despesas)}
              color={kpis.despesas > 0 ? 'red' : 'gray'}
            />
            <KPICard
              label="Lucro Liquido"
              value={formatCurrency(kpis.lucroLiquido)}
              color={kpis.lucroLiquido >= 0 ? 'green' : 'red'}
              trend={kpis.lucroLiquido > 0 ? 'up' : kpis.lucroLiquido < 0 ? 'down' : 'neutral'}
            />
            <KPICard
              label="Margem Liquida"
              value={`${kpis.margemPct.toFixed(1)}%`}
              color={kpis.margemPct >= 10 ? 'green' : kpis.margemPct >= 0 ? 'orange' : 'red'}
            />
          </div>

          {/* Charts row: FluxoCaixa + Aging */}
          <div className="grid gap-6 lg:grid-cols-3">
            <SectionCard title="Fluxo de Caixa" className="lg:col-span-2">
              <FluxoCaixaChart data={fluxoCaixa ?? []} />
            </SectionCard>
            <SectionCard title="Aging - Contas a Receber/Pagar">
              <AgingChart data={agingData ?? []} />
            </SectionCard>
          </div>

          {/* DRE Table */}
          <SectionCard title="Demonstrativo de Resultados (DRE)">
            <DRETable data={dreData ?? []} selectedMonth={activeMonth} />
          </SectionCard>

          {/* Comparativo + Margem Produto */}
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Comparativo Mensal">
              <ComparativoCard data={comparativo ?? []} selectedMonth={activeMonth} />
            </SectionCard>
            <SectionCard title="Margem por Produto">
              <MargemTable data={margemProduto ?? []} type="produto" />
            </SectionCard>
          </div>

          {/* Margem Canal */}
          <SectionCard title="Margem por Canal">
            <MargemTable data={margemCanal ?? []} type="canal" />
          </SectionCard>
        </>
      )}
    </div>
  )
}

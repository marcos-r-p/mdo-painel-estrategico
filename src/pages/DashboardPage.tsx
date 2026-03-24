import { useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useConnectionStatus } from '../services/queries/useDashboardQueries'
import { usePlatformSync } from '../services/queries/useSyncMutations'
import { getBlingOAuthURL, getShopifyOAuthURL } from '../services/api/sync'
import { DADOS } from '../data/seed'
import { formatCurrency, formatPercent, formatNumber } from '../lib/formatters'
import KPICard from '../components/ui/KPICard'
import Badge from '../components/ui/Badge'
import SectionCard from '../components/ui/SectionCard'
import PieChart from '../components/charts/PieChart'

export default function DashboardPage() {
  const { isAdmin } = useAuth()
  const [searchParams] = useSearchParams()
  const _fonteAtiva = searchParams.get('fonte') ?? 'bling'

  const { data: connected } = useConnectionStatus()
  const blingSync = usePlatformSync('bling')
  const shopifySync = usePlatformSync('shopify')
  const rdstationSync = usePlatformSync('rdstation')

  // ── Bling OAuth ──
  const handleBlingConnect = () => {
    window.open(getBlingOAuthURL(), '_blank')
  }

  // ── Shopify OAuth ──
  const handleShopifyConnect = () => {
    window.open(getShopifyOAuthURL(), '_blank')
  }

  // ── Sync handlers ──
  const handleBlingSync = () => blingSync.mutate()
  const handleShopifySync = () => shopifySync.mutate()
  const handleRDStationSync = () => rdstationSync.mutate()

  // ── Helper: check if a sync result has any errors ──
  const hasSyncError = (results: Record<string, unknown>): boolean =>
    Object.values(results).some(
      (r) => typeof r === 'object' && r !== null && 'error' in r,
    )

  // ── Cost composition for PieChart ──
  const costComposition = useMemo(() => {
    const { custos } = DADOS
    return [
      { label: 'Custos Fixos', value: custos.totalFixo },
      { label: 'Custos Variaveis', value: custos.totalVariavel },
      { label: 'Financeiro', value: custos.totalFinanceiro },
      { label: 'Impostos', value: custos.impostos },
    ]
  }, [])

  const totalDespesas = useMemo(() => {
    const { custos } = DADOS
    return custos.totalFixo + custos.totalVariavel + custos.totalFinanceiro + custos.impostos
  }, [])

  return (
    <div className="space-y-6">
      {/* === ADMIN: API Integrations === */}
      {isAdmin ? (
        <SectionCard title="Integracoes de Dados">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Bling */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">Bling</span>
                <Badge type={connected?.bling ? 'positivo' : 'medio'}>
                  {connected?.bling ? 'Conectado' : 'Desconectado'}
                </Badge>
              </div>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                ERP — pedidos, estoque, financeiro
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleBlingConnect}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Conectar OAuth
                </button>
                <button
                  onClick={handleBlingSync}
                  disabled={blingSync.progress.isRunning}
                  className="rounded-md border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors disabled:opacity-50"
                >
                  {blingSync.progress.isRunning
                    ? `Sincronizando ${blingSync.progress.currentStep ?? ''}...`
                    : 'Sincronizar'}
                </button>
              </div>
              {!blingSync.progress.isRunning && Object.keys(blingSync.progress.results).length > 0 && (
                <p className={`mt-2 text-xs ${hasSyncError(blingSync.progress.results) ? 'text-red-500' : 'text-green-600'}`}>
                  {hasSyncError(blingSync.progress.results) ? 'Erro na sincronizacao' : 'Sincronizado com sucesso'}
                </p>
              )}
            </div>

            {/* Shopify */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">Shopify</span>
                <Badge type={connected?.shopify ? 'positivo' : 'medio'}>
                  {connected?.shopify ? 'Conectado' : 'Desconectado'}
                </Badge>
              </div>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                E-commerce — vendas, clientes, produtos
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleShopifyConnect}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                >
                  Conectar OAuth
                </button>
                <button
                  onClick={handleShopifySync}
                  disabled={shopifySync.progress.isRunning}
                  className="rounded-md border border-green-600 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors disabled:opacity-50"
                >
                  {shopifySync.progress.isRunning
                    ? `Sincronizando ${shopifySync.progress.currentStep ?? ''}...`
                    : 'Sincronizar'}
                </button>
              </div>
              {!shopifySync.progress.isRunning && Object.keys(shopifySync.progress.results).length > 0 && (
                <p className={`mt-2 text-xs ${hasSyncError(shopifySync.progress.results) ? 'text-red-500' : 'text-green-600'}`}>
                  {hasSyncError(shopifySync.progress.results) ? 'Erro na sincronizacao' : 'Sincronizado com sucesso'}
                </p>
              )}
            </div>

            {/* RD Station */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">RD Station</span>
                <Badge type="medio">CRM</Badge>
              </div>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                CRM — negocios, contatos, pipeline
              </p>
              <button
                onClick={handleRDStationSync}
                disabled={rdstationSync.progress.isRunning}
                className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {rdstationSync.progress.isRunning ? 'Sincronizando...' : 'Sincronizar'}
              </button>
              {!rdstationSync.progress.isRunning && Object.keys(rdstationSync.progress.results).length > 0 && (
                <p className={`mt-2 text-xs ${hasSyncError(rdstationSync.progress.results) ? 'text-red-500' : 'text-green-600'}`}>
                  {hasSyncError(rdstationSync.progress.results) ? 'Erro na sincronizacao' : 'Sincronizado com sucesso'}
                </p>
              )}
            </div>

            {/* File Import — removed: was dead code calling onDataApplied */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">Arquivo</span>
                <Badge type="baixo">Manual</Badge>
              </div>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Importar CSV, Excel ou PDF
              </p>
              <button
                className="rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
              >
                Importar Arquivo
              </button>
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="text-lg">&#x1f512;</span>
            <span>
              Somente administradores podem conectar APIs e importar dados. Contate o admin para atualizar as fontes.
            </span>
          </div>
        </SectionCard>
      )}

      {/* === ALERT BANNER: Deficit === */}
      <div className="animate-fade-in rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
        <div className="flex items-start gap-3">
          <span className="text-2xl">&#x26a0;&#xfe0f;</span>
          <div>
            <h3 className="text-sm font-bold text-red-800 dark:text-red-300">
              Alerta: Resultado Operacional Negativo
            </h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400">
              Prejuizo de{' '}
              <strong>{formatCurrency(Math.abs(DADOS.dre.resultado))}/mes</strong>.
              Saldo caiu de{' '}
              <strong>{formatCurrency(DADOS.fluxoCaixa.saldoInicial)}</strong> para{' '}
              <strong>{formatCurrency(DADOS.fluxoCaixa.saldoFinal)}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* === ALERT BANNER: Descobertas Shopify x CRM === */}
      <div className="animate-fade-in rounded-xl border border-purple-300 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/40">
        <div className="flex items-start gap-3">
          <span className="text-2xl">&#x1F50D;</span>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-purple-800 dark:text-purple-300">
              7 Descobertas Estrategicas — Cruzamento Shopify x CRM
            </h3>
            <p className="mt-1 text-sm text-purple-700 dark:text-purple-400">
              40.067 clientes Shopify fora do CRM | 86 &quot;perdas&quot; que compraram no site |
              100% dependencia de 1 vendedor | 43% das perdas por falta de follow-up
            </p>
            <Link
              to="/app/alertas"
              className="mt-2 inline-block text-xs font-medium text-purple-600 dark:text-purple-300 hover:underline"
            >
              Ver todas as descobertas e plano de acao &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* === KPI ROW === */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Receita Bruta"
          value={formatCurrency(DADOS.receita.bruta)}
          subvalue={`${formatPercent(DADOS.comparativo.variacaoReceita)} vs Fev`}
          trend="down"
          color="red"
        />
        <KPICard
          label="Pedidos"
          value={formatNumber(DADOS.receita.pedidos)}
          subvalue={`${formatPercent(DADOS.comparativo.variacaoPedidos)} vs Fev`}
          trend="down"
          color="red"
        />
        <KPICard
          label="Ticket Medio"
          value={formatCurrency(DADOS.receita.ticketMedio)}
          subvalue={`${formatPercent(DADOS.comparativo.variacaoTicket)} vs Fev`}
          trend="down"
          color="orange"
        />
        <KPICard
          label="Markup"
          value={`${DADOS.receita.markup}%`}
          subvalue="Margem saudavel"
          trend="up"
          color="green"
        />
      </div>

      {/* === APORTES DEPENDENCY === */}
      <SectionCard title="Dependencia de Aportes dos Socios">
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Total de aportes nos ultimos meses:{' '}
          <strong className="text-red-600 dark:text-red-400">
            {formatCurrency(DADOS.aportes.total4Meses)}
          </strong>
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {DADOS.aportes.detalhes.map((aporte) => (
            <div
              key={aporte.mes}
              className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/30"
            >
              <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                {aporte.mes}
              </p>
              <p className="mt-1 text-lg font-bold text-orange-700 dark:text-orange-400">
                {formatCurrency(aporte.valor)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          A operacao so se mantem com injecao de capital dos socios. Sem aportes, o caixa seria negativo.
        </p>
      </SectionCard>

      {/* === RECEITA vs DESPESA + PIE CHART === */}
      <SectionCard title="Receita vs Despesa — Composicao de Custos">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Receita Bruta
              </span>
              <span className="text-lg font-bold text-green-700 dark:text-green-400">
                {formatCurrency(DADOS.receita.bruta)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Despesas
              </span>
              <span className="text-lg font-bold text-red-700 dark:text-red-400">
                {formatCurrency(totalDespesas)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Resultado (DRE)
              </span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatCurrency(DADOS.dre.resultado)}
              </span>
            </div>
          </div>
          <div className="shrink-0">
            <PieChart
              data={costComposition}
              size={160}
              valueKey="value"
              labelKey="label"
            />
          </div>
        </div>
      </SectionCard>

      {/* === BUSINESS SNAPSHOT === */}
      <SectionCard title="Retrato do Negocio">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label="SKUs Cadastrados"
            value={`${formatNumber(DADOS.empresa.totalSKUs)}+`}
            subvalue="Catalogo amplo"
            color="blue"
          />
          <KPICard
            label="Base de Clientes"
            value={formatNumber(DADOS.empresa.baseClientes)}
            subvalue="Registros unicos"
            color="blue"
          />
          <KPICard
            label="Taxa Recompra"
            value={`${DADOS.empresa.taxaRecompra}%`}
            subvalue="Fidelizacao saudavel"
            color="green"
          />
          <KPICard
            label="Anos de Operacao"
            value={`${DADOS.empresa.anosOperacao}+`}
            subvalue="Marca consolidada"
            color="green"
          />
        </div>
      </SectionCard>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { DADOS } from '../data/constants'
import { formatCurrency, formatPercent, formatNumber } from '../lib/formatters'
import { supabase, SUPABASE_URL } from '../lib/supabase'
import KPICard from '../components/ui/KPICard'
import Badge from '../components/ui/Badge'
import SectionCard from '../components/ui/SectionCard'
import PieChart from '../components/ui/PieChart'

export default function DashboardPage({ onDataApplied, isAdmin, fonteAtiva }) {
  const [syncStatus, setSyncStatus] = useState({})
  const [syncLoading, setSyncLoading] = useState({})

  // ── Bling OAuth ──
  const handleBlingConnect = () => {
    window.open(
      'https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=567bba7562d27003649ad247d8bd0baad95d3435&state=mdo',
      '_blank'
    )
  }

  // ── Shopify OAuth ──
  const handleShopifyConnect = () => {
    window.open(
      `${SUPABASE_URL}/functions/v1/shopify-callback`,
      '_blank'
    )
  }

  // ── Sync handlers ──
  const handleBlingSync = async () => {
    setSyncLoading((prev) => ({ ...prev, bling: true }))
    setSyncStatus((prev) => ({ ...prev, bling: null }))
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bling-sync?tipo=all`)
      const data = await res.json()
      setSyncStatus((prev) => ({ ...prev, bling: data }))
      if (onDataApplied) onDataApplied('bling', data)
    } catch (err) {
      setSyncStatus((prev) => ({ ...prev, bling: { error: err.message } }))
    } finally {
      setSyncLoading((prev) => ({ ...prev, bling: false }))
    }
  }

  const handleShopifySync = async () => {
    setSyncLoading((prev) => ({ ...prev, shopify: true }))
    setSyncStatus((prev) => ({ ...prev, shopify: null }))
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/shopify-sync?tipo=all`)
      const data = await res.json()
      setSyncStatus((prev) => ({ ...prev, shopify: data }))
      if (onDataApplied) onDataApplied('shopify', data)
    } catch (err) {
      setSyncStatus((prev) => ({ ...prev, shopify: { error: err.message } }))
    } finally {
      setSyncLoading((prev) => ({ ...prev, shopify: false }))
    }
  }

  const handleFileImport = () => {
    if (onDataApplied) onDataApplied('file', null)
  }

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
      {/* ═══ ADMIN: API Integrations ═══ */}
      {isAdmin ? (
        <SectionCard title="Integrações de Dados">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Bling */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">Bling</span>
                <Badge type={fonteAtiva === 'bling' ? 'positivo' : 'medio'}>
                  {fonteAtiva === 'bling' ? 'Conectado' : 'Desconectado'}
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
                  disabled={syncLoading.bling}
                  className="rounded-md border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors disabled:opacity-50"
                >
                  {syncLoading.bling ? 'Sincronizando...' : 'Sincronizar'}
                </button>
              </div>
              {syncStatus.bling && (
                <p className={`mt-2 text-xs ${syncStatus.bling.error ? 'text-red-500' : 'text-green-600'}`}>
                  {syncStatus.bling.error || 'Sincronizado com sucesso'}
                </p>
              )}
            </div>

            {/* Shopify */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">Shopify</span>
                <Badge type={fonteAtiva === 'shopify' ? 'positivo' : 'medio'}>
                  {fonteAtiva === 'shopify' ? 'Conectado' : 'Desconectado'}
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
                  disabled={syncLoading.shopify}
                  className="rounded-md border border-green-600 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors disabled:opacity-50"
                >
                  {syncLoading.shopify ? 'Sincronizando...' : 'Sincronizar'}
                </button>
              </div>
              {syncStatus.shopify && (
                <p className={`mt-2 text-xs ${syncStatus.shopify.error ? 'text-red-500' : 'text-green-600'}`}>
                  {syncStatus.shopify.error || 'Sincronizado com sucesso'}
                </p>
              )}
            </div>

            {/* File Import */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">Arquivo</span>
                <Badge type="baixo">Manual</Badge>
              </div>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Importar CSV, Excel ou PDF
              </p>
              <button
                onClick={handleFileImport}
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
            <span className="text-lg">🔒</span>
            <span>
              Somente administradores podem conectar APIs e importar dados. Contate o admin para atualizar as fontes.
            </span>
          </div>
        </SectionCard>
      )}

      {/* ═══ ALERT BANNER: Deficit ═══ */}
      <div className="animate-fade-in rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="text-sm font-bold text-red-800 dark:text-red-300">
              Alerta: Resultado Operacional Negativo
            </h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400">
              Prejuízo de{' '}
              <strong>{formatCurrency(Math.abs(DADOS.dre.resultado))}/mês</strong>.
              Saldo caiu de{' '}
              <strong>{formatCurrency(DADOS.fluxoCaixa.saldoInicial)}</strong> para{' '}
              <strong>{formatCurrency(DADOS.fluxoCaixa.saldoFinal)}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ═══ KPI ROW ═══ */}
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
          label="Ticket Médio"
          value={formatCurrency(DADOS.receita.ticketMedio)}
          subvalue={`${formatPercent(DADOS.comparativo.variacaoTicket)} vs Fev`}
          trend="down"
          color="orange"
        />
        <KPICard
          label="Markup"
          value={`${DADOS.receita.markup}%`}
          subvalue="Margem saudável"
          trend="up"
          color="green"
        />
      </div>

      {/* ═══ APORTES DEPENDENCY ═══ */}
      <SectionCard title="Dependência de Aportes dos Sócios">
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Total de aportes nos últimos meses:{' '}
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
          A operação só se mantém com injeção de capital dos sócios. Sem aportes, o caixa seria negativo.
        </p>
      </SectionCard>

      {/* ═══ RECEITA vs DESPESA + PIE CHART ═══ */}
      <SectionCard title="Receita vs Despesa — Composição de Custos">
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

      {/* ═══ BUSINESS SNAPSHOT ═══ */}
      <SectionCard title="Retrato do Negócio">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label="SKUs Cadastrados"
            value={`${formatNumber(DADOS.empresa.totalSKUs)}+`}
            subvalue="Catálogo amplo"
            color="blue"
          />
          <KPICard
            label="Base de Clientes"
            value={formatNumber(DADOS.empresa.baseClientes)}
            subvalue="Registros únicos"
            color="blue"
          />
          <KPICard
            label="Taxa Recompra"
            value={`${DADOS.empresa.taxaRecompra}%`}
            subvalue="Fidelização saudável"
            color="green"
          />
          <KPICard
            label="Anos de Operação"
            value={`${DADOS.empresa.anosOperacao}+`}
            subvalue="Marca consolidada"
            color="green"
          />
        </div>
      </SectionCard>
    </div>
  )
}

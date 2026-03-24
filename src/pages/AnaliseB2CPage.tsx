import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { DADOS } from '../data/seed'
import { formatCurrency, formatNumber } from '../lib/formatters'
import SectionCard from '../components/ui/SectionCard'
import DateRangePicker from '../components/ui/DateRangePicker'
import KPICard from '../components/ui/KPICard'
import PieChart from '../components/charts/PieChart'
import DetailModal from '../components/ui/DetailModal'

interface DateRange {
  dataIni: string
  dataFim: string
}

interface SubTab {
  key: string
  label: string
}

interface Faixa {
  label: string
  min: number
  max: number
  color: string
}

interface ClienteBase {
  nome: string
  valor: number
  pedidos: number
  tipo: string
  recompra: boolean
  ticketMedio: number
  produtos?: number
  uf?: string
}

const SUB_TABS: SubTab[] = [
  { key: 'perfil', label: 'Perfil B2C' },
  { key: 'faixas', label: 'Faixas de Valor' },
  { key: 'crosssell', label: 'Cross-Sell' },
]

const FAIXAS: Faixa[] = [
  { label: 'R$ 0 - 500', min: 0, max: 500, color: 'blue' },
  { label: 'R$ 500 - 1.000', min: 500, max: 1000, color: 'green' },
  { label: 'R$ 1.000 - 2.000', min: 1000, max: 2000, color: 'orange' },
  { label: 'R$ 2.000+', min: 2000, max: Infinity, color: 'purple' },
]

export default function AnaliseB2CPage() {
  useDocumentTitle('Análise B2C')
  const [searchParams] = useSearchParams()
  const fonteAtiva = searchParams.get('fonte')

  const [range, setRange] = useState<DateRange>({ dataIni: '', dataFim: '' })
  const [activeTab, setActiveTab] = useState<string>('perfil')
  const [modalCliente, setModalCliente] = useState<ClienteBase | null>(null)

  const topClientes = DADOS.topClientes || []
  const topProdutos = DADOS.topProdutos || []

  // Filter B2C clients
  const clientesB2C = useMemo(
    () => topClientes.filter((c) => c.tipo === 'B2C'),
    [topClientes]
  )

  // B2C KPIs
  const receitaB2C = useMemo(
    () => clientesB2C.reduce((s, c) => s + (c.valor || 0), 0),
    [clientesB2C]
  )
  const pedidosB2C = useMemo(
    () => clientesB2C.reduce((s, c) => s + (c.pedidos || 0), 0),
    [clientesB2C]
  )
  const ticketMedioB2C = pedidosB2C > 0 ? receitaB2C / pedidosB2C : 0
  const totalProdutos = useMemo(
    () => clientesB2C.reduce((s, c) => s + (c.produtos || 0), 0),
    [clientesB2C]
  )
  const avgProdPedido = pedidosB2C > 0 ? (totalProdutos / pedidosB2C).toFixed(1) : '0'

  const recorrentes = useMemo(() => clientesB2C.filter((c) => c.recompra), [clientesB2C])
  const unicaCompra = useMemo(() => clientesB2C.filter((c) => !c.recompra), [clientesB2C])

  // Faixas distribution
  const faixasData = useMemo(() => {
    return FAIXAS.map((f) => {
      const clientes = clientesB2C.filter((c) => c.valor >= f.min && c.valor < f.max)
      const receita = clientes.reduce((s, c) => s + (c.valor || 0), 0)
      return { ...f, clientes: clientes.length, receita, list: clientes }
    })
  }, [clientesB2C])

  const maxFaixa = Math.max(...faixasData.map((f) => f.clientes), 1)

  // Cross-sell: group products by category
  const categoriasCrossSell = useMemo(() => {
    const map: Record<string, { label: string; receita: number; qtd: number; produtos: Array<{ nome: string; receita?: number; qtd?: number }> }> = {}
    topProdutos.forEach((p) => {
      const cat = p.categoria || 'Outros'
      if (!map[cat]) map[cat] = { label: cat, receita: 0, qtd: 0, produtos: [] }
      map[cat].receita += p.receita || 0
      map[cat].qtd += p.qtd || 0
      map[cat].produtos.push(p)
    })
    return Object.values(map).sort((a, b) => b.receita - a.receita)
  }, [topProdutos])

  const maxCatReceita = Math.max(...categoriasCrossSell.map((c) => c.receita), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          Analise B2C
          {fonteAtiva && (
            <span className="ml-2 text-sm font-normal text-gray-500">({fonteAtiva})</span>
          )}
        </h2>
        <DateRangePicker dataIni={range.dataIni} dataFim={range.dataFim} onChange={setRange} />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors
              ${activeTab === tab.key
                ? 'bg-white text-blue-700 shadow-sm dark:bg-gray-900 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Perfil B2C Tab */}
      {activeTab === 'perfil' && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard
              label="Receita B2C"
              value={formatCurrency(receitaB2C)}
              subvalue={`${clientesB2C.length} clientes`}
              color="blue"
            />
            <KPICard
              label="Pedidos B2C"
              value={formatNumber(pedidosB2C)}
              subvalue="No periodo"
              color="green"
            />
            <KPICard
              label="Ticket Medio"
              value={formatCurrency(ticketMedioB2C)}
              subvalue="B2C"
              color="blue"
            />
            <KPICard
              label="Prod./Pedido"
              value={String(avgProdPedido)}
              subvalue="Media itens"
              color="green"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Recorrentes vs Compra Unica">
              <PieChart
                data={[
                  { label: `Recorrentes (${recorrentes.length})`, value: recorrentes.length },
                  { label: `Compra unica (${unicaCompra.length})`, value: unicaCompra.length },
                ]}
                size={140}
                colors={['#10b981', '#f59e0b']}
              />
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Receita recorrentes</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {formatCurrency(recorrentes.reduce((s, c) => s + c.valor, 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Receita compra unica</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {formatCurrency(unicaCompra.reduce((s, c) => s + c.valor, 0))}
                  </span>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Top Clientes B2C">
              <div className="space-y-2">
                {clientesB2C.slice(0, 6).map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setModalCliente(c)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-100 p-2.5 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {c.nome}
                      </p>
                      <p className="text-xs text-gray-500">{c.pedidos} pedidos</p>
                    </div>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(c.valor)}
                    </span>
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      )}

      {/* Faixas de Valor Tab */}
      {activeTab === 'faixas' && (
        <SectionCard title="Distribuicao por Faixa de Valor">
          <div className="space-y-4">
            {faixasData.map((f, i) => (
              <div key={i}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {f.label}
                  </span>
                  <div className="flex items-baseline gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{f.clientes} clientes</span>
                    <span className="font-semibold">{formatCurrency(f.receita)}</span>
                  </div>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      f.color === 'blue'
                        ? 'bg-blue-500'
                        : f.color === 'green'
                        ? 'bg-green-500'
                        : f.color === 'orange'
                        ? 'bg-orange-500'
                        : 'bg-purple-500'
                    }`}
                    style={{ width: `${(f.clientes / maxFaixa) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-gray-100 p-4 dark:border-gray-800">
            <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Resumo</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Total clientes B2C:</span>
                <span className="ml-1 font-semibold">{clientesB2C.length}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Receita total B2C:</span>
                <span className="ml-1 font-semibold">{formatCurrency(receitaB2C)}</span>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Cross-Sell Tab */}
      {activeTab === 'crosssell' && (
        <SectionCard title="Oportunidades Cross-Sell por Categoria">
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Receita por categoria de produto - identifique combincoes para venda cruzada.
          </p>
          <div className="space-y-3">
            {categoriasCrossSell.map((cat, i) => (
              <div key={i} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {cat.label}
                  </span>
                  <div className="flex items-baseline gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{cat.qtd} un. vendidas</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(cat.receita)}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${(cat.receita / maxCatReceita) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {cat.produtos.slice(0, 3).map((p, j) => (
                    <span
                      key={j}
                      className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    >
                      {p.nome}
                    </span>
                  ))}
                  {cat.produtos.length > 3 && (
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                      +{cat.produtos.length - 3}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!modalCliente}
        onClose={() => setModalCliente(null)}
        title={modalCliente?.nome || 'Cliente'}
      >
        {modalCliente && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Valor Total</p>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {formatCurrency(modalCliente.valor)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pedidos</p>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {modalCliente.pedidos}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ticket Medio</p>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {formatCurrency(modalCliente.ticketMedio)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Produtos</p>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {modalCliente.produtos}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                {modalCliente.tipo}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                modalCliente.recompra
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
              }`}>
                {modalCliente.recompra ? 'Recorrente' : 'Compra unica'}
              </span>
              {modalCliente.uf && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {modalCliente.uf}
                </span>
              )}
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  )
}

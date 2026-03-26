import { useState, useMemo, ReactNode } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAllShopifyData } from '../services/queries/useShopifyQueries'
import { formatCurrency, formatNumber } from '../lib/formatters'
import SectionCard from '../components/ui/SectionCard'
import DateRangePicker from '../components/ui/DateRangePicker'
import KPICard from '../components/ui/KPICard'
import DetailModal from '../components/ui/DetailModal'
import Spinner from '../components/ui/Spinner'
import type { ShopifyPedido } from '../types/database'

interface ModalState {
  open: boolean
  title: string
  content: ReactNode | null
}

export default function ShopifyPage() {
  useDocumentTitle('Shopify')
  const { data: shopifyData, isLoading, isError } = useAllShopifyData()

  const [dataIni, setDataIni] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [dataFim, setDataFim] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [modal, setModal] = useState<ModalState>({ open: false, title: '', content: null })

  // Filter pedidos by date range
  const pedidos = useMemo<ShopifyPedido[]>(() => {
    if (!shopifyData?.pedidos) return []
    return (shopifyData.pedidos as ShopifyPedido[])
      .filter((p) => {
        if (!p.data) return false
        const d = p.data.slice(0, 10)
        return d >= dataIni && d <= dataFim
      })
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
      .slice(0, 20)
  }, [shopifyData, dataIni, dataFim])

  // KPIs from filtered pedidos
  const kpis = useMemo(() => {
    const allFiltered = (shopifyData?.pedidos as ShopifyPedido[] || []).filter((p) => {
      if (!p.data) return false
      const d = p.data.slice(0, 10)
      return d >= dataIni && d <= dataFim
    })
    const total = allFiltered.length
    const receita = allFiltered.reduce((s, p) => s + (Number(p.valor_total) || 0), 0)
    const ticket = total > 0 ? receita / total : 0
    return {
      pedidos: total,
      receita,
      clientes: new Set(allFiltered.map((p) => p.cliente_nome || '')).size,
      produtos: shopifyData?.produtos?.length || 0,
      ticket,
    }
  }, [shopifyData, dataIni, dataFim])

  // Group by estado
  const porEstado = useMemo(() => {
    if (!shopifyData?.pedidos) return []
    const map: Record<string, { uf: string; total_pedidos: number; receita: number; clientes: Set<string> }> = {}
    const allFiltered = (shopifyData.pedidos as ShopifyPedido[]).filter((p) => {
      if (!p.data) return false
      const d = p.data.slice(0, 10)
      return d >= dataIni && d <= dataFim
    })
    allFiltered.forEach((p) => {
      const uf = (p.uf || '?') as string
      if (!map[uf]) map[uf] = { uf, total_pedidos: 0, receita: 0, clientes: new Set() }
      map[uf].total_pedidos++
      map[uf].receita += Number(p.valor_total) || 0
      map[uf].clientes.add((p.cliente_nome || '') as string)
    })
    return Object.values(map)
      .map((e) => ({ ...e, clientes: e.clientes.size }))
      .sort((a, b) => b.receita - a.receita)
  }, [shopifyData, dataIni, dataFim])

  function handleDateChange({ dataIni: ini, dataFim: fim }: { dataIni: string; dataFim: string }) {
    if (ini) setDataIni(ini)
    if (fim) setDataFim(fim)
  }

  function statusBadge(status: string | undefined): ReactNode {
    const s = (status || '').toLowerCase()
    if (s === 'paid')
      return <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">Pago</span>
    if (s === 'pending')
      return <span className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">Pendente</span>
    if (s === 'refunded')
      return <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">Reembolsado</span>
    return <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">{status || '\u2014'}</span>
  }

  function openEstadoModal(estado: { uf: string; total_pedidos: number; receita: number; clientes: number }) {
    setModal({
      open: true,
      title: `Vendas \u2014 ${estado.uf || 'Estado'}`,
      content: (
        <div className="space-y-2 text-sm">
          <p><strong>Pedidos:</strong> {formatNumber(estado.total_pedidos || 0)}</p>
          <p><strong>Receita:</strong> {formatCurrency(estado.receita || 0)}</p>
          <p><strong>Ticket Medio:</strong> {formatCurrency(
            (estado.receita || 0) / (estado.total_pedidos || 1)
          )}</p>
          <p><strong>Clientes:</strong> {formatNumber(estado.clientes || 0)}</p>
        </div>
      ),
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  // Error / empty state
  if (isError || !shopifyData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
            Sem dados do Shopify
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
            Nao foi possivel carregar os dados do Shopify. Verifique a conexao e tente novamente.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date picker */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Shopify</h2>
        <DateRangePicker dataIni={dataIni} dataFim={dataFim} onChange={handleDateChange} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KPICard label="Total Pedidos" value={formatNumber(kpis.pedidos)} color="blue" />
        <KPICard label="Receita" value={formatCurrency(kpis.receita)} color="green" />
        <KPICard label="Clientes" value={formatNumber(kpis.clientes)} color="blue" />
        <KPICard label="Produtos" value={formatNumber(kpis.produtos)} color="blue" />
        <KPICard label="Ticket Medio" value={formatCurrency(kpis.ticket)} color="orange" />
      </div>

      {/* Pedidos recentes */}
      <SectionCard title="Pedidos Recentes">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="px-3 py-2">N</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2">UF</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p, i) => (
                <tr
                  key={String(p.id || i)}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
                  <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">
                    {p.numero || '\u2014'}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                    {p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '\u2014'}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {p.cliente_nome || '\u2014'}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                    {formatCurrency(p.valor_total || 0)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {statusBadge(p.status_financeiro ?? undefined)}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                    {p.uf || '\u2014'}
                  </td>
                </tr>
              ))}
              {pedidos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                    Nenhum pedido encontrado no periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Vendas por Estado */}
      <SectionCard title="Vendas por Estado">
        {porEstado.length === 0 ? (
          <p className="text-sm text-gray-400">Sem dados de estados no periodo.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {porEstado.map((e, i) => (
              <button
                key={e.uf || i}
                onClick={() => openEstadoModal(e)}
                className="rounded-lg border border-gray-200 p-3 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] dark:border-gray-700"
              >
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  {e.uf || '?'}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formatNumber(e.total_pedidos || 0)} pedidos
                </p>
                <p className="text-xs font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(e.receita || 0)}
                </p>
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Detail Modal */}
      <DetailModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, title: '', content: null })}
        title={modal.title}
      >
        {modal.content}
      </DetailModal>
    </div>
  )
}

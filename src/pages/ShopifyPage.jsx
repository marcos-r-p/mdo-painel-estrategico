import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatNumber } from '../lib/formatters';
import SectionCard from '../components/ui/SectionCard';
import DateRangePicker from '../components/ui/DateRangePicker';
import KPICard from '../components/ui/KPICard';
import DetailModal from '../components/ui/DetailModal';

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

export default function ShopifyPage({ periodo, fonteAtiva }) {
  const [dataIni, setDataIni] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return fmt(d);
  });
  const [dataFim, setDataFim] = useState(() => fmt(new Date()));
  const [pedidos, setPedidos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashData, setDashData] = useState(null);
  const [modal, setModal] = useState({ open: false, title: '', content: null });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, pedidosRes, produtosRes] = await Promise.all([
        supabase.rpc('shopify_dashboard_periodo', {
          data_ini: dataIni,
          data_fim: dataFim,
        }),
        supabase
          .from('shopify_pedidos')
          .select('*')
          .gte('data_pedido', dataIni)
          .lte('data_pedido', dataFim)
          .order('data_pedido', { ascending: false })
          .limit(20),
        supabase
          .from('shopify_produtos')
          .select('*')
          .limit(1000),
      ]);

      if (dashRes.data) setDashData(dashRes.data);
      if (pedidosRes.data) setPedidos(pedidosRes.data);
      if (produtosRes.data) setProdutos(produtosRes.data);
    } catch (err) {
      console.error('ShopifyPage fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [dataIni, dataFim]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpis = useMemo(() => {
    if (!dashData) return { pedidos: 0, receita: 0, clientes: 0, produtos: 0, ticket: 0 };
    return {
      pedidos: dashData.total_pedidos || 0,
      receita: dashData.receita_total || 0,
      clientes: dashData.total_clientes || 0,
      produtos: dashData.total_produtos || 0,
      ticket: dashData.ticket_medio || 0,
    };
  }, [dashData]);

  const porEstado = useMemo(() => {
    if (!dashData?.por_estado) return [];
    return Array.isArray(dashData.por_estado) ? dashData.por_estado : [];
  }, [dashData]);

  const topClientes = useMemo(() => {
    if (!dashData?.top_clientes) return [];
    const list = Array.isArray(dashData.top_clientes) ? dashData.top_clientes : [];
    return list.slice(0, 10);
  }, [dashData]);

  const topProdutos = useMemo(() => {
    if (!dashData?.top_produtos) return [];
    const list = Array.isArray(dashData.top_produtos) ? dashData.top_produtos : [];
    return list.slice(0, 10);
  }, [dashData]);

  function handleDateChange({ dataIni: ini, dataFim: fim }) {
    if (ini) setDataIni(ini);
    if (fim) setDataFim(fim);
  }

  function statusBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'paid')
      return <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">Pago</span>;
    if (s === 'pending')
      return <span className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">Pendente</span>;
    if (s === 'refunded')
      return <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">Reembolsado</span>;
    return <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">{status || '—'}</span>;
  }

  function openEstadoModal(estado) {
    setModal({
      open: true,
      title: `Vendas — ${estado.uf || estado.estado || 'Estado'}`,
      content: (
        <div className="space-y-2 text-sm">
          <p><strong>Pedidos:</strong> {formatNumber(estado.total_pedidos || estado.pedidos || 0)}</p>
          <p><strong>Receita:</strong> {formatCurrency(estado.receita || estado.valor || 0)}</p>
          <p><strong>Ticket Medio:</strong> {formatCurrency(
            (estado.receita || estado.valor || 0) / (estado.total_pedidos || estado.pedidos || 1)
          )}</p>
          <p><strong>Clientes:</strong> {formatNumber(estado.clientes || 0)}</p>
        </div>
      ),
    });
  }

  function openClienteModal(cliente) {
    setModal({
      open: true,
      title: `Cliente — ${cliente.nome || cliente.cliente || ''}`,
      content: (
        <div className="space-y-2 text-sm">
          <p><strong>Total Gasto:</strong> {formatCurrency(cliente.valor || cliente.total || 0)}</p>
          <p><strong>Pedidos:</strong> {formatNumber(cliente.pedidos || cliente.total_pedidos || 0)}</p>
          <p><strong>Ticket Medio:</strong> {formatCurrency(
            (cliente.valor || cliente.total || 0) / (cliente.pedidos || cliente.total_pedidos || 1)
          )}</p>
        </div>
      ),
    });
  }

  function openProdutoModal(produto) {
    setModal({
      open: true,
      title: `Produto — ${produto.nome || produto.titulo || produto.produto || ''}`,
      content: (
        <div className="space-y-2 text-sm">
          <p><strong>Vendas:</strong> {formatNumber(produto.vendas || produto.quantidade || 0)}</p>
          <p><strong>Receita:</strong> {formatCurrency(produto.receita || produto.valor || 0)}</p>
        </div>
      ),
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
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
                  key={p.id || i}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
                  <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">
                    {p.numero_pedido || p.order_number || '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                    {p.data_pedido ? new Date(p.data_pedido).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {p.cliente || p.nome_cliente || '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                    {formatCurrency(p.valor_total || 0)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {statusBadge(p.status_financeiro)}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                    {p.uf || p.estado || '—'}
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
                key={e.uf || e.estado || i}
                onClick={() => openEstadoModal(e)}
                className="rounded-lg border border-gray-200 p-3 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] dark:border-gray-700"
              >
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  {e.uf || e.estado || '?'}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formatNumber(e.total_pedidos || e.pedidos || 0)} pedidos
                </p>
                <p className="text-xs font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(e.receita || e.valor || 0)}
                </p>
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Top Clientes + Top Produtos side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Top 10 Clientes">
          {topClientes.length === 0 ? (
            <p className="text-sm text-gray-400">Sem dados.</p>
          ) : (
            <div className="space-y-2">
              {topClientes.map((c, i) => (
                <button
                  key={i}
                  onClick={() => openClienteModal(c)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-left transition-all hover:bg-gray-50 hover:shadow-sm dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                      {i + 1}
                    </span>
                    <span className="truncate text-sm text-gray-700 dark:text-gray-300">
                      {c.nome || c.cliente || 'Sem nome'}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(c.valor || c.total || 0)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Top 10 Produtos">
          {topProdutos.length === 0 ? (
            <p className="text-sm text-gray-400">Sem dados.</p>
          ) : (
            <div className="space-y-2">
              {topProdutos.map((p, i) => (
                <button
                  key={i}
                  onClick={() => openProdutoModal(p)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-left transition-all hover:bg-gray-50 hover:shadow-sm dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                      {i + 1}
                    </span>
                    <span className="truncate text-sm text-gray-700 dark:text-gray-300">
                      {p.nome || p.titulo || p.produto || 'Sem nome'}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(p.receita || p.valor || 0)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Detail Modal */}
      <DetailModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, title: '', content: null })}
        title={modal.title}
      >
        {modal.content}
      </DetailModal>
    </div>
  );
}

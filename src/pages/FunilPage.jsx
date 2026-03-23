import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatNumber } from '../lib/formatters';
import SectionCard from '../components/ui/SectionCard';

export default function FunilPage({ periodo, fonteAtiva }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('shopify_pedidos')
          .select('valor_total, status_financeiro');
        if (data) setPedidos(data);
      } catch (err) {
        console.error('FunilPage fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { totalPedidos, receita, pedidosPagos } = useMemo(() => {
    const total = pedidos.length;
    const pagos = pedidos.filter(
      (p) => (p.status_financeiro || '').toLowerCase() === 'paid'
    );
    const rec = pagos.reduce((s, p) => s + (Number(p.valor_total) || 0), 0);
    return { totalPedidos: total, receita: rec, pedidosPagos: pagos.length };
  }, [pedidos]);

  const funnel = useMemo(() => {
    const sessoes = 24973;
    const vizProduto = Math.round(sessoes * 0.38);
    const addCart = Math.round(sessoes * 0.12);
    const iniCheckout = Math.round(sessoes * 0.045);
    const comprou = pedidosPagos;

    const stages = [
      { label: 'Sessoes', value: sessoes, pct: 100 },
      { label: 'Visualizou Produto', value: vizProduto, pct: 38 },
      { label: 'Adicionou ao Carrinho', value: addCart, pct: 12 },
      { label: 'Iniciou Checkout', value: iniCheckout, pct: 4.5 },
      { label: 'Comprou', value: comprou, pct: sessoes > 0 ? ((comprou / sessoes) * 100) : 0 },
    ];

    return stages;
  }, [pedidosPagos]);

  const conversions = useMemo(() => {
    if (funnel.length < 2) return [];
    const convs = [];
    for (let i = 0; i < funnel.length - 1; i++) {
      const from = funnel[i];
      const to = funnel[i + 1];
      const rate = from.value > 0 ? ((to.value / from.value) * 100) : 0;
      const lost = from.value - to.value;
      convs.push({ from: from.label, to: to.label, rate, lost });
    }
    return convs;
  }, [funnel]);

  const taxaConversao = useMemo(() => {
    const sessoes = 24973;
    return sessoes > 0 ? ((pedidosPagos / sessoes) * 100).toFixed(2) : '0.00';
  }, [pedidosPagos]);

  const maxVal = funnel.length > 0 ? funnel[0].value : 1;

  const barColors = [
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-green-500',
  ];

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
        Funil de Conversao
      </h2>

      {/* Warning banner */}
      <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
        <strong>Aviso:</strong> Os dados de sessoes, visualizacao de produto, carrinho e checkout sao estimativas.
        Apenas os dados de pedidos pagos vem diretamente da Shopify.
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Sessoes</p>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(24973)}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/40">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Pedidos Pagos</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{formatNumber(pedidosPagos)}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/40">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Taxa Conversao</p>
          <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">{taxaConversao}%</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/40">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Receita</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(receita)}</p>
        </div>
      </div>

      {/* Visual Funnel */}
      <SectionCard title="Funil Visual">
        <div className="space-y-3">
          {funnel.map((stage, i) => {
            const widthPct = maxVal > 0 ? Math.max((stage.value / maxVal) * 100, 2) : 2;
            const conv = conversions[i];
            return (
              <div key={stage.label}>
                {/* Stage bar */}
                <div className="flex items-center gap-3">
                  <div className="w-44 shrink-0 text-right">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{stage.label}</p>
                  </div>
                  <div className="relative flex-1">
                    <div
                      className={`h-10 rounded-lg ${barColors[i] || 'bg-gray-400'} flex items-center px-3 transition-all duration-500`}
                      style={{ width: `${widthPct}%` }}
                    >
                      <span className="text-xs font-bold text-white drop-shadow">
                        {formatNumber(stage.value)}
                      </span>
                    </div>
                  </div>
                  <div className="w-16 shrink-0 text-right">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {stage.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Conversion arrow between stages */}
                {conv && (
                  <div className="ml-44 flex items-center gap-2 py-1 pl-3">
                    <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {conv.rate.toFixed(1)}% conversao — {formatNumber(conv.lost)} perdidos
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Summary: Losses + Opportunities */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Maiores Perdas">
          <div className="space-y-3">
            {conversions.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/30"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {c.from} → {c.to}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Conversao: {c.rate.toFixed(1)}%
                  </p>
                </div>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  -{formatNumber(c.lost)}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Oportunidades">
          <div className="space-y-3">
            {conversions.map((c, i) => {
              const currentFrom = funnel[i]?.value || 0;
              const currentTo = funnel[i + 1]?.value || 0;
              const currentRate = currentFrom > 0 ? (currentTo / currentFrom) * 100 : 0;
              const newRate = currentRate + 1;
              const newTo = Math.round(currentFrom * (newRate / 100));
              const gain = newTo - currentTo;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950/30"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      +1% em {c.from} → {c.to}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {currentRate.toFixed(1)}% → {newRate.toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    +{formatNumber(gain)}
                  </p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

import type { ComparativoMensal } from '../../types/financial';

const METRIC_LABELS: Record<string, string> = {
  receita: 'Receita',
  despesas: 'Despesas',
  lucro: 'Lucro',
  ticket_medio: 'Ticket Médio',
  qtd_vendas: 'Qtd. Vendas',
};

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatValue(metrica: string, value: number): string {
  if (metrica === 'qtd_vendas') return value.toLocaleString('pt-BR');
  return formatBRL(value);
}

function VariationBadge({ value, label }: { value: number; label: string }) {
  if (value === 0) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {label}: 0%
      </span>
    );
  }

  const isPositive = value > 0;
  const arrow = isPositive ? '\u2191' : '\u2193';
  const colorClass = isPositive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      {arrow} {Math.abs(value).toFixed(1)}% {label}
    </span>
  );
}

interface ComparativoCardProps {
  data: ComparativoMensal[];
  selectedMonth: string;
}

export default function ComparativoCard({ data, selectedMonth }: ComparativoCardProps) {
  const monthData = data.filter((item) => item.ano_mes === selectedMonth);

  if (!monthData.length) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Sem dados comparativos para o mês selecionado
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {monthData.map((item) => (
        <div
          key={item.metrica}
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {METRIC_LABELS[item.metrica] ?? item.metrica}
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatValue(item.metrica, item.valor)}
          </p>
          <div className="mt-2 flex flex-col gap-1">
            <VariationBadge value={item.variacao_percentual_mes} label="vs mês ant." />
            <VariationBadge value={item.variacao_percentual_ano} label="vs ano ant." />
          </div>
        </div>
      ))}
    </div>
  );
}

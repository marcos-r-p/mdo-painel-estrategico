import { useState, useMemo } from 'react';
import type { MargemProduto, MargemCanal } from '../../types/financial';

function formatBRL(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function marginColor(pct: number): string {
  if (pct >= 30) return 'text-green-600 dark:text-green-400';
  if (pct >= 10) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function marginBadgeBg(pct: number): string {
  if (pct >= 30) return 'bg-green-100 dark:bg-green-900/40';
  if (pct >= 10) return 'bg-yellow-100 dark:bg-yellow-900/40';
  return 'bg-red-100 dark:bg-red-900/40';
}

type SortKey = 'margem_percentual' | 'receita' | 'margem_valor';
type SortDir = 'asc' | 'desc';

interface MargemTableProps {
  data: MargemProduto[] | MargemCanal[];
  type: 'produto' | 'canal';
}

export default function MargemTable({ data, type }: MargemTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('margem_percentual');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      const aVal = (a as unknown as Record<string, number>)[sortKey];
      const bVal = (b as unknown as Record<string, number>)[sortKey];
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  if (!data.length) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Sem dados de margem
      </div>
    );
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  const thClass =
    'px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none';
  const tdClass = 'px-4 py-2 text-sm text-gray-700 dark:text-gray-300';

  if (type === 'produto') {
    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className={thClass}>SKU</th>
              <th className={thClass}>Produto</th>
              <th className={thClass} onClick={() => handleSort('receita')}>
                Receita{sortIndicator('receita')}
              </th>
              <th className={thClass}>Custo</th>
              <th className={thClass} onClick={() => handleSort('margem_valor')}>
                Margem R${sortIndicator('margem_valor')}
              </th>
              <th className={thClass} onClick={() => handleSort('margem_percentual')}>
                Margem %{sortIndicator('margem_percentual')}
              </th>
            </tr>
          </thead>
          <tbody>
            {(sorted as MargemProduto[]).map((item) => (
              <tr
                key={item.sku}
                className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
              >
                <td className={`${tdClass} font-mono text-xs`}>{item.sku}</td>
                <td className={tdClass}>{item.produto}</td>
                <td className={tdClass}>{formatBRL(item.receita)}</td>
                <td className={tdClass}>{formatBRL(item.custo_cmv)}</td>
                <td className={tdClass}>{formatBRL(item.margem_valor)}</td>
                <td className={tdClass}>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${marginColor(item.margem_percentual)} ${marginBadgeBg(item.margem_percentual)}`}
                  >
                    {formatPercent(item.margem_percentual)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className={thClass}>Canal</th>
            <th className={thClass} onClick={() => handleSort('receita')}>
              Receita{sortIndicator('receita')}
            </th>
            <th className={thClass}>Qtd. Docs</th>
            <th className={thClass} onClick={() => handleSort('margem_percentual')}>
              Margem %{sortIndicator('margem_percentual')}
            </th>
          </tr>
        </thead>
        <tbody>
          {(sorted as MargemCanal[]).map((item) => (
            <tr
              key={item.canal}
              className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
            >
              <td className={tdClass}>{item.canal}</td>
              <td className={tdClass}>{formatBRL(item.receita)}</td>
              <td className={tdClass}>{(item.qtd_documentos ?? 0).toLocaleString('pt-BR')}</td>
              <td className={tdClass}>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${marginColor(item.margem_percentual)} ${marginBadgeBg(item.margem_percentual)}`}
                >
                  {formatPercent(item.margem_percentual)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { useState } from 'react';
import type { DREMensal } from '../../types/financial';

const DRE_ORDER = [
  'receita_bruta',
  'impostos',
  'receita_liquida',
  'cmv',
  'lucro_bruto',
  'despesas_operacionais',
  'resultado_operacional',
  'despesas_financeiras',
  'lucro_liquido',
  'margem_bruta_pct',
  'margem_liquida_pct',
] as const;

const DRE_LABELS: Record<string, string> = {
  receita_bruta: 'Receita Bruta',
  impostos: '(-) Impostos',
  receita_liquida: '(=) Receita Líquida',
  cmv: '(-) CMV',
  lucro_bruto: '(=) Lucro Bruto',
  despesas_operacionais: '(-) Despesas Operacionais',
  resultado_operacional: '(=) Resultado Operacional',
  despesas_financeiras: '(-) Despesas Financeiras',
  lucro_liquido: '(=) Lucro Líquido',
  margem_bruta_pct: 'Margem Bruta',
  margem_liquida_pct: 'Margem Líquida',
};

const SUBTOTAL_LINES = new Set([
  'receita_liquida',
  'lucro_bruto',
  'resultado_operacional',
  'lucro_liquido',
]);

const MARGIN_LINES = new Set(['margem_bruta_pct', 'margem_liquida_pct']);

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

interface DRETableProps {
  data: DREMensal[];
  selectedMonth: string;
}

export default function DRETable({ data, selectedMonth }: DRETableProps) {
  const [expanded, setExpanded] = useState(true);

  const monthData = data.filter((item) => item.ano_mes === selectedMonth);
  const valueMap = new Map(monthData.map((item) => [item.linha, item.valor]));

  if (!monthData.length) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Sem dados de DRE para o mês selecionado
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-750"
      >
        <span>DRE - {selectedMonth}</span>
        <span className="text-gray-400">{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>

      {expanded && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                Linha
              </th>
              <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">
                Valor
              </th>
            </tr>
          </thead>
          <tbody>
            {DRE_ORDER.map((linha) => {
              const valor = valueMap.get(linha);
              if (valor === undefined) return null;

              const isSubtotal = SUBTOTAL_LINES.has(linha);
              const isMargin = MARGIN_LINES.has(linha);
              const isNegative = valor < 0;

              const rowClasses = isSubtotal
                ? 'bg-gray-50 dark:bg-gray-800/60 font-bold'
                : '';

              const valueColor = isNegative
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400';

              return (
                <tr
                  key={linha}
                  className={`border-b border-gray-100 dark:border-gray-800 ${rowClasses}`}
                >
                  <td
                    className={`px-4 py-2 text-gray-700 dark:text-gray-300 ${isSubtotal ? 'font-semibold' : ''}`}
                  >
                    {DRE_LABELS[linha] ?? linha}
                  </td>
                  <td className={`px-4 py-2 text-right ${valueColor} ${isSubtotal ? 'font-semibold' : ''}`}>
                    {isMargin ? formatPercent(valor) : formatBRL(valor)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

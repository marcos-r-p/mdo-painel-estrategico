import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { FluxoCaixaMensal } from '../../types/financial';

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

function formatAnoMes(anoMes: string): string {
  const [year, month] = anoMes.split('-');
  const label = MONTH_LABELS[month] ?? month;
  return `${label}/${year.slice(2)}`;
}

function formatBRL(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface FluxoCaixaChartProps {
  data: FluxoCaixaMensal[];
}

export default function FluxoCaixaChart({ data }: FluxoCaixaChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Sem dados de fluxo de caixa
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    label: formatAnoMes(item.ano_mes),
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          axisLine={{ stroke: '#4b5563' }}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
          }}
          labelStyle={{ color: '#d1d5db', fontWeight: 600 }}
          formatter={(value: number, name: string) => {
            const labels: Record<string, string> = {
              receitas: 'Receitas',
              despesas: 'Despesas',
              saldo_acumulado: 'Saldo Acumulado',
            };
            return [formatBRL(value), labels[name] ?? name];
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '0.75rem', color: '#9ca3af' }}
          formatter={(value: string) => {
            const labels: Record<string, string> = {
              receitas: 'Receitas',
              despesas: 'Despesas',
              saldo_acumulado: 'Saldo Acumulado',
            };
            return labels[value] ?? value;
          }}
        />
        <Bar
          yAxisId="left"
          dataKey="receitas"
          stackId="stack"
          fill="#10b981"
          radius={[2, 2, 0, 0]}
        />
        <Bar
          yAxisId="left"
          dataKey="despesas"
          stackId="stack"
          fill="#f43f5e"
          radius={[2, 2, 0, 0]}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="saldo_acumulado"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={{ r: 3, fill: '#0ea5e9' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

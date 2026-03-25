import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ContasVencer } from '../../types/financial';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface AgingChartProps {
  data: ContasVencer[];
}

export default function AgingChart({ data }: AgingChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Sem dados de aging
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.ordem - b.ordem);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="faixa"
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={100}
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
              a_receber: 'A Receber',
              a_pagar: 'A Pagar',
            };
            return [formatBRL(value), labels[name] ?? name];
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '0.75rem', color: '#9ca3af' }}
          formatter={(value: string) => {
            const labels: Record<string, string> = {
              a_receber: 'A Receber',
              a_pagar: 'A Pagar',
            };
            return labels[value] ?? value;
          }}
        />
        <Bar dataKey="a_receber" fill="#10b981" radius={[0, 4, 4, 0]} />
        <Bar dataKey="a_pagar" fill="#f43f5e" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

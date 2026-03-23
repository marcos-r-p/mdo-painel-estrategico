import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const defaultColors = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
];

interface PieChartItem {
  [key: string]: string | number;
}

interface PieChartProps {
  data?: PieChartItem[];
  size?: number;
  valueKey?: string;
  labelKey?: string;
  colors?: string[];
  className?: string;
}

export default function PieChart({
  data = [],
  size = 160,
  valueKey = 'value',
  labelKey = 'label',
  colors = defaultColors,
  className = '',
}: PieChartProps) {
  const total = data.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0);

  if (!data.length || total === 0) {
    return (
      <div
        className={`flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 ${className}`}
        style={{ width: size, height: size }}
      >
        Sem dados
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: String(item[labelKey] ?? ''),
    value: Number(item[valueKey]) || 0,
  }));

  return (
    <div className={`flex items-start gap-4 ${className}`}>
      {/* Pie circle */}
      <div className="shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={size / 2 - 4}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {chartData.map((_entry, i) => (
                <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />
              ))}
            </Pie>
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 py-1">
        {data.map((item, i) => {
          const val = Number(item[valueKey]) || 0;
          const pct = ((val / total) * 100).toFixed(1);
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="text-gray-700 dark:text-gray-300">
                {item[labelKey]}
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

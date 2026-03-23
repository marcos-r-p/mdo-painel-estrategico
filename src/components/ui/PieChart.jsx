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

export default function PieChart({
  data = [],
  size = 160,
  valueKey = 'value',
  labelKey = 'label',
  colors = defaultColors,
  className = '',
}) {
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

  // Build conic gradient stops
  let cumPercent = 0;
  const stops = data.map((item, i) => {
    const percent = ((Number(item[valueKey]) || 0) / total) * 100;
    const start = cumPercent;
    cumPercent += percent;
    const color = colors[i % colors.length];
    return `${color} ${start}% ${cumPercent}%`;
  });

  const gradient = `conic-gradient(${stops.join(', ')})`;

  return (
    <div className={`flex items-start gap-4 ${className}`}>
      {/* Pie circle */}
      <div
        className="shrink-0 rounded-full shadow-sm"
        style={{
          width: size,
          height: size,
          background: gradient,
        }}
        role="img"
        aria-label="Grafico de pizza"
      />

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

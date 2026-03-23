function Sparkline({ data, color = '#3b82f6', width = 80, height = 28 }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const colorMap = {
  green: {
    bg: 'bg-green-50 dark:bg-green-950/40',
    border: 'border-green-200 dark:border-green-800',
    accent: 'text-green-600 dark:text-green-400',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800',
    accent: 'text-red-600 dark:text-red-400',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-200 dark:border-orange-800',
    accent: 'text-orange-600 dark:text-orange-400',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    accent: 'text-blue-600 dark:text-blue-400',
  },
  gray: {
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    border: 'border-gray-200 dark:border-gray-700',
    accent: 'text-gray-600 dark:text-gray-400',
  },
};

const trendConfig = {
  up: { icon: '\u2191', color: 'text-green-600 dark:text-green-400' },
  down: { icon: '\u2193', color: 'text-red-600 dark:text-red-400' },
  neutral: { icon: '\u2192', color: 'text-gray-500 dark:text-gray-400' },
};

export default function KPICard({
  label,
  value,
  subvalue,
  trend,
  color = 'gray',
  sparkData,
  sparkColor,
  onClick,
}) {
  const palette = colorMap[color] || colorMap.gray;
  const trendInfo = trend ? trendConfig[trend] || trendConfig.neutral : null;

  const Wrapper = onClick ? 'button' : 'div';
  const interactiveClasses = onClick
    ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-150'
    : '';

  return (
    <Wrapper
      onClick={onClick}
      className={`
        animate-fade-in w-full rounded-xl border p-4
        ${palette.bg} ${palette.border}
        ${interactiveClasses}
        text-left
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className={`mt-1 text-2xl font-bold ${palette.accent}`}>
            {value}
          </p>
          {subvalue && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {subvalue}
            </p>
          )}
          {trendInfo && (
            <span className={`mt-1 inline-flex items-center gap-0.5 text-xs font-medium ${trendInfo.color}`}>
              <span>{trendInfo.icon}</span>
              <span>{trend}</span>
            </span>
          )}
        </div>
        {sparkData && sparkData.length > 1 && (
          <Sparkline data={sparkData} color={sparkColor || '#3b82f6'} />
        )}
      </div>
    </Wrapper>
  );
}

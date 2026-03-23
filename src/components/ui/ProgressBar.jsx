const barColors = {
  green: 'bg-green-500 dark:bg-green-400',
  red: 'bg-red-500 dark:bg-red-400',
  orange: 'bg-orange-500 dark:bg-orange-400',
  blue: 'bg-blue-500 dark:bg-blue-400',
  purple: 'bg-purple-500 dark:bg-purple-400',
};

const trackColors = {
  green: 'bg-green-100 dark:bg-green-900/30',
  red: 'bg-red-100 dark:bg-red-900/30',
  orange: 'bg-orange-100 dark:bg-orange-900/30',
  blue: 'bg-blue-100 dark:bg-blue-900/30',
  purple: 'bg-purple-100 dark:bg-purple-900/30',
};

export default function ProgressBar({
  value = 0,
  max = 100,
  color = 'blue',
  label,
  detail,
  showPercent = false,
  className = '',
}) {
  const safeMax = max || 1;
  const percent = Math.min(Math.max((value / safeMax) * 100, 0), 100);
  const barColor = barColors[color] || barColors.blue;
  const trackColor = trackColors[color] || trackColors.blue;

  return (
    <div className={`w-full ${className}`}>
      {(label || detail || showPercent) && (
        <div className="mb-1 flex items-baseline justify-between gap-2">
          {label && (
            <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
          <div className="flex shrink-0 items-baseline gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            {detail && <span>{detail}</span>}
            {showPercent && <span className="font-semibold">{percent.toFixed(0)}%</span>}
          </div>
        </div>
      )}
      <div
        className={`h-2.5 w-full overflow-hidden rounded-full ${trackColor}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

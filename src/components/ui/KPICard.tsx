import type { KPIColor, KPITrend } from '../../types/domain';
import SparklineChart from '../charts/SparklineChart';

const colorMap: Record<KPIColor, { bg: string; border: string; accent: string }> = {
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

const trendConfig: Record<KPITrend, { icon: string; color: string }> = {
  up: { icon: '\u2191', color: 'text-green-600 dark:text-green-400' },
  down: { icon: '\u2193', color: 'text-red-600 dark:text-red-400' },
  neutral: { icon: '\u2192', color: 'text-gray-500 dark:text-gray-400' },
};

interface KPICardProps {
  label: string;
  value: string | number;
  subvalue?: string;
  trend?: KPITrend;
  color?: KPIColor;
  sparkData?: number[];
  sparkColor?: string;
  onClick?: () => void;
}

export default function KPICard({
  label,
  value,
  subvalue,
  trend,
  color = 'gray',
  sparkData,
  sparkColor,
  onClick,
}: KPICardProps) {
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
          <SparklineChart data={sparkData} color={sparkColor || '#3b82f6'} />
        )}
      </div>
    </Wrapper>
  );
}

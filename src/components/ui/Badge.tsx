import type { ReactNode } from 'react';
import type { BadgeType } from '../../types/domain';

const typeStyles: Record<BadgeType, string> = {
  critico: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
  alto: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700',
  medio: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
  baixo: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  positivo: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
};

interface BadgeProps {
  type?: BadgeType;
  children: ReactNode;
  className?: string;
}

export default function Badge({ type = 'medio', children, className = '' }: BadgeProps) {
  const styles = typeStyles[type] || typeStyles.medio;

  return (
    <span
      className={`
        inline-flex items-center rounded-full border px-2.5 py-0.5
        text-xs font-semibold leading-tight
        ${styles}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

import { useState, useMemo } from 'react';

interface DateRange {
  dataIni: string;
  dataFim: string;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function subDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDate(d);
}

function subMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return formatDate(d);
}

interface Shortcut {
  label: string;
  fn: () => DateRange;
}

const shortcuts: Shortcut[] = [
  { label: '7d', fn: () => ({ dataIni: subDays(7), dataFim: formatDate(new Date()) }) },
  { label: '30d', fn: () => ({ dataIni: subDays(30), dataFim: formatDate(new Date()) }) },
  { label: '90d', fn: () => ({ dataIni: subDays(90), dataFim: formatDate(new Date()) }) },
  { label: '6m', fn: () => ({ dataIni: subMonths(6), dataFim: formatDate(new Date()) }) },
  { label: '1a', fn: () => ({ dataIni: subMonths(12), dataFim: formatDate(new Date()) }) },
  { label: 'Tudo', fn: () => ({ dataIni: '', dataFim: '' }) },
];

interface DateRangePickerProps {
  dataIni?: string;
  dataFim?: string;
  onChange?: (range: DateRange) => void;
}

export default function DateRangePicker({ dataIni, dataFim, onChange }: DateRangePickerProps) {
  const [localIni, setLocalIni] = useState(dataIni || '');
  const [localFim, setLocalFim] = useState(dataFim || '');

  const isDirty = useMemo(
    () => localIni !== (dataIni || '') || localFim !== (dataFim || ''),
    [localIni, localFim, dataIni, dataFim],
  );

  function handleApply() {
    onChange?.({ dataIni: localIni, dataFim: localFim });
  }

  function handleShortcut(fn: () => DateRange) {
    const range = fn();
    setLocalIni(range.dataIni);
    setLocalFim(range.dataFim);
    onChange?.(range);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date inputs */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={localIni}
          onChange={(e) => setLocalIni(e.target.value)}
          className="
            rounded-lg border border-gray-300 bg-white px-2.5 py-1.5
            text-sm text-gray-700 shadow-sm
            focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
            dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200
            dark:focus:border-blue-400 dark:focus:ring-blue-400
          "
          aria-label="Data inicial"
        />
        <span className="text-xs text-gray-400">a</span>
        <input
          type="date"
          value={localFim}
          onChange={(e) => setLocalFim(e.target.value)}
          className="
            rounded-lg border border-gray-300 bg-white px-2.5 py-1.5
            text-sm text-gray-700 shadow-sm
            focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
            dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200
            dark:focus:border-blue-400 dark:focus:ring-blue-400
          "
          aria-label="Data final"
        />
      </div>

      {/* Apply button */}
      <button
        onClick={handleApply}
        disabled={!isDirty}
        className="
          rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white
          shadow-sm transition-colors
          hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40
          dark:bg-blue-500 dark:hover:bg-blue-600
        "
      >
        Aplicar
      </button>

      {/* Shortcut buttons */}
      <div className="flex items-center gap-1 border-l border-gray-200 pl-2 dark:border-gray-700">
        {shortcuts.map((s) => (
          <button
            key={s.label}
            onClick={() => handleShortcut(s.fn)}
            className="
              rounded-md px-2 py-1 text-xs font-medium text-gray-600
              transition-colors hover:bg-gray-100 hover:text-gray-900
              dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200
            "
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

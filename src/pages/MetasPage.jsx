import { useState } from 'react';
import { DADOS } from '../data/constants';
import { formatCurrency, formatNumber } from '../lib/formatters';
import SectionCard from '../components/ui/SectionCard';
import DateRangePicker from '../components/ui/DateRangePicker';
import ProgressBar from '../components/ui/ProgressBar';
import Badge from '../components/ui/Badge';

export default function MetasPage({ fonteAtiva }) {
  const [dateRange, setDateRange] = useState({ dataIni: '', dataFim: '' });

  const metas = DADOS.metas || {};
  const tarefas = DADOS.tarefas || [];

  const fase1 = metas.fase1 || {};
  const fase2 = metas.fase2 || {};
  const fase3 = metas.fase3 || {};

  const concluidas = tarefas.filter((t) => t.status === 'concluido').length;
  const pendentes = tarefas.filter((t) => t.status === 'pendente').length;

  const faseConfig = [
    {
      fase: fase1,
      label: 'Fase 1',
      borderColor: 'border-blue-200 dark:border-blue-800',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      headerBg: 'bg-blue-100 dark:bg-blue-900/50',
      textColor: 'text-blue-800 dark:text-blue-300',
      barColor: 'blue',
    },
    {
      fase: fase2,
      label: 'Fase 2',
      borderColor: 'border-purple-200 dark:border-purple-800',
      bgColor: 'bg-purple-50 dark:bg-purple-950/40',
      headerBg: 'bg-purple-100 dark:bg-purple-900/50',
      textColor: 'text-purple-800 dark:text-purple-300',
      barColor: 'purple',
    },
    {
      fase: fase3,
      label: 'Fase 3',
      borderColor: 'border-green-200 dark:border-green-800',
      bgColor: 'bg-green-50 dark:bg-green-950/40',
      headerBg: 'bg-green-100 dark:bg-green-900/50',
      textColor: 'text-green-800 dark:text-green-300',
      barColor: 'green',
    },
  ];

  function formatKPIValue(kpi) {
    if (kpi.unidade === 'R$') return formatCurrency(kpi.atual);
    if (kpi.unidade === 'clientes' || kpi.unidade === 'deals' || kpi.unidade === 'canais')
      return formatNumber(kpi.atual);
    if (kpi.unidade === '%') return `${kpi.atual}%`;
    if (kpi.unidade === 'sim/nao') return kpi.atual === 1 ? 'Sim' : 'Nao';
    return String(kpi.atual);
  }

  function formatKPIMeta(kpi) {
    if (kpi.unidade === 'R$') return formatCurrency(kpi.meta);
    if (kpi.unidade === 'clientes' || kpi.unidade === 'deals' || kpi.unidade === 'canais')
      return formatNumber(kpi.meta);
    if (kpi.unidade === '%') return `${kpi.meta}%`;
    if (kpi.unidade === 'sim/nao') return kpi.meta === 1 ? 'Sim' : 'Nao';
    return String(kpi.meta);
  }

  const prioridadeBadgeType = {
    alta: 'critico',
    media: 'medio',
    baixa: 'baixo',
  };

  const statusBadgeType = {
    concluido: 'positivo',
    pendente: 'alto',
  };

  return (
    <div className="space-y-6">
      {/* Header + DateRangePicker */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Metas &amp; Planejamento
        </h2>
        <DateRangePicker
          dataIni={dateRange.dataIni}
          dataFim={dateRange.dataFim}
          onChange={setDateRange}
        />
      </div>

      {/* 3 Phase Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {faseConfig.map(({ fase, label, borderColor, bgColor, headerBg, textColor, barColor }) => (
          <div
            key={label}
            className={`overflow-hidden rounded-xl border ${borderColor} ${bgColor}`}
          >
            {/* Phase header */}
            <div className={`px-4 py-3 ${headerBg}`}>
              <p className={`text-sm font-bold ${textColor}`}>
                {label}: {fase.nome}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {fase.periodo} &mdash; {fase.objetivo}
              </p>
            </div>

            {/* KPIs */}
            <div className="space-y-3 p-4">
              {(fase.kpis || []).map((kpi) => (
                <div key={kpi.metrica}>
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {kpi.metrica}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatKPIValue(kpi)} / {formatKPIMeta(kpi)}
                    </span>
                  </div>
                  <ProgressBar
                    value={kpi.atual}
                    max={kpi.meta}
                    color={barColor}
                    showPercent
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tarefas de Coleta de Dados */}
      <SectionCard title="Tarefas de Coleta de Dados">
        <div className="grid gap-3 sm:grid-cols-2">
          {tarefas.map((t) => (
            <div
              key={t.id}
              className={`
                flex items-center justify-between rounded-lg border p-3
                ${t.status === 'concluido'
                  ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50'
                }
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold
                    ${t.status === 'concluido'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }
                  `}
                >
                  {t.status === 'concluido' ? '\u2713' : t.id}
                </span>
                <span className={`truncate text-sm ${
                  t.status === 'concluido'
                    ? 'text-gray-500 line-through dark:text-gray-400'
                    : 'text-gray-800 dark:text-gray-200'
                }`}>
                  {t.texto}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2 ml-2">
                <Badge type={statusBadgeType[t.status] || 'medio'}>
                  {t.status === 'concluido' ? 'concluido' : 'pendente'}
                </Badge>
                <Badge type={prioridadeBadgeType[t.prioridade] || 'medio'}>
                  {t.prioridade}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-4 flex items-center gap-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700 dark:bg-green-900/50 dark:text-green-400">
              {concluidas}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">concluidas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700 dark:bg-orange-900/50 dark:text-orange-400">
              {pendentes}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">pendentes</span>
          </div>
          <div className="ml-auto">
            <ProgressBar
              value={concluidas}
              max={tarefas.length}
              color="green"
              showPercent
              className="w-40"
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

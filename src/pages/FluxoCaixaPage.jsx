import { useState } from 'react';
import { DADOS } from '../data/constants';
import { formatCurrency } from '../lib/formatters';
import SectionCard from '../components/ui/SectionCard';
import DateRangePicker from '../components/ui/DateRangePicker';
import ProgressBar from '../components/ui/ProgressBar';

export default function FluxoCaixaPage({ fonteAtiva }) {
  const [range, setRange] = useState({ dataIni: '', dataFim: '' });

  const historico = DADOS.fluxoCaixa.historico;
  const custosFixos = DADOS.custos.fixos;
  const custosVariaveis = DADOS.custos.variaveis;
  const custosFinanceiras = DADOS.custos.financeiras;
  const dre = DADOS.dre;
  const maxCustoFixo = Math.max(...custosFixos.map((c) => c.valor));

  const dreLinhas = [
    { label: 'Receita Bruta', valor: dre.receitaBruta, nivel: 0 },
    { label: '(-) Impostos', valor: dre.impostos, nivel: 1 },
    { label: '= Receita Liquida', valor: dre.receitaLiquida, nivel: 0, destaque: true },
    { label: '(-) CMV', valor: dre.cmv, nivel: 1 },
    { label: '= Lucro Bruto', valor: dre.lucroBruto, nivel: 0, destaque: true },
    { label: '(-) Marketing', valor: dre.despesasOp.marketing, nivel: 1 },
    { label: '(-) Ocupacao', valor: dre.despesasOp.ocupacao, nivel: 1 },
    { label: '(-) Logistica', valor: dre.despesasOp.logistica, nivel: 1 },
    { label: '(-) Pessoal', valor: dre.despesasOp.pessoal, nivel: 1 },
    { label: '(-) Financeiras', valor: dre.despesasOp.financeiras, nivel: 1 },
    { label: '(-) Outras', valor: dre.despesasOp.outras, nivel: 1 },
    { label: '= Resultado', valor: dre.resultado, nivel: 0, destaque: true, resultado: true },
  ];

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          Fluxo de Caixa
          {fonteAtiva && (
            <span className="ml-2 text-sm font-normal text-gray-500">({fonteAtiva})</span>
          )}
        </h2>
        <DateRangePicker dataIni={range.dataIni} dataFim={range.dataFim} onChange={setRange} />
      </div>

      {/* Evolucao do Saldo Bancario */}
      <SectionCard title="Evolucao do Saldo Bancario">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="pb-3 pr-4">Periodo</th>
                <th className="pb-3 pr-4 text-right">Saldo Inicial</th>
                <th className="pb-3 pr-4 text-right">Saldo Final</th>
                <th className="pb-3 pr-4 text-right">Variacao</th>
                <th className="pb-3 text-right">Aportes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {historico.map((h) => (
                <tr key={h.mes} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-2.5 pr-4 font-medium text-gray-800 dark:text-gray-200">
                    {h.mes}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-gray-600 dark:text-gray-400">
                    {h.saldoInicial != null ? formatCurrency(h.saldoInicial) : '-'}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-gray-600 dark:text-gray-400">
                    {h.saldoFinal != null ? formatCurrency(h.saldoFinal) : '-'}
                  </td>
                  <td
                    className={`py-2.5 pr-4 text-right font-semibold ${
                      h.variacao != null
                        ? h.variacao >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {h.variacao != null ? formatCurrency(h.variacao) : '-'}
                  </td>
                  <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">
                    {h.aportes != null ? formatCurrency(h.aportes) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Despesas por Categoria */}
      <SectionCard title="Despesas por Categoria">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Custos Fixos */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Custos Fixos
              <span className="ml-2 text-xs font-normal text-gray-500">
                (Total: {formatCurrency(DADOS.custos.totalFixo)})
              </span>
            </h4>
            <div className="space-y-3">
              {custosFixos.map((c) => (
                <ProgressBar
                  key={c.item}
                  label={c.item}
                  detail={formatCurrency(c.valor)}
                  value={c.valor}
                  max={maxCustoFixo}
                  color={c.criticidade === 'alta' ? 'red' : 'blue'}
                  showPercent
                />
              ))}
            </div>
          </div>

          {/* Custos Variaveis + Financeiras */}
          <div className="space-y-6">
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Custos Variaveis
                <span className="ml-2 text-xs font-normal text-gray-500">
                  (Total: {formatCurrency(DADOS.custos.totalVariavel)})
                </span>
              </h4>
              <div className="space-y-2">
                {custosVariaveis.map((c) => (
                  <div
                    key={c.fornecedor}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {c.fornecedor}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">{c.tipo}</span>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {formatCurrency(c.valor)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Financeiras
                <span className="ml-2 text-xs font-normal text-gray-500">
                  (Total: {formatCurrency(DADOS.custos.totalFinanceiro)})
                </span>
              </h4>
              <div className="space-y-2">
                {custosFinanceiras.map((c) => (
                  <div
                    key={c.item}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {c.item}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">{c.tipo}</span>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {formatCurrency(c.valor)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* DRE Simplificado */}
      <SectionCard title="DRE Simplificado">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {dreLinhas.map((linha) => (
                <tr
                  key={linha.label}
                  className={
                    linha.destaque
                      ? 'bg-gray-50 dark:bg-gray-800/50'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                  }
                >
                  <td
                    className={`py-2.5 pr-4 ${
                      linha.destaque
                        ? 'font-bold text-gray-900 dark:text-gray-100'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                    style={{ paddingLeft: linha.nivel * 20 }}
                  >
                    {linha.label}
                  </td>
                  <td
                    className={`py-2.5 text-right font-semibold ${
                      linha.resultado
                        ? linha.valor >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                        : linha.valor < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {formatCurrency(linha.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

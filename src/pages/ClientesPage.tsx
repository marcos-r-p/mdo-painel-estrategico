import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DADOS } from '../data/seed'
import { formatCurrency, formatNumber } from '../lib/formatters'
import SectionCard from '../components/ui/SectionCard'
import KPICard from '../components/ui/KPICard'
import Badge from '../components/ui/Badge'
import DateRangePicker from '../components/ui/DateRangePicker'
import ProgressBar from '../components/ui/ProgressBar'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

interface DateRange {
  dataIni: string
  dataFim: string
}

export default function ClientesPage() {
  const [searchParams] = useSearchParams()
  const fonteAtiva = searchParams.get('fonte')

  const [range, setRange] = useState<DateRange>({ dataIni: '', dataFim: '' })

  const topClientes = DADOS.topClientes || []
  const base = DADOS.baseClientesReal || ({} as Record<string, unknown>)
  const porUF = (base.porUF as Array<{ uf: string; qtd: number; percent: number }>) || []
  const maxUF = Math.max(...porUF.map((u) => u.qtd), 1)

  const totalClientes = DADOS.empresa?.baseClientes || 28275
  const clientesAtivos = topClientes.reduce((sum, c) => sum + (c.pedidos || 0), 0)
  const taxaRecompra = DADOS.empresa?.taxaRecompra || 44
  const ticketMedio = DADOS.receita?.ticketMedio || 166.25

  return (
    <div className="space-y-6">
      {/* Header + DateRangePicker */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          Clientes
          {fonteAtiva && (
            <span className="ml-2 text-sm font-normal text-gray-500">({fonteAtiva})</span>
          )}
        </h2>
        <DateRangePicker dataIni={range.dataIni} dataFim={range.dataFim} onChange={setRange} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          label="Base Total"
          value={formatNumber(totalClientes)}
          subvalue="Clientes cadastrados"
          color="blue"
        />
        <KPICard
          label="Clientes Ativos"
          value={formatNumber(clientesAtivos)}
          subvalue="Periodo atual"
          color="green"
        />
        <KPICard
          label="Taxa Recompra"
          value={`${taxaRecompra}%`}
          subvalue="Compraram mais de 1x"
          color="green"
        />
        <KPICard
          label="Ticket Medio"
          value={formatCurrency(ticketMedio)}
          subvalue="Por pedido"
          color="blue"
        />
      </div>

      {/* Top 10 Clientes */}
      <SectionCard title="Top 10 Clientes - Ranking por Valor">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Nome</th>
                <th className="pb-3 pr-4 text-right">Valor</th>
                <th className="pb-3 pr-4 text-right">Pedidos</th>
                <th className="pb-3 pr-4 text-center">Tipo</th>
                <th className="pb-3 pr-4 text-right">Ticket Medio</th>
                <th className="pb-3 text-center">Recompra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {topClientes.slice(0, 10).map((c, i) => (
                <tr
                  key={i}
                  className="text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/50"
                >
                  <td className="py-2.5 pr-4 font-semibold text-gray-400">{i + 1}</td>
                  <td className="py-2.5 pr-4 font-medium">{c.nome}</td>
                  <td className="py-2.5 pr-4 text-right font-semibold">{formatCurrency(c.valor)}</td>
                  <td className="py-2.5 pr-4 text-right">{c.pedidos}</td>
                  <td className="py-2.5 pr-4 text-center">
                    <Badge type={c.tipo === 'B2B' ? 'alto' : 'baixo'}>
                      {c.tipo}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4 text-right">{formatCurrency(c.ticketMedio)}</td>
                  <td className="py-2.5 text-center">
                    <Badge type={c.recompra ? 'positivo' : 'medio'}>
                      {c.recompra ? 'Recorrente' : 'Unico'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Base de Clientes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Base de Clientes - Composicao">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Pessoa Fisica</p>
                <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatNumber((base.pessoaFisica as number) || 7830)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Pessoa Juridica</p>
                <p className="mt-1 text-xl font-bold text-orange-600 dark:text-orange-400">
                  {formatNumber((base.pessoaJuridica as number) || 166)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Com Email</p>
                <p className="mt-1 text-xl font-bold text-green-600 dark:text-green-400">
                  {(base.percentEmail as number) || 76.6}%
                </p>
                <p className="text-xs text-gray-500">{formatNumber((base.comEmail as number) || 6127)} contatos</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Com Celular</p>
                <p className="mt-1 text-xl font-bold text-green-600 dark:text-green-400">
                  {(base.percentCelular as number) || 76.8}%
                </p>
                <p className="text-xs text-gray-500">{formatNumber((base.comCelular as number) || 6148)} contatos</p>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Distribuicao por UF */}
        <SectionCard title="Distribuicao por UF">
          <div className="space-y-2.5">
            {porUF.map((u) => (
              <ProgressBar
                key={u.uf}
                label={u.uf}
                value={u.qtd}
                max={maxUF}
                color="blue"
                detail={`${formatNumber(u.qtd)} (${u.percent}%)`}
              />
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

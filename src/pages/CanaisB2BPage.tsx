import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { DADOS } from '../data/seed'
import { formatCurrency } from '../lib/formatters'
import SectionCard from '../components/ui/SectionCard'
import DateRangePicker from '../components/ui/DateRangePicker'
import Badge from '../components/ui/Badge'
import ProgressBar from '../components/ui/ProgressBar'
import PieChart from '../components/charts/PieChart'
import DetailModal from '../components/ui/DetailModal'

interface DateRange {
  dataIni: string
  dataFim: string
}

interface CanalB2B {
  canal: string
  potencial: string
  ticketEst: number
  freq: string
  produtos: string
  estrategia: string
  clienteRef?: string
}

const potencialBadge: Record<string, string> = {
  alto: 'positivo',
  medio: 'medio',
  baixo: 'baixo',
}

export default function CanaisB2BPage() {
  useDocumentTitle('Canais B2B')
  const [searchParams] = useSearchParams()
  const fonteAtiva = searchParams.get('fonte')

  const [range, setRange] = useState<DateRange>({ dataIni: '', dataFim: '' })
  const [selectedCanal, setSelectedCanal] = useState<CanalB2B | null>(null)

  const canaisAtuais = DADOS.canais.atuais
  const canaisB2B = DADOS.canais.b2b as CanalB2B[]

  const pieData = canaisAtuais.map((c) => ({
    label: c.canal,
    value: c.receita,
  }))

  const totalTicketB2B = canaisB2B.reduce((sum, c) => sum + c.ticketEst, 0)
  const totalReceitaMensal = canaisB2B.reduce((sum, c) => {
    const multiplicador = c.freq === 'quinzenal' ? 2 : c.freq === 'bimestral' ? 0.5 : 1
    return sum + c.ticketEst * multiplicador
  }, 0)

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          Canais B2B
          {fonteAtiva && (
            <span className="ml-2 text-sm font-normal text-gray-500">({fonteAtiva})</span>
          )}
        </h2>
        <DateRangePicker dataIni={range.dataIni} dataFim={range.dataFim} onChange={setRange} />
      </div>

      {/* Canais Atuais */}
      <SectionCard title="Canais Atuais">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            {canaisAtuais.map((c) => (
              <ProgressBar
                key={c.canal}
                label={c.canal}
                value={c.percent}
                max={100}
                color={c.canal === 'Shopify' ? 'green' : c.canal === 'Mercado Livre' ? 'blue' : 'purple'}
                detail={`${formatCurrency(c.receita)} | ${c.pedidos} pedidos`}
                showPercent
              />
            ))}
          </div>
          <div className="flex items-center justify-center">
            <PieChart
              data={pieData}
              size={160}
            />
          </div>
        </div>
      </SectionCard>

      {/* Oportunidades B2B */}
      <SectionCard title="Oportunidades B2B">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {canaisB2B.map((canal) => (
            <button
              key={canal.canal}
              onClick={() => setSelectedCanal(canal)}
              className="
                flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4
                text-left transition-all hover:border-green-300 hover:shadow-md
                dark:border-gray-700 dark:bg-gray-800 dark:hover:border-green-600
              "
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {canal.canal}
                </span>
                <Badge type={potencialBadge[canal.potencial] || 'medio'}>
                  {canal.potencial}
                </Badge>
              </div>

              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <p>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Ticket est.:</span>{' '}
                  {formatCurrency(canal.ticketEst)}
                </p>
                <p>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Frequencia:</span>{' '}
                  {canal.freq}
                </p>
                <p>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Produtos:</span>{' '}
                  {canal.produtos}
                </p>
                <p>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Estrategia:</span>{' '}
                  {canal.estrategia}
                </p>
                {canal.clienteRef && (
                  <p className="mt-1 rounded bg-green-50 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    Ref: {canal.clienteRef}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Projecao de Receita B2B */}
      <SectionCard title="Projecao de Receita B2B">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Soma Tickets Estimados
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(totalTicketB2B)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Receita Mensal (todos ativos)
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalReceitaMensal)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Canais B2B Mapeados
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {canaisB2B.length}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!selectedCanal}
        onClose={() => setSelectedCanal(null)}
        title={selectedCanal ? `Canal B2B: ${selectedCanal.canal}` : ''}
      >
        {selectedCanal && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge type={potencialBadge[selectedCanal.potencial] || 'medio'}>
                Potencial {selectedCanal.potencial}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Ticket Estimado</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(selectedCanal.ticketEst)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Frequencia</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {selectedCanal.freq}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Produtos</p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {selectedCanal.produtos}
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Estrategia</p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {selectedCanal.estrategia}
              </p>
            </div>

            {selectedCanal.clienteRef && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/30">
                <p className="text-xs font-medium text-green-600 dark:text-green-400">Cliente Referencia</p>
                <p className="mt-1 text-sm font-semibold text-green-800 dark:text-green-200">
                  {selectedCanal.clienteRef}
                </p>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  )
}

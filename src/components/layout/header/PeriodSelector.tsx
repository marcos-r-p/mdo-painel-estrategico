import { useState, useRef, useEffect } from 'react'
import { usePeriodo } from '../../../services/queries/usePeriodoQueries'
import { formatMesLabel } from '../../../lib/formatters'

export default function PeriodSelector() {
  const { mesesDisponiveis, mesSelecionado, setMesSelecionado } = usePeriodo()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (mesesDisponiveis.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
        <span className="hidden sm:inline">{mesSelecionado ? formatMesLabel(mesSelecionado) : 'Periodo'}</span>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-36 max-h-56 overflow-y-auto rounded-lg shadow-xl border z-50 bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          {mesesDisponiveis.map((m) => (
            <button
              key={m}
              onClick={() => {
                setMesSelecionado(m)
                setOpen(false)
              }}
              className={`
                w-full text-left px-3 py-2 text-xs transition-colors
                ${m === mesSelecionado
                  ? 'bg-green-500/15 text-green-600 dark:text-green-400 font-medium'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                }
              `}
            >
              {formatMesLabel(m)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

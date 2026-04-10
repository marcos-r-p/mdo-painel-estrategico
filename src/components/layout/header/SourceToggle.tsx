import { useSearchParams } from 'react-router-dom'

export default function SourceToggle() {
  const [searchParams, setSearchParams] = useSearchParams()
  const fonteAtiva = searchParams.get('fonte') ?? 'bling'

  function setFonteAtiva(fonte: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('fonte', fonte)
      return next
    })
  }

  return (
    <div className="flex items-center rounded-lg overflow-hidden border text-xs font-medium border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setFonteAtiva('bling')}
        className={`
          px-2.5 py-1.5 transition-colors
          ${fonteAtiva === 'bling'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-50 text-gray-500 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
          }
        `}
      >
        Bling
      </button>
      <button
        onClick={() => setFonteAtiva('shopify')}
        className={`
          px-2.5 py-1.5 transition-colors
          ${fonteAtiva === 'shopify'
            ? 'bg-brand-500 text-white'
            : 'bg-gray-50 text-gray-500 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
          }
        `}
      >
        Shopify
      </button>
    </div>
  )
}

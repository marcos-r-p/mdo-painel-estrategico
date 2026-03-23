import { useRouteError, isRouteErrorResponse } from 'react-router-dom'

interface ErrorFallbackProps {
  error?: Error
  message?: string
  resetErrorBoundary?: () => void
}

export default function ErrorFallback({ error, message, resetErrorBoundary }: ErrorFallbackProps) {
  const displayMessage = error?.message ?? message ?? 'Erro inesperado'

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="text-4xl mb-4">&#x26A0;&#xFE0F;</div>
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Algo deu errado</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center max-w-md">{displayMessage}</p>
      {resetErrorBoundary && (
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}

export function RouteErrorFallback() {
  const routeError = useRouteError()
  const message = isRouteErrorResponse(routeError)
    ? routeError.statusText
    : routeError instanceof Error
      ? routeError.message
      : 'Erro inesperado'

  return <ErrorFallback message={message} />
}

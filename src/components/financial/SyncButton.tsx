import { useTriggerSync, useLastSync } from '../../services/queries/useFinancialQueries';

function formatSyncDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month} às ${hours}:${minutes}`;
}

export default function SyncButton() {
  const { data: lastSync, isLoading: isLoadingSync } = useLastSync();
  const { mutate: triggerSync, isPending, isError, error } = useTriggerSync();

  const handleSync = () => {
    if (!isPending) {
      triggerSync();
    }
  };

  const lastSyncFailed = lastSync?.status === 'error';

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={isPending}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors
          ${isPending
            ? 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 dark:bg-emerald-700 dark:hover:bg-emerald-600'
          }`}
      >
        {isPending ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Sincronizando...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Bling
          </>
        )}
      </button>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        {isLoadingSync ? (
          <span>Carregando...</span>
        ) : lastSync ? (
          <span className={lastSyncFailed ? 'text-red-500 dark:text-red-400' : ''}>
            {lastSyncFailed
              ? `Falha no sync: ${lastSync.erro ?? 'erro desconhecido'}`
              : `Último sync: ${formatSyncDate(lastSync.created_at)}`}
          </span>
        ) : (
          <span>Nenhum sync realizado</span>
        )}
      </div>

      {isError && (
        <span className="text-xs text-red-500 dark:text-red-400">
          Erro: {error instanceof Error ? error.message : 'Falha ao sincronizar'}
        </span>
      )}
    </div>
  );
}

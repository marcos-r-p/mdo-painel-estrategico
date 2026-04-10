# Materialized Views Auto-Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurar refresh automático diário + botão manual para as 17 materialized views do painel estratégico, garantindo que dados novos (como abril/2026) apareçam sem intervenção manual.

**Architecture:** Migration SQL corrige a função `refresh_financial_views()` e agenda pg_cron. Frontend adiciona `refreshViews()` no API service, `useRefreshViews()` mutation hook, e um card "Views Analiticas" no DashboardPage com botão de refresh manual.

**Tech Stack:** PostgreSQL (pg_cron), Supabase RPC, React, TanStack Query (useMutation), Tailwind CSS

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `supabase/migrations/20260410_mv_auto_refresh.sql` | Criar | Fix da função + pg_cron schedule |
| `src/services/api/dashboard.ts` | Editar | Adicionar `refreshViews()` |
| `src/services/queries/useDashboardQueries.ts` | Editar | Adicionar `useRefreshViews()` mutation |
| `src/pages/DashboardPage.tsx` | Editar | Adicionar card com botão de refresh |

---

### Task 1: Migration SQL — Corrigir função + agendar pg_cron

**Files:**
- Create: `supabase/migrations/20260410_mv_auto_refresh.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- Migration: Fix refresh_financial_views() and schedule pg_cron auto-refresh
-- The existing function breaks on mv_shopify_produtos_rank with CONCURRENTLY
-- because the unique index (produto, COALESCE(sku, '')) has duplicate keys.

-- 1. Fix the function: use non-concurrent refresh for mv_shopify_produtos_rank
CREATE OR REPLACE FUNCTION refresh_financial_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fluxo_caixa_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dre_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_contas_vencer;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_comparativo_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_funil_periodo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_evolucao_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_perdas;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_responsaveis;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_origens;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_deals_parados;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_shopify_vendas_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_shopify_recorrencia;
  REFRESH MATERIALIZED VIEW mv_shopify_produtos_rank;  -- sem CONCURRENTLY (duplicate keys)
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_shopify_cohort;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_margem_canal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_margem_produto;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_receita_por_uf;
END;
$$;

-- 2. Schedule daily refresh at 10:00 UTC (07:00 Brasilia)
-- RD Station sync already runs at 06:00 UTC (job #1), so views refresh after sync completes.
SELECT cron.schedule(
  'refresh-all-views',
  '0 10 * * *',
  'SELECT refresh_financial_views()'
);
```

- [ ] **Step 2: Aplicar a migration no Supabase**

Executar via Supabase MCP `apply_migration` ou diretamente no dashboard SQL do Supabase.

Verificar sucesso com:
```sql
-- Confirmar que a função foi atualizada
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'refresh_financial_views';

-- Confirmar que o cron job foi criado
SELECT jobid, jobname, schedule, command, active FROM cron.job WHERE jobname = 'refresh-all-views';
```

Expected: função sem `CONCURRENTLY` na linha de `mv_shopify_produtos_rank`, e job ativo com schedule `0 10 * * *`.

- [ ] **Step 3: Testar a função corrigida**

```sql
SELECT refresh_financial_views();
```

Expected: execução sem erro, retorno vazio (void).

- [ ] **Step 4: Verificar que abril aparece nas views**

```sql
SELECT 'mv_shopify_vendas_mensal' as view_name, MAX(mes::text) as ultimo_mes FROM mv_shopify_vendas_mensal
UNION ALL
SELECT 'mv_crm_funil_periodo', MAX(mes::text) FROM mv_crm_funil_periodo;
```

Expected: `2026-04-01` em ambas.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260410_mv_auto_refresh.sql
git commit -m "fix: correct refresh_financial_views and schedule pg_cron auto-refresh

- Use non-concurrent refresh for mv_shopify_produtos_rank (duplicate key issue)
- Schedule daily refresh at 10:00 UTC (07:00 Brasilia) via pg_cron"
```

---

### Task 2: API Service — Adicionar `refreshViews()`

**Files:**
- Modify: `src/services/api/dashboard.ts:60` (adicionar após `fetchConnectionStatus`)

- [ ] **Step 1: Adicionar a função `refreshViews` ao final do arquivo**

Adicionar após a função `fetchConnectionStatus()` (linha 60):

```ts
/** Manually trigger a refresh of all 17 materialized views. */
export async function refreshViews(): Promise<void> {
  const { error } = await supabase.rpc('refresh_financial_views')
  if (error) {
    throwApiError('refreshViews', error)
  }
}
```

- [ ] **Step 2: Verificar que o TypeScript compila**

Run: `npx tsc --noEmit --pretty`
Expected: sem erros relacionados a `dashboard.ts`

- [ ] **Step 3: Commit**

```bash
git add src/services/api/dashboard.ts
git commit -m "feat: add refreshViews API service function"
```

---

### Task 3: React Query Hook — Adicionar `useRefreshViews()`

**Files:**
- Modify: `src/services/queries/useDashboardQueries.ts:4` (adicionar imports)
- Modify: `src/services/queries/useDashboardQueries.ts:29` (adicionar hook após `useConnectionStatus`)

- [ ] **Step 1: Atualizar imports**

Substituir a linha 4 de imports:

```ts
// ANTES:
import { fetchResumoMensal, fetchDadosMes, fetchConnectionStatus } from '../api/dashboard'

// DEPOIS:
import { fetchResumoMensal, fetchDadosMes, fetchConnectionStatus, refreshViews } from '../api/dashboard'
```

E adicionar `useMutation` e `useQueryClient` ao import do React Query:

```ts
// ANTES:
import { useQuery } from '@tanstack/react-query'

// DEPOIS:
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
```

- [ ] **Step 2: Adicionar o hook `useRefreshViews` após `useConnectionStatus`**

Adicionar após a linha 29 (final do arquivo):

```ts
/** Mutation to manually refresh all materialized views and invalidate cached queries. */
export function useRefreshViews() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: refreshViews,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['financial'] })
      queryClient.invalidateQueries({ queryKey: ['crm'] })
      queryClient.invalidateQueries({ queryKey: ['shopify'] })
    },
  })
}
```

- [ ] **Step 3: Verificar que o TypeScript compila**

Run: `npx tsc --noEmit --pretty`
Expected: sem erros

- [ ] **Step 4: Commit**

```bash
git add src/services/queries/useDashboardQueries.ts
git commit -m "feat: add useRefreshViews mutation hook"
```

---

### Task 4: UI — Adicionar card de refresh no DashboardPage

**Files:**
- Modify: `src/pages/DashboardPage.tsx:4` (adicionar import)
- Modify: `src/pages/DashboardPage.tsx:159-173` (substituir card "Arquivo" por card "Views Analiticas")

- [ ] **Step 1: Adicionar import do hook**

Substituir a linha 4:

```ts
// ANTES:
import { useConnectionStatus } from '../services/queries/useDashboardQueries'

// DEPOIS:
import { useConnectionStatus, useRefreshViews } from '../services/queries/useDashboardQueries'
```

- [ ] **Step 2: Adicionar o hook no componente**

Após a linha 21 (`const rdstationSync = ...`), adicionar:

```ts
  const viewsRefresh = useRefreshViews()
```

- [ ] **Step 3: Substituir o card "Arquivo" pelo card "Views Analiticas"**

Substituir o bloco das linhas 159-173 (o card `{/* File Import */}`):

```tsx
            {/* Views Refresh */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">Views</span>
                <Badge type="positivo">Analytics</Badge>
              </div>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Atualiza dashboards e relatorios
              </p>
              <button
                onClick={() => viewsRefresh.mutate()}
                disabled={viewsRefresh.isPending}
                className="rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
              >
                {viewsRefresh.isPending ? 'Atualizando...' : 'Atualizar Views'}
              </button>
              {viewsRefresh.isSuccess && (
                <p className="mt-2 text-xs text-green-600">Atualizado com sucesso</p>
              )}
              {viewsRefresh.isError && (
                <p className="mt-2 text-xs text-red-500">Erro ao atualizar</p>
              )}
            </div>
```

- [ ] **Step 4: Verificar que o TypeScript compila**

Run: `npx tsc --noEmit --pretty`
Expected: sem erros

- [ ] **Step 5: Testar visualmente no browser**

Run: `npm run dev`

1. Fazer login como admin
2. Verificar que o card "Views / Analytics" aparece no grid de integrações
3. Clicar "Atualizar Views" → deve mostrar "Atualizando..." e depois "Atualizado com sucesso"
4. Verificar que as páginas de Shopify analytics e CRM mostram dados de abril

- [ ] **Step 6: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: add manual refresh views button to admin dashboard"
```

---

### Task 5: Verificação Final

- [ ] **Step 1: Verificar compilação completa**

Run: `npx tsc --noEmit --pretty`
Expected: 0 errors

- [ ] **Step 2: Verificar lint**

Run: `npm run lint`
Expected: sem erros novos

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build completo sem erros

- [ ] **Step 4: Validar critérios de aceite**

| Critério | Como verificar |
|----------|---------------|
| `refresh_financial_views()` executa sem erro | `SELECT refresh_financial_views()` no Supabase |
| pg_cron job ativo | `SELECT * FROM cron.job WHERE jobname = 'refresh-all-views'` |
| Botão visível apenas para admin | Login como admin vs non-admin |
| Queries invalidadas após refresh | DevTools > React Query — verificar refetch |
| Dados de abril nas views | PeriodSelector mostra ABR/26 com fonte Shopify |

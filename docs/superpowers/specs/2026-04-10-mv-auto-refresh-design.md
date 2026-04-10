# Materialized Views — Auto-Refresh + Manual Refresh

**Data:** 2026-04-10
**Status:** Draft
**Abordagem escolhida:** B (pg_cron diário + botão manual no admin)

---

## Problema

As 17 materialized views do painel estratégico não atualizam automaticamente. Quando novos dados são sincronizados (Bling, Shopify, RD Station), as views permanecem com dados antigos até que alguém execute `REFRESH MATERIALIZED VIEW` manualmente. Resultado: abril/2026 não aparecia em nenhuma seção do painel.

## Causa Raiz

1. **Materialized views são snapshots** — não se atualizam sozinhas
2. **Nenhum mecanismo de refresh automático** existia (sem pg_cron job, sem trigger pós-sync)
3. **A função `refresh_financial_views()` quebra** porque `mv_shopify_produtos_rank` usa `REFRESH CONCURRENTLY` mas pode ter chaves duplicadas no resultado da query subjacente

## Escopo

### Incluído

- Corrigir `refresh_financial_views()` para não quebrar em `mv_shopify_produtos_rank`
- Agendar refresh diário via pg_cron
- Botão "Atualizar Views" no admin (DashboardPage)
- Hook React Query + API service para refresh manual

### Excluído

- Migração de páginas de seed data para Supabase (escopo separado)
- Correção do sync financeiro do Bling (`bling_contas_receber` vazio)
- Alteração no schema das materialized views

---

## Design Técnico

### 1. Migration SQL — Corrigir função + agendar pg_cron

**Arquivo:** `supabase/migrations/20260410_mv_auto_refresh.sql`

#### 1.1 Corrigir `refresh_financial_views()`

Substituir a função existente para usar `REFRESH MATERIALIZED VIEW` (sem `CONCURRENTLY`) em `mv_shopify_produtos_rank`, que tem chaves potencialmente duplicadas no index `(produto, COALESCE(sku, ''))`.

```sql
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
  REFRESH MATERIALIZED VIEW mv_shopify_produtos_rank;  -- sem CONCURRENTLY
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_shopify_cohort;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_margem_canal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_margem_produto;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_receita_por_uf;
END;
$$;
```

#### 1.2 Agendar pg_cron job

O RD Station sync já roda às 06:00 UTC (job existente #1). O refresh de views roda às 10:00 UTC (07:00 Brasília), dando tempo para o sync completar.

```sql
SELECT cron.schedule(
  'refresh-all-views',
  '0 10 * * *',
  'SELECT refresh_financial_views()'
);
```

### 2. API Service — `refreshViews()`

**Arquivo:** `src/services/api/dashboard.ts`

Adicionar uma função que chama a RPC existente:

```ts
export async function refreshViews(): Promise<void> {
  const { error } = await supabase.rpc('refresh_financial_views')
  if (error) throwApiError('refreshViews', error)
}
```

### 3. React Query Hook — `useRefreshViews()`

**Arquivo:** `src/services/queries/useDashboardQueries.ts`

Mutation que:
- Chama `refreshViews()`
- Invalida todas as query keys relacionadas após sucesso (`dashboard`, `financial`, `crm`, `shopify`)

```ts
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

### 4. UI — Botão no DashboardPage

**Arquivo:** `src/pages/DashboardPage.tsx`

Dentro do `SectionCard` de "Integrações de Dados" (visível apenas para admin), adicionar um novo card:

```
┌─────────────────────────┐
│ Views Analíticas    ⟳   │
│ Atualiza dashboards     │
│                         │
│ [Atualizar Views]       │
│ ✓ Atualizado com sucesso│
└─────────────────────────┘
```

**Estados do botão:**
- **idle:** "Atualizar Views" (habilitado)
- **loading:** "Atualizando..." (desabilitado, com spinner)
- **success:** "Atualizado com sucesso" (texto verde, por 3s)
- **error:** "Erro ao atualizar" (texto vermelho)

**Estilo:** Seguir o mesmo padrão visual dos cards Bling/Shopify/RD Station existentes no grid `sm:grid-cols-2 lg:grid-cols-4`.

---

## Views Afetadas (17 total)

| View | Fonte | Ultimo Mês Pós-Refresh |
|------|-------|----------------------|
| mv_shopify_vendas_mensal | shopify_pedidos | ABR/26 |
| mv_shopify_recorrencia | shopify_pedidos + shopify_clientes | ABR/26 |
| mv_shopify_produtos_rank | shopify_pedidos (itens jsonb) | ABR/26 |
| mv_shopify_cohort | shopify_pedidos + shopify_clientes | ABR/26 |
| mv_crm_funil_periodo | rdstation_deals + rdstation_stages | ABR/26 |
| mv_crm_evolucao_mensal | rdstation_deals | ABR/26 |
| mv_crm_perdas | rdstation_deals | Atualizada |
| mv_crm_responsaveis | rdstation_deals | Atualizada |
| mv_crm_origens | rdstation_deals | Atualizada |
| mv_crm_deals_parados | rdstation_deals | Atualizada |
| mv_fluxo_caixa_mensal | bling_contas_receber + bling_contas_pagar | MAI/25* |
| mv_dre_mensal | bling_contas_receber + bling_contas_pagar + bling_pedidos_compra | MAI/25* |
| mv_contas_vencer | bling_contas_receber + bling_contas_pagar | Atualizada |
| mv_comparativo_mensal | bling_contas_receber | MAI/25* |
| mv_margem_canal | bling_contas_receber | Atualizada |
| mv_margem_produto | shopify_pedidos + bling_contas_receber | Atualizada |
| mv_receita_por_uf | bling_contas_receber + shopify_pedidos | Atualizada |

*\* Views financeiras Bling ficam em MAI/25 porque `bling_contas_receber` está vazia — problema de sync separado.*

---

## Arquivos Modificados

| Arquivo | Tipo de Mudança |
|---------|----------------|
| `supabase/migrations/20260410_mv_auto_refresh.sql` | **Novo** — migration com fix da função + pg_cron |
| `src/services/api/dashboard.ts` | **Editado** — adicionar `refreshViews()` |
| `src/services/queries/useDashboardQueries.ts` | **Editado** — adicionar `useRefreshViews()` |
| `src/pages/DashboardPage.tsx` | **Editado** — adicionar card "Views Analíticas" |

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| `REFRESH` sem `CONCURRENTLY` bloqueia leituras em `mv_shopify_produtos_rank` | Refresh roda às 7h Brasília (baixo tráfego). Duração esperada < 5s |
| pg_cron falha silenciosamente | Verificar `cron.job_run_details` periodicamente |
| Botão de refresh é chamado em excesso | Desabilitar botão durante execução (mutation loading state) |

---

## Critérios de Aceite

- [ ] `refresh_financial_views()` executa sem erro
- [ ] pg_cron job `refresh-all-views` ativo e agendado para `0 10 * * *`
- [ ] Botão "Atualizar Views" visível apenas para admin no DashboardPage
- [ ] Após clicar o botão, views são atualizadas e queries invalidadas
- [ ] Dados de abril aparecem nas páginas que consomem materialized views (Shopify analytics, CRM)

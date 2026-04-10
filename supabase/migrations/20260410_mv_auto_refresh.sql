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

# Financial Analysis (Bling + Shopify) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded seed data in FluxoCaixaPage with real financial data from Bling ERP and Shopify, using materialized views for pre-aggregated reports.

**Architecture:** Supabase Edge Functions sync Bling API v3 data into 4 raw tables. 7 PostgreSQL materialized views pre-calculate financial reports (DRE, fluxo de caixa, aging, margens). Frontend reads pre-aggregated data via React Query hooks. Vercel Cron triggers daily sync; manual sync button available for admins.

**Tech Stack:** Supabase (PostgreSQL + Edge Functions/Deno), React 19, TanStack Query 5, Recharts 2, Tailwind CSS 4, Vitest, Vercel Cron

**Spec:** `docs/superpowers/specs/2026-03-24-financial-analysis-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260324_financial_tables.sql` | DDL for 4 Bling tables + indexes + RLS |
| `supabase/migrations/20260324_materialized_views.sql` | 7 materialized views + unique indexes |
| `supabase/migrations/20260324_security_fixes.sql` | Fix RLS on bling_tokens and shopify_tokens |
| `src/types/financial.ts` | TypeScript interfaces for Bling tables + view results |
| `src/services/api/financial.ts` | API service: fetch from materialized views + trigger sync |
| `src/services/queries/useFinancialQueries.ts` | React Query hooks for all 7 views |
| `src/components/charts/FluxoCaixaChart.tsx` | Stacked bar + line chart (receita/despesa/saldo) |
| `src/components/charts/AgingChart.tsx` | Horizontal bar chart for aging buckets |
| `src/components/financial/DRETable.tsx` | Collapsible DRE table |
| `src/components/financial/ComparativoCard.tsx` | Month comparison card with variation % |
| `src/components/financial/MargemTable.tsx` | Margin ranking table (product or channel) |
| `src/components/financial/SyncButton.tsx` | Sync button with per-step progress |
| `api/cron/bling-sync.ts` | Vercel Cron API route (thin wrapper) |
| `api/sync/bling.ts` | Manual sync API route (called by SyncButton) |

### Modified Files

| File | Change |
|------|--------|
| `supabase/functions/bling-sync/index.ts` | Restructure: add financial sync steps (categorias, contas receber/pagar, pedidos compra) + view refresh |
| `src/pages/FluxoCaixaPage.tsx` | Replace seed data with real data hooks + new layout |
| `src/services/api/shopify.ts` | Remove hardcoded 5000 limit, add pagination |
| `vercel.json` | Add cron config |

---

## Task 1: Security Fixes (RLS Token Tables)

**Files:**
- Create: `supabase/migrations/20260324_security_fixes.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- supabase/migrations/20260324_security_fixes.sql

-- Fix bling_tokens: remove insecure policy, restrict to service_role
DROP POLICY IF EXISTS "allow_all_bling_tokens" ON bling_tokens;
CREATE POLICY "service_role_only" ON bling_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Fix shopify_tokens: same pattern
DROP POLICY IF EXISTS "shopify_tokens_all" ON shopify_tokens;
CREATE POLICY "service_role_only" ON shopify_tokens
  FOR ALL USING (auth.role() = 'service_role');
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Run: `mcp__claude_ai_Supabase__apply_migration` with the SQL above.

- [ ] **Step 3: Verify policies applied**

Run SQL: `SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('bling_tokens', 'shopify_tokens');`
Expected: only `service_role_only` policies remain.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260324_security_fixes.sql
git commit -m "fix: restrict RLS on bling_tokens and shopify_tokens to service_role"
```

---

## Task 2: Financial Tables Migration

**Files:**
- Create: `supabase/migrations/20260324_financial_tables.sql`

- [ ] **Step 1: Write migration for 4 tables + bling_sync_log update**

```sql
-- supabase/migrations/20260324_financial_tables.sql

-- bling_categorias
CREATE TABLE IF NOT EXISTS bling_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bling_id bigint UNIQUE NOT NULL,
  descricao text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  dre_classificacao text DEFAULT 'despesa_operacional'
    CHECK (dre_classificacao IN ('receita_bruta', 'imposto', 'cmv', 'despesa_operacional', 'despesa_financeira', 'outras_receitas')),
  categoria_pai_id uuid REFERENCES bling_categorias(id),
  synced_at timestamptz DEFAULT now()
);

-- bling_contas_receber
CREATE TABLE IF NOT EXISTS bling_contas_receber (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bling_id bigint UNIQUE NOT NULL,
  numero_documento text,
  contato_id bigint,
  contato_nome text,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  valor_recebido numeric(12,2) NOT NULL DEFAULT 0,
  saldo numeric(12,2) NOT NULL DEFAULT 0,
  data_emissao date,
  data_vencimento date,
  data_recebimento date,
  situacao text NOT NULL DEFAULT 'aberto',
  categoria text,
  historico text,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- bling_contas_pagar
CREATE TABLE IF NOT EXISTS bling_contas_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bling_id bigint UNIQUE NOT NULL,
  numero_documento text,
  fornecedor_id bigint,
  fornecedor_nome text,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  valor_pago numeric(12,2) NOT NULL DEFAULT 0,
  saldo numeric(12,2) NOT NULL DEFAULT 0,
  data_emissao date,
  data_vencimento date,
  data_pagamento date,
  situacao text NOT NULL DEFAULT 'aberto',
  categoria text,
  historico text,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- bling_pedidos_compra
CREATE TABLE IF NOT EXISTS bling_pedidos_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bling_id bigint UNIQUE NOT NULL,
  numero text,
  fornecedor_id bigint,
  fornecedor_nome text,
  valor_total numeric(12,2) NOT NULL DEFAULT 0,
  valor_frete numeric(12,2) NOT NULL DEFAULT 0,
  valor_desconto numeric(12,2) NOT NULL DEFAULT 0,
  data_pedido date,
  data_prevista date,
  situacao text,
  itens jsonb DEFAULT '[]',
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_contas_receber_vencimento ON bling_contas_receber(data_vencimento);
CREATE INDEX idx_contas_receber_situacao ON bling_contas_receber(situacao);
CREATE INDEX idx_contas_receber_categoria ON bling_contas_receber(categoria);
CREATE INDEX idx_contas_receber_recebimento ON bling_contas_receber(data_recebimento);
CREATE INDEX idx_contas_pagar_vencimento ON bling_contas_pagar(data_vencimento);
CREATE INDEX idx_contas_pagar_situacao ON bling_contas_pagar(situacao);
CREATE INDEX idx_contas_pagar_categoria ON bling_contas_pagar(categoria);
CREATE INDEX idx_contas_pagar_pagamento ON bling_contas_pagar(data_pagamento);
CREATE INDEX idx_pedidos_compra_data ON bling_pedidos_compra(data_pedido);
CREATE INDEX idx_pedidos_compra_fornecedor ON bling_pedidos_compra(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_shopify_pedidos_data ON shopify_pedidos(data);
CREATE INDEX IF NOT EXISTS idx_shopify_pedidos_numero ON shopify_pedidos(numero);

-- RLS
ALTER TABLE bling_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE bling_contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE bling_contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE bling_pedidos_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read" ON bling_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_role_write" ON bling_categorias FOR ALL TO service_role USING (true);

CREATE POLICY "authenticated_read" ON bling_contas_receber FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_role_write" ON bling_contas_receber FOR ALL TO service_role USING (true);

CREATE POLICY "authenticated_read" ON bling_contas_pagar FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_role_write" ON bling_contas_pagar FOR ALL TO service_role USING (true);

CREATE POLICY "authenticated_read" ON bling_pedidos_compra FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_role_write" ON bling_pedidos_compra FOR ALL TO service_role USING (true);

-- Update bling_sync_log schema (add steps column if not exists)
ALTER TABLE bling_sync_log ADD COLUMN IF NOT EXISTS steps jsonb DEFAULT '[]';
ALTER TABLE bling_sync_log ADD COLUMN IF NOT EXISTS duracao_ms integer;
ALTER TABLE bling_sync_log ADD COLUMN IF NOT EXISTS registros_total integer DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_bling_sync_log_created ON bling_sync_log(created_at DESC);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Run: `mcp__claude_ai_Supabase__apply_migration` with the SQL.

- [ ] **Step 3: Verify tables exist**

Run SQL: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'bling_%' ORDER BY table_name;`
Expected: `bling_categorias`, `bling_contas_pagar`, `bling_contas_receber`, `bling_pedidos_compra`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260324_financial_tables.sql
git commit -m "feat: add Bling financial tables (contas receber/pagar, pedidos compra, categorias)"
```

---

## Task 3: Materialized Views Migration

**Files:**
- Create: `supabase/migrations/20260324_materialized_views.sql`

- [ ] **Step 1: Write mv_fluxo_caixa_mensal**

```sql
-- supabase/migrations/20260324_materialized_views.sql

-- 1. Fluxo de Caixa Mensal
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_fluxo_caixa_mensal AS
WITH receitas AS (
  SELECT to_char(data_recebimento, 'YYYY-MM') AS ano_mes,
         SUM(valor_recebido) AS receitas
  FROM bling_contas_receber
  WHERE data_recebimento IS NOT NULL
  GROUP BY 1
),
despesas AS (
  SELECT to_char(data_pagamento, 'YYYY-MM') AS ano_mes,
         SUM(valor_pago) AS despesas
  FROM bling_contas_pagar
  WHERE data_pagamento IS NOT NULL
  GROUP BY 1
),
meses AS (
  SELECT ano_mes FROM receitas
  UNION
  SELECT ano_mes FROM despesas
)
SELECT m.ano_mes,
       COALESCE(r.receitas, 0) AS receitas,
       COALESCE(d.despesas, 0) AS despesas,
       COALESCE(r.receitas, 0) - COALESCE(d.despesas, 0) AS saldo_mes,
       SUM(COALESCE(r.receitas, 0) - COALESCE(d.despesas, 0))
         OVER (ORDER BY m.ano_mes) AS saldo_acumulado
FROM meses m
LEFT JOIN receitas r ON r.ano_mes = m.ano_mes
LEFT JOIN despesas d ON d.ano_mes = m.ano_mes
ORDER BY m.ano_mes;

CREATE UNIQUE INDEX ON mv_fluxo_caixa_mensal(ano_mes);
```

- [ ] **Step 2: Write mv_dre_mensal**

```sql
-- 2. DRE Mensal
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dre_mensal AS
WITH categorized_receitas AS (
  SELECT to_char(cr.data_recebimento, 'YYYY-MM') AS ano_mes,
         COALESCE(cat.dre_classificacao, 'receita_bruta') AS classificacao,
         SUM(cr.valor_recebido) AS total
  FROM bling_contas_receber cr
  LEFT JOIN bling_categorias cat ON cr.categoria = cat.descricao AND cat.tipo = 'receita'
  WHERE cr.data_recebimento IS NOT NULL
  GROUP BY 1, 2
),
categorized_despesas AS (
  SELECT to_char(cp.data_pagamento, 'YYYY-MM') AS ano_mes,
         COALESCE(cat.dre_classificacao, 'despesa_operacional') AS classificacao,
         SUM(cp.valor_pago) AS total
  FROM bling_contas_pagar cp
  LEFT JOIN bling_categorias cat ON cp.categoria = cat.descricao AND cat.tipo = 'despesa'
  WHERE cp.data_pagamento IS NOT NULL
  GROUP BY 1, 2
),
cmv AS (
  SELECT to_char(data_pedido, 'YYYY-MM') AS ano_mes,
         SUM(valor_total) AS total
  FROM bling_pedidos_compra
  WHERE data_pedido IS NOT NULL
  GROUP BY 1
),
meses AS (
  SELECT DISTINCT ano_mes FROM categorized_receitas
  UNION
  SELECT DISTINCT ano_mes FROM categorized_despesas
  UNION
  SELECT DISTINCT ano_mes FROM cmv
),
dre_data AS (
  SELECT m.ano_mes,
    COALESCE((SELECT SUM(total) FROM categorized_receitas WHERE ano_mes = m.ano_mes AND classificacao = 'receita_bruta'), 0) AS receita_bruta,
    COALESCE((SELECT SUM(total) FROM categorized_receitas WHERE ano_mes = m.ano_mes AND classificacao = 'outras_receitas'), 0) AS outras_receitas,
    COALESCE((SELECT SUM(total) FROM categorized_despesas WHERE ano_mes = m.ano_mes AND classificacao = 'imposto'), 0) AS impostos,
    COALESCE(c.total, 0) AS cmv,
    COALESCE((SELECT SUM(total) FROM categorized_despesas WHERE ano_mes = m.ano_mes AND classificacao = 'despesa_operacional'), 0) AS despesas_operacionais,
    COALESCE((SELECT SUM(total) FROM categorized_despesas WHERE ano_mes = m.ano_mes AND classificacao = 'despesa_financeira'), 0) AS despesas_financeiras
  FROM meses m
  LEFT JOIN cmv c ON c.ano_mes = m.ano_mes
)
SELECT ano_mes, 'receita_bruta' AS linha, receita_bruta AS valor FROM dre_data
UNION ALL
SELECT ano_mes, 'impostos', impostos FROM dre_data
UNION ALL
SELECT ano_mes, 'receita_liquida', receita_bruta - impostos FROM dre_data
UNION ALL
SELECT ano_mes, 'cmv', cmv FROM dre_data
UNION ALL
SELECT ano_mes, 'lucro_bruto', receita_bruta - impostos - cmv FROM dre_data
UNION ALL
SELECT ano_mes, 'despesas_operacionais', despesas_operacionais FROM dre_data
UNION ALL
SELECT ano_mes, 'resultado_operacional', receita_bruta - impostos - cmv - despesas_operacionais FROM dre_data
UNION ALL
SELECT ano_mes, 'despesas_financeiras', despesas_financeiras FROM dre_data
UNION ALL
SELECT ano_mes, 'lucro_liquido', receita_bruta - impostos - cmv - despesas_operacionais - despesas_financeiras FROM dre_data
UNION ALL
SELECT ano_mes, 'margem_bruta_pct',
  CASE WHEN receita_bruta > 0 THEN ROUND(((receita_bruta - impostos - cmv) / receita_bruta) * 100, 2) ELSE 0 END
FROM dre_data
UNION ALL
SELECT ano_mes, 'margem_liquida_pct',
  CASE WHEN receita_bruta > 0 THEN ROUND(((receita_bruta - impostos - cmv - despesas_operacionais - despesas_financeiras) / receita_bruta) * 100, 2) ELSE 0 END
FROM dre_data
ORDER BY ano_mes, linha;

CREATE UNIQUE INDEX ON mv_dre_mensal(ano_mes, linha);
```

- [ ] **Step 3: Write mv_contas_vencer (aging)**

```sql
-- 3. Aging de Contas a Pagar/Receber
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_contas_vencer AS
WITH faixas AS (
  SELECT unnest(ARRAY['Vencido', 'Hoje', '1-7 dias', '8-15 dias', '16-30 dias', '31-60 dias', '60+ dias']) AS faixa,
         unnest(ARRAY[1, 2, 3, 4, 5, 6, 7]) AS ordem
),
receber AS (
  SELECT
    CASE
      WHEN data_vencimento < CURRENT_DATE THEN 'Vencido'
      WHEN data_vencimento = CURRENT_DATE THEN 'Hoje'
      WHEN data_vencimento BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 7 THEN '1-7 dias'
      WHEN data_vencimento BETWEEN CURRENT_DATE + 8 AND CURRENT_DATE + 15 THEN '8-15 dias'
      WHEN data_vencimento BETWEEN CURRENT_DATE + 16 AND CURRENT_DATE + 30 THEN '16-30 dias'
      WHEN data_vencimento BETWEEN CURRENT_DATE + 31 AND CURRENT_DATE + 60 THEN '31-60 dias'
      ELSE '60+ dias'
    END AS faixa,
    SUM(saldo) AS total
  FROM bling_contas_receber
  WHERE situacao IN ('aberto', 'parcial')
  GROUP BY 1
),
pagar AS (
  SELECT
    CASE
      WHEN data_vencimento < CURRENT_DATE THEN 'Vencido'
      WHEN data_vencimento = CURRENT_DATE THEN 'Hoje'
      WHEN data_vencimento BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 7 THEN '1-7 dias'
      WHEN data_vencimento BETWEEN CURRENT_DATE + 8 AND CURRENT_DATE + 15 THEN '8-15 dias'
      WHEN data_vencimento BETWEEN CURRENT_DATE + 16 AND CURRENT_DATE + 30 THEN '16-30 dias'
      WHEN data_vencimento BETWEEN CURRENT_DATE + 31 AND CURRENT_DATE + 60 THEN '31-60 dias'
      ELSE '60+ dias'
    END AS faixa,
    SUM(saldo) AS total
  FROM bling_contas_pagar
  WHERE situacao IN ('aberto', 'parcial')
  GROUP BY 1
)
SELECT f.faixa, f.ordem,
       COALESCE(r.total, 0) AS a_receber,
       COALESCE(p.total, 0) AS a_pagar,
       COALESCE(r.total, 0) - COALESCE(p.total, 0) AS saldo
FROM faixas f
LEFT JOIN receber r ON r.faixa = f.faixa
LEFT JOIN pagar p ON p.faixa = f.faixa
ORDER BY f.ordem;

CREATE UNIQUE INDEX ON mv_contas_vencer(faixa);
```

- [ ] **Step 4: Write mv_margem_produto, mv_margem_canal, mv_comparativo_mensal, mv_receita_por_uf**

```sql
-- 4. Margem por Produto (Shopify items × Bling costs)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_margem_produto AS
WITH receita_produto AS (
  SELECT item->>'sku' AS sku,
         item->>'titulo' AS produto,
         SUM((item->>'preco')::numeric * (item->>'quantidade')::numeric) AS receita,
         SUM((item->>'quantidade')::numeric) AS quantidade_vendida
  FROM shopify_pedidos sp,
       jsonb_array_elements(sp.itens) AS item
  INNER JOIN bling_contas_receber bcr ON sp.numero = bcr.numero_documento
  WHERE sp.itens IS NOT NULL AND jsonb_array_length(sp.itens) > 0
  GROUP BY 1, 2
),
custo_produto AS (
  SELECT item->>'sku' AS sku,
         SUM((item->>'valor_total')::numeric) / NULLIF(SUM((item->>'quantidade')::numeric), 0) AS custo_medio
  FROM bling_pedidos_compra,
       jsonb_array_elements(itens) AS item
  WHERE itens IS NOT NULL AND jsonb_array_length(itens) > 0
  GROUP BY 1
)
SELECT rp.sku, rp.produto, rp.receita,
       COALESCE(cp.custo_medio * rp.quantidade_vendida, 0) AS custo_cmv,
       rp.receita - COALESCE(cp.custo_medio * rp.quantidade_vendida, 0) AS margem_valor,
       CASE WHEN rp.receita > 0
         THEN ROUND(((rp.receita - COALESCE(cp.custo_medio * rp.quantidade_vendida, 0)) / rp.receita) * 100, 2)
         ELSE 0 END AS margem_percentual
FROM receita_produto rp
LEFT JOIN custo_produto cp ON cp.sku = rp.sku
WHERE rp.sku IS NOT NULL AND rp.sku != ''
ORDER BY rp.receita DESC;

CREATE UNIQUE INDEX ON mv_margem_produto(sku);

-- 5. Margem por Canal
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_margem_canal AS
WITH receita_canal AS (
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM shopify_pedidos sp WHERE sp.numero = bcr.numero_documento) THEN 'E-commerce'
      WHEN EXISTS (SELECT 1 FROM bling_categorias cat WHERE cat.descricao = bcr.categoria AND (cat.descricao ILIKE '%atacado%' OR cat.descricao ILIKE '%b2b%')) THEN 'Atacado/B2B'
      ELSE 'Outros Canais'
    END AS canal,
    SUM(valor_recebido) AS receita,
    COUNT(*) AS qtd_documentos
  FROM bling_contas_receber bcr
  WHERE data_recebimento IS NOT NULL
  GROUP BY 1
)
SELECT canal, receita, qtd_documentos,
       0::numeric AS custo,
       0::numeric AS margem_percentual
FROM receita_canal
ORDER BY receita DESC;

CREATE UNIQUE INDEX ON mv_margem_canal(canal);

-- 6. Comparativo Mensal (todos os meses, 5 métricas)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_comparativo_mensal AS
WITH base_receitas AS (
  SELECT to_char(data_recebimento, 'YYYY-MM') AS ano_mes,
         SUM(valor_recebido) AS receita,
         COUNT(*) AS qtd_vendas
  FROM bling_contas_receber
  WHERE data_recebimento IS NOT NULL
  GROUP BY 1
),
base_despesas AS (
  SELECT to_char(data_pagamento, 'YYYY-MM') AS ano_mes,
         SUM(valor_pago) AS despesas
  FROM bling_contas_pagar
  WHERE data_pagamento IS NOT NULL
  GROUP BY 1
),
meses AS (
  SELECT ano_mes FROM base_receitas UNION SELECT ano_mes FROM base_despesas
),
mensal AS (
  SELECT m.ano_mes,
         COALESCE(r.receita, 0) AS receita,
         COALESCE(d.despesas, 0) AS despesas,
         COALESCE(r.receita, 0) - COALESCE(d.despesas, 0) AS lucro,
         CASE WHEN COALESCE(r.qtd_vendas, 0) > 0
           THEN ROUND(COALESCE(r.receita, 0) / r.qtd_vendas, 2)
           ELSE 0 END AS ticket_medio,
         COALESCE(r.qtd_vendas, 0) AS qtd_vendas
  FROM meses m
  LEFT JOIN base_receitas r ON r.ano_mes = m.ano_mes
  LEFT JOIN base_despesas d ON d.ano_mes = m.ano_mes
)
SELECT m.ano_mes, 'receita' AS metrica, m.receita AS valor,
       LAG(m.receita) OVER (ORDER BY m.ano_mes) AS valor_mes_anterior,
       m2.receita AS valor_mesmo_mes_ano_passado,
       CASE WHEN LAG(m.receita) OVER (ORDER BY m.ano_mes) > 0
         THEN ROUND(((m.receita - LAG(m.receita) OVER (ORDER BY m.ano_mes)) / LAG(m.receita) OVER (ORDER BY m.ano_mes)) * 100, 2)
         ELSE 0 END AS variacao_percentual_mes,
       CASE WHEN m2.receita > 0
         THEN ROUND(((m.receita - m2.receita) / m2.receita) * 100, 2)
         ELSE 0 END AS variacao_percentual_ano
FROM mensal m
LEFT JOIN mensal m2 ON m2.ano_mes = to_char((to_date(m.ano_mes, 'YYYY-MM') - interval '1 year'), 'YYYY-MM')
UNION ALL
SELECT m.ano_mes, 'despesas', m.despesas,
       LAG(m.despesas) OVER (ORDER BY m.ano_mes), m2.despesas,
       CASE WHEN LAG(m.despesas) OVER (ORDER BY m.ano_mes) > 0
         THEN ROUND(((m.despesas - LAG(m.despesas) OVER (ORDER BY m.ano_mes)) / LAG(m.despesas) OVER (ORDER BY m.ano_mes)) * 100, 2)
         ELSE 0 END,
       CASE WHEN m2.despesas > 0
         THEN ROUND(((m.despesas - m2.despesas) / m2.despesas) * 100, 2)
         ELSE 0 END
FROM mensal m
LEFT JOIN mensal m2 ON m2.ano_mes = to_char((to_date(m.ano_mes, 'YYYY-MM') - interval '1 year'), 'YYYY-MM')
UNION ALL
SELECT m.ano_mes, 'lucro', m.lucro,
       LAG(m.lucro) OVER (ORDER BY m.ano_mes), m2.lucro,
       CASE WHEN LAG(m.lucro) OVER (ORDER BY m.ano_mes) != 0
         THEN ROUND(((m.lucro - LAG(m.lucro) OVER (ORDER BY m.ano_mes)) / ABS(LAG(m.lucro) OVER (ORDER BY m.ano_mes))) * 100, 2)
         ELSE 0 END,
       CASE WHEN m2.lucro != 0
         THEN ROUND(((m.lucro - m2.lucro) / ABS(m2.lucro)) * 100, 2)
         ELSE 0 END
FROM mensal m
LEFT JOIN mensal m2 ON m2.ano_mes = to_char((to_date(m.ano_mes, 'YYYY-MM') - interval '1 year'), 'YYYY-MM')
UNION ALL
SELECT m.ano_mes, 'ticket_medio', m.ticket_medio,
       LAG(m.ticket_medio) OVER (ORDER BY m.ano_mes), m2.ticket_medio,
       CASE WHEN LAG(m.ticket_medio) OVER (ORDER BY m.ano_mes) > 0
         THEN ROUND(((m.ticket_medio - LAG(m.ticket_medio) OVER (ORDER BY m.ano_mes)) / LAG(m.ticket_medio) OVER (ORDER BY m.ano_mes)) * 100, 2)
         ELSE 0 END,
       CASE WHEN m2.ticket_medio > 0
         THEN ROUND(((m.ticket_medio - m2.ticket_medio) / m2.ticket_medio) * 100, 2)
         ELSE 0 END
FROM mensal m
LEFT JOIN mensal m2 ON m2.ano_mes = to_char((to_date(m.ano_mes, 'YYYY-MM') - interval '1 year'), 'YYYY-MM')
UNION ALL
SELECT m.ano_mes, 'qtd_vendas', m.qtd_vendas,
       LAG(m.qtd_vendas) OVER (ORDER BY m.ano_mes), m2.qtd_vendas,
       CASE WHEN LAG(m.qtd_vendas) OVER (ORDER BY m.ano_mes) > 0
         THEN ROUND(((m.qtd_vendas - LAG(m.qtd_vendas) OVER (ORDER BY m.ano_mes)) / LAG(m.qtd_vendas) OVER (ORDER BY m.ano_mes)) * 100, 2)
         ELSE 0 END,
       CASE WHEN m2.qtd_vendas > 0
         THEN ROUND(((m.qtd_vendas - m2.qtd_vendas) / m2.qtd_vendas) * 100, 2)
         ELSE 0 END
FROM mensal m
LEFT JOIN mensal m2 ON m2.ano_mes = to_char((to_date(m.ano_mes, 'YYYY-MM') - interval '1 year'), 'YYYY-MM')
ORDER BY 1, 2;

CREATE UNIQUE INDEX ON mv_comparativo_mensal(ano_mes, metrica);

-- 7. Receita por UF (Bling × Shopify)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_receita_por_uf AS
SELECT COALESCE(sp.uf, 'Não identificado') AS uf,
       SUM(bcr.valor_recebido) AS receita,
       COUNT(DISTINCT bcr.bling_id) AS quantidade_pedidos,
       CASE WHEN COUNT(DISTINCT bcr.bling_id) > 0
         THEN ROUND(SUM(bcr.valor_recebido) / COUNT(DISTINCT bcr.bling_id), 2)
         ELSE 0 END AS ticket_medio
FROM bling_contas_receber bcr
LEFT JOIN shopify_pedidos sp ON sp.numero = bcr.numero_documento
WHERE bcr.data_recebimento IS NOT NULL
GROUP BY 1
ORDER BY receita DESC;

CREATE UNIQUE INDEX ON mv_receita_por_uf(uf);

-- Function to refresh all views (called by Edge Function)
CREATE OR REPLACE FUNCTION refresh_financial_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fluxo_caixa_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dre_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_contas_vencer;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_margem_produto;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_margem_canal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_comparativo_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_receita_por_uf;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Note:** `mv_comparativo_mensal` now reads from base tables directly (not from `mv_fluxo_caixa_mensal`), so all views are independent and refresh order doesn't matter.

- [ ] **Step 5: Apply migration via Supabase MCP**

- [ ] **Step 6: Verify views exist (empty but valid)**

Run SQL: `SELECT matviewname FROM pg_matviews WHERE schemaname = 'public' ORDER BY matviewname;`
Expected: all 7 `mv_*` views listed.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260324_materialized_views.sql
git commit -m "feat: add 7 materialized views for financial reports (DRE, fluxo caixa, aging, margens)"
```

---

## Task 4: TypeScript Types

**Files:**
- Create: `src/types/financial.ts`

- [ ] **Step 1: Write type definitions**

```typescript
// src/types/financial.ts

// ─── Bling Raw Tables ─────────────────────────────────────
export interface BlingCategoria {
  id: string
  bling_id: number
  descricao: string
  tipo: 'receita' | 'despesa'
  dre_classificacao: 'receita_bruta' | 'imposto' | 'cmv' | 'despesa_operacional' | 'despesa_financeira' | 'outras_receitas'
  categoria_pai_id: string | null
  synced_at: string
}

export interface BlingContaReceber {
  id: string
  bling_id: number
  numero_documento: string | null
  contato_id: number | null
  contato_nome: string | null
  valor: number
  valor_recebido: number
  saldo: number
  data_emissao: string | null
  data_vencimento: string | null
  data_recebimento: string | null
  situacao: string
  categoria: string | null
  historico: string | null
  synced_at: string
  created_at: string
  updated_at: string
}

export interface BlingContaPagar {
  id: string
  bling_id: number
  numero_documento: string | null
  fornecedor_id: number | null
  fornecedor_nome: string | null
  valor: number
  valor_pago: number
  saldo: number
  data_emissao: string | null
  data_vencimento: string | null
  data_pagamento: string | null
  situacao: string
  categoria: string | null
  historico: string | null
  synced_at: string
  created_at: string
  updated_at: string
}

export interface BlingPedidoCompra {
  id: string
  bling_id: number
  numero: string | null
  fornecedor_id: number | null
  fornecedor_nome: string | null
  valor_total: number
  valor_frete: number
  valor_desconto: number
  data_pedido: string | null
  data_prevista: string | null
  situacao: string | null
  itens: Array<{ sku: string; descricao: string; quantidade: number; valor_unitario: number; valor_total: number }>
  synced_at: string
  created_at: string
  updated_at: string
}

// ─── Materialized View Results ────────────────────────────
export interface FluxoCaixaMensal {
  ano_mes: string
  receitas: number
  despesas: number
  saldo_mes: number
  saldo_acumulado: number
}

export interface DREMensal {
  ano_mes: string
  linha: string
  valor: number
}

export interface ContasVencer {
  faixa: string
  ordem: number
  a_receber: number
  a_pagar: number
  saldo: number
}

export interface MargemProduto {
  sku: string
  produto: string
  receita: number
  custo_cmv: number
  margem_valor: number
  margem_percentual: number
}

export interface MargemCanal {
  canal: string
  receita: number
  custo: number
  margem_percentual: number
  qtd_documentos: number
}

export interface ComparativoMensal {
  ano_mes: string
  metrica: string
  valor: number
  valor_mes_anterior: number | null
  valor_mesmo_mes_ano_passado: number | null
  variacao_percentual_mes: number
  variacao_percentual_ano: number
}

export interface ReceitaPorUF {
  uf: string
  receita: number
  quantidade_pedidos: number
  ticket_medio: number
}

// ─── Sync ─────────────────────────────────────────────────
export interface SyncStep {
  step: string
  status: 'success' | 'error' | 'skipped'
  registros: number
  duracao_ms: number
  erro?: string
}

export interface BlingSyncLog {
  id: string
  tipo: 'full' | 'incremental' | 'manual'
  status: 'success' | 'partial' | 'error'
  steps: SyncStep[]
  registros_total: number
  duracao_ms: number
  erro: string | null
  created_at: string
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS (no errors from new file)

- [ ] **Step 3: Commit**

```bash
git add src/types/financial.ts
git commit -m "feat: add TypeScript types for Bling financial tables and materialized views"
```

---

## Task 5: Financial API Service

**Files:**
- Create: `src/services/api/financial.ts`

- [ ] **Step 1: Write API service for materialized views**

```typescript
// src/services/api/financial.ts
import { supabase } from '../supabase'
import type {
  FluxoCaixaMensal, DREMensal, ContasVencer,
  MargemProduto, MargemCanal, ComparativoMensal,
  ReceitaPorUF, BlingSyncLog, BlingCategoria,
} from '../../types/financial'

export async function fetchFluxoCaixa(): Promise<FluxoCaixaMensal[]> {
  const { data, error } = await supabase
    .from('mv_fluxo_caixa_mensal')
    .select('*')
    .order('ano_mes')
  if (error) throw new Error(`fetchFluxoCaixa: ${error.message}`)
  return (data ?? []) as FluxoCaixaMensal[]
}

export async function fetchDRE(): Promise<DREMensal[]> {
  const { data, error } = await supabase
    .from('mv_dre_mensal')
    .select('*')
    .order('ano_mes')
  if (error) throw new Error(`fetchDRE: ${error.message}`)
  return (data ?? []) as DREMensal[]
}

export async function fetchAging(): Promise<ContasVencer[]> {
  const { data, error } = await supabase
    .from('mv_contas_vencer')
    .select('*')
    .order('ordem')
  if (error) throw new Error(`fetchAging: ${error.message}`)
  return (data ?? []) as ContasVencer[]
}

export async function fetchMargemProduto(): Promise<MargemProduto[]> {
  const { data, error } = await supabase
    .from('mv_margem_produto')
    .select('*')
    .order('receita', { ascending: false })
    .limit(50)
  if (error) throw new Error(`fetchMargemProduto: ${error.message}`)
  return (data ?? []) as MargemProduto[]
}

export async function fetchMargemCanal(): Promise<MargemCanal[]> {
  const { data, error } = await supabase
    .from('mv_margem_canal')
    .select('*')
    .order('receita', { ascending: false })
  if (error) throw new Error(`fetchMargemCanal: ${error.message}`)
  return (data ?? []) as MargemCanal[]
}

export async function fetchComparativo(): Promise<ComparativoMensal[]> {
  const { data, error } = await supabase
    .from('mv_comparativo_mensal')
    .select('*')
    .order('ano_mes', { ascending: false })
  if (error) throw new Error(`fetchComparativo: ${error.message}`)
  return (data ?? []) as ComparativoMensal[]
}

export async function fetchReceitaPorUF(): Promise<ReceitaPorUF[]> {
  const { data, error } = await supabase
    .from('mv_receita_por_uf')
    .select('*')
    .order('receita', { ascending: false })
  if (error) throw new Error(`fetchReceitaPorUF: ${error.message}`)
  return (data ?? []) as ReceitaPorUF[]
}

export async function fetchBlingCategorias(): Promise<BlingCategoria[]> {
  const { data, error } = await supabase
    .from('bling_categorias')
    .select('*')
    .order('descricao')
  if (error) throw new Error(`fetchBlingCategorias: ${error.message}`)
  return (data ?? []) as BlingCategoria[]
}

export async function updateCategoriaDRE(id: string, dre_classificacao: string): Promise<void> {
  const { error } = await supabase
    .from('bling_categorias')
    .update({ dre_classificacao })
    .eq('id', id)
  if (error) throw new Error(`updateCategoriaDRE: ${error.message}`)
}

export async function fetchLastSync(): Promise<BlingSyncLog | null> {
  const { data, error } = await supabase
    .from('bling_sync_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(`fetchLastSync: ${error.message}`)
  return data as BlingSyncLog | null
}

export async function triggerBlingSync(): Promise<{ success: boolean; message: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch('/api/sync/bling', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` },
  })
  if (!response.ok) throw new Error(`Sync failed: ${response.statusText}`)
  return response.json()
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/services/api/financial.ts
git commit -m "feat: add financial API service for materialized views and sync"
```

---

## Task 6: React Query Hooks

**Files:**
- Create: `src/services/queries/useFinancialQueries.ts`

- [ ] **Step 1: Write query hooks**

```typescript
// src/services/queries/useFinancialQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchFluxoCaixa, fetchDRE, fetchAging,
  fetchMargemProduto, fetchMargemCanal,
  fetchComparativo, fetchReceitaPorUF,
  fetchLastSync, triggerBlingSync,
  fetchBlingCategorias,
} from '../api/financial'

const STALE_TIME = 5 * 60 * 1000
const GC_TIME = 30 * 60 * 1000
const OPTS = { staleTime: STALE_TIME, gcTime: GC_TIME, refetchOnWindowFocus: false }

export function useFluxoCaixa() {
  return useQuery({ queryKey: ['financial', 'fluxo-caixa'], queryFn: fetchFluxoCaixa, ...OPTS })
}

export function useDRE() {
  return useQuery({ queryKey: ['financial', 'dre'], queryFn: fetchDRE, ...OPTS })
}

export function useAging() {
  return useQuery({ queryKey: ['financial', 'aging'], queryFn: fetchAging, ...OPTS })
}

export function useMargemProduto() {
  return useQuery({ queryKey: ['financial', 'margem-produto'], queryFn: fetchMargemProduto, ...OPTS })
}

export function useMargemCanal() {
  return useQuery({ queryKey: ['financial', 'margem-canal'], queryFn: fetchMargemCanal, ...OPTS })
}

export function useComparativo() {
  return useQuery({ queryKey: ['financial', 'comparativo'], queryFn: fetchComparativo, ...OPTS })
}

export function useReceitaPorUF() {
  return useQuery({ queryKey: ['financial', 'receita-uf'], queryFn: fetchReceitaPorUF, ...OPTS })
}

export function useLastSync() {
  return useQuery({ queryKey: ['financial', 'last-sync'], queryFn: fetchLastSync, staleTime: 30_000 })
}

export function useBlingCategorias() {
  return useQuery({ queryKey: ['financial', 'categorias'], queryFn: fetchBlingCategorias, ...OPTS })
}

export function useTriggerSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: triggerBlingSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial'] })
    },
  })
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/services/queries/useFinancialQueries.ts
git commit -m "feat: add React Query hooks for financial data"
```

---

## Task 7: Bling Sync Edge Function (Restructure)

**Files:**
- Modify: `supabase/functions/bling-sync/index.ts`

- [ ] **Step 1: Read current Edge Function**

Read `supabase/functions/bling-sync/index.ts` to understand current structure. It handles `contatos`, `produtos`, `pedidos` via `?tipo=` parameter.

- [ ] **Step 2: Add financial sync steps**

Add new sync functions for: `categorias`, `contas-receber`, `contas-pagar`, `pedidos-compra`. Keep existing sync types working. Add a new `?tipo=financeiro` that orchestrates all 4 financial steps + view refresh.

Key implementation points:
- Reuse existing `blingFetch()` helper for authenticated API calls
- Reuse existing pagination loop pattern
- Reuse existing `refreshToken()` for OAuth
- Add `tipo=financeiro` that runs: categorias → contas-receber → contas-pagar → pedidos-compra → refresh views
- Each step: paginate, upsert with `ON CONFLICT (bling_id) DO UPDATE`, log step result
- After all steps: call `supabase.rpc('refresh_financial_views')`
- Log to `bling_sync_log` with `steps` JSONB

Bling API v3 endpoints:
- `GET /categorias/receitas-despesas` → bling_categorias
- `GET /contas/receber` → bling_contas_receber
- `GET /contas/pagar` → bling_contas_pagar
- `GET /pedidos/compras` → bling_pedidos_compra

- [ ] **Step 3: Test locally with Supabase CLI (if available)**

Run: `supabase functions serve bling-sync` then `curl -X POST 'http://localhost:54321/functions/v1/bling-sync?tipo=financeiro'`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/bling-sync/index.ts
git commit -m "feat: add financial sync to bling-sync Edge Function (categorias, contas, pedidos compra)"
```

---

## Task 8: Vercel Cron + API Routes

**Files:**
- Create: `api/cron/bling-sync.ts`
- Create: `api/sync/bling.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create Vercel Cron API route**

```typescript
// api/cron/bling-sync.ts

export default async function handler(req: Request) {
  // Verify cron secret for security (Vercel sets this automatically for cron jobs)
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase config' }), { status: 500 })
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/bling-sync?tipo=financeiro`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return new Response(JSON.stringify(data), { status: response.ok ? 200 : 500 })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
}
```

- [ ] **Step 2: Create manual sync API route (for SyncButton)**

```typescript
// api/sync/bling.ts

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  // Verify user is authenticated via Supabase JWT in Authorization header
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase config' }), { status: 500 })
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/bling-sync?tipo=financeiro`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return new Response(JSON.stringify(data), { status: response.ok ? 200 : 500 })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
}
```

- [ ] **Step 3: Update vercel.json with cron config**

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "crons": [{
    "path": "/api/cron/bling-sync",
    "schedule": "0 6 * * *"
  }]
}
```

- [ ] **Step 4: Add CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY to Vercel env vars**

Note for implementer: these must be added manually in Vercel dashboard > Settings > Environment Variables.

- [ ] **Step 5: Commit**

```bash
git add api/cron/bling-sync.ts api/sync/bling.ts vercel.json
git commit -m "feat: add Vercel Cron + manual sync API routes for Bling"
```

---

## Task 9: Financial Chart Components

**Files:**
- Create: `src/components/charts/FluxoCaixaChart.tsx`
- Create: `src/components/charts/AgingChart.tsx`

- [ ] **Step 1: Write FluxoCaixaChart**

Stacked bar chart (receita green, despesa red) with line overlay for saldo_acumulado. Uses Recharts `ComposedChart` with `Bar` + `Line`. Props: `data: FluxoCaixaMensal[]`.

Reference existing chart pattern in `src/components/charts/PieChart.tsx` for Recharts usage and Tailwind styling.

- [ ] **Step 2: Write AgingChart**

Horizontal bar chart showing a_receber (green) and a_pagar (red) per aging bucket. Uses Recharts `BarChart` with `layout="vertical"`. Props: `data: ContasVencer[]`.

- [ ] **Step 3: Verify both render without errors**

Run: `npm run dev` and import into a test page, or verify typecheck: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/components/charts/FluxoCaixaChart.tsx src/components/charts/AgingChart.tsx
git commit -m "feat: add FluxoCaixaChart and AgingChart components"
```

---

## Task 10: Financial Table Components

**Files:**
- Create: `src/components/financial/DRETable.tsx`
- Create: `src/components/financial/ComparativoCard.tsx`
- Create: `src/components/financial/MargemTable.tsx`
- Create: `src/components/financial/SyncButton.tsx`

- [ ] **Step 1: Write DRETable**

Collapsible table displaying DRE lines for selected month. Shows: Receita Bruta → Lucro Líquido with subtotals and margins. Props: `data: DREMensal[]`, `selectedMonth: string`. Use existing `SectionCard` wrapper pattern.

DRE line ordering: `receita_bruta` → `impostos` → `receita_liquida` → `cmv` → `lucro_bruto` → `despesas_operacionais` → `resultado_operacional` → `despesas_financeiras` → `lucro_liquido` → `margem_bruta_pct` → `margem_liquida_pct`.

- [ ] **Step 2: Write ComparativoCard**

Shows current month vs previous month vs same month last year. Displays variation % with up/down arrows (green for positive, red for negative). Props: `data: ComparativoMensal[]`, `selectedMonth: string`. Filter data by `ano_mes === selectedMonth`.

- [ ] **Step 3: Write MargemTable**

Ranked table showing margin by product or channel. Columns: name, receita, custo, margem R$, margem %. Green/red color coding for margin. Props: `data: MargemProduto[] | MargemCanal[]`, `type: 'produto' | 'canal'`.

- [ ] **Step 4: Write SyncButton**

Button that triggers `useTriggerSync()`. Shows loading state with step-by-step progress. Displays last sync timestamp from `useLastSync()`. Props: none (uses hooks internally).

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add src/components/financial/
git commit -m "feat: add DRETable, ComparativoCard, MargemTable, SyncButton components"
```

---

## Task 11: Redesign FluxoCaixaPage

**Files:**
- Modify: `src/pages/FluxoCaixaPage.tsx`

- [ ] **Step 1: Replace seed data imports with real data hooks**

Remove imports from `src/data/seed.ts`. Import all hooks from `useFinancialQueries.ts`. Add loading and error states.

- [ ] **Step 2: Implement new layout**

Follow the spec layout:
1. Filter bar (period selector + SyncButton)
2. KPI cards row (Receita Líquida, Despesas, Lucro, Margem %)
3. FluxoCaixaChart + AgingChart side by side
4. DRETable full width
5. Donut chart (despesas por categoria) + ComparativoCard side by side
6. MargemTable (produto) + MargemTable (canal) side by side

Use existing `SectionCard`, `KPICard`, `DateRangePicker` components. Filter data by selected period (filter `ano_mes` range from hooks).

- [ ] **Step 3: Verify page renders with empty data (views are empty)**

Run: `npm run dev`, navigate to `/app/fluxo-caixa`. Should show empty state / zero values without errors.

- [ ] **Step 4: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add src/pages/FluxoCaixaPage.tsx
git commit -m "feat: redesign FluxoCaixaPage with real financial data from materialized views"
```

---

## Task 12: Shopify Pagination Fix

**Files:**
- Modify: `src/services/api/shopify.ts`

- [ ] **Step 1: Read current shopify.ts**

Current code has hardcoded `.limit(5000)`. Replace with pagination loop.

- [ ] **Step 2: Implement pagination**

Replace each fetch function to use a pagination loop:
```typescript
async function fetchAllPages<T>(table: string, select: string, pageSize = 1000): Promise<T[]> {
  let all: T[] = []
  let page = 0
  let hasMore = true
  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(page * pageSize, (page + 1) * pageSize - 1)
    if (error) throw new Error(`fetch ${table}: ${error.message}`)
    all = all.concat((data ?? []) as T[])
    hasMore = (data?.length ?? 0) === pageSize
    page++
  }
  return all
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/services/api/shopify.ts
git commit -m "fix: replace hardcoded 5000 limit with pagination in Shopify API service"
```

---

## Task 13: Integration Testing & Final Verification

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: PASS (fix any issues)

- [ ] **Step 3: Run existing tests**

Run: `npm run test:run`
Expected: All existing tests pass

- [ ] **Step 4: Verify FluxoCaixaPage renders**

Run: `npm run dev`, navigate to `/app/fluxo-caixa`. Verify:
- No console errors
- Empty state displays correctly (views have no data yet)
- SyncButton appears and is clickable
- All chart/table components render without crash

- [ ] **Step 5: Verify materialized views are queryable**

Run SQL: `SELECT COUNT(*) FROM mv_fluxo_caixa_mensal;`
Expected: 0 rows (no data synced yet)

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "chore: fix lint and integration issues from financial analysis feature"
```

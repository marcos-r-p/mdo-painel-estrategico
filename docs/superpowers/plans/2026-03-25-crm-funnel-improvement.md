# CRM & Funnel Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded CRM/Funnel pages with real data from materialized views, plus an automatic insight engine that generates alerts and recommendations.

**Architecture:** 10 new materialized views (6 CRM from `rdstation_deals`, 4 Shopify from `shopify_pedidos`) feed into TypeScript insight rules via React Query hooks. The existing `refresh_financial_views()` function is expanded to include all new views.

**Tech Stack:** PostgreSQL materialized views, Supabase JS client, TanStack React Query v5, Recharts v2, TypeScript

---

## File Structure

### New files to create:
| File | Responsibility |
|------|---------------|
| `src/types/crm.ts` | TypeScript interfaces for all 6 CRM materialized view row shapes |
| `src/types/shopify-views.ts` | TypeScript interfaces for all 4 Shopify materialized view row shapes |
| `src/lib/insights/types.ts` | Insight, Severity, InsightType definitions |
| `src/lib/insights/crm-insights.ts` | 6 CRM insight rules |
| `src/lib/insights/shopify-insights.ts` | 6 Shopify insight rules |
| `src/lib/insights/engine.ts` | processInsights() — combine, prioritize, deduplicate |
| `src/services/api/crm-views.ts` | Fetch functions for 6 CRM materialized views |
| `src/services/api/shopify-views.ts` | Fetch functions for 4 Shopify materialized views |
| `src/lib/insights/__tests__/crm-insights.test.ts` | Unit tests for CRM insight rules |
| `src/lib/insights/__tests__/shopify-insights.test.ts` | Unit tests for Shopify insight rules |

### Existing files to modify:
| File | Change |
|------|--------|
| `src/services/queries/useRDStationQueries.ts` | Add 6 new hooks for CRM views |
| `src/services/queries/useShopifyQueries.ts` | Add 4 new hooks for Shopify views |
| `src/pages/CRMPage.tsx` | Full rewrite: replace seed data with view hooks + insight engine |
| `src/pages/FunilPage.tsx` | Full rewrite: replace estimated data with view hooks + insight engine |

### SQL migration:
| File | Content |
|------|---------|
| Applied via Supabase MCP | 10 materialized views + 10 unique indexes + GRANT SELECT + refresh function update |

---

## Task 1: SQL Migration — Create 10 Materialized Views

**Files:**
- Apply via Supabase MCP: `apply_migration`

This task creates all 10 views, indexes, grants, and updates the refresh function in a single migration. Must be done first as all frontend work depends on it.

- [ ] **Step 1: Apply the migration via Supabase MCP**

Use `mcp__claude_ai_Supabase__apply_migration` with name `crm_shopify_materialized_views` and the following SQL:

```sql
-- ══════════════════════════════════════════════════════════════
-- CRM Materialized Views (from rdstation_deals)
-- ══════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_crm_funil_periodo AS
SELECT
  date_trunc('month', d.created_at)::date AS mes,
  d.stage_name AS etapa,
  COUNT(*) AS qtd,
  SUM(d.amount) AS valor_total,
  COUNT(*) FILTER (WHERE d.win = true) AS vendas,
  COUNT(*) FILTER (WHERE d.closed = true AND d.win = false) AS perdas,
  SUM(d.amount) FILTER (WHERE d.win = true) AS valor_vendas
FROM rdstation_deals d
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

CREATE UNIQUE INDEX ON mv_crm_funil_periodo (mes, etapa);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_crm_evolucao_mensal AS
SELECT
  date_trunc('month', d.created_at)::date AS mes,
  COUNT(*) AS criados,
  COUNT(*) FILTER (WHERE d.win = true) AS vendidos,
  COUNT(*) FILTER (WHERE d.closed = true AND d.win = false) AS perdidos,
  SUM(d.amount) AS valor_criado,
  SUM(d.amount) FILTER (WHERE d.win = true) AS valor_vendido,
  SUM(d.amount) FILTER (WHERE d.closed = true AND d.win = false) AS valor_perdido
FROM rdstation_deals d
GROUP BY 1
ORDER BY 1 DESC;

CREATE UNIQUE INDEX ON mv_crm_evolucao_mensal (mes);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_crm_perdas AS
SELECT
  COALESCE(d.loss_reason, 'Sem motivo') AS motivo,
  COUNT(*) AS qtd,
  SUM(d.amount) AS valor_total,
  ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER(), 0), 1) AS percentual
FROM rdstation_deals d
WHERE d.closed = true AND d.win = false
GROUP BY 1
ORDER BY qtd DESC;

CREATE UNIQUE INDEX ON mv_crm_perdas (motivo);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_crm_responsaveis AS
SELECT
  COALESCE(d.user_name, 'Sem responsavel') AS responsavel,
  COUNT(*) AS total_deals,
  COUNT(*) FILTER (WHERE d.win = true) AS vendas,
  COUNT(*) FILTER (WHERE d.closed = true AND d.win = false) AS perdas,
  ROUND(100.0 * COUNT(*) FILTER (WHERE d.win = true) / NULLIF(COUNT(*), 0), 1) AS taxa_conversao,
  COALESCE(AVG(d.amount) FILTER (WHERE d.win = true), 0) AS ticket_medio,
  COALESCE(SUM(d.amount) FILTER (WHERE d.win = true), 0) AS valor_total_vendas
FROM rdstation_deals d
GROUP BY 1
ORDER BY valor_total_vendas DESC;

CREATE UNIQUE INDEX ON mv_crm_responsaveis (responsavel);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_crm_origens AS
SELECT
  COALESCE(d.deal_source, 'Direto') AS origem,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE d.win = true) AS convertidos,
  ROUND(100.0 * COUNT(*) FILTER (WHERE d.win = true) / NULLIF(COUNT(*), 0), 1) AS taxa_conversao,
  COALESCE(SUM(d.amount) FILTER (WHERE d.win = true), 0) AS valor_convertido
FROM rdstation_deals d
GROUP BY 1
ORDER BY total DESC;

CREATE UNIQUE INDEX ON mv_crm_origens (origem);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_crm_deals_parados AS
SELECT
  d.id,
  d.name AS deal_nome,
  d.stage_name AS etapa,
  d.amount AS valor,
  d.user_name AS responsavel,
  d.created_at,
  d.synced_at,
  EXTRACT(DAY FROM now() - COALESCE(d.synced_at, d.created_at))::int AS dias_parado
FROM rdstation_deals d
WHERE d.closed = false
ORDER BY dias_parado DESC;

CREATE UNIQUE INDEX ON mv_crm_deals_parados (id);

-- ══════════════════════════════════════════════════════════════
-- Shopify Materialized Views (from shopify_pedidos)
-- ══════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_shopify_vendas_mensal AS
SELECT
  date_trunc('month', p.data)::date AS mes,
  COUNT(*) AS pedidos,
  SUM(p.valor_total) AS receita,
  AVG(p.valor_total) AS ticket_medio,
  SUM(p.desconto) AS descontos_total
FROM shopify_pedidos p
WHERE p.status_financeiro IN ('paid', 'partially_refunded')
GROUP BY 1
ORDER BY 1 DESC;

CREATE UNIQUE INDEX ON mv_shopify_vendas_mensal (mes);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_shopify_recorrencia AS
WITH cliente_compras AS (
  SELECT
    cliente_email,
    COUNT(*) AS total_compras,
    MIN(data) AS primeira_compra
  FROM shopify_pedidos
  WHERE status_financeiro IN ('paid', 'partially_refunded')
    AND cliente_email IS NOT NULL
  GROUP BY cliente_email
)
SELECT
  date_trunc('month', p.data)::date AS mes,
  COUNT(*) FILTER (WHERE cc.total_compras = 1) AS clientes_novos,
  COUNT(*) FILTER (WHERE cc.total_compras > 1) AS clientes_recorrentes,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cc.total_compras > 1) / NULLIF(COUNT(*), 0), 1) AS taxa_recompra
FROM shopify_pedidos p
JOIN cliente_compras cc ON p.cliente_email = cc.cliente_email
WHERE p.status_financeiro IN ('paid', 'partially_refunded')
GROUP BY 1
ORDER BY 1 DESC;

CREATE UNIQUE INDEX ON mv_shopify_recorrencia (mes);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_shopify_produtos_rank AS
SELECT
  item->>'titulo' AS produto,
  COALESCE(item->>'sku', '') AS sku,
  SUM((item->>'quantidade')::int) AS qtd_vendida,
  SUM((item->>'quantidade')::int * (item->>'preco')::numeric) AS receita_total,
  AVG((item->>'preco')::numeric) AS preco_medio,
  COUNT(DISTINCT p.id) AS pedidos_distintos
FROM shopify_pedidos p,
     jsonb_array_elements(p.itens) AS item
WHERE p.status_financeiro IN ('paid', 'partially_refunded')
GROUP BY 1, 2
ORDER BY receita_total DESC;

CREATE UNIQUE INDEX ON mv_shopify_produtos_rank (produto, COALESCE(sku, ''));

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_shopify_cohort AS
WITH primeira AS (
  SELECT
    cliente_email,
    date_trunc('month', MIN(data))::date AS cohort_mes
  FROM shopify_pedidos
  WHERE status_financeiro IN ('paid', 'partially_refunded')
    AND cliente_email IS NOT NULL
  GROUP BY cliente_email
)
SELECT
  pr.cohort_mes,
  date_trunc('month', p.data)::date AS mes_compra,
  COUNT(DISTINCT p.cliente_email) AS clientes,
  SUM(p.valor_total) AS receita
FROM shopify_pedidos p
JOIN primeira pr ON p.cliente_email = pr.cliente_email
WHERE p.status_financeiro IN ('paid', 'partially_refunded')
GROUP BY 1, 2
ORDER BY 1, 2;

CREATE UNIQUE INDEX ON mv_shopify_cohort (cohort_mes, mes_compra);

-- ══════════════════════════════════════════════════════════════
-- GRANT SELECT to authenticated role
-- ══════════════════════════════════════════════════════════════

GRANT SELECT ON mv_crm_funil_periodo TO authenticated;
GRANT SELECT ON mv_crm_evolucao_mensal TO authenticated;
GRANT SELECT ON mv_crm_perdas TO authenticated;
GRANT SELECT ON mv_crm_responsaveis TO authenticated;
GRANT SELECT ON mv_crm_origens TO authenticated;
GRANT SELECT ON mv_crm_deals_parados TO authenticated;
GRANT SELECT ON mv_shopify_vendas_mensal TO authenticated;
GRANT SELECT ON mv_shopify_recorrencia TO authenticated;
GRANT SELECT ON mv_shopify_produtos_rank TO authenticated;
GRANT SELECT ON mv_shopify_cohort TO authenticated;

-- ══════════════════════════════════════════════════════════════
-- Update refresh function to include new views
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION refresh_financial_views()
RETURNS void AS $$
BEGIN
  -- Financial (existing)
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fluxo_caixa_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dre_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_contas_vencer;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_comparativo_mensal;
  -- CRM (new)
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_funil_periodo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_evolucao_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_perdas;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_responsaveis;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_origens;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_deals_parados;
  -- Shopify (new)
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_shopify_vendas_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_shopify_recorrencia;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_shopify_produtos_rank;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_shopify_cohort;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Verify views were created**

Use `mcp__claude_ai_Supabase__execute_sql` to verify:

```sql
SELECT matviewname FROM pg_matviews
WHERE matviewname LIKE 'mv_crm_%' OR matviewname LIKE 'mv_shopify_%'
ORDER BY matviewname;
```

Expected: 10 rows (6 `mv_crm_*` + 4 `mv_shopify_*`).

- [ ] **Step 3: Verify data exists in the views**

```sql
SELECT 'mv_crm_funil_periodo' AS view, COUNT(*) FROM mv_crm_funil_periodo
UNION ALL SELECT 'mv_crm_evolucao_mensal', COUNT(*) FROM mv_crm_evolucao_mensal
UNION ALL SELECT 'mv_shopify_vendas_mensal', COUNT(*) FROM mv_shopify_vendas_mensal
UNION ALL SELECT 'mv_shopify_produtos_rank', COUNT(*) FROM mv_shopify_produtos_rank;
```

- [ ] **Step 4: Commit migration tracking file**

Note: No local files to commit for this task — the migration was applied directly via Supabase MCP.

---

## Task 2: TypeScript Types for View Results

**Files:**
- Create: `src/types/crm.ts`
- Create: `src/types/shopify-views.ts`

- [ ] **Step 1: Create CRM types**

Create `src/types/crm.ts`:

```typescript
// src/types/crm.ts
// TypeScript interfaces for CRM materialized view row shapes.

export interface CrmFunilPeriodo {
  mes: string
  etapa: string
  qtd: number
  valor_total: number
  vendas: number
  perdas: number
  valor_vendas: number
}

export interface CrmEvolucaoMensal {
  mes: string
  criados: number
  vendidos: number
  perdidos: number
  valor_criado: number
  valor_vendido: number
  valor_perdido: number
}

export interface CrmPerda {
  motivo: string
  qtd: number
  valor_total: number
  percentual: number
}

export interface CrmResponsavel {
  responsavel: string
  total_deals: number
  vendas: number
  perdas: number
  taxa_conversao: number
  ticket_medio: number
  valor_total_vendas: number
}

export interface CrmOrigem {
  origem: string
  total: number
  convertidos: number
  taxa_conversao: number
  valor_convertido: number
}

export interface CrmDealParado {
  id: number
  deal_nome: string
  etapa: string
  valor: number
  responsavel: string | null
  created_at: string
  synced_at: string | null
  dias_parado: number
}
```

- [ ] **Step 2: Create Shopify view types**

Create `src/types/shopify-views.ts`:

```typescript
// src/types/shopify-views.ts
// TypeScript interfaces for Shopify materialized view row shapes.

export interface ShopifyVendasMensal {
  mes: string
  pedidos: number
  receita: number
  ticket_medio: number
  descontos_total: number
}

export interface ShopifyRecorrencia {
  mes: string
  clientes_novos: number
  clientes_recorrentes: number
  taxa_recompra: number
}

export interface ShopifyProdutoRank {
  produto: string
  sku: string
  qtd_vendida: number
  receita_total: number
  preco_medio: number
  pedidos_distintos: number
}

export interface ShopifyCohort {
  cohort_mes: string
  mes_compra: string
  clientes: number
  receita: number
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/crm.ts src/types/shopify-views.ts
git commit -m "feat: add TypeScript types for CRM and Shopify materialized views"
```

---

## Task 3: API Service Functions for Views

**Files:**
- Create: `src/services/api/crm-views.ts`
- Create: `src/services/api/shopify-views.ts`

Follow the exact pattern from `src/services/api/financial.ts` — one function per view, using `supabase.from('view_name').select('*')`.

- [ ] **Step 1: Create CRM API service**

Create `src/services/api/crm-views.ts`:

```typescript
// src/services/api/crm-views.ts
import { supabase } from '../supabase'
import type {
  CrmFunilPeriodo, CrmEvolucaoMensal, CrmPerda,
  CrmResponsavel, CrmOrigem, CrmDealParado,
} from '../../types/crm'

export async function fetchCrmFunil(): Promise<CrmFunilPeriodo[]> {
  const { data, error } = await supabase
    .from('mv_crm_funil_periodo')
    .select('*')
    .order('mes', { ascending: false })
  if (error) throw new Error(`fetchCrmFunil: ${error.message}`)
  return (data ?? []) as CrmFunilPeriodo[]
}

export async function fetchCrmEvolucao(): Promise<CrmEvolucaoMensal[]> {
  const { data, error } = await supabase
    .from('mv_crm_evolucao_mensal')
    .select('*')
    .order('mes')
  if (error) throw new Error(`fetchCrmEvolucao: ${error.message}`)
  return (data ?? []) as CrmEvolucaoMensal[]
}

export async function fetchCrmPerdas(): Promise<CrmPerda[]> {
  const { data, error } = await supabase
    .from('mv_crm_perdas')
    .select('*')
    .order('qtd', { ascending: false })
  if (error) throw new Error(`fetchCrmPerdas: ${error.message}`)
  return (data ?? []) as CrmPerda[]
}

export async function fetchCrmResponsaveis(): Promise<CrmResponsavel[]> {
  const { data, error } = await supabase
    .from('mv_crm_responsaveis')
    .select('*')
    .order('valor_total_vendas', { ascending: false })
  if (error) throw new Error(`fetchCrmResponsaveis: ${error.message}`)
  return (data ?? []) as CrmResponsavel[]
}

export async function fetchCrmOrigens(): Promise<CrmOrigem[]> {
  const { data, error } = await supabase
    .from('mv_crm_origens')
    .select('*')
    .order('total', { ascending: false })
  if (error) throw new Error(`fetchCrmOrigens: ${error.message}`)
  return (data ?? []) as CrmOrigem[]
}

export async function fetchCrmDealsParados(): Promise<CrmDealParado[]> {
  const { data, error } = await supabase
    .from('mv_crm_deals_parados')
    .select('*')
    .order('dias_parado', { ascending: false })
  if (error) throw new Error(`fetchCrmDealsParados: ${error.message}`)
  return (data ?? []) as CrmDealParado[]
}
```

- [ ] **Step 2: Create Shopify API service**

Create `src/services/api/shopify-views.ts`:

```typescript
// src/services/api/shopify-views.ts
import { supabase } from '../supabase'
import type {
  ShopifyVendasMensal, ShopifyRecorrencia,
  ShopifyProdutoRank, ShopifyCohort,
} from '../../types/shopify-views'

export async function fetchShopifyVendasMensal(): Promise<ShopifyVendasMensal[]> {
  const { data, error } = await supabase
    .from('mv_shopify_vendas_mensal')
    .select('*')
    .order('mes')
  if (error) throw new Error(`fetchShopifyVendasMensal: ${error.message}`)
  return (data ?? []) as ShopifyVendasMensal[]
}

export async function fetchShopifyRecorrencia(): Promise<ShopifyRecorrencia[]> {
  const { data, error } = await supabase
    .from('mv_shopify_recorrencia')
    .select('*')
    .order('mes')
  if (error) throw new Error(`fetchShopifyRecorrencia: ${error.message}`)
  return (data ?? []) as ShopifyRecorrencia[]
}

export async function fetchShopifyProdutosRank(): Promise<ShopifyProdutoRank[]> {
  const { data, error } = await supabase
    .from('mv_shopify_produtos_rank')
    .select('*')
    .order('receita_total', { ascending: false })
    .limit(50)
  if (error) throw new Error(`fetchShopifyProdutosRank: ${error.message}`)
  return (data ?? []) as ShopifyProdutoRank[]
}

export async function fetchShopifyCohort(): Promise<ShopifyCohort[]> {
  const { data, error } = await supabase
    .from('mv_shopify_cohort')
    .select('*')
    .order('cohort_mes')
  if (error) throw new Error(`fetchShopifyCohort: ${error.message}`)
  return (data ?? []) as ShopifyCohort[]
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/api/crm-views.ts src/services/api/shopify-views.ts
git commit -m "feat: add API service functions for CRM and Shopify materialized views"
```

---

## Task 4: React Query Hooks for Views

**Files:**
- Modify: `src/services/queries/useRDStationQueries.ts`
- Modify: `src/services/queries/useShopifyQueries.ts`

Follow the exact pattern from `src/services/queries/useFinancialQueries.ts` — shared OPTS constant, one hook per view.

- [ ] **Step 1: Update useRDStationQueries.ts**

Replace the entire file with:

```typescript
// src/services/queries/useRDStationQueries.ts
import { useQuery } from '@tanstack/react-query'
import { fetchAllRDStationData, fetchCRMDashboard } from '../api/rdstation'
import {
  fetchCrmFunil, fetchCrmEvolucao, fetchCrmPerdas,
  fetchCrmResponsaveis, fetchCrmOrigens, fetchCrmDealsParados,
} from '../api/crm-views'

const STALE_TIME = 5 * 60 * 1000
const GC_TIME = 30 * 60 * 1000
const OPTS = { staleTime: STALE_TIME, gcTime: GC_TIME, refetchOnWindowFocus: false }

// ── Existing hooks (preserved) ───────────────────────────────

export function useAllRDStationData() {
  return useQuery({
    queryKey: ['rdstation', 'all'],
    queryFn: fetchAllRDStationData,
  })
}

export function useCRMDashboard(periodo?: string, rdToken?: string) {
  return useQuery({
    queryKey: ['rdstation', 'crm-dashboard', periodo ?? 'default'],
    queryFn: () => fetchCRMDashboard(periodo, rdToken),
  })
}

// ── New CRM view hooks ───────────────────────────────────────

export function useCrmFunil() {
  return useQuery({ queryKey: ['crm', 'funil'], queryFn: fetchCrmFunil, ...OPTS })
}

export function useCrmEvolucao() {
  return useQuery({ queryKey: ['crm', 'evolucao'], queryFn: fetchCrmEvolucao, ...OPTS })
}

export function useCrmPerdas() {
  return useQuery({ queryKey: ['crm', 'perdas'], queryFn: fetchCrmPerdas, ...OPTS })
}

export function useCrmResponsaveis() {
  return useQuery({ queryKey: ['crm', 'responsaveis'], queryFn: fetchCrmResponsaveis, ...OPTS })
}

export function useCrmOrigens() {
  return useQuery({ queryKey: ['crm', 'origens'], queryFn: fetchCrmOrigens, ...OPTS })
}

export function useCrmDealsParados() {
  return useQuery({ queryKey: ['crm', 'deals-parados'], queryFn: fetchCrmDealsParados, ...OPTS })
}
```

- [ ] **Step 2: Update useShopifyQueries.ts**

Replace the entire file with:

```typescript
// src/services/queries/useShopifyQueries.ts
import { useQuery } from '@tanstack/react-query'
import { fetchAllShopifyData } from '../api/shopify'
import {
  fetchShopifyVendasMensal, fetchShopifyRecorrencia,
  fetchShopifyProdutosRank, fetchShopifyCohort,
} from '../api/shopify-views'

const STALE_TIME = 5 * 60 * 1000
const GC_TIME = 30 * 60 * 1000
const OPTS = { staleTime: STALE_TIME, gcTime: GC_TIME, refetchOnWindowFocus: false }

// ── Existing hooks (preserved) ───────────────────────────────

export function useAllShopifyData() {
  return useQuery({
    queryKey: ['shopify', 'all'],
    queryFn: fetchAllShopifyData,
  })
}

// ── New Shopify view hooks ───────────────────────────────────

export function useShopifyVendasMensal() {
  return useQuery({ queryKey: ['shopify', 'vendas-mensal'], queryFn: fetchShopifyVendasMensal, ...OPTS })
}

export function useShopifyRecorrencia() {
  return useQuery({ queryKey: ['shopify', 'recorrencia'], queryFn: fetchShopifyRecorrencia, ...OPTS })
}

export function useShopifyProdutosRank() {
  return useQuery({ queryKey: ['shopify', 'produtos-rank'], queryFn: fetchShopifyProdutosRank, ...OPTS })
}

export function useShopifyCohort() {
  return useQuery({ queryKey: ['shopify', 'cohort'], queryFn: fetchShopifyCohort, ...OPTS })
}
```

- [ ] **Step 3: Verify build passes**

```bash
npm run typecheck
```

Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/queries/useRDStationQueries.ts src/services/queries/useShopifyQueries.ts
git commit -m "feat: add React Query hooks for CRM and Shopify materialized views"
```

---

## Task 5: Insight Engine — Types and Core

**Files:**
- Create: `src/lib/insights/types.ts`
- Create: `src/lib/insights/engine.ts`

- [ ] **Step 1: Create insight types**

Create `src/lib/insights/types.ts`:

```typescript
// src/lib/insights/types.ts

export type InsightType = 'alerta' | 'oportunidade' | 'tendencia'
export type Severity = 'critico' | 'atencao' | 'info'

export interface Insight {
  id: string
  type: InsightType
  severity: Severity
  titulo: string
  descricao: string
  metrica: {
    atual: number
    anterior?: number
    variacao?: number
  }
  recomendacao: string
  prioridade: number // 1-10, higher = more urgent
}
```

- [ ] **Step 2: Create engine**

Create `src/lib/insights/engine.ts`:

```typescript
// src/lib/insights/engine.ts
import type { Insight } from './types'

const SEVERITY_WEIGHT: Record<string, number> = {
  critico: 3,
  atencao: 2,
  info: 1,
}

/**
 * Combine, deduplicate by id, and sort insights by priority (desc)
 * then by severity weight (desc).
 */
export function processInsights(...groups: Insight[][]): Insight[] {
  const all = groups.flat()
  const unique = new Map<string, Insight>()
  for (const insight of all) {
    if (!unique.has(insight.id)) {
      unique.set(insight.id, insight)
    }
  }

  return Array.from(unique.values()).sort((a, b) => {
    if (b.prioridade !== a.prioridade) return b.prioridade - a.prioridade
    return (SEVERITY_WEIGHT[b.severity] ?? 0) - (SEVERITY_WEIGHT[a.severity] ?? 0)
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/insights/types.ts src/lib/insights/engine.ts
git commit -m "feat: add insight engine types and core processInsights function"
```

---

## Task 6: CRM Insight Rules + Tests

**Files:**
- Create: `src/lib/insights/crm-insights.ts`
- Create: `src/lib/insights/__tests__/crm-insights.test.ts`

- [ ] **Step 1: Write CRM insight rules test**

Create `src/lib/insights/__tests__/crm-insights.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateCrmInsights } from '../crm-insights'
import type { CrmFunilPeriodo, CrmEvolucaoMensal, CrmDealParado, CrmResponsavel, CrmOrigem, CrmPerda } from '../../../types/crm'

describe('generateCrmInsights', () => {
  it('returns empty array when all data is empty', () => {
    const result = generateCrmInsights({
      funil: [],
      evolucao: [],
      dealsParados: [],
      responsaveis: [],
      origens: [],
      perdas: [],
    })
    expect(result).toEqual([])
  })

  it('generates critical alert for deals parados > 5', () => {
    const dealsParados: CrmDealParado[] = Array.from({ length: 8 }, (_, i) => ({
      id: i, deal_nome: `Deal ${i}`, etapa: 'Proposta', valor: 1000,
      responsavel: 'João', created_at: '2026-01-01', synced_at: '2026-01-01', dias_parado: 20,
    }))

    const result = generateCrmInsights({
      funil: [], evolucao: [], dealsParados, responsaveis: [], origens: [], perdas: [],
    })

    const alert = result.find(i => i.id === 'crm-deals-parados')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('critico')
    expect(alert!.metrica.atual).toBe(8)
  })

  it('generates alert when conversion drops > 20%', () => {
    const evolucao: CrmEvolucaoMensal[] = [
      { mes: '2026-02-01', criados: 100, vendidos: 20, perdidos: 30, valor_criado: 100000, valor_vendido: 20000, valor_perdido: 30000 },
      { mes: '2026-01-01', criados: 100, vendidos: 40, perdidos: 20, valor_criado: 100000, valor_vendido: 40000, valor_perdido: 20000 },
    ]

    const result = generateCrmInsights({
      funil: [], evolucao, dealsParados: [], responsaveis: [], origens: [], perdas: [],
    })

    const alert = result.find(i => i.id === 'crm-conversao-queda')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
  })

  it('generates opportunity for high-conversion origin', () => {
    const origens: CrmOrigem[] = [
      { origem: 'Google Ads', total: 50, convertidos: 20, taxa_conversao: 40, valor_convertido: 100000 },
    ]

    const result = generateCrmInsights({
      funil: [], evolucao: [], dealsParados: [], responsaveis: [], origens, perdas: [],
    })

    const opp = result.find(i => i.id === 'crm-origem-alta-conversao-Google Ads')
    expect(opp).toBeDefined()
    expect(opp!.type).toBe('oportunidade')
  })

  it('generates alert for seller with 0 sales', () => {
    const responsaveis: CrmResponsavel[] = [
      { responsavel: 'Maria', total_deals: 10, vendas: 0, perdas: 3, taxa_conversao: 0, ticket_medio: 0, valor_total_vendas: 0 },
    ]

    const result = generateCrmInsights({
      funil: [], evolucao: [], dealsParados: [], responsaveis, origens: [], perdas: [],
    })

    const alert = result.find(i => i.id === 'crm-vendedor-sem-vendas-Maria')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
  })

  it('generates alert for losses without reason > 30%', () => {
    const perdas: CrmPerda[] = [
      { motivo: 'Sem motivo', qtd: 40, valor_total: 40000, percentual: 40 },
      { motivo: 'Preco', qtd: 60, valor_total: 60000, percentual: 60 },
    ]

    const result = generateCrmInsights({
      funil: [], evolucao: [], dealsParados: [], responsaveis: [], origens: [], perdas,
    })

    const alert = result.find(i => i.id === 'crm-perdas-sem-motivo')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/insights/__tests__/crm-insights.test.ts
```

Expected: FAIL — module `../crm-insights` not found.

- [ ] **Step 3: Implement CRM insight rules**

Create `src/lib/insights/crm-insights.ts`:

```typescript
// src/lib/insights/crm-insights.ts
import type { Insight } from './types'
import type {
  CrmFunilPeriodo, CrmEvolucaoMensal, CrmDealParado,
  CrmResponsavel, CrmOrigem, CrmPerda,
} from '../../types/crm'

interface CrmInsightInput {
  funil: CrmFunilPeriodo[]
  evolucao: CrmEvolucaoMensal[]
  dealsParados: CrmDealParado[]
  responsaveis: CrmResponsavel[]
  origens: CrmOrigem[]
  perdas: CrmPerda[]
}

export function generateCrmInsights(input: CrmInsightInput): Insight[] {
  const insights: Insight[] = []

  // Rule 1: Deals parados > 5
  if (input.dealsParados.length > 5) {
    const top = input.dealsParados[0]
    insights.push({
      id: 'crm-deals-parados',
      type: 'alerta',
      severity: 'critico',
      titulo: `${input.dealsParados.length} deals parados`,
      descricao: `Existem ${input.dealsParados.length} deals abertos sem movimentacao. O mais antigo esta na etapa "${top?.etapa}" ha ${top?.dias_parado} dias.`,
      metrica: { atual: input.dealsParados.length },
      recomendacao: `Revisar os ${input.dealsParados.length} deals parados, priorizando a etapa "${top?.etapa}"`,
      prioridade: 9,
    })
  }

  // Rule 2: Conversion drop > 20% (needs at least 2 months)
  if (input.evolucao.length >= 2) {
    const sorted = [...input.evolucao].sort((a, b) => b.mes.localeCompare(a.mes))
    const atual = sorted[0]
    const anterior = sorted[1]
    const convAtual = atual.criados > 0 ? (atual.vendidos / atual.criados) * 100 : 0
    const convAnterior = anterior.criados > 0 ? (anterior.vendidos / anterior.criados) * 100 : 0

    if (convAnterior > 0 && convAtual < convAnterior * 0.8) {
      insights.push({
        id: 'crm-conversao-queda',
        type: 'alerta',
        severity: 'atencao',
        titulo: 'Conversao em queda',
        descricao: `Taxa de conversao caiu de ${convAnterior.toFixed(1)}% para ${convAtual.toFixed(1)}%.`,
        metrica: { atual: convAtual, anterior: convAnterior, variacao: convAtual - convAnterior },
        recomendacao: `Conversao caiu de ${convAnterior.toFixed(1)}% para ${convAtual.toFixed(1)}%, verificar qualificacao de leads`,
        prioridade: 8,
      })
    }
  }

  // Rule 3: Seller with 0 sales (only if has deals)
  for (const resp of input.responsaveis) {
    if (resp.vendas === 0 && resp.total_deals > 0) {
      insights.push({
        id: `crm-vendedor-sem-vendas-${resp.responsavel}`,
        type: 'alerta',
        severity: 'atencao',
        titulo: `${resp.responsavel} sem vendas`,
        descricao: `${resp.responsavel} tem ${resp.total_deals} deals mas nenhuma venda fechada.`,
        metrica: { atual: 0 },
        recomendacao: `Vendedor ${resp.responsavel} sem fechamento, avaliar pipeline e suporte`,
        prioridade: 6,
      })
    }
  }

  // Rule 4: High-conversion origin (> 30%)
  for (const origem of input.origens) {
    if (origem.taxa_conversao > 30 && origem.total >= 5) {
      insights.push({
        id: `crm-origem-alta-conversao-${origem.origem}`,
        type: 'oportunidade',
        severity: 'info',
        titulo: `${origem.origem} converte ${origem.taxa_conversao}%`,
        descricao: `Canal "${origem.origem}" tem taxa de conversao de ${origem.taxa_conversao}% com ${origem.total} leads.`,
        metrica: { atual: origem.taxa_conversao },
        recomendacao: `Canal ${origem.origem} converte ${origem.taxa_conversao}%, considerar investir mais`,
        prioridade: 5,
      })
    }
  }

  // Rule 5: Losses without reason > 30%
  const semMotivo = input.perdas.find(p => p.motivo === 'Sem motivo')
  if (semMotivo && semMotivo.percentual > 30) {
    insights.push({
      id: 'crm-perdas-sem-motivo',
      type: 'alerta',
      severity: 'atencao',
      titulo: `${semMotivo.percentual}% perdas sem motivo`,
      descricao: `${semMotivo.percentual}% das perdas nao tem motivo registrado (${semMotivo.qtd} deals).`,
      metrica: { atual: semMotivo.percentual },
      recomendacao: `${semMotivo.percentual}% das perdas sem motivo registrado, treinar equipe para documentar`,
      prioridade: 7,
    })
  }

  // Rule 6: Pipeline crescendo (> 20% more deals than previous month)
  if (input.funil.length > 0) {
    const meses = [...new Set(input.funil.map(f => f.mes))].sort()
    if (meses.length >= 2) {
      const mesAtual = meses[meses.length - 1]
      const mesAnterior = meses[meses.length - 2]
      const qtdAtual = input.funil.filter(f => f.mes === mesAtual).reduce((a, f) => a + f.qtd, 0)
      const qtdAnterior = input.funil.filter(f => f.mes === mesAnterior).reduce((a, f) => a + f.qtd, 0)

      if (qtdAnterior > 0 && qtdAtual > qtdAnterior * 1.2) {
        insights.push({
          id: 'crm-pipeline-crescendo',
          type: 'oportunidade',
          severity: 'info',
          titulo: 'Pipeline em crescimento',
          descricao: `Pipeline cresceu de ${qtdAnterior} para ${qtdAtual} deals (+${((qtdAtual / qtdAnterior - 1) * 100).toFixed(0)}%).`,
          metrica: { atual: qtdAtual, anterior: qtdAnterior, variacao: qtdAtual - qtdAnterior },
          recomendacao: `Pipeline cresceu ${((qtdAtual / qtdAnterior - 1) * 100).toFixed(0)}%, bom momento para acelerar conversoes`,
          prioridade: 5,
        })
      }
    }
  }

  return insights
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/insights/__tests__/crm-insights.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/insights/crm-insights.ts src/lib/insights/__tests__/crm-insights.test.ts
git commit -m "feat: add CRM insight rules with 6 unit tests"
```

---

## Task 7: Shopify Insight Rules + Tests

**Files:**
- Create: `src/lib/insights/shopify-insights.ts`
- Create: `src/lib/insights/__tests__/shopify-insights.test.ts`

- [ ] **Step 1: Write Shopify insight rules test**

Create `src/lib/insights/__tests__/shopify-insights.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateShopifyInsights } from '../shopify-insights'
import type { ShopifyVendasMensal, ShopifyRecorrencia, ShopifyProdutoRank, ShopifyCohort } from '../../../types/shopify-views'

const EMPTY = { vendasMensal: [], recorrencia: [], produtosRank: [], cohort: [] }

describe('generateShopifyInsights', () => {
  it('returns empty array when all data is empty', () => {
    expect(generateShopifyInsights(EMPTY)).toEqual([])
  })

  it('generates alert when ticket medio drops > 15%', () => {
    const vendasMensal: ShopifyVendasMensal[] = [
      { mes: '2026-01-01', pedidos: 100, receita: 50000, ticket_medio: 500, descontos_total: 0 },
      { mes: '2026-02-01', pedidos: 100, receita: 40000, ticket_medio: 400, descontos_total: 0 },
    ]

    const result = generateShopifyInsights({ ...EMPTY, vendasMensal })
    const alert = result.find(i => i.id === 'shopify-ticket-queda')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
  })

  it('generates critical alert when recompra < 10%', () => {
    const recorrencia: ShopifyRecorrencia[] = [
      { mes: '2026-02-01', clientes_novos: 95, clientes_recorrentes: 5, taxa_recompra: 5 },
    ]

    const result = generateShopifyInsights({ ...EMPTY, recorrencia })
    const alert = result.find(i => i.id === 'shopify-recompra-baixa')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('critico')
  })

  it('generates opportunity for record revenue month (needs 3+ months)', () => {
    const vendasMensal: ShopifyVendasMensal[] = [
      { mes: '2025-12-01', pedidos: 70, receita: 30000, ticket_medio: 430, descontos_total: 0 },
      { mes: '2026-01-01', pedidos: 80, receita: 40000, ticket_medio: 500, descontos_total: 0 },
      { mes: '2026-02-01', pedidos: 100, receita: 60000, ticket_medio: 600, descontos_total: 0 },
    ]

    const result = generateShopifyInsights({ ...EMPTY, vendasMensal })
    const opp = result.find(i => i.id === 'shopify-receita-recorde')
    expect(opp).toBeDefined()
    expect(opp!.type).toBe('oportunidade')
  })

  it('generates critical alert when orders drop > 20%', () => {
    const vendasMensal: ShopifyVendasMensal[] = [
      { mes: '2026-01-01', pedidos: 100, receita: 50000, ticket_medio: 500, descontos_total: 0 },
      { mes: '2026-02-01', pedidos: 70, receita: 35000, ticket_medio: 500, descontos_total: 0 },
    ]

    const result = generateShopifyInsights({ ...EMPTY, vendasMensal })
    const alert = result.find(i => i.id === 'shopify-pedidos-queda')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('critico')
  })

  it('generates alert when top products are very close in ranking', () => {
    const produtosRank: ShopifyProdutoRank[] = [
      { produto: 'Camiseta A', sku: 'CA01', qtd_vendida: 100, receita_total: 10000, preco_medio: 100, pedidos_distintos: 90 },
      { produto: 'Camiseta B', sku: 'CB01', qtd_vendida: 98, receita_total: 9800, preco_medio: 100, pedidos_distintos: 88 },
      { produto: 'Camiseta C', sku: 'CC01', qtd_vendida: 50, receita_total: 5000, preco_medio: 100, pedidos_distintos: 45 },
    ]

    const result = generateShopifyInsights({ ...EMPTY, produtosRank })
    const alert = result.find(i => i.id === 'shopify-produto-ranking-apertado')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
  })

  it('generates opportunity for high-retention cohort', () => {
    const cohort: ShopifyCohort[] = [
      { cohort_mes: '2025-10-01', mes_compra: '2025-10-01', clientes: 100, receita: 50000 },
      { cohort_mes: '2025-10-01', mes_compra: '2025-11-01', clientes: 40, receita: 20000 },
      { cohort_mes: '2025-10-01', mes_compra: '2025-12-01', clientes: 30, receita: 15000 },
    ]

    const result = generateShopifyInsights({ ...EMPTY, cohort })
    const opp = result.find(i => i.id.startsWith('shopify-cohort-alta-retencao'))
    expect(opp).toBeDefined()
    expect(opp!.type).toBe('oportunidade')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/insights/__tests__/shopify-insights.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Shopify insight rules**

Create `src/lib/insights/shopify-insights.ts`:

```typescript
// src/lib/insights/shopify-insights.ts
import type { Insight } from './types'
import type {
  ShopifyVendasMensal, ShopifyRecorrencia,
  ShopifyProdutoRank, ShopifyCohort,
} from '../../types/shopify-views'

interface ShopifyInsightInput {
  vendasMensal: ShopifyVendasMensal[]
  recorrencia: ShopifyRecorrencia[]
  produtosRank: ShopifyProdutoRank[]
  cohort: ShopifyCohort[]
}

export function generateShopifyInsights(input: ShopifyInsightInput): Insight[] {
  const insights: Insight[] = []
  const sorted = [...input.vendasMensal].sort((a, b) => a.mes.localeCompare(b.mes))

  if (sorted.length >= 2) {
    const atual = sorted[sorted.length - 1]
    const anterior = sorted[sorted.length - 2]

    // Rule 1: Ticket medio drop > 15%
    if (anterior.ticket_medio > 0 && atual.ticket_medio < anterior.ticket_medio * 0.85) {
      insights.push({
        id: 'shopify-ticket-queda',
        type: 'alerta',
        severity: 'atencao',
        titulo: 'Ticket medio em queda',
        descricao: `Ticket medio caiu de R$ ${anterior.ticket_medio.toFixed(0)} para R$ ${atual.ticket_medio.toFixed(0)}.`,
        metrica: { atual: atual.ticket_medio, anterior: anterior.ticket_medio, variacao: atual.ticket_medio - anterior.ticket_medio },
        recomendacao: 'Ticket medio caiu, revisar mix de produtos e estrategia de pricing',
        prioridade: 7,
      })
    }

    // Rule 2: Orders drop > 20%
    if (anterior.pedidos > 0 && atual.pedidos < anterior.pedidos * 0.8) {
      insights.push({
        id: 'shopify-pedidos-queda',
        type: 'alerta',
        severity: 'critico',
        titulo: 'Queda de pedidos',
        descricao: `Pedidos cairam de ${anterior.pedidos} para ${atual.pedidos} (-${((1 - atual.pedidos / anterior.pedidos) * 100).toFixed(0)}%).`,
        metrica: { atual: atual.pedidos, anterior: anterior.pedidos, variacao: atual.pedidos - anterior.pedidos },
        recomendacao: `Pedidos cairam ${((1 - atual.pedidos / anterior.pedidos) * 100).toFixed(0)}%, investigar causa`,
        prioridade: 9,
      })
    }

    // Rule 3: Record revenue
    const maxReceita = Math.max(...sorted.slice(0, -1).map(v => v.receita))
    if (atual.receita > maxReceita && sorted.length >= 3) {
      insights.push({
        id: 'shopify-receita-recorde',
        type: 'oportunidade',
        severity: 'info',
        titulo: 'Receita recorde!',
        descricao: `Receita de R$ ${atual.receita.toFixed(0)} superou o recorde anterior de R$ ${maxReceita.toFixed(0)}.`,
        metrica: { atual: atual.receita, anterior: maxReceita },
        recomendacao: 'Receita recorde! Analisar o que mudou para replicar',
        prioridade: 4,
      })
    }
  }

  // Rule 4: Low repurchase rate (< 10%)
  if (input.recorrencia.length > 0) {
    const sortedRec = [...input.recorrencia].sort((a, b) => b.mes.localeCompare(a.mes))
    const ultimoMes = sortedRec[0]
    if (ultimoMes.taxa_recompra < 10) {
      insights.push({
        id: 'shopify-recompra-baixa',
        type: 'alerta',
        severity: 'critico',
        titulo: `Recompra em ${ultimoMes.taxa_recompra}%`,
        descricao: `Taxa de recompra esta em ${ultimoMes.taxa_recompra}%, abaixo do minimo de 10%.`,
        metrica: { atual: ultimoMes.taxa_recompra },
        recomendacao: 'Taxa de recompra baixa, implementar estrategia de pos-venda e fidelizacao',
        prioridade: 8,
      })
    }
  }

  // Rule 5: Top product losing ranking (needs at least 2 months of data to compare)
  // Note: Since the view is a snapshot, we compare by checking if top-3 products
  // have significantly lower receita_total than expected. This is a simplified check.
  // A full implementation would need historical snapshots.
  if (input.produtosRank.length >= 3) {
    const top = input.produtosRank[0]
    const second = input.produtosRank[1]
    // If #1 and #2 are very close (< 5% difference), flag it
    if (top.receita_total > 0 && second.receita_total / top.receita_total > 0.95) {
      insights.push({
        id: 'shopify-produto-ranking-apertado',
        type: 'alerta',
        severity: 'atencao',
        titulo: `${top.produto} quase perdendo #1`,
        descricao: `"${top.produto}" (R$ ${top.receita_total.toFixed(0)}) e "${second.produto}" (R$ ${second.receita_total.toFixed(0)}) estao muito proximos no ranking.`,
        metrica: { atual: top.receita_total, anterior: second.receita_total },
        recomendacao: `Produto "${top.produto}" esta quase perdendo posicao #1, avaliar estrategia`,
        prioridade: 5,
      })
    }
  }

  // Rule 6: Cohort with high retention (> 25%)
  if (input.cohort.length > 0) {
    const cohorts = [...new Set(input.cohort.map(c => c.cohort_mes))].sort()
    for (const cohortMes of cohorts) {
      const cohortRows = input.cohort.filter(c => c.cohort_mes === cohortMes).sort((a, b) => a.mes_compra.localeCompare(b.mes_compra))
      if (cohortRows.length >= 2) {
        const firstMonth = cohortRows[0]
        const lastMonth = cohortRows[cohortRows.length - 1]
        const retention = firstMonth.clientes > 0 ? (lastMonth.clientes / firstMonth.clientes) * 100 : 0
        if (retention > 25 && cohortRows.length >= 3) {
          insights.push({
            id: `shopify-cohort-alta-retencao-${cohortMes}`,
            type: 'oportunidade',
            severity: 'info',
            titulo: `Cohort ${cohortMes.slice(0, 7)} com ${retention.toFixed(0)}% retencao`,
            descricao: `Cohort de ${cohortMes.slice(0, 7)} mantem ${retention.toFixed(0)}% dos clientes apos ${cohortRows.length - 1} meses.`,
            metrica: { atual: retention },
            recomendacao: `Cohort de ${cohortMes.slice(0, 7)} tem ${retention.toFixed(0)}% retencao, analisar o que diferencia estes clientes`,
            prioridade: 4,
          })
          break // Only report the most notable cohort
        }
      }
    }
  }

  return insights
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/insights/__tests__/shopify-insights.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/insights/shopify-insights.ts src/lib/insights/__tests__/shopify-insights.test.ts
git commit -m "feat: add Shopify insight rules with 5 unit tests"
```

---

## Task 8: CRMPage Redesign

**Files:**
- Modify: `src/pages/CRMPage.tsx`

This is a full rewrite of CRMPage. The page currently uses seed data (`CRM_SEED`) and has 8 inline section components. We replace it with real data from the 6 CRM view hooks + insight engine.

**Key conventions to follow (from existing codebase):**
- Use `useDocumentTitle('CRM')` at top
- Sub-sections as internal functions, not separate files
- Use Recharts for charts (dark theme: `#1f2937` bg, `#374151` borders, `#9ca3af` text)
- Use `ResponsiveContainer` wrapping all charts
- Use `formatCurrency`, `formatNumber`, `formatPercent` from `src/lib/formatters.ts`
- Loading state: `<Spinner />` component
- Empty state: card with icon + message + CTA

- [ ] **Step 1: Rewrite CRMPage.tsx**

Replace the entire file with a new implementation. The page should:

1. Import and call all 6 CRM hooks: `useCrmFunil()`, `useCrmEvolucao()`, `useCrmPerdas()`, `useCrmResponsaveis()`, `useCrmOrigens()`, `useCrmDealsParados()`
2. Import and call `generateCrmInsights()` with the data, wrapped in `useMemo`
3. Import and call `processInsights()` to sort
4. Show loading spinner while any query is loading
5. Show empty state when no data available

Internal sections to implement:

| Section | Chart type | Data hook |
|---------|-----------|-----------|
| `SecaoInsights` | Colored severity cards | `processInsights(generateCrmInsights(...))` |
| `SecaoFunil` | Horizontal bar chart (Recharts `BarChart` horizontal) | `useCrmFunil()` — filter to latest month |
| `SecaoEvolucao` | Line chart (Recharts `LineChart`) | `useCrmEvolucao()` |
| `SecaoPerdas` | Donut chart (Recharts `PieChart`) + table | `useCrmPerdas()` |
| `SecaoResponsaveis` | Table with bar indicators | `useCrmResponsaveis()` |
| `SecaoOrigens` | Horizontal bar chart | `useCrmOrigens()` |
| `SecaoDealsParados` | Urgency list (table with colored badges) | `useCrmDealsParados()` |

**Insight card colors:**
- `critico`: `bg-red-500/10 border-red-500/30 text-red-400`
- `atencao`: `bg-yellow-500/10 border-yellow-500/30 text-yellow-400`
- `info`: `bg-blue-500/10 border-blue-500/30 text-blue-400`
- `oportunidade`: `bg-emerald-500/10 border-emerald-500/30 text-emerald-400`

**Empty state pattern:**
```tsx
function EstadoVazio({ mensagem, cta }: { mensagem: string; cta?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <svg className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="text-sm">{mensagem}</p>
      {cta && <p className="text-xs mt-2 text-gray-500">{cta}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run typecheck
```

- [ ] **Step 3: Visual verification**

```bash
npm run dev
```

Open browser, navigate to CRM page. Verify:
- Insight cards appear at top (if data exists)
- Charts render with real data
- Empty states show when no data
- No console errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/CRMPage.tsx
git commit -m "feat: redesign CRMPage with real data from materialized views and insight engine"
```

---

## Task 9: FunilPage Redesign

**Files:**
- Modify: `src/pages/FunilPage.tsx`

Same approach as CRMPage but for Shopify data. Currently uses direct Supabase queries with useState/useEffect and estimated session data.

- [ ] **Step 1: Rewrite FunilPage.tsx**

Replace the entire file. The page should:

1. Import and call all 4 Shopify hooks: `useShopifyVendasMensal()`, `useShopifyRecorrencia()`, `useShopifyProdutosRank()`, `useShopifyCohort()`
2. Import and call `generateShopifyInsights()` with data, wrapped in `useMemo`
3. Import and call `processInsights()` to sort

Internal sections to implement:

| Section | Chart type | Data hook |
|---------|-----------|-----------|
| `SecaoInsights` | Same colored cards as CRM | `processInsights(generateShopifyInsights(...))` |
| `SecaoVendas` | Area chart (Recharts `AreaChart`) receita + line ticket medio | `useShopifyVendasMensal()` |
| `SecaoRecorrencia` | Stacked bar chart (Recharts `BarChart`) novos vs recorrentes | `useShopifyRecorrencia()` |
| `SecaoProdutos` | Table top 10 with horizontal bar indicators | `useShopifyProdutosRank()` |
| `SecaoCohort` | Heatmap table (pure HTML/CSS with color intensity) | `useShopifyCohort()` |

**Cohort heatmap pattern:**
- Rows = cohort month (first purchase month)
- Columns = subsequent months
- Cell color intensity = % of original cohort still buying
- Use `bg-emerald-500` with varying opacity: `style={{ opacity: retentionRate }}`

- [ ] **Step 2: Verify build**

```bash
npm run typecheck
```

- [ ] **Step 3: Visual verification**

```bash
npm run dev
```

Open browser, navigate to Funil page. Verify:
- Insight cards at top
- Area chart with monthly sales
- Stacked bar for recurrence
- Products ranking table
- Cohort heatmap
- No console errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/FunilPage.tsx
git commit -m "feat: redesign FunilPage with real Shopify data and insight engine"
```

---

## Task 10: Final Integration Test

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass, including new insight tests.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: 0 errors (warnings acceptable).

- [ ] **Step 4: Run dev server and verify all pages**

```bash
npm run dev
```

Check in browser:
1. CRM page loads with real data
2. Funil page loads with real data
3. Financial page still works (refresh function was updated)
4. No console errors on any page

- [ ] **Step 5: Final commit if any fixes needed**

Stage only the specific files that needed fixes, then commit:

```bash
git add <specific-files> && git commit -m "fix: address lint/typecheck issues from CRM/Funnel redesign"
```

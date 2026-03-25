# CRM & Funnel Improvement — Design Spec

**Data:** 2026-03-25
**Status:** Aprovado
**Escopo:** Redesign das páginas CRM (RD Station) e Funil (Shopify) com dados reais, insights automáticos e dashboards avançados

---

## Problema

Ambas as páginas (CRMPage e FunilPage) usam dados hardcoded/seed. Não há análise automática, alertas ou recomendações de ação. Os dashboards são estáticos e não refletem a operação real.

## Decisões de Design

| Decisão | Escolha | Alternativas descartadas |
|---------|---------|--------------------------|
| Fonte CRM | RD Station (tabelas `rdstation_*` existentes) | Bling contatos |
| Fonte Shopify | Dados reais de `shopify_pedidos` existentes | Estimativas de sessões |
| Nível de insights | Avançado: KPIs + alertas + recomendações priorizadas | Apenas KPIs / KPIs + alertas simples |
| Arquitetura | Views SQL + Frontend insight engine (TS) | Edge Function com lógica / Frontend puro |

---

## Section 1: Materialized Views

### CRM (RD Station) — 6 views

#### 1. `mv_crm_funil_periodo`
Quantidade, valor, perdas e vendas por etapa do funil, agrupado por mês.

```sql
CREATE MATERIALIZED VIEW mv_crm_funil_periodo AS
SELECT
  date_trunc('month', d.created_at)::date AS mes,
  d.deal_stage AS etapa,
  COUNT(*) AS qtd,
  SUM(d.amount) AS valor_total,
  COUNT(*) FILTER (WHERE d.deal_status = 'won') AS vendas,
  COUNT(*) FILTER (WHERE d.deal_status = 'lost') AS perdas,
  SUM(d.amount) FILTER (WHERE d.deal_status = 'won') AS valor_vendas
FROM rdstation_deals d
GROUP BY 1, 2
ORDER BY 1 DESC, 2;
```

#### 2. `mv_crm_evolucao_mensal`
Deals criados, vendidos e perdidos com valores por mês.

```sql
CREATE MATERIALIZED VIEW mv_crm_evolucao_mensal AS
SELECT
  date_trunc('month', d.created_at)::date AS mes,
  COUNT(*) AS criados,
  COUNT(*) FILTER (WHERE d.deal_status = 'won') AS vendidos,
  COUNT(*) FILTER (WHERE d.deal_status = 'lost') AS perdidos,
  SUM(d.amount) AS valor_criado,
  SUM(d.amount) FILTER (WHERE d.deal_status = 'won') AS valor_vendido,
  SUM(d.amount) FILTER (WHERE d.deal_status = 'lost') AS valor_perdido
FROM rdstation_deals d
GROUP BY 1
ORDER BY 1 DESC;
```

#### 3. `mv_crm_perdas`
Motivos de perda agrupados com contagem e valor.

```sql
CREATE MATERIALIZED VIEW mv_crm_perdas AS
SELECT
  COALESCE(d.loss_reason, 'Sem motivo') AS motivo,
  COUNT(*) AS qtd,
  SUM(d.amount) AS valor_total,
  ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER(), 0), 1) AS percentual
FROM rdstation_deals d
WHERE d.deal_status = 'lost'
GROUP BY 1
ORDER BY qtd DESC;
```

#### 4. `mv_crm_responsaveis`
Metricas por vendedor: conversao, ticket medio, volume.

```sql
CREATE MATERIALIZED VIEW mv_crm_responsaveis AS
SELECT
  COALESCE(d.user_name, 'Sem responsavel') AS responsavel,
  COUNT(*) AS total_deals,
  COUNT(*) FILTER (WHERE d.deal_status = 'won') AS vendas,
  COUNT(*) FILTER (WHERE d.deal_status = 'lost') AS perdas,
  ROUND(100.0 * COUNT(*) FILTER (WHERE d.deal_status = 'won') / NULLIF(COUNT(*), 0), 1) AS taxa_conversao,
  COALESCE(AVG(d.amount) FILTER (WHERE d.deal_status = 'won'), 0) AS ticket_medio,
  COALESCE(SUM(d.amount) FILTER (WHERE d.deal_status = 'won'), 0) AS valor_total_vendas
FROM rdstation_deals d
GROUP BY 1
ORDER BY valor_total_vendas DESC;
```

#### 5. `mv_crm_origens`
Leads por fonte com taxa de conversao.

```sql
CREATE MATERIALIZED VIEW mv_crm_origens AS
SELECT
  COALESCE(d.deal_source, 'Direto') AS origem,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE d.deal_status = 'won') AS convertidos,
  ROUND(100.0 * COUNT(*) FILTER (WHERE d.deal_status = 'won') / NULLIF(COUNT(*), 0), 1) AS taxa_conversao,
  COALESCE(SUM(d.amount) FILTER (WHERE d.deal_status = 'won'), 0) AS valor_convertido
FROM rdstation_deals d
GROUP BY 1
ORDER BY total DESC;
```

#### 6. `mv_crm_deals_parados`
Deals abertos ha mais de X dias por etapa.

```sql
CREATE MATERIALIZED VIEW mv_crm_deals_parados AS
SELECT
  d.id,
  d.name AS deal_nome,
  d.deal_stage AS etapa,
  d.amount AS valor,
  d.user_name AS responsavel,
  d.created_at,
  d.updated_at,
  EXTRACT(DAY FROM now() - COALESCE(d.updated_at, d.created_at))::int AS dias_parado
FROM rdstation_deals d
WHERE d.deal_status NOT IN ('won', 'lost')
ORDER BY dias_parado DESC;
```

### Shopify Funnel — 4 views

#### 7. `mv_shopify_vendas_mensal`
Pedidos, receita e ticket medio por mes.

```sql
CREATE MATERIALIZED VIEW mv_shopify_vendas_mensal AS
SELECT
  date_trunc('month', p.created_at)::date AS mes,
  COUNT(*) AS pedidos,
  SUM(p.total_price) AS receita,
  AVG(p.total_price) AS ticket_medio,
  SUM(p.total_discounts) AS descontos_total
FROM shopify_pedidos p
WHERE p.financial_status IN ('paid', 'partially_refunded')
GROUP BY 1
ORDER BY 1 DESC;
```

#### 8. `mv_shopify_recorrencia`
Clientes novos vs recorrentes e taxa de recompra.

```sql
CREATE MATERIALIZED VIEW mv_shopify_recorrencia AS
WITH cliente_compras AS (
  SELECT
    customer_email,
    COUNT(*) AS total_compras,
    MIN(created_at) AS primeira_compra
  FROM shopify_pedidos
  WHERE financial_status IN ('paid', 'partially_refunded')
    AND customer_email IS NOT NULL
  GROUP BY customer_email
)
SELECT
  date_trunc('month', p.created_at)::date AS mes,
  COUNT(*) FILTER (WHERE cc.total_compras = 1) AS clientes_novos,
  COUNT(*) FILTER (WHERE cc.total_compras > 1) AS clientes_recorrentes,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cc.total_compras > 1) / NULLIF(COUNT(*), 0), 1) AS taxa_recompra
FROM shopify_pedidos p
JOIN cliente_compras cc ON p.customer_email = cc.customer_email
WHERE p.financial_status IN ('paid', 'partially_refunded')
GROUP BY 1
ORDER BY 1 DESC;
```

#### 9. `mv_shopify_produtos_rank`
Top produtos por receita e quantidade vendida.

```sql
CREATE MATERIALIZED VIEW mv_shopify_produtos_rank AS
SELECT
  li.title AS produto,
  li.sku,
  SUM(li.quantity) AS qtd_vendida,
  SUM(li.quantity * li.price) AS receita_total,
  AVG(li.price) AS preco_medio,
  COUNT(DISTINCT p.id) AS pedidos_distintos
FROM shopify_line_items li
JOIN shopify_pedidos p ON li.order_id = p.id
WHERE p.financial_status IN ('paid', 'partially_refunded')
GROUP BY 1, 2
ORDER BY receita_total DESC;
```

#### 10. `mv_shopify_cohort`
Cohort mensal: primeira compra vs recompras.

```sql
CREATE MATERIALIZED VIEW mv_shopify_cohort AS
WITH primeira AS (
  SELECT
    customer_email,
    date_trunc('month', MIN(created_at))::date AS cohort_mes
  FROM shopify_pedidos
  WHERE financial_status IN ('paid', 'partially_refunded')
    AND customer_email IS NOT NULL
  GROUP BY customer_email
)
SELECT
  pr.cohort_mes,
  date_trunc('month', p.created_at)::date AS mes_compra,
  COUNT(DISTINCT p.customer_email) AS clientes,
  SUM(p.total_price) AS receita
FROM shopify_pedidos p
JOIN primeira pr ON p.customer_email = pr.customer_email
WHERE p.financial_status IN ('paid', 'partially_refunded')
GROUP BY 1, 2
ORDER BY 1, 2;
```

### Unique Indexes (para REFRESH CONCURRENTLY)

Cada view precisa de um unique index:

```sql
CREATE UNIQUE INDEX ON mv_crm_funil_periodo (mes, etapa);
CREATE UNIQUE INDEX ON mv_crm_evolucao_mensal (mes);
CREATE UNIQUE INDEX ON mv_crm_perdas (motivo);
CREATE UNIQUE INDEX ON mv_crm_responsaveis (responsavel);
CREATE UNIQUE INDEX ON mv_crm_origens (origem);
CREATE UNIQUE INDEX ON mv_crm_deals_parados (id);
CREATE UNIQUE INDEX ON mv_shopify_vendas_mensal (mes);
CREATE UNIQUE INDEX ON mv_shopify_recorrencia (mes);
CREATE UNIQUE INDEX ON mv_shopify_produtos_rank (produto, sku);
CREATE UNIQUE INDEX ON mv_shopify_cohort (cohort_mes, mes_compra);
```

---

## Section 2: Frontend — Insight Engine + Componentes

### Insight Engine

Modulo TypeScript puro em `src/lib/insights/` que recebe dados das views e gera alertas, KPIs derivados e recomendacoes priorizadas. Regras deterministicas, sem IA.

```
src/lib/insights/
├── types.ts            # InsightType, Severity, Recommendation
├── crm-insights.ts     # Regras CRM
├── shopify-insights.ts # Regras Shopify
└── engine.ts           # processInsights() — combina, prioriza, deduplica
```

#### Tipo Insight

```typescript
type Insight = {
  id: string
  type: 'alerta' | 'oportunidade' | 'tendencia'
  severity: 'critico' | 'atencao' | 'info'
  titulo: string
  descricao: string
  metrica: { atual: number; anterior?: number; variacao?: number }
  recomendacao: string
  prioridade: number // 1-10
}
```

#### Regras CRM

| Regra | Trigger | Severity | Recomendacao |
|-------|---------|----------|--------------|
| Deals parados > 15 dias | `mv_crm_deals_parados` count > 5 | critico | "Revisar X deals parados na etapa Y" |
| Conversao caiu > 20% | `mv_crm_evolucao_mensal` mes atual vs anterior | atencao | "Conversao caiu de X% para Y%, verificar qualificacao" |
| Vendedor com 0 vendas no mes | `mv_crm_responsaveis` vendas = 0 | atencao | "Vendedor Z sem fechamento este mes" |
| Origem com ROI alto | `mv_crm_origens` conversao > 30% | oportunidade | "Canal W converte X%, considerar investir mais" |
| Pipeline crescendo | `mv_crm_funil_periodo` qtd atual > anterior + 20% | oportunidade | "Pipeline cresceu X%, bom momento para acelerar" |
| Muitas perdas sem motivo | `mv_crm_perdas` "Sem motivo" > 30% | atencao | "X% das perdas sem motivo registrado" |

#### Regras Shopify

| Regra | Trigger | Severity | Recomendacao |
|-------|---------|----------|--------------|
| Ticket medio caiu > 15% | `mv_shopify_vendas_mensal` variacao | atencao | "Ticket medio caiu, revisar mix de produtos" |
| Recompra < 10% | `mv_shopify_recorrencia` taxa < 0.1 | critico | "Taxa de recompra baixa, implementar pos-venda" |
| Produto top perdendo ranking | `mv_shopify_produtos_rank` variacao posicao | atencao | "Produto X caiu de #1 para #3" |
| Mes recorde de receita | `mv_shopify_vendas_mensal` > max historico | oportunidade | "Receita recorde! Analisar o que mudou" |
| Cohort com alta retencao | `mv_shopify_cohort` retencao > 25% | oportunidade | "Cohort de mes X tem Y% retencao" |
| Queda de pedidos > 20% | `mv_shopify_vendas_mensal` variacao | critico | "Pedidos cairam X%, investigar causa" |

### React Query Hooks

```
src/services/queries/
├── useCRMQueries.ts       # hooks para as 6 views CRM
└── useShopifyQueries.ts   # hooks para as 4 views Shopify
```

Configuracao: `staleTime: 5min`, `gcTime: 30min`. Dados mudam apenas no refresh das views.

### Componentes — CRMPage

| Componente | Dados | Visual |
|------------|-------|--------|
| `CRMInsightsBar` | engine output | Cards coloridos por severity no topo |
| `CRMFunilChart` | `mv_crm_funil_periodo` | Funil horizontal com valores por etapa |
| `CRMEvolucaoChart` | `mv_crm_evolucao_mensal` | Line chart: criados vs vendidos vs perdidos |
| `CRMPerdasChart` | `mv_crm_perdas` | Donut + tabela motivos |
| `CRMResponsaveisTable` | `mv_crm_responsaveis` | Tabela rankeada com sparklines |
| `CRMOrigensChart` | `mv_crm_origens` | Bar chart horizontal por fonte |
| `CRMDealsParados` | `mv_crm_deals_parados` | Lista urgente com dias parados |

### Componentes — FunilPage

| Componente | Dados | Visual |
|------------|-------|--------|
| `ShopifyInsightsBar` | engine output | Cards coloridos no topo |
| `ShopifyVendasChart` | `mv_shopify_vendas_mensal` | Area chart receita + line ticket medio |
| `ShopifyRecorrenciaChart` | `mv_shopify_recorrencia` | Stacked bar novos vs recorrentes |
| `ShopifyProdutosRank` | `mv_shopify_produtos_rank` | Tabela top 10 com barras horizontais |
| `ShopifyCohortTable` | `mv_shopify_cohort` | Heatmap cohort mensal |

---

## Section 3: Refresh Strategy e Seguranca

### Refresh das Views

Refresh disparado pelo Edge Function existente (`bling-sync`). Expandimos a funcao para incluir todas as views:

```sql
CREATE OR REPLACE FUNCTION refresh_all_views()
RETURNS void AS $$
BEGIN
  -- Financial (existentes)
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fluxo_caixa_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dre_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_contas_vencer;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_comparativo_mensal;

  -- CRM (novas)
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_funil_periodo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_evolucao_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_perdas;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_responsaveis;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_origens;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_deals_parados;

  -- Shopify (novas)
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_shopify_vendas_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_shopify_recorrencia;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_shopify_produtos_rank;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_shopify_cohort;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Frequencia:** Vercel Cron existente (6h). Mesmo schedule para CRM/Shopify.

**Manual:** Botao "Atualizar dados" no header de cada pagina chama a Edge Function.

### Seguranca

- Materialized views sao read-only
- Acesso via `GRANT SELECT` para role `authenticated`
- Tabelas-fonte manteem suas politicas RLS existentes
- Frontend usa Supabase client com chave `anon`

### Fallback para Dados Vazios

Quando uma view retorna 0 rows:
- Estado vazio com icone + mensagem explicativa
- Call-to-action contextual (ex: "Configure a integracao com RD Station")
- Insight engine retorna insight tipo `info`: "Sem dados suficientes para gerar analises"

---

## Resumo de Entregaveis

| Camada | Itens | Quantidade |
|--------|-------|------------|
| SQL | Materialized Views | 10 |
| SQL | Unique Indexes | 10 |
| SQL | Funcao refresh_all_views | 1 |
| TypeScript | Insight Engine (lib) | 4 arquivos |
| TypeScript | React Query Hooks | 2 arquivos |
| React | Componentes CRM | 7 |
| React | Componentes Shopify | 5 |
| React | Paginas redesenhadas | 2 (CRMPage, FunilPage) |

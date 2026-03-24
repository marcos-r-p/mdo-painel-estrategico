# Analise de Debitos Tecnicos — Backend de Dados

**Projeto:** mdo-painel-estrategico
**Data:** 2026-03-24
**Autor:** Dara (Data Engineer Agent)
**Banco:** PostgreSQL 17.6 (Supabase, sa-east-1)
**Projeto Supabase:** giecmntojoirganbgcrk

---

## Resumo Executivo

| Metrica | Valor |
|---------|-------|
| Tabelas | 26 |
| Views | 13 |
| Functions | 12 |
| Triggers | 1 |
| Volume total | ~40 MB |
| Maior tabela | `shopify_clientes` (49.515 rows, 7.5 MB) |
| Debitos criticos | 2 (seguranca) |
| Debitos altos | 3 (indexes, types, RLS) |
| Debitos medios | 4 (schema, views, queries, functions) |
| Debitos baixos | 4 (unificacao, FKs, cleanup, retention) |

### Distribuicao de Volume

| Tabela | Rows | Tamanho |
|--------|------|---------|
| shopify_clientes | 49.515 | 7.5 MB |
| clientes | 36.940 | 6.7 MB |
| shopify_pedidos | 35.995 | 17 MB |
| produtos | 8.254 | 3.2 MB |
| shopify_produtos | 5.388 | 4.1 MB |
| rdstation_deals | 884 | 528 KB |
| rdstation_contacts | 796 | 376 KB |
| shopify_sync_log | 269 | 72 KB |
| pedidos | 250 | 200 KB |
| Demais (17 tabelas) | < 200 | < 100 KB cada |

---

## 1. SEGURANCA (RLS)

**Severidade: CRITICA**

### 1.1 Tokens de API expostos publicamente

As tabelas `bling_tokens` e `shopify_tokens` possuem policies `allow_all` para o role `public`. Qualquer requisicao anonima ao endpoint REST do Supabase pode **ler e sobrescrever** os tokens de acesso das APIs.

```
bling_tokens  → allow_all_bling_tokens  → ALL → public → true
shopify_tokens → shopify_tokens_all     → ALL → public → true
```

**Dados expostos:**
- `bling_tokens.access_token` — Token OAuth do Bling ERP
- `bling_tokens.refresh_token` — Refresh token do Bling ERP
- `shopify_tokens.access_token` — Token de acesso da Shopify Admin API

**Impacto:** Um atacante pode:
1. Ler os tokens e acessar as APIs externas diretamente
2. Sobrescrever tokens com valores invalidos, quebrando a sincronizacao
3. Escalar para acesso total ao ERP e e-commerce

**Correcao imediata:**
```sql
-- Revogar acesso publico
DROP POLICY IF EXISTS allow_all_bling_tokens ON bling_tokens;
DROP POLICY IF EXISTS shopify_tokens_all ON shopify_tokens;

-- Apenas service_role (Edge Functions) pode acessar
CREATE POLICY "service_role_only" ON bling_tokens
  FOR ALL TO public
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "service_role_only" ON shopify_tokens
  FOR ALL TO public
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
```

### 1.2 Dados sensiveis com acesso publico irrestrito

**16 de 26 tabelas** permitem leitura e escrita para qualquer pessoa (incluindo anonimos):

| Tabela | Rows | Policy | Dados sensiveis |
|--------|------|--------|----------------|
| `clientes` | 36.940 | `allow_all_clientes` | Nome, email, celular, cidade, UF |
| `shopify_clientes` | 49.515 | `shopify_clientes_all` | Email, telefone, endereco, historico de compras |
| `shopify_pedidos` | 35.995 | `shopify_pedidos_all` | Dados financeiros, PII de clientes |
| `pedidos` | 250 | `pedidos_select/insert/update/delete` | Valores, custos, lucros |
| `produtos` | 8.254 | `allow_all_produtos` | Custos, markups, precos |
| `custos` | 0 | `allow_all_custos` | Estrutura de custos do negocio |
| `fornecedores` | 0 | `allow_all_fornecedores` | CNPJ, contatos de fornecedores |
| `vendas_periodo` | 3 | `allow_all_vendas_periodo` | Receita, resultado operacional |
| `vendas_estado` | 14 | `allow_all_vendas_estado` | Distribuicao geografica de vendas |
| `vendas_canal` | 3 | `allow_all_vendas_canal` | Performance por canal |
| `shopify_produtos` | 5.388 | `shopify_produtos_all` | Catalogo completo |
| `shopify_analytics` | 0 | `shopify_analytics_all` | Metricas de conversao |
| `shopify_checkouts_abandonados` | 0 | `shopify_checkouts_all` | Emails de clientes |
| `shopify_sync_log` | 269 | `shopify_sync_log_all` | Logs operacionais |
| `bling_sync_log` | 5 | `allow_all_bling_sync_log` | Logs operacionais |
| `importacoes` | 0 | `allow_all_importacoes` | Metadados de importacao |

**Modelo recomendado:**
```sql
-- Leitura: apenas usuarios autenticados
-- Escrita: apenas service_role (Edge Functions de sync)
-- Exemplo para clientes:
DROP POLICY IF EXISTS allow_all_clientes ON clientes;

CREATE POLICY "authenticated_read" ON clientes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_write" ON clientes
  FOR ALL TO public
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
```

### 1.3 Tabelas com RLS correto (referencia)

| Tabela | Modelo | Avaliacao |
|--------|--------|-----------|
| `access_logs` | INSERT own, SELECT admin | Correto |
| `roles` | SELECT authenticated, WRITE admin | Correto |
| `role_permissions` | SELECT authenticated, WRITE admin | Correto |
| `user_profiles` | SELECT authenticated, UPDATE own+service_role | Correto |
| `rdstation_*` (4) | SELECT public, WRITE service_role | Adequado |

---

## 2. INDEXES AUSENTES

**Severidade: ALTA**

### 2.1 Analise de queries vs indexes

As tabelas de maior volume nao possuem indexes para os padroes de busca mais frequentes:

#### `clientes` (36.940 rows, 6.7 MB)

| Query/View | Filtro | Index existente |
|------------|--------|----------------|
| `vw_resumo_mensal` | `fonte IN ('bling_api_pedidos','bling')` + `ultima_compra IS NOT NULL` | Nenhum |
| `vw_clientes_mes` | Mesmo + `nome <> 'Consumidor Final'` | Nenhum |
| `vw_uf_mensal` | Mesmo + `uf IS NOT NULL` | Nenhum |
| `fn_resumo_mensal_por_fonte` | `fonte` + `ultima_compra` + GROUP BY | Nenhum |
| `fn_clientes_mes_por_fonte` | `fonte` + `to_char(ultima_compra)` | Nenhum |
| `v_clientes_rfm` | `total_gasto > 0` | Nenhum |

#### `shopify_pedidos` (35.995 rows, 17 MB — maior tabela por tamanho)

| Query/View | Filtro | Index existente |
|------------|--------|----------------|
| `v_shopify_resumo_mensal` | `status_financeiro NOT IN ('voided','refunded')` + GROUP BY `data` | Nenhum |
| `v_shopify_por_estado` | Mesmo + GROUP BY `uf` | Nenhum |
| `fn_resumo_mensal_por_fonte('shopify')` | `status_financeiro` + `to_char(data)` | Nenhum |
| `fn_clientes_mes_por_fonte('shopify')` | Mesmo + `cliente_nome` | Nenhum |
| `shopify_dashboard_periodo()` | `data BETWEEN` + `status_financeiro` | Nenhum |
| `shopify_rfm_matrix()` | `status_financeiro` + GROUP BY `cliente_email` | Nenhum |

#### `shopify_clientes` (49.515 rows, 7.5 MB — mais rows)

| Query | Filtro | Index existente |
|-------|--------|----------------|
| `fetchShopifyClientes` | Nenhum (SELECT * LIMIT 5000) | Nenhum |
| Nenhuma view referencia | — | — |

### 2.2 Indexes recomendados

```sql
-- clientes: otimiza todas as views e functions do dashboard
CREATE INDEX idx_clientes_fonte_ultima_compra
  ON clientes(fonte, ultima_compra DESC)
  WHERE ultima_compra IS NOT NULL;

-- shopify_pedidos: otimiza views, functions e dashboard
CREATE INDEX idx_shopify_pedidos_status_data
  ON shopify_pedidos(status_financeiro, data DESC);

CREATE INDEX idx_shopify_pedidos_uf
  ON shopify_pedidos(uf)
  WHERE uf IS NOT NULL AND uf <> '';

CREATE INDEX idx_shopify_pedidos_cliente_email
  ON shopify_pedidos(cliente_email)
  WHERE cliente_email IS NOT NULL;

-- shopify_clientes: otimiza lookups por email
CREATE INDEX idx_shopify_clientes_email
  ON shopify_clientes(email)
  WHERE email IS NOT NULL;
```

### 2.3 Indexes existentes (OK)

| Tabela | Index | Tipo |
|--------|-------|------|
| `access_logs` | `(user_id, created_at)` | Composite |
| `access_logs` | `(event_type, created_at)` | Composite |
| `access_logs` | `(page_key, created_at)` | Composite |
| `pedidos` | `(cliente_id)` | FK index |
| `produtos` | `(sku)` | UNIQUE |
| `rdstation_*` | `(rdstation_id)` | UNIQUE (4 tabelas) |
| `roles` | `(nome)` | UNIQUE |
| `role_permissions` | `(role_id, page_key)` | UNIQUE composite |

---

## 3. SCHEMA DESIGN

**Severidade: MEDIA**

### 3.1 Schemas paralelos sem unificacao

O banco possui duas hierarquias completas sem relacao entre si:

```
┌─────────────────────────────┐    ┌─────────────────────────────────────┐
│        BLING SCHEMA         │    │          SHOPIFY SCHEMA             │
├─────────────────────────────┤    ├─────────────────────────────────────┤
│ clientes (36.940)           │    │ shopify_clientes (49.515)           │
│   └── pedidos (250)    [FK] │    │ shopify_pedidos (35.995)   [sem FK] │
│ produtos (8.254)            │    │ shopify_produtos (5.388)            │
│ vendas_periodo (3)          │    │ shopify_analytics (0)               │
│ vendas_estado (14)          │    │ shopify_checkouts_abandonados (0)   │
│ vendas_canal (3)            │    │                                     │
│ custos (0)                  │    │                                     │
│ fornecedores (0)            │    │                                     │
├─────────────────────────────┤    ├─────────────────────────────────────┤
│ bling_tokens (singleton)    │    │ shopify_tokens (singleton)          │
│ bling_sync_log (5)          │    │ shopify_sync_log (269)              │
└─────────────────────────────┘    └─────────────────────────────────────┘

┌─────────────────────────────┐    ┌─────────────────────────────────────┐
│       RDSTATION SCHEMA      │    │         USER MANAGEMENT             │
├─────────────────────────────┤    ├─────────────────────────────────────┤
│ rdstation_deals (884)       │    │ user_profiles (1)   [FK auth.users] │
│ rdstation_contacts (796)    │    │ roles (2)                           │
│ rdstation_stages (12)       │    │ role_permissions (14) [FK roles]    │
│ rdstation_tasks (187)       │    │ access_logs (0)     [FK auth.users] │
└─────────────────────────────┘    └─────────────────────────────────────┘
```

**Problemas:**
- `shopify_pedidos` nao tem FK para `shopify_clientes` — associacao somente por `cliente_email` (texto livre)
- `pedidos.cliente_id` referencia `clientes.id` (correto), mas `shopify_pedidos` nao tem equivalente
- Nenhuma tabela unificada para analytics cross-platform
- Maintenance burden dobrado para cada feature nova

### 3.2 Views duplicadas

Existem **3 pares de views** que fazem a mesma coisa com nomes e filtros ligeiramente diferentes:

| Funcao | View 1 (prefixo `v_`) | View 2 (prefixo `shopify_`) | Diferenca |
|--------|----------------------|---------------------------|-----------|
| Resumo mensal | `v_shopify_resumo_mensal` | `shopify_resumo_mensal` | v_ filtra voided/refunded; shopify_ nao filtra |
| Top clientes | `v_shopify_top_clientes` | `shopify_top_clientes` | v_ filtra voided/refunded; shopify_ filtra email vazio |
| Vendas por UF | `v_shopify_por_estado` | `shopify_vendas_por_estado` | v_ e all-time agregado; shopify_ e por dia individual |

**Adicionalmente**, existem views Bling que usam tabelas diferentes para dados similares:

| Funcao | View Bling (tabela `clientes`) | View Bling (tabela `pedidos`) |
|--------|-------------------------------|------------------------------|
| Resumo mensal | `vw_resumo_mensal` | `v_resumo_mensal` |
| Vendas por UF | `vw_uf_mensal` | `v_vendas_estado` |

**`vw_resumo_mensal`** agrega da tabela `clientes` (por `ultima_compra`), enquanto **`v_resumo_mensal`** agrega da tabela `pedidos` (por `data`). Sao fontes de dados diferentes que podem gerar numeros diferentes.

**Recomendacao:** Consolidar em 1 view canonica por funcao, com a "source of truth" documentada.

### 3.3 `updated_at` ausente

**16 de 26 tabelas** nao possuem coluna `updated_at`:

| Categoria | Tabelas |
|-----------|---------|
| Dados de vendas | `vendas_periodo`, `vendas_estado`, `vendas_canal`, `pedidos`, `shopify_pedidos` |
| Custos/Fornecedores | `custos`, `fornecedores` |
| Logs | `bling_sync_log`, `shopify_sync_log`, `shopify_analytics`, `access_logs` |
| User management | `roles`, `role_permissions` |
| Importacoes | `importacoes`, `shopify_checkouts_abandonados` |
| RD Station | `rdstation_contacts`, `rdstation_stages`, `rdstation_tasks` |

**Tabelas que TEM `updated_at` (10):** `clientes`, `produtos`, `bling_tokens`, `shopify_tokens`, `shopify_clientes`, `shopify_produtos`, `user_profiles`

**Problema adicional:** Nenhuma tabela possui trigger para atualizar `updated_at` automaticamente. O valor depende do cliente (frontend/edge-function) setar manualmente.

**Correcao:**
```sql
-- Funcao generica de updated_at
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em cada tabela que possui a coluna
CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Repetir para: produtos, shopify_clientes, shopify_produtos,
-- bling_tokens, shopify_tokens, user_profiles
```

### 3.4 Inconsistencia de naming entre schemas

| Conceito | Bling | Shopify | Observacao |
|----------|-------|---------|------------|
| Data do pedido | `data` (date) | `data` (timestamptz) | Tipos diferentes |
| Status do pedido | `situacao` | `status_financeiro` | Nomes diferentes |
| Nome do produto | `nome` | `titulo` | Nomes diferentes |
| Identificador do produto | `sku` (text) | `id` (bigint, Shopify ID) | Semantica diferente |
| Tipo de cliente | `tipo` ('B2B'/'B2C') | Nao existe | Campo ausente |
| Celular | `celular` | `telefone` | Nomes diferentes |
| Tags | Nao existe | `tags` (text) | Campo ausente no Bling |

### 3.5 Foreign keys ausentes

| Tabela | Coluna | FK esperado | Status |
|--------|--------|-------------|--------|
| `shopify_pedidos` | `cliente_email` | `shopify_clientes.email` | **AUSENTE** |
| `rdstation_tasks` | `deal_id` | `rdstation_deals.rdstation_id` | **AUSENTE** |
| `vendas_estado` | — | `vendas_periodo` (por periodo) | **AUSENTE** |
| `vendas_canal` | — | `vendas_periodo` (por periodo) | **AUSENTE** |

---

## 4. TYPE MISMATCHES (TypeScript vs Banco)

**Severidade: MEDIA**

### 4.1 `VwResumoMensal` — campos fantasma

**Arquivo:** `src/types/database.ts:7-18`

```typescript
export interface VwResumoMensal {
  mes: string;
  receita_bruta: number;   // NAO EXISTE na view
  receita_total: number;   // NAO EXISTE na view
  pedidos: number;
  ticket_medio: number;
  clientes: number;
  b2b: number;
  custo_total: number;     // NAO EXISTE na view
  resultado: number;       // NAO EXISTE na view
}
```

**Colunas reais da view `vw_resumo_mensal`:**
```
mes, clientes, receita, pedidos, ticket_medio, b2b, b2c, com_celular, estados
```

**Campos ausentes no TypeScript:** `b2c`, `com_celular`, `estados`
**Campos fantasma no TypeScript:** `receita_bruta`, `receita_total`, `custo_total`, `resultado`

**Impacto direto:** `Header.tsx:30` calcula `resumoAtual.receita_total - resumoAtual.custo_total` que sempre retorna `0 - 0 = 0` porque esses campos nao existem.

### 4.2 `VwClientesMes` — campos divergentes

**Arquivo:** `src/types/database.ts:21-30`

```typescript
export interface VwClientesMes {
  mes: string;
  cliente_id: string;   // NAO EXISTE na view
  nome: string;
  email: string | null; // NAO EXISTE na view
  cidade: string | null; // NAO EXISTE na view
  uf: string;
  total_pedidos: number;
  total_gasto: number;
}
```

**Colunas reais:**
```
mes, nome, tipo, uf, total_gasto, total_pedidos, ticket_medio, markup, lucro, celular, loja, segmento, ultima_compra
```

**Campos fantasma:** `cliente_id`, `email`, `cidade`
**Campos ausentes:** `tipo`, `ticket_medio`, `markup`, `lucro`, `celular`, `loja`, `segmento`, `ultima_compra`

---

## 5. QUERIES NO FRONTEND

**Severidade: MEDIA**

### 5.1 Transferencia excessiva de dados

| Funcao | Tabela | SELECT | Limite | Tamanho estimado por fetch |
|--------|--------|--------|--------|---------------------------|
| `fetchShopifyPedidos` | `shopify_pedidos` | `*` (20 colunas + JSONB `itens`) | 5.000 | ~2-3 MB |
| `fetchShopifyClientes` | `shopify_clientes` | `*` (15 colunas) | 5.000 | ~500 KB |
| `fetchShopifyProdutos` | `shopify_produtos` | `*` (10 colunas + JSONB `variantes`) | 5.000 | ~1 MB |
| `fetchRDStationDeals` | `rdstation_deals` | `*` (15 colunas) | 5.000 | ~200 KB |

**Problema:** `shopify_pedidos` tem 35.995 rows mas o limit e 5.000 — 86% dos dados sao silenciosamente cortados. O usuario ve dados incompletos sem saber.

**Recomendacoes:**
1. Selecionar apenas colunas necessarias (evitar `SELECT *`)
2. Implementar paginacao real ou cursor-based
3. Usar server-side aggregation (views/functions) em vez de trazer dados brutos
4. Considerar `count: 'exact'` para informar o usuario sobre dados truncados

### 5.2 Error handling inconsistente

| Padrao | Queries | Exemplo |
|--------|---------|---------|
| Throw com mensagem | 34 (80%) | `fetchResumoMensal`, `fetchDadosMes` |
| Fire-and-forget (silencioso) | 3 (5%) | `logEvent`, `usePageTracking` |
| Graceful fallback | 3 (5%) | `fetchConnectionStatus`, `fetchAllRDStationData` |
| Implicito via hooks | 5 (10%) | Mutations do React Query |

### 5.3 Caching inconsistente

| staleTime | Hooks | Adequacao |
|-----------|-------|-----------|
| 30s | `useConnectionStatus`, `useAccessLogs` | Adequado (dados frequentes) |
| 60s | `useLogStats`, `useUsers` | Adequado |
| 5min | `useResumoMensal`, `useDadosMes`, `useShopify*`, `useRDStation*`, `useRoles`, `usePermissions` | OK para dados que mudam por sync |

---

## 6. FUNCTIONS

**Severidade: BAIXA**

### 6.1 SECURITY DEFINER sem search_path

| Function | SECURITY DEFINER | search_path definido |
|----------|-----------------|---------------------|
| `handle_new_user()` | Sim | Sim (`public`) |
| `is_admin()` | Sim | **Nao** |
| `rdstation_dashboard_periodo()` | Sim | **Nao** |
| `fn_dashboard_periodo()` | Nao | — |
| `fn_shopify_periodo()` | Nao | — |
| `shopify_dashboard_periodo()` | Nao | — |
| `shopify_rfm_*()` (3) | Nao | — |
| `fn_*_por_fonte()` (3) | Nao | — |

**Risco:** Sem `SET search_path = public` explicito, funcoes SECURITY DEFINER podem ser exploradas se um atacante conseguir criar schemas temporarios.

**Correcao:**
```sql
ALTER FUNCTION is_admin(uuid) SET search_path = public;
ALTER FUNCTION rdstation_dashboard_periodo(timestamptz, timestamptz) SET search_path = public;
```

### 6.2 Functions duplicadas/sobrepostas

| Funcao | `fn_dashboard_periodo` | `fn_shopify_periodo` | `shopify_dashboard_periodo` |
|--------|----------------------|---------------------|---------------------------|
| Fonte | Tabela `pedidos` | Nao existe (retorna JSON) | Tabela `shopify_pedidos` |
| Retorno | JSON | JSON | JSON |
| Usada por | Nenhum hook atual | — | `useCRMDashboard` (RPC call) |

`fn_shopify_periodo` e `shopify_dashboard_periodo` fazem a mesma coisa com nomes diferentes.

---

## 7. TRIGGER AUSENTE

**Severidade: MEDIA**

### 7.1 Unico trigger existente

```
on_auth_user_created → AFTER INSERT on auth.users → handle_new_user()
```

Cria `user_profiles` automaticamente no signup. Primeiro usuario recebe role `admin`, demais recebem `leitor`.

### 7.2 Triggers recomendados

| Trigger | Tabela | Funcao | Motivo |
|---------|--------|--------|--------|
| `trg_set_updated_at` | 7 tabelas com `updated_at` | `fn_set_updated_at()` | Auto-atualizar timestamp |
| `trg_sync_log_cleanup` | `*_sync_log` | `fn_cleanup_old_logs()` | Retention (30 dias) |

---

## 8. TABELAS VAZIAS

**Severidade: BAIXA**

| Tabela | Criada em | Status | Recomendacao |
|--------|-----------|--------|-------------|
| `custos` | Migration inicial | Nunca populada | Manter — sera usada quando importacao de custos for implementada |
| `fornecedores` | Migration inicial | Nunca populada | Manter — sera usada com sync Bling de fornecedores |
| `importacoes` | Migration inicial | Feature de import removida | Avaliar remocao |
| `shopify_analytics` | Migration Shopify | Sync nao implementada | Manter — planejar implementacao |
| `shopify_checkouts_abandonados` | Migration Shopify | Sync nao implementada | Manter — planejar implementacao |
| `access_logs` | 2026-03-24 | Recem criada | OK — sera populada com uso |

---

## 9. PLANO DE ACAO PRIORIZADO

### CRITICO — Fazer imediatamente

| # | Acao | Tabelas | Esforco |
|---|------|---------|---------|
| 1 | Restringir tokens a `service_role` only | `bling_tokens`, `shopify_tokens` | 30 min |
| 2 | Restringir dados a `authenticated` read + `service_role` write | 14 tabelas de dados | 2h |

### ALTO — Sprint atual

| # | Acao | Detalhe | Esforco |
|---|------|---------|---------|
| 3 | Criar indexes em tabelas de alto volume | `clientes`, `shopify_pedidos`, `shopify_clientes` | 1h |
| 4 | Corrigir TypeScript types | `VwResumoMensal`, `VwClientesMes` vs views reais | 2h |
| 5 | Corrigir calculo de resultado no Header | `receita_total`/`custo_total` nao existem na view | 1h |

### MEDIO — Proximo sprint

| # | Acao | Detalhe | Esforco |
|---|------|---------|---------|
| 6 | Adicionar `updated_at` + trigger auto | 16 tabelas + funcao generica | 3h |
| 7 | Consolidar views duplicadas | 3 pares Shopify → 1 canonica cada | 2h |
| 8 | Adicionar paginacao real | `fetchShopify*`, `fetchRDStation*` | 4h |
| 9 | Definir `search_path` em SECURITY DEFINER | `is_admin`, `rdstation_dashboard_periodo` | 30 min |

### BAIXO — Backlog

| # | Acao | Detalhe | Esforco |
|---|------|---------|---------|
| 10 | Avaliar unificacao Bling/Shopify | Tabelas canonicas com campo `fonte` | Spike 4h |
| 11 | Adicionar FKs no schema Shopify | `shopify_pedidos` → `shopify_clientes` | 2h |
| 12 | Limpar tabelas/views nao utilizadas | `importacoes`, views duplicadas | 1h |
| 13 | Implementar retention policy para logs | `access_logs`, `*_sync_log` | 2h |

---

## Apendice A: Mapa completo de RLS policies

```
access_logs
  ├── admin_read         SELECT  authenticated  is_admin(auth.uid())
  └── authenticated_insert INSERT authenticated  auth.uid() = user_id

bling_tokens
  └── allow_all_bling_tokens  ALL  public  true  ← CRITICO

bling_sync_log
  └── allow_all_bling_sync_log  ALL  public  true

clientes
  └── allow_all_clientes  ALL  public  true

custos
  └── allow_all_custos  ALL  public  true

fornecedores
  └── allow_all_fornecedores  ALL  public  true

importacoes
  └── allow_all_importacoes  ALL  public  true

pedidos
  ├── pedidos_select   SELECT  public  true
  ├── pedidos_insert   INSERT  public  true
  ├── pedidos_update   UPDATE  public  true
  └── pedidos_delete   DELETE  public  true

produtos
  └── allow_all_produtos  ALL  public  true

rdstation_contacts
  ├── rdstation_contacts_select  SELECT  public  true
  ├── rdstation_contacts_insert  INSERT  public  service_role
  ├── rdstation_contacts_update  UPDATE  public  service_role
  └── rdstation_contacts_delete  DELETE  public  service_role

rdstation_deals
  ├── rdstation_deals_select  SELECT  public  true
  ├── rdstation_deals_insert  INSERT  public  service_role
  ├── rdstation_deals_update  UPDATE  public  service_role
  └── rdstation_deals_delete  DELETE  public  service_role

rdstation_stages
  ├── rdstation_stages_select  SELECT  public  true
  ├── rdstation_stages_insert  INSERT  public  service_role
  ├── rdstation_stages_update  UPDATE  public  service_role
  └── rdstation_stages_delete  DELETE  public  service_role

rdstation_tasks
  ├── rdstation_tasks_select  SELECT  public  true
  ├── rdstation_tasks_insert  INSERT  public  service_role
  ├── rdstation_tasks_update  UPDATE  public  service_role
  └── rdstation_tasks_delete  DELETE  public  service_role

role_permissions
  ├── authenticated_read  SELECT  authenticated  true
  └── admin_write         ALL     authenticated  is_admin()

roles
  ├── authenticated_read  SELECT  authenticated  true
  └── admin_write         ALL     authenticated  is_admin()

shopify_analytics
  └── shopify_analytics_all  ALL  public  true

shopify_checkouts_abandonados
  └── shopify_checkouts_all  ALL  public  true

shopify_clientes
  └── shopify_clientes_all  ALL  public  true

shopify_pedidos
  └── shopify_pedidos_all  ALL  public  true

shopify_produtos
  └── shopify_produtos_all  ALL  public  true

shopify_sync_log
  └── shopify_sync_log_all  ALL  public  true

shopify_tokens
  └── shopify_tokens_all  ALL  public  true  ← CRITICO

user_profiles
  ├── user_profiles_select  SELECT  public  authenticated|service_role
  ├── user_profiles_insert  INSERT  public  service_role
  ├── user_profiles_update  UPDATE  public  own|service_role
  └── user_profiles_delete  DELETE  public  service_role

vendas_canal
  └── allow_all_vendas_canal  ALL  public  true

vendas_estado
  └── allow_all_vendas_estado  ALL  public  true

vendas_periodo
  └── allow_all_vendas_periodo  ALL  public  true
```

---

## Apendice B: Mapa de views e fontes de dados

```
Views derivadas de `clientes` (Bling):
  vw_resumo_mensal  ─── mes, clientes, receita, pedidos, ticket_medio, b2b, b2c
  vw_clientes_mes   ─── mes, nome, tipo, uf, total_gasto, total_pedidos, ...
  vw_uf_mensal      ─── mes, uf, clientes, receita, pedidos
  v_clientes_rfm    ─── RFM scores calculados

Views derivadas de `pedidos` (Bling):
  v_resumo_mensal   ─── periodo, pedidos, receita, cmv, lucro
  v_vendas_estado   ─── periodo, uf, pedidos, receita
  v_top_produtos    ─── periodo, produto, sku, quantidade, receita (JSONB lateral)

Views derivadas de `shopify_pedidos` (Shopify — prefixo v_):
  v_shopify_resumo_mensal  ─── periodo, pedidos, receita, ticket_medio, descontos
  v_shopify_top_clientes   ─── cliente_nome, pedidos, total_gasto
  v_shopify_por_estado     ─── uf, pedidos, receita (all-time)

Views derivadas de `shopify_pedidos` (Shopify — prefixo shopify_):
  shopify_resumo_mensal     ─── mes, pedidos, clientes_unicos, receita (SEM filtro status)
  shopify_top_clientes      ─── cliente_email, total_pedidos (filtro email)
  shopify_vendas_por_estado ─── uf, pedidos, receita (POR DIA, nao agregado)
```

---

*Documento gerado por Dara (Data Engineer Agent) — 2026-03-24*

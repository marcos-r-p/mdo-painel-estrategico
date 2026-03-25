# Financial Analysis — Bling + Shopify Integration Design

**Date:** 2026-03-24
**Status:** Approved
**Scope:** Consolidar dados financeiros do Bling e Shopify para gerar fluxo de caixa real com visão gerencial completa.

---

## Context

O painel estratégico MdO atualmente exibe dados financeiros hardcoded (seed data). O Bling é o ERP principal da empresa, onde todas as vendas (incluindo Shopify) são consolidadas. O Shopify é o canal de vendas online e seus pedidos fluem automaticamente para o Bling.

**Estado atual:**
- FluxoCaixaPage existe com UI, mas usa dados seed
- Shopify integrado: 35K pedidos, 49K clientes, 5K produtos no banco
- Bling: OAuth configurado, sync steps definidos, mas sem data fetching real
- Tabelas `custos` e `fornecedores` vazias
- Nenhuma funcionalidade de projeção/forecast

**Histórico financeiro disponível:** 1-2 anos no Bling.

---

## Architecture Decision

**Abordagem A: Edge Functions + Views Materializadas**

- Supabase Edge Functions sincronizam dados brutos do Bling API v3
- Dados armazenados em tabelas raw no PostgreSQL
- Views materializadas pre-calculam agregações (DRE, fluxo de caixa, margens)
- Dashboard carrega dados pre-agregados (milissegundos)
- Refresh das views roda após cada sync (diário ou manual)

**Razões da escolha:**
- Performance excelente para 1-2 anos de dados históricos
- Menor carga no frontend
- Refresh concorrente (sem lock de leitura)

---

## Data Model

### Novas Tabelas (Bling)

#### bling_contas_receber
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid (PK) | ID interno |
| bling_id | bigint (unique) | ID no Bling |
| numero_documento | text | Número do documento |
| contato_id | bigint | ID do contato no Bling |
| contato_nome | text | Nome do contato |
| valor | numeric(12,2) | Valor total |
| valor_recebido | numeric(12,2) | Valor já recebido |
| saldo | numeric(12,2) | Saldo pendente |
| data_emissao | date | Data de emissão |
| data_vencimento | date | Data de vencimento |
| data_recebimento | date | Data de recebimento (null se pendente) |
| situacao | text | aberto, recebido, parcial, vencido |
| categoria | text | Categoria financeira (mapeada do Bling) |
| historico | text | Observações |
| synced_at | timestamptz | Última sincronização |
| created_at | timestamptz | Criação do registro |
| updated_at | timestamptz | Última atualização |

#### bling_contas_pagar
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid (PK) | ID interno |
| bling_id | bigint (unique) | ID no Bling |
| numero_documento | text | Número do documento |
| fornecedor_id | bigint | ID do fornecedor no Bling |
| fornecedor_nome | text | Nome do fornecedor |
| valor | numeric(12,2) | Valor total |
| valor_pago | numeric(12,2) | Valor já pago |
| saldo | numeric(12,2) | Saldo pendente |
| data_emissao | date | Data de emissão |
| data_vencimento | date | Data de vencimento |
| data_pagamento | date | Data de pagamento (null se pendente) |
| situacao | text | aberto, pago, parcial, vencido |
| categoria | text | Categoria financeira |
| historico | text | Observações |
| synced_at | timestamptz | Última sincronização |
| created_at | timestamptz | Criação do registro |
| updated_at | timestamptz | Última atualização |

#### bling_pedidos_compra
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid (PK) | ID interno |
| bling_id | bigint (unique) | ID no Bling |
| numero | text | Número do pedido |
| fornecedor_id | bigint | ID do fornecedor |
| fornecedor_nome | text | Nome do fornecedor |
| valor_total | numeric(12,2) | Valor total |
| valor_frete | numeric(12,2) | Valor do frete |
| valor_desconto | numeric(12,2) | Valor de desconto |
| data_pedido | date | Data do pedido |
| data_prevista | date | Data prevista de entrega |
| situacao | text | Status do pedido |
| itens | jsonb | Array de itens [{sku, descricao, quantidade, valor_unitario, valor_total}] |
| synced_at | timestamptz | Última sincronização |
| created_at | timestamptz | Criação do registro |
| updated_at | timestamptz | Última atualização |

#### bling_categorias
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid (PK) | ID interno |
| bling_id | bigint (unique) | ID no Bling |
| descricao | text | Nome da categoria |
| tipo | text | receita, despesa |
| dre_classificacao | text | Classificação DRE: receita_bruta, imposto, cmv, despesa_operacional, despesa_financeira, outras_receitas |
| categoria_pai_id | uuid | FK para categoria pai (hierarquia) |
| synced_at | timestamptz | Última sincronização |

**Mapeamento DRE (C1):** O campo `dre_classificacao` é preenchido manualmente pelo admin após o primeiro sync. Uma tela de mapeamento permite associar cada categoria Bling a uma linha do DRE. Categorias sem mapeamento caem em "Despesas Operacionais" (fallback). Valores possíveis:
- `receita_bruta` — vendas, serviços
- `imposto` — ICMS, PIS, COFINS, ISS, etc.
- `cmv` — custo de mercadoria vendida
- `despesa_operacional` — aluguel, salários, marketing, etc.
- `despesa_financeira` — juros, taxas bancárias, IOF
- `outras_receitas` — receitas não-operacionais

### Views Materializadas

#### 1. mv_fluxo_caixa_mensal
Receitas vs despesas agrupadas por mês com saldo acumulado.
```sql
-- Fonte: bling_contas_receber (recebidos) + bling_contas_pagar (pagos)
-- Colunas: ano_mes, receitas, despesas, saldo_mes, saldo_acumulado
-- Agrupamento: por ano_mes (YYYY-MM)
-- Filtro: apenas registros com data_recebimento/data_pagamento preenchida
-- saldo_acumulado: SUM(saldo_mes) OVER (ORDER BY ano_mes) — começa de zero
--   (saldo inicial configurável via tabela config_financeiro se necessário no futuro)
```

#### 2. mv_dre_mensal
Demonstrativo de Resultado do Exercício completo.
```
(+) Receita Bruta             — soma contas recebidas
(-) Impostos                  — categorias tipo imposto
(=) Receita Líquida
(-) CMV                       — custo mercadoria vendida (pedidos compra)
(=) Lucro Bruto
(-) Despesas Operacionais     — despesas fixas + variáveis por categoria
(=) Resultado Operacional
(-) Despesas Financeiras      — juros, taxas bancárias
(=) Lucro Líquido
    Margem Bruta %
    Margem Líquida %
```
Classificação via `bling_categorias.dre_classificacao` (mapeado manualmente pelo admin). JOIN: `bling_contas_receber.categoria = bling_categorias.descricao` e `bling_contas_pagar.categoria = bling_categorias.descricao`. CMV vem de `bling_pedidos_compra` (soma `valor_total` por mês).

#### 3. mv_contas_vencer (Aging)
Contas a pagar e receber agrupadas por faixa de vencimento.
```
Faixas: Vencido | Hoje | 1-7 dias | 8-15 dias | 16-30 dias | 31-60 dias | 60+ dias
Colunas: faixa, a_receber, a_pagar, saldo
Nota: faixas são relativas ao CURRENT_DATE no momento do refresh.
  Entre syncs as faixas ficam levemente desatualizadas (máx 24h).
  Botão manual de sync também atualiza esta view.
  Frontend exibe "Atualizado em: {timestamp}" junto ao aging chart.
```

#### 4. mv_margem_produto
Margem por produto cruzando receita com custo.
```
Receita por produto: shopify_pedidos.itens (JSONB com sku + preco)
  → JOIN via shopify_pedidos.numero ←→ bling_contas_receber.numero_documento
  → Apenas pedidos com match no Bling (receita confirmada)
Custo por produto: bling_pedidos_compra.itens (JSONB com sku + valor_unitario)
  → Custo médio ponderado por SKU

Colunas: produto, sku, receita, custo_cmv, margem_valor, margem_percentual
Limitação: só calcula margem para pedidos Shopify (tem detalhe por item).
           Pedidos de outros canais sem detalhe por item ficam fora.
```

#### 5. mv_margem_canal
Margem por canal de venda derivada via lógica de classificação.
```
Derivação do canal:
  1. Se bling_contas_receber.numero_documento tem match em shopify_pedidos.numero → "E-commerce"
  2. Se bling_categorias.descricao contém "atacado" ou "B2B" → "Atacado/B2B"
  3. Demais → "Outros Canais"

O admin pode refinar a classificação futuramente via campo customizável.

Colunas: canal, receita, custo, margem_percentual, qtd_documentos
```

#### 6. mv_comparativo_mensal
Comparativo armazenando todos os meses para filtragem no frontend.
```
Colunas: ano_mes, metrica, valor, valor_mes_anterior, valor_mesmo_mes_ano_passado, variacao_percentual_mes, variacao_percentual_ano
Métricas: receita, despesas, lucro, ticket_medio, qtd_vendas
Unique index: (ano_mes, metrica)
O frontend filtra pelo mês desejado — não depende de CURRENT_DATE no refresh.
```

#### 7. mv_receita_por_uf
Receita do Bling cruzada com UF do Shopify via número do pedido.
```
Cruzamento: shopify_pedidos.numero ←→ bling_contas_receber.numero_documento
Colunas: uf, receita, quantidade_pedidos, ticket_medio
```

### Indexes

```sql
-- Novas tabelas
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

-- Tabelas existentes (faltam)
CREATE INDEX idx_shopify_pedidos_data ON shopify_pedidos(data_pedido);
CREATE INDEX idx_shopify_pedidos_numero ON shopify_pedidos(numero);

-- Views materializadas (unique index para REFRESH CONCURRENTLY)
CREATE UNIQUE INDEX ON mv_fluxo_caixa_mensal(ano_mes);
CREATE UNIQUE INDEX ON mv_dre_mensal(ano_mes, linha);
CREATE UNIQUE INDEX ON mv_contas_vencer(faixa);
CREATE UNIQUE INDEX ON mv_margem_produto(sku);
CREATE UNIQUE INDEX ON mv_margem_canal(canal);
CREATE UNIQUE INDEX ON mv_comparativo_mensal(ano_mes, metrica);
CREATE UNIQUE INDEX ON mv_receita_por_uf(uf);
```

### Cruzamento Shopify ↔ Bling (Validação)

O join `shopify_pedidos.numero ←→ bling_contas_receber.numero_documento` precisa de validação:
- Ambos são campos `text` — verificar se formatos coincidem (prefixos, padding, etc.)
- Implementação deve incluir step de validação no primeiro sync: contar matches e reportar % de cobertura
- Registros sem match em `mv_receita_por_uf` ficam como UF "Não identificado"
- Registros sem match em `mv_margem_canal` caem em "Outros Canais"

### Upsert Strategy

Todas as tabelas Bling usam `bling_id` como chave única. O sync incremental usa:
```sql
INSERT INTO bling_contas_receber (...) VALUES (...)
ON CONFLICT (bling_id) DO UPDATE SET
  valor = EXCLUDED.valor,
  situacao = EXCLUDED.situacao,
  ...,
  synced_at = NOW();
```

### Refresh Order das Views

Views são independentes (todas leem de tabelas base, nenhuma depende de outra view):
1. mv_fluxo_caixa_mensal
2. mv_dre_mensal
3. mv_contas_vencer
4. mv_margem_produto
5. mv_margem_canal
6. mv_comparativo_mensal
7. mv_receita_por_uf

Ordem não importa, mas executadas sequencialmente para não sobrecarregar o banco.

---

## Sync Engine

### Supabase Edge Function: bling-sync (reestruturada)

A Edge Function existente (`supabase/functions/bling-sync/index.ts`) será **reestruturada** (não apenas estendida). Atualmente lida com `contatos`, `produtos`, `pedidos` via parâmetro `?tipo=`. A nova versão orquestra o sync financeiro completo em uma única invocação.

**Trigger:** Vercel Cron chama API route `/api/cron/bling-sync` que é um **thin wrapper** invocando a Supabase Edge Function via `supabase.functions.invoke('bling-sync')`. O botão manual no dashboard chama o mesmo endpoint.

**Fluxo de execução:**
1. Refresh OAuth token (`bling_tokens`)
2. Sync categorias (`GET /categorias/receitas-despesas`)
3. Sync contas a receber (`GET /contas-receber`)
4. Sync contas a pagar (`GET /contas-pagar`)
5. Sync pedidos de compra (`GET /pedidos-compra`)
6. Refresh all materialized views (`REFRESH MATERIALIZED VIEW CONCURRENTLY`)
7. Gravar resultado em `bling_sync_log`

**Sync incremental:**
- Cada tabela guarda `synced_at`
- Próximo sync busca apenas `dataAlteracao >= ultima_sync`
- Primeiro sync: busca tudo (full sync)

**Paginação:**
- Bling API v3 retorna máximo 100 registros por página
- Loop automático até última página
- Rate limiting: 3 req/s (delay 350ms entre chamadas)

**Tratamento de erros:**
- Se uma etapa falha: retry 1x automático
- Se falhar 2x: marca erro no log, segue para próxima etapa
- Etapas anteriores ficam salvas (sem rollback)
- Dashboard mostra banner de alerta se último sync falhou

**Vercel Cron config:**
```json
{
  "crons": [{
    "path": "/api/cron/bling-sync",
    "schedule": "0 6 * * *"
  }]
}
```

**Tabela bling_sync_log (atualizada):**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid (PK) | ID do log |
| tipo | text | Tipo do sync: full, incremental, manual |
| status | text | success, partial, error |
| steps | jsonb | Status por etapa: [{step, status, registros, duracao_ms, erro}] |
| registros_total | integer | Total de registros sincronizados |
| duracao_ms | integer | Duração total em ms |
| erro | text | Mensagem de erro (se houver) |
| created_at | timestamptz | Timestamp do sync |

### Botão Manual

Endpoint: `POST /api/sync/bling`
- Chama mesma Edge Function
- Retorna progresso via polling ou SSE
- UI mostra status por etapa (categorias → contas receber → contas pagar → compras → views)

---

## Frontend

### FluxoCaixaPage (redesenhada)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Filtros: [Período] [Comparar com...] [Sincronizar]  │
├─────────────────────────────────────────────────────┤
│ KPI Cards: Receita Líquida | Despesas | Lucro | Margem % │
├──────────────────────┬──────────────────────────────┤
│ Gráfico Fluxo Caixa  │ Aging Contas Pagar/Receber   │
│ (barras + linha)     │ (barras horizontais)          │
├──────────────────────┴──────────────────────────────┤
│ DRE Mensal (tabela expandível)                       │
├──────────────────────┬──────────────────────────────┤
│ Despesas por Categ.  │ Comparativo Mensal            │
│ (donut chart)        │ (atual vs anterior vs ano)    │
├──────────────────────┴──────────────────────────────┤
│ Margem por Produto (top 10) | Margem por Canal       │
└─────────────────────────────────────────────────────┘
```

### Novos Componentes

| Componente | Descrição |
|-----------|-----------|
| `FluxoCaixaChart` | Barras empilhadas (receita/despesa) + linha de saldo acumulado |
| `AgingChart` | Barras horizontais por faixa de vencimento (a pagar vs a receber) |
| `DRETable` | Tabela colapsável com drill-down por categoria Bling |
| `ComparativoCard` | Mês atual vs anterior com variação % e indicadores |
| `MargemTable` | Ranking de margem por produto ou canal |
| `SyncButton` | Botão com progresso por etapa do sync |

### React Query Hooks

| Hook | View/Fonte | staleTime |
|------|-----------|-----------|
| `useFluxoCaixa(periodo)` | mv_fluxo_caixa_mensal | 5 min |
| `useDRE(periodo)` | mv_dre_mensal | 5 min |
| `useAging()` | mv_contas_vencer | 5 min |
| `useMargemProduto(periodo)` | mv_margem_produto | 5 min |
| `useMargemCanal(periodo)` | mv_margem_canal | 5 min |
| `useComparativo(mes)` | mv_comparativo_mensal | 5 min |
| `useReceitaPorUF(periodo)` | mv_receita_por_uf | 5 min |

**Cache config:**
- `staleTime: 5 * 60 * 1000` (views são estáticas entre syncs)
- `gcTime: 30 * 60 * 1000`
- `refetchOnWindowFocus: false`

---

## Shopify Integration (Complementar)

O Bling é a fonte oficial de receita. Shopify é usado para enriquecer a análise:

**Dados que o Shopify adiciona:**
- Geolocalização (UF, cidade) para `mv_receita_por_uf`
- Dados de e-commerce (fulfillment status, canal)
- Dados de clientes online (recorrência, primeiro pedido)

**Cruzamento:**
```
shopify_pedidos.numero ←→ bling_contas_receber.numero_documento
```

**Melhorias no sync Shopify existente:**
- Remover limite hardcoded de 5000 registros
- Adicionar paginação para histórico completo
- Manter sync existente (já funciona)

---

## Security

### RLS Policies (novas tabelas)

| Tabela | SELECT | INSERT/UPDATE/DELETE |
|--------|--------|---------------------|
| bling_contas_receber | authenticated | service_role |
| bling_contas_pagar | authenticated | service_role |
| bling_pedidos_compra | authenticated | service_role |
| bling_categorias | authenticated | service_role |

### Fix urgente

- `bling_tokens`: remover policy `allow_all`, restringir para `service_role` only
- `shopify_tokens`: idem

### Views materializadas

Views materializadas não têm RLS próprio — herdam segurança via função de acesso (RPC function com `SECURITY DEFINER` se necessário, ou acesso direto se views são read-only para authenticated).

---

## TypeScript Types

Atualizar `src/types/database.ts` com interfaces para:
- `BlingContaReceber`, `BlingContaPagar`, `BlingPedidoCompra`, `BlingCategoria`
- `FluxoCaixaMensal`, `DREMensal`, `ContasVencer`, `MargemProduto`, `MargemCanal`, `ComparativoMensal`, `ReceitaPorUF`
- `BlingSyncLog` (atualizado com campo `steps`)

---

## Out of Scope

- Projeções/forecast de fluxo de caixa (fase futura)
- Integração com outros ERPs
- Conciliação bancária automática
- Emissão de notas fiscais
- Multi-empresa/multi-CNPJ

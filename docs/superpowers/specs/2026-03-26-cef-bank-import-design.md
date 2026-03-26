# Importação de Extrato Bancário CEF — Design Spec

## Contexto

O cliente não utiliza o Bling para gestão financeira completa — usa extratos bancários da CEF (Caixa Econômica Federal) como fonte primária. O dashboard financeiro (FluxoCaixaPage) mostra R$0,00 porque as tabelas do Bling estão vazias. Esta feature importa extratos OFX da CEF para alimentar fluxo de caixa, DRE e conciliação bancária.

## Requisitos

### Funcionais

- **FR-1:** Upload de arquivo OFX via interface web com preview antes da confirmação
- **FR-2:** Parser OFX no browser extrai transações (data, valor, descrição, FITID)
- **FR-3:** Deduplicação por FITID — reimportar o mesmo extrato não duplica transações
- **FR-4:** Categorização automática por regras de padrão na descrição do lançamento
- **FR-5:** Interface de revisão para o cliente confirmar/corrigir categorias sugeridas
- **FR-6:** Regras customizadas — correções do cliente criam padrões para futuras importações
- **FR-7:** Conciliação automática cruzando extrato com Shopify (pedidos) e Bling (contas a pagar/receber) por valor + janela de ±3 dias
- **FR-8:** Interface de conciliação mostrando status (conciliado/pendente/ignorado) com match manual para pendentes
- **FR-9:** Fluxo de caixa e DRE calculados a partir do extrato bancário (views dedicadas)
- **FR-10:** Toggle na FluxoCaixaPage para alternar fonte: Bling vs. Extrato Bancário

### Não-Funcionais

- **NFR-1:** Upload semanal de ~50-200 transações — insert batch simples, sem chunking
- **NFR-2:** Parser OFX roda no browser — sem Edge Function para parsing
- **NFR-3:** Conciliação roda como RPC function no Supabase (server-side)
- **NFR-4:** Mesma arquitetura de materialized views do sistema Bling existente
- **NFR-5:** RLS: authenticated = SELECT + INSERT + UPDATE (upload e revisão); service_role = full CRUD incluindo DELETE

### Restrições

- **CON-1:** Uma única conta corrente PJ na CEF
- **CON-2:** Formato de arquivo: OFX (SGML, padrão bancário brasileiro)
- **CON-3:** Frequência de importação: semanal (manual pelo cliente)
- **CON-4:** Categorias mapeiam para as mesmas linhas DRE já existentes

---

## Modelo de Dados

### Tabela: `extrato_bancario`

Metadados de cada upload de extrato.

```sql
CREATE TABLE extrato_bancario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banco text NOT NULL DEFAULT 'CEF',
  conta text NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  arquivo_nome text NOT NULL,
  qtd_transacoes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_extrato_bancario_periodo ON extrato_bancario (periodo_inicio, periodo_fim);
CREATE INDEX idx_extrato_bancario_created ON extrato_bancario (created_at DESC);
```

### Tabela: `extrato_transacao`

Cada lançamento individual do extrato.

```sql
CREATE TABLE extrato_transacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrato_id uuid NOT NULL REFERENCES extrato_bancario(id) ON DELETE CASCADE,
  fitid text NOT NULL,
  data date NOT NULL,
  valor numeric(14,2) NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('credit', 'debit')),
  descricao text NOT NULL DEFAULT '',
  categoria_sugerida text NOT NULL DEFAULT 'Não categorizado',
  categoria_confirmada text,
  conciliado boolean NOT NULL DEFAULT false,
  dre_classificacao text,
  conciliacao_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(fitid)
);

CREATE INDEX idx_extrato_transacao_extrato ON extrato_transacao (extrato_id);
CREATE INDEX idx_extrato_transacao_data ON extrato_transacao (data);
CREATE INDEX idx_extrato_transacao_conciliado ON extrato_transacao (conciliado) WHERE conciliado = false;
CREATE INDEX idx_extrato_transacao_categoria ON extrato_transacao (categoria_confirmada) WHERE categoria_confirmada IS NULL;
```

### Tabela: `extrato_regra_custom`

Regras de categorização criadas a partir de correções do cliente.

```sql
CREATE TABLE extrato_regra_custom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  padrao text NOT NULL,
  categoria text NOT NULL,
  dre_classificacao text NOT NULL DEFAULT 'despesa_operacional',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_extrato_regra_padrao ON extrato_regra_custom (lower(padrao));
```

### RLS

```sql
ALTER TABLE extrato_bancario ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrato_transacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrato_regra_custom ENABLE ROW LEVEL SECURITY;

-- Authenticated: SELECT
CREATE POLICY "extrato_bancario_select" ON extrato_bancario FOR SELECT TO authenticated USING (true);
CREATE POLICY "extrato_transacao_select" ON extrato_transacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "extrato_regra_select" ON extrato_regra_custom FOR SELECT TO authenticated USING (true);

-- Authenticated: INSERT/UPDATE (client uploads and reviews)
CREATE POLICY "extrato_bancario_insert" ON extrato_bancario FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "extrato_bancario_delete" ON extrato_bancario FOR DELETE TO authenticated USING (true);
CREATE POLICY "extrato_transacao_insert" ON extrato_transacao FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "extrato_transacao_update" ON extrato_transacao FOR UPDATE TO authenticated USING (true);
CREATE POLICY "extrato_regra_insert" ON extrato_regra_custom FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "extrato_regra_update" ON extrato_regra_custom FOR UPDATE TO authenticated USING (true);
```

---

## Parser OFX

### Biblioteca

Usar `ofx-js` ou `node-ofx-parser` (npm) — parser OFX browser-compatible. **Nota:** OFX brasileiro usa formato SGML, não XML. Validar que o parser escolhido suporta SGML antes de implementar. Se nenhum parser existente funcionar com SGML da CEF, implementar parser custom simples baseado em regex para extrair blocos `<STMTTRN>`.

### Campos extraídos do OFX

```
BANKACCTFROM > ACCTID  → conta (número da conta)
STMTTRN > TRNTYPE      → tipo (CREDIT/DEBIT)
STMTTRN > DTPOSTED     → data (formato YYYYMMDD)
STMTTRN > TRNAMT       → valor (positivo=crédito, negativo=débito)
STMTTRN > FITID        → fitid (ID único para deduplicação)
STMTTRN > MEMO ou NAME → descricao
```

### Fluxo no browser

1. `FileReader.readAsText(file)` lê o arquivo OFX
2. `ofx.parse(text)` retorna objeto estruturado
3. Extrair transações do path `OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN`
4. Extrair conta do path `OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKACCTFROM.ACCTID`
5. Mapear cada `STMTTRN` para o formato `extrato_transacao`
6. Aplicar categorização automática (regras padrão + custom)
7. Verificar FITIDs existentes no banco para deduplicação

### Deduplicação

Antes do insert:
1. Coleta todos os `fitid` das transações parseadas
2. Consulta `extrato_transacao` para verificar quais já existem
3. Filtra apenas novas transações
4. Preview mostra: "X novas transações, Y já importadas (ignoradas)"

---

## Categorização Automática

### Regras padrão (hardcoded)

Aplicadas em ordem — primeiro match vence.

| Prioridade | Padrão (case-insensitive) | Categoria | DRE |
|---|---|---|---|
| 1 | `SHOPIFY`, `PAGAR.ME`, `MERCADOPAGO`, `PAGSEGURO` | Receita E-commerce | receita_bruta |
| 2 | `PIX RECEBIDO`, `TED RECEBIDA`, `DOC RECEBID`, `CREDITO` | Receita | receita_bruta |
| 3 | `TARIFA`, `TAR `, `ANUIDADE`, `TAXA` | Tarifa Bancária | despesa_financeira |
| 4 | `IOF`, `IR `, `IMPOSTO`, `DARF`, `GPS`, `DAS`, `SIMPLES` | Impostos | impostos |
| 5 | `FOLHA`, `SALARIO`, `FGTS`, `INSS`, `RESCISAO` | Folha de Pagamento | despesa_operacional |
| 6 | `ALUGUEL`, `CONDOMINIO`, `IPTU` | Aluguel/Ocupação | despesa_operacional |
| 7 | `ENERGIA`, `CEMIG`, `CPFL`, `AGUA`, `SABESP`, `SANEAGO` | Utilidades | despesa_operacional |
| 8 | `TELEFONE`, `INTERNET`, `VIVO`, `CLARO`, `TIM` | Telecom | despesa_operacional |
| 9 | `DEB AUTOMATICO` | Débito Automático | despesa_operacional |
| 10 | `APLICACAO`, `RESGATE`, `CDB`, `LCI`, `LCA`, `POUPANCA` | Investimento | não-operacional |
| 11 | `TRANSF ENTRE CONTAS`, `TRANSF MESMA TITULARIDADE` | Transferência Interna | ignorar |

**Fallback:** `categoria_sugerida = "Não categorizado"`, `dre_classificacao = null`

**Nota sobre DRE:** Transações "Não categorizado" (`dre_classificacao = null`) são **excluídas** do DRE. A UI deve exibir um banner de alerta quando existirem transações não categorizadas: "X transações sem categoria — o DRE pode estar incompleto".

### Regras custom (tabela `extrato_regra_custom`)

- Carregadas antes das regras padrão — **prioridade maior**
- Criadas automaticamente quando o cliente corrige uma categoria na UI
- O padrão é extraído da descrição da transação corrigida (parte mais específica)
- Match: `descricao ILIKE '%' || padrao || '%'`

### Fluxo de categorização

```
1. Carregar regras custom do banco
2. Para cada transação:
   a. Testar contra regras custom (match parcial, case-insensitive)
   b. Se não match → testar contra regras padrão
   c. Se não match → "Não categorizado"
3. Gravar categoria_sugerida
```

---

## Conciliação Bancária

### RPC Function: `conciliar_extrato(p_extrato_id uuid)`

Executa server-side no Supabase.

### Algoritmo

Para cada transação **não conciliada** e **não ignorada** do extrato:

**Créditos (valor > 0):**
1. Buscar em `shopify_pedidos` por `valor_total = valor` AND `data` entre `extrato.data - 3 dias` e `extrato.data + 3 dias`
2. Se não encontrou → buscar em `bling_contas_receber` por `valor = valor` AND `data_vencimento` entre `data - 3 dias` e `data + 3 dias`
3. Match único → `conciliado = true`, `conciliacao_ref = 'shopify:{order_id}'` ou `'bling_cr:{id}'`
4. Match múltiplo → mantém pendente (revisão manual)

**Débitos (valor < 0):**
1. Buscar em `bling_contas_pagar` por `valor = ABS(valor)` AND `data_vencimento` entre `data - 3 dias` e `data + 3 dias`
2. Match único → `conciliado = true`, `conciliacao_ref = 'bling_cp:{id}'`
3. Match múltiplo → mantém pendente

**Ignorados:**
- Transações com categoria "Transferência Interna" ou "Investimento" → `conciliado = false` (ignoradas no relatório)

### Retorno da RPC

```json
{
  "total": 142,
  "conciliados": 98,
  "pendentes": 35,
  "ignorados": 9
}
```

---

## Materialized Views

### `mv_fluxo_caixa_extrato`

Mesma estrutura da `mv_fluxo_caixa_mensal` existente.

```sql
CREATE MATERIALIZED VIEW mv_fluxo_caixa_extrato AS
WITH mensal AS (
  SELECT
    to_char(data, 'YYYY-MM') AS ano_mes,
    SUM(CASE WHEN valor > 0 THEN valor ELSE 0 END) AS receitas,
    SUM(CASE WHEN valor < 0 THEN ABS(valor) ELSE 0 END) AS despesas,
    SUM(valor) AS saldo_mes
  FROM extrato_transacao
  WHERE COALESCE(categoria_confirmada, categoria_sugerida) NOT IN ('Transferência Interna', 'Investimento')
  GROUP BY to_char(data, 'YYYY-MM')
)
SELECT
  ano_mes,
  receitas,
  despesas,
  saldo_mes,
  SUM(saldo_mes) OVER (ORDER BY ano_mes) AS saldo_acumulado
FROM mensal
ORDER BY ano_mes;

CREATE UNIQUE INDEX ON mv_fluxo_caixa_extrato(ano_mes);
```

### `mv_dre_extrato`

Mesma estrutura da `mv_dre_mensal` existente. Usa `dre_classificacao` da `extrato_transacao` para mapear categorias para linhas DRE, garantindo compatibilidade com regras custom. Valores seguem a mesma convenção de sinal do Bling (positivos para receitas, negativos para deduções). Inclui linhas `cmv` e `lucro_bruto` com valor zero (extrato bancário não distingue CMV) para manter estrutura idêntica ao DRETable.

```sql
CREATE MATERIALIZED VIEW mv_dre_extrato AS
WITH por_mes AS (
  SELECT
    to_char(data, 'YYYY-MM') AS ano_mes,
    SUM(CASE WHEN dre_classificacao = 'receita_bruta' THEN ABS(valor) ELSE 0 END) AS receita_bruta,
    SUM(CASE WHEN dre_classificacao = 'impostos' THEN ABS(valor) ELSE 0 END) AS impostos,
    SUM(CASE WHEN dre_classificacao = 'despesa_operacional' THEN ABS(valor) ELSE 0 END) AS despesas_operacionais,
    SUM(CASE WHEN dre_classificacao = 'despesa_financeira' THEN ABS(valor) ELSE 0 END) AS despesas_financeiras
  FROM extrato_transacao
  WHERE dre_classificacao IS NOT NULL
    AND COALESCE(categoria_confirmada, categoria_sugerida) NOT IN ('Transferência Interna', 'Investimento')
  GROUP BY to_char(data, 'YYYY-MM')
)
SELECT ano_mes, 'receita_bruta' AS linha, receita_bruta AS valor FROM por_mes
UNION ALL
SELECT ano_mes, 'impostos', impostos FROM por_mes
UNION ALL
SELECT ano_mes, 'receita_liquida', receita_bruta - impostos FROM por_mes
UNION ALL
SELECT ano_mes, 'cmv', 0 FROM por_mes
UNION ALL
SELECT ano_mes, 'lucro_bruto', receita_bruta - impostos FROM por_mes
UNION ALL
SELECT ano_mes, 'despesas_operacionais', despesas_operacionais FROM por_mes
UNION ALL
SELECT ano_mes, 'resultado_operacional', receita_bruta - impostos - despesas_operacionais FROM por_mes
UNION ALL
SELECT ano_mes, 'despesas_financeiras', despesas_financeiras FROM por_mes
UNION ALL
SELECT ano_mes, 'lucro_liquido', receita_bruta - impostos - despesas_operacionais - despesas_financeiras FROM por_mes
UNION ALL
SELECT ano_mes, 'margem_bruta_pct',
  CASE WHEN receita_bruta > 0
    THEN ((receita_bruta - impostos) / receita_bruta) * 100
    ELSE 0
  END
FROM por_mes
UNION ALL
SELECT ano_mes, 'margem_liquida_pct',
  CASE WHEN receita_bruta > 0
    THEN ((receita_bruta - impostos - despesas_operacionais - despesas_financeiras) / receita_bruta) * 100
    ELSE 0
  END
FROM por_mes
ORDER BY ano_mes, linha;

CREATE UNIQUE INDEX ON mv_dre_extrato(ano_mes, linha);
```

**Nota:** O campo `dre_classificacao` na `extrato_transacao` é preenchido durante a categorização (tanto regras padrão quanto custom). Isso garante que regras custom com categorias novas sejam corretamente mapeadas no DRE sem hardcoding de nomes de categoria na view.

### `mv_conciliacao_resumo`

```sql
CREATE MATERIALIZED VIEW mv_conciliacao_resumo AS
SELECT
  to_char(data, 'YYYY-MM') AS ano_mes,
  COUNT(*) AS total_transacoes,
  COUNT(*) FILTER (WHERE conciliado = true) AS conciliadas,
  COUNT(*) FILTER (WHERE conciliado = false AND COALESCE(categoria_confirmada, categoria_sugerida) NOT IN ('Transferência Interna', 'Investimento')) AS pendentes,
  COUNT(*) FILTER (WHERE COALESCE(categoria_confirmada, categoria_sugerida) IN ('Transferência Interna', 'Investimento')) AS ignoradas,
  SUM(ABS(valor)) FILTER (WHERE conciliado = false AND COALESCE(categoria_confirmada, categoria_sugerida) NOT IN ('Transferência Interna', 'Investimento')) AS valor_nao_conciliado
FROM extrato_transacao
GROUP BY to_char(data, 'YYYY-MM')
ORDER BY ano_mes;

CREATE UNIQUE INDEX ON mv_conciliacao_resumo(ano_mes);
```

### RPC: `import_extrato(p_data jsonb)`

Garante atomicidade — insere extrato + todas as transações numa única transaction. Se qualquer insert falhar, faz rollback completo.

```sql
CREATE OR REPLACE FUNCTION import_extrato(p_data jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_extrato_id uuid;
  v_txn jsonb;
BEGIN
  INSERT INTO extrato_bancario (banco, conta, periodo_inicio, periodo_fim, arquivo_nome, qtd_transacoes)
  VALUES (
    p_data->>'banco',
    p_data->>'conta',
    (p_data->>'periodo_inicio')::date,
    (p_data->>'periodo_fim')::date,
    p_data->>'arquivo_nome',
    (p_data->>'qtd_transacoes')::int
  )
  RETURNING id INTO v_extrato_id;

  FOR v_txn IN SELECT * FROM jsonb_array_elements(p_data->'transacoes')
  LOOP
    INSERT INTO extrato_transacao (extrato_id, fitid, data, valor, tipo, descricao, categoria_sugerida, dre_classificacao)
    VALUES (
      v_extrato_id,
      v_txn->>'fitid',
      (v_txn->>'data')::date,
      (v_txn->>'valor')::numeric,
      v_txn->>'tipo',
      v_txn->>'descricao',
      v_txn->>'categoria_sugerida',
      v_txn->>'dre_classificacao'
    )
    ON CONFLICT (fitid) DO NOTHING;
  END LOOP;

  RETURN v_extrato_id;
END;
$$;

GRANT EXECUTE ON FUNCTION import_extrato(jsonb) TO authenticated;
```

### Refresh

Função `refresh_extrato_views()` chamada após cada import e após conciliação:

```sql
CREATE OR REPLACE FUNCTION refresh_extrato_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fluxo_caixa_extrato;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dre_extrato;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conciliacao_resumo;
END;
$$;
```

---

## TypeScript Types

### `src/types/extrato.ts`

```typescript
export interface ExtratoBancario {
  id: string;
  banco: string;
  conta: string;
  periodo_inicio: string;
  periodo_fim: string;
  arquivo_nome: string;
  qtd_transacoes: number;
  created_at: string;
}

export interface ExtratoTransacao {
  id: string;
  extrato_id: string;
  fitid: string;
  data: string;
  valor: number;
  tipo: 'credit' | 'debit';
  descricao: string;
  categoria_sugerida: string;
  categoria_confirmada: string | null;
  dre_classificacao: string | null;
  conciliado: boolean;
  conciliacao_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtratoRegraCustom {
  id: string;
  padrao: string;
  categoria: string;
  dre_classificacao: string;
  created_at: string;
}

export interface ConciliacaoResumo {
  ano_mes: string;
  total_transacoes: number;
  conciliadas: number;
  pendentes: number;
  ignoradas: number;
  valor_nao_conciliado: number;
}

export interface ConciliacaoResult {
  total: number;
  conciliados: number;
  pendentes: number;
  ignorados: number;
}
```

---

## API Services

### `src/services/api/extrato.ts`

```typescript
// Upload — usa RPC import_extrato() para atomicidade (extrato + transações num único transaction)
importExtrato(extrato: Omit<ExtratoBancario, 'id' | 'created_at'>, transacoes: Omit<ExtratoTransacao, 'id' | 'extrato_id' | 'created_at' | 'updated_at'>[]): Promise<string>
fetchExistingFitids(fitids: string[]): Promise<string[]>

// Queries
fetchExtratos(): Promise<ExtratoBancario[]>
fetchTransacoes(extratoId?: string, filters?: { conciliado?: boolean; categorizada?: boolean }): Promise<ExtratoTransacao[]>
fetchRegrasCustom(): Promise<ExtratoRegraCustom[]>

// Mutations
updateTransacaoCategoria(id: string, categoria: string): Promise<void>
insertRegraCustom(regra: Omit<ExtratoRegraCustom, 'id' | 'created_at'>): Promise<void>

// Delete (cascade deletes transações)
deleteExtrato(extratoId: string): Promise<void>

// Conciliação
triggerConciliacao(extratoId: string): Promise<ConciliacaoResult>

// Views
fetchFluxoCaixaExtrato(): Promise<FluxoCaixaMensal[]>  // mesma interface
fetchDREExtrato(): Promise<DREMensal[]>                  // mesma interface
fetchConciliacaoResumo(): Promise<ConciliacaoResumo[]>

// Refresh
refreshExtratoViews(): Promise<void>
```

---

## React Query Hooks

### `src/services/queries/useExtratoQueries.ts`

```typescript
useExtratos()                              // lista de uploads
useTransacoes(extratoId?, filters?)        // transações com filtros
useRegrasCustom()                          // regras de categorização
useFluxoCaixaExtrato()                     // fluxo de caixa do extrato
useDREExtrato()                            // DRE do extrato
useConciliacaoResumo()                     // resumo de conciliação

// Mutations
useUploadExtrato()                         // upload + insert + refresh views
useUpdateCategoria()                       // atualizar categoria + criar regra custom
useTriggerConciliacao()                    // rodar conciliação + refresh views
```

Stale time: 5 minutos (mesmo padrão dos hooks financeiros existentes).

---

## UI Components

### Novos componentes

**`src/components/extrato/UploadExtratoModal.tsx`**
- Dropzone para arquivo OFX
- Preview: período, conta, total transações, novas vs duplicadas
- Botão confirmar/cancelar
- Loading state durante insert

**`src/components/extrato/TransacoesTable.tsx`**
- Tabela paginada de transações
- Colunas: Data, Descrição, Valor, Categoria (badge + dropdown), Status Conciliação
- Filtros: período, categoria, status conciliação, apenas não categorizados
- Inline editing de categoria (dropdown) → grava + cria regra custom

**`src/components/extrato/ConciliacaoPanel.tsx`**
- Cards de resumo: conciliados / pendentes / ignorados / valor não conciliado
- Lista de transações pendentes com sugestões de match
- Botão para conciliar manualmente (selecionar match)
- Botão "Rodar Conciliação" para executar RPC

### Alterações em componentes existentes

**`src/pages/FluxoCaixaPage.tsx`**
- Toggle "Fonte: Bling | Extrato Bancário" no topo
- Botão "Importar Extrato" ao lado do SyncButton existente
- Card de último import (data, qtd transações, pendentes)
- Novas abas: Categorização, Conciliação
- Quando fonte = "Extrato": usa `useFluxoCaixaExtrato()` e `useDREExtrato()` no lugar dos hooks Bling

---

## Dependências npm

- `ofx-js` ou `node-ofx-parser` — parser OFX (browser-compatible). Fallback: parser custom SGML se nenhum pacote existente suportar o formato SGML da CEF corretamente.

Nenhuma outra dependência nova necessária.

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

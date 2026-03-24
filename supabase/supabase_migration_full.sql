-- ============================================================
-- MDO Painel Estrategico - Full Supabase Migration
-- Generated: 2026-03-24
-- Execute on a fresh Supabase project (public schema)
-- ============================================================

-- ============================================================
-- 1. TABLES (with sequences)
-- ============================================================

-- clientes
CREATE SEQUENCE IF NOT EXISTS clientes_id_seq;
CREATE TABLE public.clientes (
  id bigint PRIMARY KEY DEFAULT nextval('clientes_id_seq'),
  nome text NOT NULL,
  tipo text DEFAULT 'B2C' CHECK (tipo IN ('B2C','B2B')),
  uf text,
  cidade text,
  email text,
  celular text,
  loja text DEFAULT 'Shopify',
  total_gasto numeric DEFAULT 0,
  total_pedidos integer DEFAULT 0,
  ticket_medio numeric DEFAULT 0,
  markup numeric DEFAULT 0,
  lucro numeric DEFAULT 0,
  frequencia_mensal numeric DEFAULT 0,
  ultima_compra date,
  ultimos_produtos text[],
  periodo_cliente text,
  rfm_r integer DEFAULT 0,
  rfm_f integer DEFAULT 0,
  rfm_m integer DEFAULT 0,
  rfm_score text,
  segmento text,
  acao_sugerida text,
  fonte text DEFAULT 'bling',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER SEQUENCE clientes_id_seq OWNED BY clientes.id;

-- produtos
CREATE SEQUENCE IF NOT EXISTS produtos_id_seq;
CREATE TABLE public.produtos (
  id bigint PRIMARY KEY DEFAULT nextval('produtos_id_seq'),
  sku text UNIQUE,
  nome text NOT NULL,
  categoria text,
  quantidade_vendida integer DEFAULT 0,
  receita numeric DEFAULT 0,
  markup numeric DEFAULT 0,
  custo numeric DEFAULT 0,
  preco_venda numeric DEFAULT 0,
  estoque integer DEFAULT 0,
  fat_percentual numeric DEFAULT 0,
  classe_abc text CHECK (classe_abc IN ('A','B','C')),
  fonte text DEFAULT 'bling',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER SEQUENCE produtos_id_seq OWNED BY produtos.id;

-- vendas_periodo
CREATE SEQUENCE IF NOT EXISTS vendas_periodo_id_seq;
CREATE TABLE public.vendas_periodo (
  id bigint PRIMARY KEY DEFAULT nextval('vendas_periodo_id_seq'),
  periodo text NOT NULL,
  receita_bruta numeric,
  pedidos integer,
  ticket_medio numeric,
  cmv numeric,
  lucro_bruto numeric,
  markup numeric,
  resultado_operacional numeric,
  saldo_inicial numeric,
  saldo_final numeric,
  aportes_socios numeric,
  fonte text DEFAULT 'bling',
  created_at timestamptz DEFAULT now()
);
ALTER SEQUENCE vendas_periodo_id_seq OWNED BY vendas_periodo.id;

-- vendas_estado
CREATE SEQUENCE IF NOT EXISTS vendas_estado_id_seq;
CREATE TABLE public.vendas_estado (
  id bigint PRIMARY KEY DEFAULT nextval('vendas_estado_id_seq'),
  periodo text NOT NULL,
  uf text NOT NULL,
  pedidos integer DEFAULT 0,
  receita numeric DEFAULT 0,
  pecas integer DEFAULT 0,
  frete_medio numeric DEFAULT 0,
  ticket_medio numeric DEFAULT 0,
  percentual numeric DEFAULT 0,
  fonte text DEFAULT 'bling',
  created_at timestamptz DEFAULT now()
);
ALTER SEQUENCE vendas_estado_id_seq OWNED BY vendas_estado.id;

-- vendas_canal
CREATE SEQUENCE IF NOT EXISTS vendas_canal_id_seq;
CREATE TABLE public.vendas_canal (
  id bigint PRIMARY KEY DEFAULT nextval('vendas_canal_id_seq'),
  periodo text NOT NULL,
  canal text NOT NULL,
  pedidos integer DEFAULT 0,
  receita numeric DEFAULT 0,
  ticket_medio numeric DEFAULT 0,
  markup numeric DEFAULT 0,
  impostos numeric DEFAULT 0,
  contribuicao numeric DEFAULT 0,
  percentual numeric DEFAULT 0,
  fonte text DEFAULT 'bling',
  created_at timestamptz DEFAULT now()
);
ALTER SEQUENCE vendas_canal_id_seq OWNED BY vendas_canal.id;

-- custos
CREATE SEQUENCE IF NOT EXISTS custos_id_seq;
CREATE TABLE public.custos (
  id bigint PRIMARY KEY DEFAULT nextval('custos_id_seq'),
  periodo text NOT NULL,
  categoria text NOT NULL,
  item text NOT NULL,
  valor numeric NOT NULL,
  tipo text CHECK (tipo IN ('fixo','variavel','financeiro','imposto')),
  criticidade text DEFAULT 'baixa',
  fonte text DEFAULT 'extrato',
  created_at timestamptz DEFAULT now()
);
ALTER SEQUENCE custos_id_seq OWNED BY custos.id;

-- fornecedores
CREATE SEQUENCE IF NOT EXISTS fornecedores_id_seq;
CREATE TABLE public.fornecedores (
  id bigint PRIMARY KEY DEFAULT nextval('fornecedores_id_seq'),
  nome text NOT NULL,
  fantasia text,
  cnpj text,
  cidade text,
  uf text,
  email text,
  telefone text,
  tipo text,
  situacao text DEFAULT 'Ativo',
  fonte text DEFAULT 'bling',
  created_at timestamptz DEFAULT now()
);
ALTER SEQUENCE fornecedores_id_seq OWNED BY fornecedores.id;

-- importacoes
CREATE SEQUENCE IF NOT EXISTS importacoes_id_seq;
CREATE TABLE public.importacoes (
  id bigint PRIMARY KEY DEFAULT nextval('importacoes_id_seq'),
  nome_arquivo text NOT NULL,
  tipo_detectado text,
  total_linhas integer,
  total_colunas integer,
  confianca integer DEFAULT 0,
  status text DEFAULT 'importado',
  dados_aplicados boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER SEQUENCE importacoes_id_seq OWNED BY importacoes.id;

-- bling_tokens
CREATE TABLE public.bling_tokens (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- bling_sync_log
CREATE SEQUENCE IF NOT EXISTS bling_sync_log_id_seq;
CREATE TABLE public.bling_sync_log (
  id bigint PRIMARY KEY DEFAULT nextval('bling_sync_log_id_seq'),
  tipo text NOT NULL,
  registros integer DEFAULT 0,
  status text DEFAULT 'sucesso',
  erro text,
  created_at timestamptz DEFAULT now()
);
ALTER SEQUENCE bling_sync_log_id_seq OWNED BY bling_sync_log.id;

-- user_profiles
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  nome text,
  role text NOT NULL DEFAULT 'leitor' CHECK (role IN ('admin','leitor')),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- pedidos
CREATE TABLE public.pedidos (
  id bigint PRIMARY KEY,
  numero text,
  data date NOT NULL,
  cliente_id bigint REFERENCES clientes(id),
  cliente_nome text,
  valor_total numeric DEFAULT 0,
  desconto numeric DEFAULT 0,
  frete numeric DEFAULT 0,
  custo numeric DEFAULT 0,
  lucro numeric DEFAULT 0,
  situacao text,
  loja text DEFAULT 'Shopify',
  uf text,
  cidade text,
  canal text,
  itens jsonb DEFAULT '[]',
  fonte text DEFAULT 'bling',
  created_at timestamptz DEFAULT now()
);

-- shopify_tokens
CREATE TABLE public.shopify_tokens (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  shop text NOT NULL,
  access_token text,
  scopes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- shopify_pedidos
CREATE TABLE public.shopify_pedidos (
  id bigint PRIMARY KEY,
  numero text,
  data timestamptz NOT NULL,
  cliente_email text,
  cliente_nome text,
  valor_total numeric DEFAULT 0,
  subtotal numeric DEFAULT 0,
  desconto numeric DEFAULT 0,
  frete numeric DEFAULT 0,
  impostos numeric DEFAULT 0,
  status_financeiro text,
  status_fulfillment text,
  canal text,
  gateway_pagamento text,
  uf text,
  cidade text,
  pais text DEFAULT 'BR',
  itens jsonb DEFAULT '[]',
  tags text,
  nota text,
  created_at timestamptz DEFAULT now()
);

-- shopify_clientes
CREATE TABLE public.shopify_clientes (
  id bigint PRIMARY KEY,
  email text,
  nome text,
  telefone text,
  total_pedidos integer DEFAULT 0,
  total_gasto numeric DEFAULT 0,
  tags text,
  aceita_marketing boolean DEFAULT false,
  uf text,
  cidade text,
  pais text DEFAULT 'BR',
  primeira_compra timestamptz,
  ultima_compra timestamptz,
  nota text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- shopify_produtos
CREATE TABLE public.shopify_produtos (
  id bigint PRIMARY KEY,
  titulo text NOT NULL,
  tipo text,
  vendor text,
  tags text,
  status text DEFAULT 'active',
  variantes jsonb DEFAULT '[]',
  imagem_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- shopify_analytics
CREATE SEQUENCE IF NOT EXISTS shopify_analytics_id_seq;
CREATE TABLE public.shopify_analytics (
  id bigint PRIMARY KEY DEFAULT nextval('shopify_analytics_id_seq'),
  periodo date NOT NULL,
  sessoes integer DEFAULT 0,
  visitantes integer DEFAULT 0,
  pageviews integer DEFAULT 0,
  add_to_cart integer DEFAULT 0,
  checkouts_iniciados integer DEFAULT 0,
  pedidos_concluidos integer DEFAULT 0,
  taxa_conversao numeric DEFAULT 0,
  fonte text,
  dispositivo text,
  created_at timestamptz DEFAULT now()
);
ALTER SEQUENCE shopify_analytics_id_seq OWNED BY shopify_analytics.id;

-- shopify_checkouts_abandonados
CREATE TABLE public.shopify_checkouts_abandonados (
  id bigint PRIMARY KEY,
  data timestamptz,
  email text,
  valor_total numeric DEFAULT 0,
  itens jsonb DEFAULT '[]',
  url_recuperacao text,
  recuperado boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- shopify_sync_log
CREATE SEQUENCE IF NOT EXISTS shopify_sync_log_id_seq;
CREATE TABLE public.shopify_sync_log (
  id bigint PRIMARY KEY DEFAULT nextval('shopify_sync_log_id_seq'),
  tipo text NOT NULL,
  registros integer DEFAULT 0,
  status text DEFAULT 'sucesso',
  erro text,
  created_at timestamptz DEFAULT now()
);
ALTER SEQUENCE shopify_sync_log_id_seq OWNED BY shopify_sync_log.id;

-- rdstation_deals
CREATE SEQUENCE IF NOT EXISTS rdstation_deals_id_seq;
CREATE TABLE public.rdstation_deals (
  id bigint PRIMARY KEY DEFAULT nextval('rdstation_deals_id_seq'),
  rdstation_id text NOT NULL UNIQUE,
  name text,
  amount numeric DEFAULT 0,
  stage_id text,
  stage_name text,
  win boolean DEFAULT false,
  closed boolean DEFAULT false,
  user_name text,
  deal_source text,
  contact_name text,
  contact_email text,
  loss_reason text,
  created_at timestamptz,
  closed_at timestamptz,
  synced_at timestamptz DEFAULT now()
);
ALTER SEQUENCE rdstation_deals_id_seq OWNED BY rdstation_deals.id;

-- rdstation_contacts
CREATE SEQUENCE IF NOT EXISTS rdstation_contacts_id_seq;
CREATE TABLE public.rdstation_contacts (
  id bigint PRIMARY KEY DEFAULT nextval('rdstation_contacts_id_seq'),
  rdstation_id text NOT NULL UNIQUE,
  name text,
  email text,
  phone text,
  tags text[] DEFAULT '{}',
  synced_at timestamptz DEFAULT now()
);
ALTER SEQUENCE rdstation_contacts_id_seq OWNED BY rdstation_contacts.id;

-- rdstation_stages
CREATE SEQUENCE IF NOT EXISTS rdstation_stages_id_seq;
CREATE TABLE public.rdstation_stages (
  id bigint PRIMARY KEY DEFAULT nextval('rdstation_stages_id_seq'),
  rdstation_id text NOT NULL UNIQUE,
  name text,
  stage_order integer DEFAULT 0,
  deals_count integer DEFAULT 0,
  synced_at timestamptz DEFAULT now()
);
ALTER SEQUENCE rdstation_stages_id_seq OWNED BY rdstation_stages.id;

-- rdstation_tasks
CREATE SEQUENCE IF NOT EXISTS rdstation_tasks_id_seq;
CREATE TABLE public.rdstation_tasks (
  id bigint PRIMARY KEY DEFAULT nextval('rdstation_tasks_id_seq'),
  rdstation_id text NOT NULL UNIQUE,
  subject text,
  deal_id text,
  due_date timestamptz,
  done boolean DEFAULT false,
  synced_at timestamptz DEFAULT now()
);
ALTER SEQUENCE rdstation_tasks_id_seq OWNED BY rdstation_tasks.id;


-- ============================================================
-- 2. VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.shopify_resumo_mensal AS
SELECT
  (date_trunc('month', data))::date AS mes,
  count(*) AS pedidos,
  count(DISTINCT cliente_email) AS clientes_unicos,
  sum(valor_total) AS receita,
  avg(valor_total) AS ticket_medio,
  sum(frete) AS frete_total,
  sum(desconto) AS desconto_total,
  count(CASE WHEN status_financeiro = 'paid' THEN 1 ELSE NULL END) AS pedidos_pagos,
  count(CASE WHEN status_financeiro = 'pending' THEN 1 ELSE NULL END) AS pedidos_pendentes,
  count(CASE WHEN status_financeiro = 'refunded' THEN 1 ELSE NULL END) AS pedidos_reembolsados
FROM shopify_pedidos
GROUP BY (date_trunc('month', data))::date
ORDER BY (date_trunc('month', data))::date DESC;

CREATE OR REPLACE VIEW public.shopify_top_clientes AS
SELECT
  cliente_email,
  cliente_nome,
  count(*) AS total_pedidos,
  sum(valor_total) AS total_gasto,
  avg(valor_total) AS ticket_medio,
  max(data) AS ultima_compra,
  min(data) AS primeira_compra,
  max(uf) AS uf,
  max(cidade) AS cidade
FROM shopify_pedidos
WHERE cliente_email IS NOT NULL AND cliente_email <> ''
GROUP BY cliente_email, cliente_nome;

CREATE OR REPLACE VIEW public.shopify_vendas_por_estado AS
SELECT
  uf,
  count(*) AS pedidos,
  count(DISTINCT cliente_email) AS clientes,
  sum(valor_total) AS receita,
  avg(valor_total) AS ticket_medio,
  data
FROM shopify_pedidos
WHERE uf IS NOT NULL AND uf <> ''
GROUP BY uf, data;

CREATE OR REPLACE VIEW public.v_clientes_rfm AS
SELECT
  id, nome, tipo, uf, cidade, email, celular, loja,
  total_gasto, total_pedidos, ticket_medio, ultima_compra,
  segmento, acao_sugerida,
  CASE
    WHEN ultima_compra >= CURRENT_DATE - 30 THEN 5
    WHEN ultima_compra >= CURRENT_DATE - 60 THEN 4
    WHEN ultima_compra >= CURRENT_DATE - 90 THEN 3
    WHEN ultima_compra >= CURRENT_DATE - 180 THEN 2
    ELSE 1
  END AS rfm_r,
  CASE
    WHEN total_pedidos >= 10 THEN 5
    WHEN total_pedidos >= 5 THEN 4
    WHEN total_pedidos >= 3 THEN 3
    WHEN total_pedidos >= 2 THEN 2
    ELSE 1
  END AS rfm_f,
  CASE
    WHEN total_gasto >= 1000 THEN 5
    WHEN total_gasto >= 500 THEN 4
    WHEN total_gasto >= 250 THEN 3
    WHEN total_gasto >= 100 THEN 2
    ELSE 1
  END AS rfm_m,
  CURRENT_DATE - ultima_compra AS dias_sem_compra
FROM clientes c
WHERE total_gasto > 0;

CREATE OR REPLACE VIEW public.v_resumo_mensal AS
SELECT
  to_char(data::timestamptz, 'YYYY-MM') AS periodo,
  to_char(data::timestamptz, 'Mon/YY') AS periodo_label,
  count(*) AS pedidos,
  sum(valor_total) AS receita,
  avg(valor_total) AS ticket_medio,
  sum(custo) AS cmv,
  sum(lucro) AS lucro,
  count(DISTINCT cliente_id) AS clientes_unicos,
  count(DISTINCT uf) AS estados
FROM pedidos
WHERE situacao NOT IN ('Cancelado','Devolvido')
GROUP BY to_char(data::timestamptz, 'YYYY-MM'), to_char(data::timestamptz, 'Mon/YY')
ORDER BY to_char(data::timestamptz, 'YYYY-MM');

CREATE OR REPLACE VIEW public.v_shopify_por_estado AS
SELECT
  COALESCE(uf, 'N/D') AS uf,
  count(*) AS pedidos,
  sum(valor_total) AS receita,
  avg(valor_total) AS ticket_medio,
  count(DISTINCT cliente_email) AS clientes
FROM shopify_pedidos
WHERE status_financeiro NOT IN ('voided','refunded')
GROUP BY uf
ORDER BY sum(valor_total) DESC;

CREATE OR REPLACE VIEW public.v_shopify_resumo_mensal AS
SELECT
  to_char(data, 'YYYY-MM') AS periodo,
  count(*) AS pedidos,
  sum(valor_total) AS receita,
  avg(valor_total) AS ticket_medio,
  sum(desconto) AS descontos,
  sum(frete) AS frete_total,
  count(DISTINCT cliente_email) AS clientes_unicos,
  count(DISTINCT uf) AS estados
FROM shopify_pedidos
WHERE status_financeiro NOT IN ('voided','refunded')
GROUP BY to_char(data, 'YYYY-MM')
ORDER BY to_char(data, 'YYYY-MM');

CREATE OR REPLACE VIEW public.v_shopify_top_clientes AS
SELECT
  cliente_nome,
  cliente_email,
  count(*) AS pedidos,
  sum(valor_total) AS total_gasto,
  avg(valor_total) AS ticket_medio,
  max(data) AS ultima_compra,
  min(data) AS primeira_compra
FROM shopify_pedidos
WHERE status_financeiro NOT IN ('voided','refunded')
  AND cliente_nome IS NOT NULL
GROUP BY cliente_nome, cliente_email
ORDER BY sum(valor_total) DESC;

CREATE OR REPLACE VIEW public.v_top_produtos AS
SELECT
  to_char(p.data::timestamptz, 'YYYY-MM') AS periodo,
  item.value->>'nome' AS produto,
  item.value->>'codigo' AS sku,
  sum((item.value->>'quantidade')::numeric) AS quantidade,
  sum((item.value->>'valor')::numeric * (item.value->>'quantidade')::numeric) AS receita
FROM pedidos p,
  LATERAL jsonb_array_elements(p.itens) item(value)
WHERE p.situacao NOT IN ('Cancelado','Devolvido')
GROUP BY to_char(p.data::timestamptz, 'YYYY-MM'), item.value->>'nome', item.value->>'codigo';

CREATE OR REPLACE VIEW public.v_vendas_estado AS
SELECT
  to_char(data::timestamptz, 'YYYY-MM') AS periodo,
  COALESCE(uf, 'N/D') AS uf,
  count(*) AS pedidos,
  sum(valor_total) AS receita,
  avg(valor_total) AS ticket_medio,
  count(DISTINCT cliente_id) AS clientes
FROM pedidos
WHERE situacao NOT IN ('Cancelado','Devolvido')
GROUP BY to_char(data::timestamptz, 'YYYY-MM'), uf;

CREATE OR REPLACE VIEW public.vw_clientes_mes AS
SELECT
  to_char(ultima_compra::timestamptz, 'YYYY-MM') AS mes,
  nome, tipo, uf,
  total_gasto::numeric AS total_gasto,
  total_pedidos,
  ticket_medio::numeric AS ticket_medio,
  markup::numeric AS markup,
  lucro::numeric AS lucro,
  celular, loja, segmento, ultima_compra
FROM clientes
WHERE ultima_compra IS NOT NULL
  AND fonte IN ('bling_api_pedidos','bling')
  AND nome <> 'Consumidor Final';

CREATE OR REPLACE VIEW public.vw_resumo_mensal AS
SELECT
  to_char(ultima_compra::timestamptz, 'YYYY-MM') AS mes,
  count(*) AS clientes,
  sum(total_gasto::numeric) AS receita,
  sum(total_pedidos) AS pedidos,
  avg(total_gasto::numeric) AS ticket_medio,
  count(*) FILTER (WHERE tipo = 'B2B') AS b2b,
  count(*) FILTER (WHERE tipo = 'B2C') AS b2c,
  count(*) FILTER (WHERE celular IS NOT NULL AND celular <> '') AS com_celular,
  count(DISTINCT uf) AS estados
FROM clientes
WHERE ultima_compra IS NOT NULL
  AND fonte IN ('bling_api_pedidos','bling')
GROUP BY to_char(ultima_compra::timestamptz, 'YYYY-MM')
ORDER BY to_char(ultima_compra::timestamptz, 'YYYY-MM');

CREATE OR REPLACE VIEW public.vw_uf_mensal AS
SELECT
  to_char(ultima_compra::timestamptz, 'YYYY-MM') AS mes,
  uf,
  count(*) AS clientes,
  sum(total_gasto::numeric) AS receita,
  sum(total_pedidos) AS pedidos
FROM clientes
WHERE ultima_compra IS NOT NULL
  AND uf IS NOT NULL AND uf <> ''
  AND fonte IN ('bling_api_pedidos','bling')
GROUP BY to_char(ultima_compra::timestamptz, 'YYYY-MM'), uf
ORDER BY to_char(ultima_compra::timestamptz, 'YYYY-MM'), sum(total_gasto::numeric) DESC;


-- ============================================================
-- 3. FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_dashboard_periodo(data_ini date, data_fim date)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  resultado JSON;
BEGIN
  SELECT json_build_object(
    'receita', COALESCE(SUM(valor_total), 0),
    'pedidos', COUNT(*),
    'ticket_medio', COALESCE(AVG(valor_total), 0),
    'clientes_unicos', COUNT(DISTINCT cliente_id),
    'cmv', COALESCE(SUM(custo), 0),
    'lucro', COALESCE(SUM(lucro), 0),
    'estados', COUNT(DISTINCT uf),
    'por_estado', (
      SELECT json_agg(row_to_json(e)) FROM (
        SELECT COALESCE(uf, 'N/D') as uf, COUNT(*) as pedidos, SUM(valor_total) as receita,
          AVG(valor_total) as ticket_medio, COUNT(DISTINCT cliente_id) as clientes
        FROM pedidos WHERE data BETWEEN data_ini AND data_fim AND situacao NOT IN ('Cancelado','Devolvido')
        GROUP BY uf ORDER BY SUM(valor_total) DESC
      ) e
    ),
    'por_canal', (
      SELECT json_agg(row_to_json(c)) FROM (
        SELECT COALESCE(canal, loja, 'Outros') as canal, COUNT(*) as pedidos, SUM(valor_total) as receita
        FROM pedidos WHERE data BETWEEN data_ini AND data_fim AND situacao NOT IN ('Cancelado','Devolvido')
        GROUP BY COALESCE(canal, loja, 'Outros') ORDER BY SUM(valor_total) DESC
      ) c
    ),
    'top_clientes', (
      SELECT json_agg(row_to_json(tc)) FROM (
        SELECT cliente_nome as nome, COUNT(*) as pedidos, SUM(valor_total) as total, AVG(valor_total) as ticket_medio
        FROM pedidos WHERE data BETWEEN data_ini AND data_fim AND situacao NOT IN ('Cancelado','Devolvido')
        GROUP BY cliente_nome ORDER BY SUM(valor_total) DESC LIMIT 20
      ) tc
    )
  ) INTO resultado
  FROM pedidos
  WHERE data BETWEEN data_ini AND data_fim
    AND situacao NOT IN ('Cancelado', 'Devolvido');

  RETURN resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_shopify_periodo(data_ini date, data_fim date)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE resultado JSON;
BEGIN
  SELECT json_build_object(
    'receita', COALESCE(SUM(valor_total), 0),
    'pedidos', COUNT(*),
    'ticket_medio', COALESCE(AVG(valor_total), 0),
    'clientes_unicos', COUNT(DISTINCT cliente_email),
    'descontos', COALESCE(SUM(desconto), 0),
    'frete', COALESCE(SUM(frete), 0),
    'estados', COUNT(DISTINCT uf),
    'por_estado', (
      SELECT COALESCE(json_agg(row_to_json(e)), '[]'::json) FROM (
        SELECT COALESCE(uf, 'N/D') as uf, COUNT(*) as pedidos, SUM(valor_total) as receita,
          AVG(valor_total) as ticket_medio, COUNT(DISTINCT cliente_email) as clientes
        FROM shopify_pedidos WHERE data::date BETWEEN data_ini AND data_fim
          AND status_financeiro NOT IN ('voided','refunded')
        GROUP BY uf ORDER BY SUM(valor_total) DESC
      ) e
    ),
    'por_gateway', (
      SELECT COALESCE(json_agg(row_to_json(g)), '[]'::json) FROM (
        SELECT COALESCE(gateway_pagamento, 'Outros') as gateway, COUNT(*) as pedidos, SUM(valor_total) as receita
        FROM shopify_pedidos WHERE data::date BETWEEN data_ini AND data_fim
          AND status_financeiro NOT IN ('voided','refunded')
        GROUP BY gateway_pagamento ORDER BY COUNT(*) DESC
      ) g
    ),
    'top_clientes', (
      SELECT COALESCE(json_agg(row_to_json(tc)), '[]'::json) FROM (
        SELECT cliente_nome as nome, cliente_email as email, COUNT(*) as pedidos,
          SUM(valor_total) as total, AVG(valor_total) as ticket_medio
        FROM shopify_pedidos WHERE data::date BETWEEN data_ini AND data_fim
          AND status_financeiro NOT IN ('voided','refunded') AND cliente_nome IS NOT NULL
        GROUP BY cliente_nome, cliente_email ORDER BY SUM(valor_total) DESC LIMIT 20
      ) tc
    ),
    'por_dia', (
      SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json) FROM (
        SELECT data::date as dia, COUNT(*) as pedidos, SUM(valor_total) as receita
        FROM shopify_pedidos WHERE data::date BETWEEN data_ini AND data_fim
          AND status_financeiro NOT IN ('voided','refunded')
        GROUP BY data::date ORDER BY data::date
      ) d
    )
  ) INTO resultado
  FROM shopify_pedidos
  WHERE data::date BETWEEN data_ini AND data_fim
    AND status_financeiro NOT IN ('voided', 'refunded');

  RETURN resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_count INT;
  user_role TEXT;
  user_nome TEXT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM user_profiles;

  IF user_count = 0 THEN
    user_role := 'admin';
  ELSE
    user_role := 'leitor';
  END IF;

  user_nome := COALESCE(
    NEW.raw_user_meta_data->>'nome',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO user_profiles (id, email, nome, role, ativo)
  VALUES (NEW.id, NEW.email, user_nome, user_role, TRUE)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rdstation_dashboard_periodo(
  data_ini timestamp with time zone DEFAULT (now() - '1 year'::interval),
  data_fim timestamp with time zone DEFAULT now()
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE resultado JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_criadas', (SELECT count(*) FROM rdstation_deals WHERE created_at BETWEEN data_ini AND data_fim),
    'total_vendidas', (SELECT count(*) FROM rdstation_deals WHERE win = true AND closed_at BETWEEN data_ini AND data_fim),
    'total_perdidas', (SELECT count(*) FROM rdstation_deals WHERE closed = true AND win = false AND closed_at BETWEEN data_ini AND data_fim),
    'valor_vendido', COALESCE((SELECT sum(amount) FROM rdstation_deals WHERE win = true AND closed_at BETWEEN data_ini AND data_fim), 0),
    'valor_perdido', COALESCE((SELECT sum(amount) FROM rdstation_deals WHERE closed = true AND win = false AND closed_at BETWEEN data_ini AND data_fim), 0),
    'valor_pipeline', COALESCE((SELECT sum(amount) FROM rdstation_deals WHERE closed = false), 0),
    'ticket_medio', COALESCE((SELECT avg(amount) FROM rdstation_deals WHERE win = true AND closed_at BETWEEN data_ini AND data_fim), 0),
    'ciclo_medio_dias', COALESCE((SELECT avg(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400) FROM rdstation_deals WHERE win = true AND closed_at BETWEEN data_ini AND data_fim AND created_at IS NOT NULL), 0),
    'win_rate', CASE WHEN (SELECT count(*) FROM rdstation_deals WHERE closed = true AND closed_at BETWEEN data_ini AND data_fim) > 0
      THEN round((SELECT count(*)::numeric FROM rdstation_deals WHERE win = true AND closed_at BETWEEN data_ini AND data_fim) / (SELECT count(*)::numeric FROM rdstation_deals WHERE closed = true AND closed_at BETWEEN data_ini AND data_fim) * 100, 1) ELSE 0 END,
    'funil_stages', COALESCE((SELECT jsonb_agg(row_to_json(sub)::jsonb ORDER BY sub.stage_order) FROM (SELECT s.name AS stage_name, s.stage_order, count(d.id) AS deals_count, COALESCE(sum(d.amount), 0) AS valor FROM rdstation_stages s LEFT JOIN rdstation_deals d ON d.stage_name = s.name AND d.closed = false GROUP BY s.name, s.stage_order) sub), '[]'::jsonb),
    'perdas_por_motivo', COALESCE((SELECT jsonb_agg(row_to_json(sub)::jsonb ORDER BY sub.qtd DESC) FROM (SELECT COALESCE(loss_reason, 'Sem motivo') AS motivo, count(*) AS qtd, COALESCE(sum(amount), 0) AS valor FROM rdstation_deals WHERE closed = true AND win = false AND closed_at BETWEEN data_ini AND data_fim GROUP BY loss_reason LIMIT 10) sub), '[]'::jsonb),
    'top_perdidos', COALESCE((SELECT jsonb_agg(row_to_json(sub)::jsonb ORDER BY sub.amount DESC) FROM (SELECT name, amount, contact_name AS contact, loss_reason AS reason FROM rdstation_deals WHERE closed = true AND win = false AND closed_at BETWEEN data_ini AND data_fim ORDER BY amount DESC LIMIT 10) sub), '[]'::jsonb),
    'por_vendedor', COALESCE((SELECT jsonb_agg(row_to_json(sub)::jsonb ORDER BY sub.receita DESC) FROM (SELECT user_name, count(*) AS total, count(*) FILTER (WHERE win = true) AS vendidas, count(*) FILTER (WHERE closed = true AND win = false) AS perdidas, CASE WHEN count(*) FILTER (WHERE closed = true) > 0 THEN round(count(*) FILTER (WHERE win = true)::numeric / count(*) FILTER (WHERE closed = true)::numeric * 100, 1) ELSE 0 END AS win_rate, COALESCE(sum(amount) FILTER (WHERE win = true), 0) AS receita, COALESCE(avg(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400) FILTER (WHERE win = true AND created_at IS NOT NULL), 0) AS ciclo FROM rdstation_deals WHERE created_at BETWEEN data_ini AND data_fim GROUP BY user_name) sub), '[]'::jsonb),
    'evolucao_mensal', COALESCE((SELECT jsonb_agg(row_to_json(sub)::jsonb ORDER BY sub.mes) FROM (SELECT to_char(created_at, 'YYYY-MM') AS mes, count(*) AS criadas, count(*) FILTER (WHERE win = true) AS vendidas, COALESCE(sum(amount) FILTER (WHERE win = true), 0) AS receita FROM rdstation_deals WHERE created_at BETWEEN data_ini AND data_fim GROUP BY to_char(created_at, 'YYYY-MM')) sub), '[]'::jsonb),
    'total_contatos', (SELECT count(*) FROM rdstation_contacts),
    'contatos_com_deal', (SELECT count(DISTINCT contact_email) FROM rdstation_deals WHERE contact_email IS NOT NULL),
    'tarefas_total', (SELECT count(*) FROM rdstation_tasks),
    'tarefas_abertas', (SELECT count(*) FROM rdstation_tasks WHERE done = false),
    'tarefas_atrasadas', (SELECT count(*) FROM rdstation_tasks WHERE done = false AND due_date < now()),
    'tarefas_taxa_conclusao', CASE WHEN (SELECT count(*) FROM rdstation_tasks) > 0 THEN round((SELECT count(*)::numeric FROM rdstation_tasks WHERE done = true) / (SELECT count(*)::numeric FROM rdstation_tasks) * 100, 1) ELSE 0 END
  ) INTO resultado;
  RETURN resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.shopify_dashboard_periodo(data_ini date, data_fim date)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE resultado JSON;
BEGIN
  SELECT json_build_object(
    'pedidos', (SELECT count(*) FROM shopify_pedidos WHERE data::date BETWEEN data_ini AND data_fim),
    'receita', (SELECT coalesce(sum(valor_total), 0) FROM shopify_pedidos WHERE data::date BETWEEN data_ini AND data_fim),
    'clientes', (SELECT count(DISTINCT cliente_email) FROM shopify_pedidos WHERE data::date BETWEEN data_ini AND data_fim AND cliente_email IS NOT NULL AND cliente_email != ''),
    'ticket_medio', (SELECT coalesce(avg(valor_total), 0) FROM shopify_pedidos WHERE data::date BETWEEN data_ini AND data_fim),
    'pedidos_pagos', (SELECT count(*) FROM shopify_pedidos WHERE data::date BETWEEN data_ini AND data_fim AND status_financeiro = 'paid'),
    'frete_total', (SELECT coalesce(sum(frete), 0) FROM shopify_pedidos WHERE data::date BETWEEN data_ini AND data_fim),
    'desconto_total', (SELECT coalesce(sum(desconto), 0) FROM shopify_pedidos WHERE data::date BETWEEN data_ini AND data_fim),
    'por_estado', (SELECT coalesce(json_agg(row_to_json(e)), '[]'::json) FROM (
      SELECT uf, count(*) as pedidos, count(DISTINCT cliente_email) as clientes, sum(valor_total) as receita
      FROM shopify_pedidos WHERE data::date BETWEEN data_ini AND data_fim AND uf IS NOT NULL AND uf != ''
      GROUP BY uf ORDER BY receita DESC LIMIT 15
    ) e),
    'por_mes', (SELECT coalesce(json_agg(row_to_json(m)), '[]'::json) FROM (
      SELECT date_trunc('month', data)::date as mes, count(*) as pedidos, sum(valor_total) as receita
      FROM shopify_pedidos WHERE data::date BETWEEN data_ini AND data_fim
      GROUP BY 1 ORDER BY 1
    ) m),
    'top_clientes', (SELECT coalesce(json_agg(row_to_json(c)), '[]'::json) FROM (
      SELECT cliente_nome, cliente_email, count(*) as pedidos, sum(valor_total) as total_gasto, avg(valor_total) as ticket_medio, max(uf) as uf
      FROM shopify_pedidos WHERE data::date BETWEEN data_ini AND data_fim AND cliente_email IS NOT NULL AND cliente_email != ''
      GROUP BY cliente_nome, cliente_email ORDER BY total_gasto DESC LIMIT 20
    ) c)
  ) INTO resultado;
  RETURN resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.shopify_rfm_matrix()
 RETURNS TABLE(email text, nome text, uf text, cidade text, recency_days integer, frequency integer, monetary numeric, ticket_medio numeric, ultima_compra timestamp with time zone, primeira_compra timestamp with time zone, r_score integer, f_score integer, m_score integer, rfm_score integer, segmento text)
 LANGUAGE sql
 STABLE
AS $function$
  WITH cliente_stats AS (
    SELECT
      cliente_email AS email,
      MAX(cliente_nome) AS nome,
      MAX(uf) AS uf,
      MAX(cidade) AS cidade,
      EXTRACT(DAY FROM NOW() - MAX(data))::INT AS recency_days,
      COUNT(*)::INT AS frequency,
      SUM(valor_total) AS monetary,
      AVG(valor_total) AS ticket_medio,
      MAX(data) AS ultima_compra,
      MIN(data) AS primeira_compra
    FROM shopify_pedidos
    WHERE cliente_email IS NOT NULL
      AND cliente_email != ''
      AND status_financeiro = 'paid'
    GROUP BY cliente_email
  ),
  scored AS (
    SELECT *,
      CASE
        WHEN recency_days <= 30 THEN 5
        WHEN recency_days <= 60 THEN 4
        WHEN recency_days <= 90 THEN 3
        WHEN recency_days <= 180 THEN 2
        ELSE 1
      END AS r_score,
      CASE
        WHEN frequency >= 10 THEN 5
        WHEN frequency >= 5 THEN 4
        WHEN frequency >= 3 THEN 3
        WHEN frequency >= 2 THEN 2
        ELSE 1
      END AS f_score,
      CASE
        WHEN monetary >= 2000 THEN 5
        WHEN monetary >= 1000 THEN 4
        WHEN monetary >= 500 THEN 3
        WHEN monetary >= 200 THEN 2
        ELSE 1
      END AS m_score
    FROM cliente_stats
  )
  SELECT
    email, nome, uf, cidade,
    recency_days, frequency, monetary, ticket_medio,
    ultima_compra, primeira_compra,
    r_score, f_score, m_score,
    (r_score + f_score + m_score) AS rfm_score,
    CASE
      WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'Campeoes'
      WHEN r_score >= 4 AND f_score >= 3 THEN 'Leais'
      WHEN r_score >= 4 AND f_score <= 2 THEN 'Novos Promissores'
      WHEN r_score >= 3 AND f_score >= 3 THEN 'Potenciais Leais'
      WHEN r_score = 3 AND f_score <= 2 THEN 'Precisam Atencao'
      WHEN r_score = 2 AND f_score >= 3 THEN 'Em Risco'
      WHEN r_score = 2 AND f_score <= 2 THEN 'Quase Perdidos'
      WHEN r_score = 1 AND f_score >= 4 THEN 'Nao Pode Perder'
      WHEN r_score = 1 AND f_score >= 2 THEN 'Hibernando'
      ELSE 'Perdidos'
    END AS segmento
  FROM scored
  ORDER BY rfm_score DESC, monetary DESC;
$function$;

CREATE OR REPLACE FUNCTION public.shopify_rfm_resumo()
 RETURNS TABLE(segmento text, total_clientes bigint, receita_total numeric, ticket_medio numeric, frequencia_media numeric, recencia_media numeric)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    segmento,
    COUNT(*) AS total_clientes,
    SUM(monetary) AS receita_total,
    AVG(ticket_medio) AS ticket_medio,
    AVG(frequency)::NUMERIC AS frequencia_media,
    AVG(recency_days)::NUMERIC AS recencia_media
  FROM shopify_rfm_matrix()
  GROUP BY segmento
  ORDER BY receita_total DESC;
$function$;

CREATE OR REPLACE FUNCTION public.shopify_rfm_top_clientes()
 RETURNS TABLE(email text, nome text, uf text, cidade text, recency_days integer, frequency integer, monetary numeric, ticket_medio numeric, ultima_compra timestamp with time zone, primeira_compra timestamp with time zone, r_score integer, f_score integer, m_score integer, rfm_score integer, segmento text)
 LANGUAGE sql
 STABLE
AS $function$
  WITH ranked AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY m.segmento ORDER BY m.monetary DESC) as rn
    FROM shopify_rfm_matrix() m
  )
  SELECT email, nome, uf, cidade, recency_days, frequency, monetary, ticket_medio,
         ultima_compra, primeira_compra, r_score, f_score, m_score, rfm_score, segmento
  FROM ranked WHERE rn <= 50;
$function$;


-- ============================================================
-- 4. RLS ENABLE + POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas_periodo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas_estado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas_canal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bling_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bling_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_checkouts_abandonados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rdstation_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rdstation_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rdstation_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rdstation_tasks ENABLE ROW LEVEL SECURITY;

-- Policies: clientes
CREATE POLICY allow_all_clientes ON public.clientes FOR ALL TO public USING (true) WITH CHECK (true);

-- Policies: produtos
CREATE POLICY allow_all_produtos ON public.produtos FOR ALL TO public USING (true) WITH CHECK (true);

-- Policies: vendas_periodo
CREATE POLICY allow_all_vendas_periodo ON public.vendas_periodo FOR ALL TO public USING (true) WITH CHECK (true);

-- Policies: vendas_estado
CREATE POLICY allow_all_vendas_estado ON public.vendas_estado FOR ALL TO public USING (true) WITH CHECK (true);

-- Policies: vendas_canal
CREATE POLICY allow_all_vendas_canal ON public.vendas_canal FOR ALL TO public USING (true) WITH CHECK (true);

-- Policies: custos
CREATE POLICY allow_all_custos ON public.custos FOR ALL TO public USING (true) WITH CHECK (true);

-- Policies: fornecedores
CREATE POLICY allow_all_fornecedores ON public.fornecedores FOR ALL TO public USING (true) WITH CHECK (true);

-- Policies: importacoes
CREATE POLICY allow_all_importacoes ON public.importacoes FOR ALL TO public USING (true) WITH CHECK (true);

-- Policies: bling_tokens
CREATE POLICY allow_all_bling_tokens ON public.bling_tokens FOR ALL TO public USING (true) WITH CHECK (true);

-- Policies: bling_sync_log
CREATE POLICY allow_all_bling_sync_log ON public.bling_sync_log FOR ALL TO public USING (true) WITH CHECK (true);

-- Policies: pedidos
CREATE POLICY pedidos_read ON public.pedidos FOR SELECT TO public USING (true);
CREATE POLICY pedidos_write ON public.pedidos FOR ALL TO public USING (true);

-- Policies: shopify_tokens
CREATE POLICY shopify_tokens_all ON public.shopify_tokens FOR ALL TO public USING (true);

-- Policies: shopify_pedidos
CREATE POLICY shopify_pedidos_all ON public.shopify_pedidos FOR ALL TO public USING (true);

-- Policies: shopify_clientes
CREATE POLICY shopify_clientes_all ON public.shopify_clientes FOR ALL TO public USING (true);

-- Policies: shopify_produtos
CREATE POLICY shopify_produtos_all ON public.shopify_produtos FOR ALL TO public USING (true);

-- Policies: shopify_analytics
CREATE POLICY shopify_analytics_all ON public.shopify_analytics FOR ALL TO public USING (true);

-- Policies: shopify_checkouts_abandonados
CREATE POLICY shopify_checkouts_all ON public.shopify_checkouts_abandonados FOR ALL TO public USING (true);

-- Policies: shopify_sync_log
CREATE POLICY shopify_sync_log_all ON public.shopify_sync_log FOR ALL TO public USING (true);

-- Policies: rdstation_deals
CREATE POLICY rdstation_deals_select ON public.rdstation_deals FOR SELECT TO public USING (true);
CREATE POLICY rdstation_deals_service ON public.rdstation_deals FOR ALL TO public USING (auth.role() = 'service_role');

-- Policies: rdstation_contacts
CREATE POLICY rdstation_contacts_select ON public.rdstation_contacts FOR SELECT TO public USING (true);
CREATE POLICY rdstation_contacts_service ON public.rdstation_contacts FOR ALL TO public USING (auth.role() = 'service_role');

-- Policies: rdstation_stages
CREATE POLICY rdstation_stages_select ON public.rdstation_stages FOR SELECT TO public USING (true);
CREATE POLICY rdstation_stages_service ON public.rdstation_stages FOR ALL TO public USING (auth.role() = 'service_role');

-- Policies: rdstation_tasks
CREATE POLICY rdstation_tasks_select ON public.rdstation_tasks FOR SELECT TO public USING (true);
CREATE POLICY rdstation_tasks_service ON public.rdstation_tasks FOR ALL TO public USING (auth.role() = 'service_role');

-- Policies: user_profiles
CREATE POLICY authenticated_read ON public.user_profiles FOR SELECT TO public USING (auth.role() = 'authenticated');
CREATE POLICY own_update ON public.user_profiles FOR UPDATE TO public USING (auth.uid() = id);
CREATE POLICY service_write ON public.user_profiles FOR ALL TO public USING (auth.role() = 'service_role');


-- ============================================================
-- 5. TRIGGERS
-- ============================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

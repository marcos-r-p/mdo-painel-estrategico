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

-- 4. Margem por Produto (Shopify items x Bling costs)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_margem_produto AS
WITH receita_produto AS (
  SELECT item->>'sku' AS sku,
         item->>'titulo' AS produto,
         SUM((item->>'preco')::numeric * (item->>'quantidade')::numeric) AS receita,
         SUM((item->>'quantidade')::numeric) AS quantidade_vendida
  FROM shopify_pedidos sp
  INNER JOIN bling_contas_receber bcr ON sp.numero = bcr.numero_documento
  CROSS JOIN LATERAL jsonb_array_elements(sp.itens) AS item
  WHERE sp.itens IS NOT NULL AND jsonb_array_length(sp.itens) > 0
  GROUP BY 1, 2
),
custo_produto AS (
  SELECT item->>'sku' AS sku,
         SUM((item->>'valor_total')::numeric) / NULLIF(SUM((item->>'quantidade')::numeric), 0) AS custo_medio
  FROM bling_pedidos_compra
  CROSS JOIN LATERAL jsonb_array_elements(itens) AS item
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

-- 6. Comparativo Mensal (todos os meses, 5 metricas)
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

-- 7. Receita por UF (Bling x Shopify)
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

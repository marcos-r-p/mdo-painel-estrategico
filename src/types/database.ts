// ─── Supabase Database Types ─────────────────────────────────
// Interfaces matching Supabase tables and views (snake_case field names).

// ── Views ────────────────────────────────────────────────────

/** fn_resumo_mensal_por_fonte / vw_resumo_mensal — monthly summary */
export interface VwResumoMensal {
  mes: string;
  clientes: number;
  receita: number;
  pedidos: number;
  ticket_medio: number;
  b2b: number;
  b2c: number;
  com_celular: number;
  estados: number;
}

/** fn_clientes_mes_por_fonte / vw_clientes_mes — clients per month */
export interface VwClientesMes {
  mes: string;
  nome: string;
  tipo: string;
  uf: string;
  total_gasto: number;
  total_pedidos: number;
  ultima_compra: string;
}

/** vw_uf_mensal — monthly sales by state view */
export interface VwUfMensal {
  mes: string;
  uf: string;
  pedidos: number;
  receita: number;
  clientes: number;
}

// ── Shopify Tables ───────────────────────────────────────────

export interface ShopifyPedido {
  id: number;
  numero: string | null;
  data: string | null;
  cliente_email: string | null;
  cliente_nome: string | null;
  valor_total: number;
  subtotal: number;
  frete: number | null;
  desconto: number | null;
  impostos: number | null;
  status_financeiro: string | null;
  status_fulfillment: string | null;
  canal: string | null;
  gateway_pagamento: string | null;
  uf: string | null;
  cidade: string | null;
  pais: string | null;
  itens: Array<{ sku: string; titulo: string; quantidade: number; preco: number }> | null;
  tags: string | null;
  nota: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopifyCliente {
  id: number;
  shopify_id: string;
  email: string | null;
  nome: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  total_pedidos: number;
  total_gasto: number;
  primeiro_pedido: string | null;
  ultimo_pedido: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopifyProduto {
  id: number;
  shopify_id: string;
  titulo: string;
  tipo: string | null;
  fornecedor: string | null;
  sku: string | null;
  preco: number;
  preco_comparacao: number | null;
  estoque: number;
  status: string | null;
  imagem_url: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

// ── RD Station Tables ────────────────────────────────────────

export interface RDStationDeal {
  id: number;
  rd_id: string;
  nome: string | null;
  valor: number;
  stage_id: string | null;
  stage_name: string | null;
  status: string | null;
  win: boolean | null;
  loss_reason: string | null;
  contact_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  user_id: string | null;
  user_name: string | null;
  source: string | null;
  campaign: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface RDStationContact {
  id: number;
  rd_id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  empresa: string | null;
  cargo: string | null;
  cidade: string | null;
  uf: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

export interface RDStationStage {
  id: number;
  rd_id: string;
  nome: string;
  stage_order: number;
  pipeline_id: string | null;
  created_at: string;
}

export interface RDStationTask {
  id: number;
  rd_id: string;
  deal_id: string | null;
  contact_id: string | null;
  tipo: string | null;
  descricao: string | null;
  status: string | null;
  data_limite: string | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
  updated_at: string;
}

// ── Auth / User Tables ───────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  nome: string | null;
  role_id: string;
  role_nome: string;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}


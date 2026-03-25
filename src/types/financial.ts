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

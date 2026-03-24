import type { NavigationSection } from '../types/domain'

export const NAVIGATION_SECTIONS: NavigationSection[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'DB', ariaLabel: 'Dashboard', path: '/app/dashboard' },
  { id: 'fluxo', label: 'Fluxo de Caixa', icon: 'FC', ariaLabel: 'Fluxo de Caixa', path: '/app/fluxo-caixa' },
  { id: 'clientes', label: 'Clientes', icon: 'CL', ariaLabel: 'Clientes', path: '/app/clientes' },
  { id: 'b2c', label: 'Análise B2C', icon: 'B2C', ariaLabel: 'Análise B2C', path: '/app/analise-b2c' },
  { id: 'rfm', label: 'Matriz RFM', icon: 'RFM', ariaLabel: 'Matriz RFM', path: '/app/matriz-rfm' },
  { id: 'b2b', label: 'Canais B2B', icon: 'B2B', ariaLabel: 'Canais B2B', path: '/app/canais-b2b' },
  { id: 'produtos', label: 'Produtos', icon: 'PR', ariaLabel: 'Produtos', path: '/app/produtos' },
  { id: 'temporal', label: 'Análise Temporal', icon: 'AT', ariaLabel: 'Análise Temporal', path: '/app/analise-temporal' },
  { id: 'shopify', label: 'Shopify', icon: 'SH', ariaLabel: 'Shopify', path: '/app/shopify' },
  { id: 'crm', label: 'CRM', icon: 'CRM', ariaLabel: 'CRM', path: '/app/crm' },
  { id: 'funil', label: 'Funil', icon: 'FN', ariaLabel: 'Funil de Vendas', path: '/app/funil' },
  { id: 'analise', label: 'Análise IA', icon: 'IA', ariaLabel: 'Análise por Inteligência Artificial', path: '/app/analise-ia' },
  { id: 'metas', label: 'Metas 90 Dias', icon: 'MT', ariaLabel: 'Metas 90 Dias', path: '/app/metas' },
  { id: 'alertas', label: 'Alertas', icon: 'AL', ariaLabel: 'Alertas', path: '/app/alertas' },
]

/** Map route path segment → page_key used in role_permissions */
export const PAGE_KEYS: Record<string, string> = {
  dashboard: 'dashboard',
  'fluxo-caixa': 'fluxo-caixa',
  clientes: 'clientes',
  'analise-b2c': 'analise-b2c',
  'matriz-rfm': 'matriz-rfm',
  'canais-b2b': 'canais-b2b',
  produtos: 'produtos',
  'analise-temporal': 'analise-temporal',
  shopify: 'shopify',
  crm: 'crm',
  funil: 'funil',
  'analise-ia': 'analise-ia',
  metas: 'metas',
  alertas: 'alertas',
}

export const ADMIN_NAVIGATION: NavigationSection[] = [
  { id: 'admin-usuarios', label: 'Usuários', icon: 'US', ariaLabel: 'Gerenciar Usuários', path: '/app/admin/usuarios' },
  { id: 'admin-roles', label: 'Roles e Permissões', icon: 'RP', ariaLabel: 'Gerenciar Roles e Permissões', path: '/app/admin/roles' },
  { id: 'admin-logs', label: 'Logs de Acesso', icon: 'LG', ariaLabel: 'Logs de Acesso', path: '/app/admin/logs' },
]

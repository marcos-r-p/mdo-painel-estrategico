import type { NavigationSection } from '../types/domain'

export const NAVIGATION_SECTIONS: NavigationSection[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/app/dashboard' },
  { id: 'fluxo', label: 'Fluxo de Caixa', icon: '💰', path: '/app/fluxo-caixa' },
  { id: 'clientes', label: 'Clientes', icon: '👥', path: '/app/clientes' },
  { id: 'b2c', label: 'Análise B2C', icon: '🛒', path: '/app/analise-b2c' },
  { id: 'rfm', label: 'Matriz RFM', icon: '🎯', path: '/app/matriz-rfm' },
  { id: 'b2b', label: 'Canais B2B', icon: '🏢', path: '/app/canais-b2b' },
  { id: 'produtos', label: 'Produtos', icon: '📦', path: '/app/produtos' },
  { id: 'temporal', label: 'Análise Temporal', icon: '📈', path: '/app/analise-temporal' },
  { id: 'shopify', label: 'Shopify', icon: '🟢', path: '/app/shopify' },
  { id: 'crm', label: 'CRM', icon: '📞', path: '/app/crm' },
  { id: 'funil', label: 'Funil', icon: '🔻', path: '/app/funil' },
  { id: 'analise', label: 'Análise IA', icon: '🤖', path: '/app/analise-ia' },
  { id: 'metas', label: 'Metas 90 Dias', icon: '🎯', path: '/app/metas' },
  { id: 'alertas', label: 'Alertas', icon: '🚨', path: '/app/alertas' },
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
  { id: 'admin-usuarios', label: 'Usuários', icon: '👤', path: '/app/admin/usuarios' },
  { id: 'admin-roles', label: 'Roles e Permissões', icon: '🔑', path: '/app/admin/roles' },
  { id: 'admin-logs', label: 'Logs de Acesso', icon: '📋', path: '/app/admin/logs' },
]

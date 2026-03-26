import type { NavigationItem, NavigationGroup } from '../types/domain'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  ShoppingBag,
  Grid3X3,
  Building2,
  Package,
  CalendarRange,
  Store,
  Handshake,
  Filter,
  BrainCircuit,
  Target,
  Bell,
  HeartPulse,
  UserCog,
  Shield,
  FileText,
} from 'lucide-react'

export const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    groupLabel: 'Financeiro',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, ariaLabel: 'Dashboard', path: '/app/dashboard' },
      { id: 'fluxo', label: 'Fluxo de Caixa', icon: ArrowLeftRight, ariaLabel: 'Fluxo de Caixa', path: '/app/fluxo-caixa' },
    ],
  },
  {
    groupLabel: 'Clientes & Vendas',
    items: [
      { id: 'clientes', label: 'Clientes', icon: Users, ariaLabel: 'Clientes', path: '/app/clientes' },
      { id: 'b2c', label: 'Análise B2C', icon: ShoppingBag, ariaLabel: 'Análise B2C', path: '/app/analise-b2c' },
      { id: 'rfm', label: 'Matriz RFM', icon: Grid3X3, ariaLabel: 'Matriz RFM', path: '/app/matriz-rfm' },
      { id: 'crm', label: 'CRM', icon: Handshake, ariaLabel: 'CRM', path: '/app/crm' },
      { id: 'funil', label: 'Funil', icon: Filter, ariaLabel: 'Funil de Vendas', path: '/app/funil' },
    ],
  },
  {
    groupLabel: 'Canais & Produtos',
    items: [
      { id: 'b2b', label: 'Canais B2B', icon: Building2, ariaLabel: 'Canais B2B', path: '/app/canais-b2b' },
      { id: 'produtos', label: 'Produtos', icon: Package, ariaLabel: 'Produtos', path: '/app/produtos' },
      { id: 'shopify', label: 'Shopify', icon: Store, ariaLabel: 'Shopify', path: '/app/shopify' },
    ],
  },
  {
    groupLabel: 'Inteligência',
    items: [
      { id: 'temporal', label: 'Análise Temporal', icon: CalendarRange, ariaLabel: 'Análise Temporal', path: '/app/analise-temporal' },
      { id: 'analise', label: 'Análise IA', icon: BrainCircuit, ariaLabel: 'Análise por Inteligência Artificial', path: '/app/analise-ia' },
      { id: 'saude-ecommerce', label: 'Saúde E-commerce', icon: HeartPulse, ariaLabel: 'Saúde do E-commerce', path: '/app/saude-ecommerce' },
    ],
  },
  {
    groupLabel: 'Gestão',
    items: [
      { id: 'metas', label: 'Metas 90 Dias', icon: Target, ariaLabel: 'Metas 90 Dias', path: '/app/metas' },
      { id: 'alertas', label: 'Alertas', icon: Bell, ariaLabel: 'Alertas', path: '/app/alertas' },
    ],
  },
]

/** Flat list for backwards compatibility (e.g. route guards) */
export const NAVIGATION_SECTIONS: NavigationItem[] = NAVIGATION_GROUPS.flatMap((g) => g.items)

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
  'saude-ecommerce': 'saude-ecommerce',
}

export const ADMIN_NAVIGATION: NavigationItem[] = [
  { id: 'admin-usuarios', label: 'Usuários', icon: UserCog, ariaLabel: 'Gerenciar Usuários', path: '/app/admin/usuarios' },
  { id: 'admin-roles', label: 'Roles e Permissões', icon: Shield, ariaLabel: 'Gerenciar Roles e Permissões', path: '/app/admin/roles' },
  { id: 'admin-logs', label: 'Logs de Acesso', icon: FileText, ariaLabel: 'Logs de Acesso', path: '/app/admin/logs' },
]

import { useState, useMemo, useCallback } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import SectionCard from '../components/ui/SectionCard'
import KPICard from '../components/ui/KPICard'
import Badge from '../components/ui/Badge'
import ProgressBar from '../components/ui/ProgressBar'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------
type TabId = 'overview' | 'gmc' | 'checklist'
type Priority = 'p0' | 'p1' | 'p2'

interface ChecklistItem {
  id: string
  title: string
  impact: string
  priority: Priority
}

interface AlertItem {
  id: string
  severity: 'critical' | 'warning' | 'info' | 'gmc'
  title: string
  description: string
}

// -------------------------------------------------------------------
// Static data
// -------------------------------------------------------------------
const CHECKLIST_ITEMS: ChecklistItem[] = [
  // P0 — Crítico
  { id: 'p0-1', title: 'Instalar app de reviews (Judge.me)', impact: '+15-30% conversao', priority: 'p0' },
  { id: 'p0-2', title: 'WhatsApp fixo na pagina de produto', impact: '+10-20% conversao', priority: 'p0' },
  { id: 'p0-3', title: 'Calculadora de frete na PDP', impact: '+5-15% conversao', priority: 'p0' },
  { id: 'p0-4', title: 'Ocultar 409 SKUs sem estoque', impact: '+10-15% UX', priority: 'p0' },
  { id: 'p0-5', title: 'Banner com rating na home (4.6)', impact: '+5-10% trust', priority: 'p0' },
  // P1 — Alto
  { id: 'p1-1', title: 'Navegacao por beneficio/uso', impact: '+20-40% conversao', priority: 'p1' },
  { id: 'p1-2', title: 'Cross-sell "Combine com..."', impact: '+10-20% AOV', priority: 'p1' },
  { id: 'p1-3', title: 'Selos de confianca (SSL, etc)', impact: '+5-10% conversao', priority: 'p1' },
  { id: 'p1-4', title: 'Busca preditiva/autocomplete', impact: '+10-15% findability', priority: 'p1' },
  { id: 'p1-5', title: 'Badges "Mais Vendido" nos cards', impact: '+5-10% CTR', priority: 'p1' },
  // P2 — Medio
  { id: 'p2-1', title: 'Scroll infinito em colecoes', impact: '+5% UX', priority: 'p2' },
  { id: 'p2-2', title: 'Quick-add no hover', impact: '+5% UX', priority: 'p2' },
  { id: 'p2-3', title: 'Exit intent popup', impact: '+3-5% recovery', priority: 'p2' },
  { id: 'p2-4', title: 'Timer/urgencia no carrinho', impact: '+3-5% conversao', priority: 'p2' },
  { id: 'p2-5', title: 'Videos de uso nas PDPs', impact: '+5-10% confianca', priority: 'p2' },
]

const ALERTS: AlertItem[] = [
  { id: 'a1', severity: 'critical', title: 'Conversao critica: 0.45%', description: '70% abaixo do benchmark (1.5%)' },
  { id: 'a2', severity: 'critical', title: '76% do catalogo sem estoque', description: '409 de 537 oleos vegetais indisponiveis' },
  { id: 'a3', severity: 'warning', title: 'Zero reviews visiveis', description: '4.914 avaliacoes nao aparecem nas PDPs' },
  { id: 'a4', severity: 'gmc', title: 'Google Merchant Center desconectado', description: 'Conecte para analise de performance por produto' },
  { id: 'a5', severity: 'info', title: 'Ticket CRM 2.5x maior que site', description: 'R$447 vs R$177 — oportunidade de upsell' },
]

const FUNNEL_STEPS = [
  { label: 'Sessoes', value: 8200, rate: null, width: 100 },
  { label: 'Add to Cart', value: 369, rate: 4.5, width: 45 },
  { label: 'Checkout', value: 164, rate: 44, width: 20 },
  { label: 'Compras', value: 37, rate: 22, width: 9 },
]

const PRIORITY_CONFIG: Record<Priority, { label: string; badgeType: 'critico' | 'alto' | 'medio'; color: string }> = {
  p0: { label: 'Prioridade Critica (P0)', badgeType: 'critico', color: 'red' },
  p1: { label: 'Prioridade Alta (P1)', badgeType: 'alto', color: 'orange' },
  p2: { label: 'Prioridade Media (P2)', badgeType: 'medio', color: 'green' },
}

const STORAGE_KEY = 'mdo-saude-ecommerce-checked'

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------
function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch { /* ignore */ }
  return new Set()
}

function saveChecked(items: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...items]))
}

function formatNumber(n: number): string {
  return n.toLocaleString('pt-BR')
}

// -------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 10) * circumference
  const colorClass = score < 5 ? 'text-red-500' : score < 7.5 ? 'text-amber-500' : 'text-green-500'
  const statusLabel = score < 5 ? 'Critico' : score < 7.5 ? 'Precisa Atencao' : 'Saudavel'
  const statusBg = score < 5 ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : score < 7.5 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400'

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="relative w-36 h-36 mb-3">
        <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
          <circle cx="72" cy="72" r="54" fill="none" stroke="currentColor" strokeWidth="10"
            className="text-gray-200 dark:text-gray-700" />
          <circle cx="72" cy="72" r="54" fill="none" strokeWidth="10" strokeLinecap="round"
            className={colorClass}
            style={{ strokeDasharray: circumference, strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease-out' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">{score.toFixed(1)}</span>
          <span className="text-sm text-gray-400">/10</span>
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Score Geral</p>
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusBg}`}>
        {statusLabel}
      </span>
    </div>
  )
}

function FunnelChart() {
  const barColors = [
    'bg-green-500',
    'bg-green-500/70',
    'bg-green-500/50',
    'bg-amber-500',
  ]

  return (
    <div className="space-y-2">
      {FUNNEL_STEPS.map((step, i) => (
        <div key={step.label} className="flex items-center gap-2">
          <span className="w-24 text-xs text-gray-500 dark:text-gray-400 shrink-0">{step.label}</span>
          <div className="flex-1">
            <div
              className={`h-7 rounded ${barColors[i]} flex items-center px-2 transition-all duration-500`}
              style={{ width: `${step.width}%` }}
            >
              {step.width > 15 && (
                <span className="text-[11px] font-semibold text-white">
                  {step.rate != null ? `${step.rate}%` : '100%'}
                </span>
              )}
            </div>
          </div>
          <span className={`w-16 text-right text-sm font-semibold ${i === FUNNEL_STEPS.length - 1 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
            {formatNumber(step.value)}
          </span>
          <span className="w-12 text-right text-xs text-gray-400">
            {step.rate != null ? `${step.rate}%` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

function AlertsList() {
  const severityStyles: Record<string, string> = {
    critical: 'bg-red-50 border-l-red-500 dark:bg-red-950/30 dark:border-l-red-400',
    warning: 'bg-amber-50 border-l-amber-500 dark:bg-amber-950/30 dark:border-l-amber-400',
    info: 'bg-blue-50 border-l-blue-500 dark:bg-blue-950/30 dark:border-l-blue-400',
    gmc: 'bg-blue-50 border-l-blue-500 dark:bg-blue-950/30 dark:border-l-blue-400',
  }

  return (
    <div className="space-y-2">
      {ALERTS.map((alert) => (
        <div key={alert.id} className={`flex items-start gap-2 p-3 rounded-lg border-l-4 ${severityStyles[alert.severity]}`}>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{alert.title}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{alert.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function GmcPendingMetrics() {
  const metrics = ['Impressoes', 'Cliques GMC', 'CTR', 'Conversoes GMC', 'Receita GMC']
  const subs = ['Google Shopping', 'Trafego qualificado', 'Bench: 1-2%', 'Atribuidas ao Google', 'Free + Ads']

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {metrics.map((m, i) => (
        <div key={m} className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{m}</p>
          <p className="text-2xl font-bold text-gray-300 dark:text-gray-600">--</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{subs[i]}</p>
        </div>
      ))}
    </div>
  )
}

// -------------------------------------------------------------------
// Main page
// -------------------------------------------------------------------
export default function SaudeEcommercePage() {
  useDocumentTitle('Saude do E-commerce')

  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [checked, setChecked] = useState<Set<string>>(loadChecked)

  const toggleItem = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveChecked(next)
      return next
    })
  }, [])

  // Derived state
  const counts = useMemo(() => {
    const byPriority = (p: Priority) => CHECKLIST_ITEMS.filter((it) => it.priority === p)
    const checkedByPriority = (p: Priority) => byPriority(p).filter((it) => checked.has(it.id)).length
    const total = checked.size
    const p0 = checkedByPriority('p0')
    const p1 = checkedByPriority('p1')
    const p2 = checkedByPriority('p2')

    let score = 5.5
    score += p0 * 0.5
    score += p1 * 0.3
    score += p2 * 0.1
    score = Math.min(10, score)

    return { total, p0, p1, p2, score }
  }, [checked])

  const tabs: { id: TabId; label: string; extra?: string }[] = [
    { id: 'overview', label: 'Visao Geral' },
    { id: 'gmc', label: 'Google Merchant', extra: 'Pendente' },
    { id: 'checklist', label: 'Checklist UX' },
  ]

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Saude do E-commerce</h2>
          <Badge type="positivo">CRO + GMC</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2
              ${activeTab === tab.id
                ? 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800'
              }`}
          >
            {tab.label}
            {tab.extra && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                {tab.extra}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ================================================================ */}
      {/* TAB: Visao Geral */}
      {/* ================================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Score + Conversion metrics */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            <SectionCard>
              <ScoreRing score={counts.score} />
            </SectionCard>

            <SectionCard title="Metricas de Conversao">
              <div className="flex items-center gap-2 mb-4">
                <Badge type="positivo">Shopify</Badge>
                <Badge type="medio">Manual</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KPICard label="Taxa de Conversao" value="0.45%" subvalue="Meta: 1.5% | -70%" color="red" />
                <KPICard label="Sessoes (30d)" value="8.200" subvalue="+15% vs mes ant." color="blue" />
                <KPICard label="Add to Cart" value="4.5%" subvalue="Bench: 8-10% | -50%" color="orange" />
                <KPICard label="Abandono Checkout" value="78%" subvalue="Bench: 65-70%" color="orange" />
              </div>
            </SectionCard>
          </div>

          {/* GMC Preview */}
          <SectionCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-blue-500 font-semibold text-base">Google Merchant Center</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                Aguardando conexao
              </span>
            </div>
            <GmcPendingMetrics />
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
              Conecte para ver impressoes, cliques, CTR e conversoes por produto
            </p>
          </SectionCard>

          {/* Funnel + Alerts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard title="Funil de Conversao">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Ultimos 30 dias</p>
              <FunnelChart />

              {/* Channel comparison */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Google Shopping</p>
                  <p className="text-xl font-bold text-blue-500">--</p>
                  <p className="text-[11px] text-gray-400">Aguardando GMC</p>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-center">
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Organico</p>
                  <p className="text-xl font-bold text-green-500">~60%</p>
                  <p className="text-[11px] text-gray-400">Estimado</p>
                </div>
                <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-3 text-center">
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Direto/Outros</p>
                  <p className="text-xl font-bold text-purple-500">~40%</p>
                  <p className="text-[11px] text-gray-400">Estimado</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Alertas Ativos">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 dark:text-gray-500">{ALERTS.length} alertas</span>
              </div>
              <AlertsList />
            </SectionCard>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB: Google Merchant Center */}
      {/* ================================================================ */}
      {activeTab === 'gmc' && (
        <div className="space-y-6">
          {/* Empty state */}
          <SectionCard>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 17l10 5 10-5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Google Merchant Center nao conectado</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                Conecte sua conta GMC para visualizar impressoes, cliques, CTR e identificar produtos com gap de conversao.
              </p>
            </div>
          </SectionCard>

          {/* What will be available */}
          <SectionCard title="Dados disponiveis apos conexao">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                <h4 className="text-sm font-semibold text-blue-500 mb-2">Performance por Produto</h4>
                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc pl-4">
                  <li>Impressoes por SKU</li>
                  <li>Cliques por SKU</li>
                  <li>CTR por produto</li>
                  <li>Conversoes atribuidas</li>
                </ul>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                <h4 className="text-sm font-semibold text-green-500 mb-2">Analise de Gap</h4>
                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc pl-4">
                  <li>Alta impressao + baixa conversao</li>
                  <li>Baixa impressao (SEO do feed)</li>
                  <li>CTR abaixo do benchmark</li>
                  <li>Produtos nao aprovados</li>
                </ul>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                <h4 className="text-sm font-semibold text-amber-500 mb-2">Comparativos</h4>
                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc pl-4">
                  <li>Free Listings vs Ads</li>
                  <li>Performance por categoria</li>
                  <li>Evolucao semanal/mensal</li>
                  <li>Share of voice estimado</li>
                </ul>
              </div>
            </div>
          </SectionCard>

          {/* Sample table preview */}
          <SectionCard title="Preview: Produtos com Gap de Conversao">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Exemplo de analise</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Produto</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Impressoes</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cliques</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">CTR</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Conv.</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Gap</th>
                  </tr>
                </thead>
                <tbody className="opacity-50">
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3">
                      <p className="font-medium text-gray-900 dark:text-white">Oleo de Rosa Mosqueta 60ml</p>
                      <p className="text-[11px] text-gray-400">SKU: ORM-060</p>
                    </td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">12.450</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">187</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">1.5%</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">8</td>
                    <td className="py-2 px-3"><Badge type="critico">Alto gap</Badge></td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3">
                      <p className="font-medium text-gray-900 dark:text-white">Oleo de Semente de Uva 250ml</p>
                      <p className="text-[11px] text-gray-400">SKU: OSU-250</p>
                    </td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">8.920</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">142</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">1.6%</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">12</td>
                    <td className="py-2 px-3"><Badge type="alto">Medio</Badge></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">
                      <p className="font-medium text-gray-900 dark:text-white">Oleo de Jojoba 60ml</p>
                      <p className="text-[11px] text-gray-400">SKU: OJB-060</p>
                    </td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">6.340</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">158</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">2.5%</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">18</td>
                    <td className="py-2 px-3"><Badge type="positivo">OK</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
              Dados ilustrativos — conecte o GMC para dados reais
            </p>
          </SectionCard>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB: Checklist UX */}
      {/* ================================================================ */}
      {activeTab === 'checklist' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Checklist */}
          <SectionCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Checklist UX/CRO</h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">{counts.total}/15 implementados</span>
            </div>

            {(['p0', 'p1', 'p2'] as Priority[]).map((priority) => {
              const config = PRIORITY_CONFIG[priority]
              const items = CHECKLIST_ITEMS.filter((it) => it.priority === priority)
              const checkedCount = priority === 'p0' ? counts.p0 : priority === 'p1' ? counts.p1 : counts.p2

              return (
                <div key={priority} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-1 mb-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{config.label}</span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{checkedCount}/5</span>
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const isChecked = checked.has(item.id)
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className="w-full flex items-start gap-2 p-2 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <div className={`w-4.5 h-4.5 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                            ${isChecked
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 dark:border-gray-600'
                            }`}
                            style={{ width: 18, height: 18 }}
                          >
                            {isChecked && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isChecked ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                              {item.title}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Impacto: <span className="text-green-600 dark:text-green-400 font-medium">{item.impact}</span>
                            </p>
                          </div>
                          <Badge type={config.badgeType} className="shrink-0">{priority.toUpperCase()}</Badge>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            <ProgressBar
              value={counts.total}
              max={15}
              color="green"
              showPercent
              className="mt-4"
            />
          </SectionCard>

          {/* Impact estimado */}
          <div className="space-y-6">
            <SectionCard title="Impacto Estimado">
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4">
                  <p className="text-xs text-green-700 dark:text-green-400 mb-1">Se implementar todos os P0:</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-400">+45-90%</p>
                  <p className="text-xs text-green-600 dark:text-green-500">Potencial aumento de conversao</p>
                </div>

                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-4">
                  <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">Meta de conversao:</p>
                  <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">0.45% → 1.0%</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">Em 60 dias com quick wins</p>
                </div>

                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Receita adicional estimada/mes:</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">+ R$ 8-15k</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Baseado em sessoes atuais x nova conversao</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Proximos Passos">
              <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>Instalar Judge.me (gratis)</li>
                <li>Configurar WhatsApp na PDP</li>
                <li>Ocultar SKUs sem estoque</li>
                <li>Conectar Google Merchant Center</li>
                <li>Medir conversao em 30 dias</li>
              </ol>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        Ultima atualizacao: 26/03/2026 as 11:30
      </p>
    </div>
  )
}

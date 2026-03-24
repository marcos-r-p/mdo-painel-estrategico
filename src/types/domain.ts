// ─── UI / Domain Model Types ─────────────────────────────────
// Types for components, pages, and business logic.

// ── KPI Card ─────────────────────────────────────────────────

export type KPIColor = 'green' | 'red' | 'orange' | 'blue' | 'gray';
export type KPITrend = 'up' | 'down' | 'neutral';

export interface KPIData {
  label: string;
  value: string | number;
  subvalue?: string;
  trend?: KPITrend;
  color?: KPIColor;
  sparkData?: number[];
  sparkColor?: string;
  onClick?: () => void;
}

// ── Badge ────────────────────────────────────────────────────

export type BadgeType = 'critico' | 'alto' | 'medio' | 'baixo' | 'positivo';

// ── CRM Types ────────────────────────────────────────────────

export interface FunilEtapa {
  nome: string;
  qtd: number;
  valor: number;
  taxaAvanco: number;
  perdas: number;
  vendas: number;
}

export interface MotivoPerda {
  motivo: string;
  qtd: number;
  percentual: number;
}

export interface EvolucaoMensal {
  mes: string;
  criadas: number;
  vendidas: number;
  perdidas: number;
  valorVendido: number;
  valorPerdido: number;
}

export interface CRMResponsavel {
  nome: string;
  criadas: number;
  vendidas: number;
  perdidas: number;
  valorVendido: number;
  valorPerdido: number;
  taxaConversao: number;
  ticketMedio: number;
}

export interface CRMOrigem {
  fonte: string;
  qtd: number;
  percent: number;
}

export type SaudeDimensaoStatus = 'ok' | 'alerta' | 'critico';

export interface SaudeDimensao {
  nome: string;
  score: number;
  status: SaudeDimensaoStatus;
}

export interface CRMSaude {
  scoreGeral: number;
  dimensoes: SaudeDimensao[];
}

export interface CRMData {
  dataExtracao: string;
  funil: string;
  totalNegociacoes: number;
  valorPipeline: number;
  taxaConversaoGeral: number;
  cicloVendaDias: number;
  cicloPercaDias: number;
  ticketMedioMesAtual: number;
  etapas: FunilEtapa[];
  motivosPerda: MotivoPerda[];
  evolucaoMensal: EvolucaoMensal[];
  responsaveis: CRMResponsavel[];
  origens: CRMOrigem[];
  saude: CRMSaude;
}

// ── Navigation ───────────────────────────────────────────────

export interface NavigationSection {
  id: string;
  label: string;
  icon: string;
  path: string;
  ariaLabel?: string;
}

// ── Alertas ──────────────────────────────────────────────────

export type AlertTipo = 'critico' | 'alto' | 'medio' | 'positivo';

export interface Alerta {
  tipo: AlertTipo;
  titulo: string;
  desc: string;
  acao: string;
}

export interface PlanoAcao {
  numero: number;
  titulo: string;
  desc: string;
  economia: string;
}

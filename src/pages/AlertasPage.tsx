import { useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { DADOS } from '../data/seed';
import type { Alerta, AlertTipo, PlanoAcao } from '../types/domain';
import SectionCard from '../components/ui/SectionCard';
import Badge from '../components/ui/Badge';

interface TipoConfig {
  emoji: string;
  label: string;
  order: number;
}

const tipoConfig: Record<AlertTipo, TipoConfig> = {
  critico: { emoji: '\uD83D\uDD34', label: 'Critico', order: 0 },
  alto:    { emoji: '\uD83D\uDFE0', label: 'Alto', order: 1 },
  medio:   { emoji: '\uD83D\uDFE1', label: 'Medio', order: 2 },
  positivo:{ emoji: '\uD83D\uDFE2', label: 'Positivo', order: 3 },
};

const planoAcao: PlanoAcao[] = [
  {
    numero: 1,
    titulo: 'Renegociar Webi',
    desc: 'Migrar para modelo success fee ou reduzir escopo',
    economia: 'Economia R$ 5-6K/mes',
  },
  {
    numero: 2,
    titulo: 'Refinanciar dividas',
    desc: 'Consolidar emprestimo + cartao em parcelas menores',
    economia: 'R$ 8K \u2192 R$ 3K/mes',
  },
  {
    numero: 3,
    titulo: 'Campanha reativacao base 28K',
    desc: 'E-mail marketing + WhatsApp para clientes inativos',
    economia: 'R$ 163K receita potencial',
  },
  {
    numero: 4,
    titulo: 'Prospeccao 10 farmacias B2B',
    desc: 'Kit amostras + visita comercial para farmacias de manipulacao',
    economia: 'R$ 25K/mes receita recorrente',
  },
];

// ── Descobertas estratégicas do cruzamento Shopify x CRM ──
interface Descoberta {
  tipo: AlertTipo;
  categoria: string;
  titulo: string;
  dado: string;
  impacto: string;
  acao: string;
  metrica?: string;
}

const descobertas: Descoberta[] = [
  {
    tipo: 'critico',
    categoria: 'Funil',
    titulo: '40.067 clientes Shopify nunca entraram no CRM',
    dado: 'Apenas 592 dos 49.230 clientes Shopify possuem registro no CRM (1,2%)',
    impacto: 'Base enorme sem follow-up comercial — potencial de recompra desperdicado',
    acao: 'Criar fluxo automatico: pedido Shopify → lead no RD Station com tag "e-commerce"',
    metrica: '49.230 clientes | 592 no CRM | 98,8% sem contato',
  },
  {
    tipo: 'critico',
    categoria: 'Risco Operacional',
    titulo: '100% das negociacoes em 1 unico vendedor',
    dado: 'Arnaldo Quagliato responde por todas as 877 negociacoes no CRM',
    impacto: 'Qualquer ausencia (ferias, doenca) paralisa 100% das vendas do CRM',
    acao: 'Treinar ao menos 1 pessoa para operar o funil WhatsApp. Criar playbook de atendimento.',
    metrica: '877 deals | 1 vendedor | 0 backup',
  },
  {
    tipo: 'alto',
    categoria: 'Recuperacao',
    titulo: '86 deals "perdidos" no CRM compraram no Shopify',
    dado: 'Clientes marcados como perda no CRM possuem pedidos pagos no Shopify',
    impacto: 'O funil CRM nao fecha o loop — venda acontece mas nao e rastreada como conversao',
    acao: 'Integrar status do pedido Shopify com deal CRM. Marcar como "Venda via e-commerce" ao inves de perda.',
    metrica: '86 deals | status incorreto | win rate real e maior',
  },
  {
    tipo: 'alto',
    categoria: 'Follow-up',
    titulo: '43% das perdas por "Sem Resposta" — follow-up ausente',
    dado: '211 negociacoes perdidas nos ultimos 6 meses por falta de retorno ativo',
    impacto: 'Estimativa: recuperar 15% = +R$ 8.700/mes. Sobre 6 meses = +R$ 48k',
    acao: 'Automacao RD Station: orcamento enviado → sem resposta 24h → mensagem D+1 e D+3. 3 tentativas.',
    metrica: '211 perdas | 43% do total | R$ 48k potencial',
  },
  {
    tipo: 'alto',
    categoria: 'Rastreabilidade',
    titulo: '80% dos leads sem origem conhecida',
    dado: 'Campo "fonte" do lead nao e preenchido — impossivel calcular ROI por canal',
    impacto: 'Webi fatura R$ 8.850/mes sem ROI rastreavel. Nao sabemos qual canal converte.',
    acao: 'Tornar campo "Fonte" obrigatorio no RD. Criar opcoes: WhatsApp, Instagram, Google, Indicacao.',
    metrica: '80% desconhecido | R$ 8.850/mes Webi | ROI = ?',
  },
  {
    tipo: 'medio',
    categoria: 'Qualidade de Dados',
    titulo: '0% de e-mail nos deals do CRM',
    dado: 'Nenhuma negociacao possui e-mail do contato — campo contact_email vazio em 100% dos deals',
    impacto: 'Impossivel campanhas de e-mail para leads do CRM. Re-engajamento limitado ao WhatsApp.',
    acao: 'Configurar campo e-mail como obrigatorio no cadastro de deal. Importar e-mails da tabela de contatos.',
    metrica: '877 deals | 0 emails | 790 contatos com email',
  },
  {
    tipo: 'medio',
    categoria: 'Qualidade de Dados',
    titulo: 'Valores monetarios zerados em todos os deals',
    dado: 'Campo "amount" = R$ 0 em 100% das negociacoes do RD Station',
    impacto: 'Pipeline e ticket medio CRM nao refletem a realidade. Analises financeiras do funil imprecisas.',
    acao: 'Preencher valor do orcamento ao criar deal no RD. Retroativamente: cruzar com valor do pedido Shopify.',
    metrica: '877 deals | R$ 0 pipeline | dados financeiros comprometidos',
  },
];


export default function AlertasPage() {
  useDocumentTitle('Alertas');
  const [searchParams] = useSearchParams();
  const fonteAtiva: string | null = searchParams.get('fonte');

  const alertas: Alerta[] = DADOS.alertas;

  // Group alerts by tipo
  const grupos = alertas.reduce<Record<string, Alerta[]>>((acc, alerta) => {
    if (!acc[alerta.tipo]) acc[alerta.tipo] = [];
    acc[alerta.tipo].push(alerta);
    return acc;
  }, {});

  // Sort groups by severity order
  const gruposOrdenados: [string, Alerta[]][] = Object.entries(grupos).sort(
    ([a], [b]) => (tipoConfig[a as AlertTipo]?.order ?? 99) - (tipoConfig[b as AlertTipo]?.order ?? 99)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          Alertas e Plano de Acao
          {fonteAtiva && (
            <span className="ml-2 text-sm font-normal text-gray-500">({fonteAtiva})</span>
          )}
        </h2>
      </div>

      {/* Alert Groups */}
      {gruposOrdenados.map(([tipo, items]) => {
        const config = tipoConfig[tipo as AlertTipo] || { emoji: '\u26A0\uFE0F', label: tipo };
        return (
          <SectionCard
            key={tipo}
            title={`${config.emoji} ${config.label}`}
          >
            <div className="space-y-3">
              {items.map((alerta: Alerta, idx: number) => (
                <div
                  key={idx}
                  className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {alerta.titulo}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {alerta.desc}
                    </p>
                  </div>
                  <Badge type={tipo} className="shrink-0 self-start sm:self-center">
                    {alerta.acao}
                  </Badge>
                </div>
              ))}
            </div>
          </SectionCard>
        );
      })}

      {/* Descobertas Estratégicas — Cruzamento Shopify x CRM */}
      <SectionCard title="Descobertas Estrategicas — Shopify x CRM">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Resultados do cruzamento de dados entre a base Shopify (49.230 clientes) e o CRM RD Station (877 negociacoes, 790 contatos).
          Cada item abaixo e uma oportunidade ou risco identificado que precisa de acao.
        </p>
        <div className="space-y-4">
          {descobertas.map((d, idx) => {
            const config = tipoConfig[d.tipo] || { emoji: '\u26A0\uFE0F', label: d.tipo };
            const borderColor = d.tipo === 'critico'
              ? 'border-red-200 dark:border-red-800'
              : d.tipo === 'alto'
              ? 'border-orange-200 dark:border-orange-800'
              : 'border-yellow-200 dark:border-yellow-800';
            const bgColor = d.tipo === 'critico'
              ? 'bg-red-50 dark:bg-red-950/30'
              : d.tipo === 'alto'
              ? 'bg-orange-50 dark:bg-orange-950/30'
              : 'bg-yellow-50 dark:bg-yellow-950/30';

            return (
              <div key={idx} className={`rounded-xl border ${borderColor} ${bgColor} p-4`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">{config.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                        {d.categoria}
                      </span>
                      <Badge type={d.tipo}>{config.label}</Badge>
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                      {d.titulo}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {d.dado}
                    </p>
                    {d.metrica && (
                      <p className="text-xs font-mono text-gray-500 dark:text-gray-500 mt-1.5 bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded inline-block">
                        {d.metrica}
                      </p>
                    )}
                    <div className="mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Impacto:</span> {d.impacto}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span className="font-medium text-blue-600 dark:text-blue-400">Acao:</span> {d.acao}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Plano de Acao Prioritario */}
      <SectionCard title="Plano de Acao Prioritario">
        <div className="space-y-4">
          {planoAcao.map((item: PlanoAcao) => (
            <div
              key={item.numero}
              className="flex gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white dark:bg-blue-500">
                {item.numero}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {item.titulo}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.desc}
                </p>
                <p className="mt-1 text-sm font-semibold text-green-600 dark:text-green-400">
                  {item.economia}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

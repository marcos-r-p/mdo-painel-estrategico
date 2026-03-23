import { useState, useMemo } from 'react';
import { DADOS } from '../data/constants';
import { formatCurrency, formatNumber } from '../lib/formatters';
import SectionCard from '../components/ui/SectionCard';
import ProgressBar from '../components/ui/ProgressBar';
import Badge from '../components/ui/Badge';

/* ─── helpers ─── */
const scoreColor = (v) => (v <= 4 ? 'red' : v <= 6 ? 'orange' : 'green');
const scoreBg = (v) =>
  v <= 4
    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
    : v <= 6
      ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
      : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
const scoreText = (v) =>
  v <= 4
    ? 'text-red-700 dark:text-red-400'
    : v <= 6
      ? 'text-orange-700 dark:text-orange-400'
      : 'text-green-700 dark:text-green-400';

export default function AnaliseIAPage({ dados, fonteAtiva }) {
  const d = dados || {};
  const dre = d.dre || {};
  const despOp = dre.despesasOp || {};
  const custos = d.custos || {};
  const receita = d.receita || {};
  const comparativo = d.comparativo || {};
  const canais = d.canais || {};
  const curvaABC = d.curvaABC || {};
  const topProdutos = d.topProdutos || [];
  const estoque = d.estoque || {};
  const aportes = d.aportes || {};
  const alertas = d.alertas || [];
  const metas = d.metas || {};

  /* ─── 1. Sinais Vitais ─── */
  const sinaisVitais = useMemo(() => {
    const resultado = dre.resultado || 0;
    const recBruta = dre.receitaBruta || 1;
    const financeiro = Math.max(0, Math.min(10, Math.round(10 + (resultado / recBruta) * 10)));

    const varRec = comparativo.variacaoReceita || 0;
    const comercial = Math.max(0, Math.min(10, Math.round(5 + varRec / 10)));

    const canalPrinc = (canais.atuais || [])[0];
    const ecommerce = canalPrinc ? Math.max(0, Math.min(10, Math.round((canalPrinc.percent || 0) / 15 + 2))) : 5;

    const totalABC = (curvaABC.classeA || 0) + (curvaABC.classeB || 0) + (curvaABC.classeC || 0);
    const portfolio = totalABC > 200 ? 7 : totalABC > 100 ? 5 : 3;

    const taxa = d.empresa?.taxaRecompra || 0;
    const baseClientes = taxa > 40 ? 7 : taxa > 25 ? 5 : 3;

    const totalFixo = custos.totalFixo || 0;
    const gestao = totalFixo < 15000 ? 7 : totalFixo < 25000 ? 5 : 3;

    return [
      { nome: 'Saude Financeira', score: financeiro, desc: 'DRE, fluxo, margem' },
      { nome: 'Comercial / CRM', score: comercial, desc: 'Vendas, conversao, funil' },
      { nome: 'E-commerce', score: ecommerce, desc: 'Shopify, canais, trafego' },
      { nome: 'Portfolio', score: portfolio, desc: 'Curva ABC, categorias' },
      { nome: 'Base Clientes', score: baseClientes, desc: 'Recompra, segmentacao' },
      { nome: 'Gestao Operacional', score: gestao, desc: 'Custos, processos, equipe' },
    ];
  }, [dre, comparativo, canais, curvaABC, custos, d.empresa]);

  /* ─── 2. DRE Cascata ─── */
  const dreLinhas = useMemo(() => {
    const rb = dre.receitaBruta || 0;
    return [
      { label: 'Receita Bruta', valor: rb, tipo: 'positivo' },
      { label: 'Impostos', valor: dre.impostos || 0, tipo: 'negativo' },
      { label: 'Receita Liquida', valor: dre.receitaLiquida || 0, tipo: 'subtotal' },
      { label: 'CMV', valor: dre.cmv || 0, tipo: 'negativo' },
      { label: 'Lucro Bruto', valor: dre.lucroBruto || 0, tipo: 'subtotal' },
      { label: 'Marketing', valor: despOp.marketing || 0, tipo: 'negativo' },
      { label: 'Ocupacao', valor: despOp.ocupacao || 0, tipo: 'negativo' },
      { label: 'Logistica', valor: despOp.logistica || 0, tipo: 'negativo' },
      { label: 'Pessoal', valor: despOp.pessoal || 0, tipo: 'negativo' },
      { label: 'Financeiras', valor: despOp.financeiras || 0, tipo: 'negativo' },
      { label: 'Outras', valor: despOp.outras || 0, tipo: 'negativo' },
      { label: 'Resultado', valor: dre.resultado || 0, tipo: 'resultado' },
    ];
  }, [dre, despOp]);

  const maxDRE = useMemo(
    () => Math.max(...dreLinhas.map((l) => Math.abs(l.valor)), 1),
    [dreLinhas],
  );

  /* ─── 3. CRM ─── */
  const crm = useMemo(() => {
    const criadas = 284;
    const vendidas = 132;
    const perdidas = 266;
    const valorVendido = 58000;
    const valorPerdido = 169000;
    const ticketCRM = 447;
    const ticketSite = 177;
    const cenarios = [10, 20, 30, 50].map((p) => ({
      percent: p,
      deals: Math.round(perdidas * p / 100),
      valor: Math.round(valorPerdido * p / 100),
    }));
    return { criadas, vendidas, perdidas, valorVendido, valorPerdido, ticketCRM, ticketSite, cenarios };
  }, []);

  /* ─── 4. Portfolio ─── */
  const abc = useMemo(() => {
    const a = curvaABC.classeA || 0;
    const b = curvaABC.classeB || 0;
    const c = curvaABC.classeC || 0;
    const total = curvaABC.total || a + b + c || 1;
    return { a, b, c, total };
  }, [curvaABC]);

  /* ─── 5. Gaps ─── */
  const gaps = useMemo(() => [
    { urgencia: 'critico', gap: 'Deficit Operacional', impacto: 'R$ -28.467/mes', acao: 'Reduzir custos + aumentar receita', prazo: '30 dias' },
    { urgencia: 'critico', gap: 'Custo Webi elevado', impacto: 'R$ 8.850/mes (20% receita)', acao: 'Renegociar para success fee', prazo: '15 dias' },
    { urgencia: 'alto', gap: 'Concentracao regional (DF 42%)', impacto: 'Risco de mercado', acao: 'Expandir SP, MG, RJ', prazo: '60 dias' },
    { urgencia: 'alto', gap: 'Ruptura de estoque (6.105 SKUs)', impacto: 'Vendas perdidas', acao: 'Reposicao itens curva A', prazo: '30 dias' },
    { urgencia: 'alto', gap: 'Queda receita -38% vs Fev', impacto: 'R$ -27.032/mes', acao: 'Reativacao base + campanhas', prazo: '30 dias' },
  ], []);

  /* ─── 6. Simulador ─── */
  const [sim, setSim] = useState({
    taxaConversao: 2.5,
    recuperacaoCRM: 20,
    reativacao: 10,
    clientesB2B: 5,
    ticketB2B: 2500,
    crescimento: 10,
  });

  const simulacao = useMemo(() => {
    const recBase = receita.bruta || 43890;
    const pedBase = receita.pedidos || 264;
    const ticketBase = receita.ticketMedio || 166;

    const fatorConversao = sim.taxaConversao / 1.8;
    const recSite = recBase * fatorConversao;
    const recCRM = crm.valorPerdido * sim.recuperacaoCRM / 100;
    const recReativacao = (d.empresa?.baseClientes || 28275) * sim.reativacao / 100 * ticketBase * 0.3;
    const recB2B = sim.clientesB2B * sim.ticketB2B;
    const recCrescimento = recBase * sim.crescimento / 100;

    const projetada = recSite + recCRM + recReativacao + recB2B + recCrescimento;
    const totalCustos = (custos.totalFixo || 0) + (custos.totalVariavel || 0) + (custos.totalFinanceiro || 0) + (custos.impostos || 0);
    const breakeven = projetada >= totalCustos;

    return { recSite, recCRM, recReativacao, recB2B, recCrescimento, projetada, totalCustos, breakeven };
  }, [sim, receita, crm, custos, d.empresa]);

  const sliders = [
    { key: 'taxaConversao', label: 'Taxa de Conversao (%)', min: 0.5, max: 5, step: 0.1 },
    { key: 'recuperacaoCRM', label: 'Recuperacao CRM (%)', min: 0, max: 50, step: 1 },
    { key: 'reativacao', label: 'Reativacao Base (%)', min: 0, max: 20, step: 1 },
    { key: 'clientesB2B', label: 'Novos Clientes B2B', min: 0, max: 20, step: 1 },
    { key: 'ticketB2B', label: 'Ticket Medio B2B (R$)', min: 500, max: 10000, step: 100 },
    { key: 'crescimento', label: 'Crescimento Organico (%)', min: 0, max: 30, step: 1 },
  ];

  /* ─── 7. Plano 90 Dias ─── */
  const acoes = useMemo(() => [
    {
      num: 1, titulo: 'Renegociar Webi', desc: 'Migrar contrato marketing para modelo success fee (% sobre receita gerada)',
      impacto: 'Economia R$ 5-6K/mes', custo: 'Zero', prazo: '15 dias', responsavel: 'Gestao', badge: 'critico',
    },
    {
      num: 2, titulo: 'Campanha Reativacao Base', desc: 'E-mail + WhatsApp para 28K clientes inativos com cupom exclusivo',
      impacto: 'R$ 15-25K receita add', custo: 'R$ 500-1K', prazo: '30 dias', responsavel: 'Marketing', badge: 'alto',
    },
    {
      num: 3, titulo: 'Recuperar Deals Perdidos CRM', desc: 'Recontactar 266 negociacoes perdidas com proposta personalizada',
      impacto: 'R$ 17-34K (10-20%)', custo: 'Tempo equipe', prazo: '30 dias', responsavel: 'Comercial', badge: 'alto',
    },
    {
      num: 4, titulo: 'Prospectar 10 Clientes B2B', desc: 'Farmacias, clinicas estetica, lojas naturais. Kit amostras + tabela atacado',
      impacto: 'R$ 25K/mes recorrente', custo: 'R$ 2-3K kits', prazo: '60 dias', responsavel: 'Comercial', badge: 'alto',
    },
    {
      num: 5, titulo: 'Reposicao Estoque Curva A', desc: 'Repor 132 SKUs classe A para evitar ruptura e vendas perdidas',
      impacto: 'Evitar perda R$ 10K', custo: 'Capital giro', prazo: '30 dias', responsavel: 'Operacoes', badge: 'medio',
    },
    {
      num: 6, titulo: 'Diversificar Canais de Venda', desc: 'Ativar Mercado Livre, Amazon, TikTok Shop com catalogo reduzido (top 50)',
      impacto: 'R$ 8-15K/mes add', custo: 'R$ 1-2K setup', prazo: '90 dias', responsavel: 'E-commerce', badge: 'medio',
    },
  ], []);

  /* ─── breakeven calc ─── */
  const totalDespesas = (custos.totalFixo || 0) + (custos.totalVariavel || 0) + (custos.totalFinanceiro || 0) + (custos.impostos || 0);
  const breakevenNecessario = Math.round(totalDespesas);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          Analise IA
          {fonteAtiva && (
            <span className="ml-2 text-sm font-normal text-gray-500">({fonteAtiva})</span>
          )}
        </h2>
      </div>

      {/* ════════ 1. SINAIS VITAIS ════════ */}
      <SectionCard title="Sinais Vitais">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {sinaisVitais.map((s) => (
            <div
              key={s.nome}
              className={`rounded-lg border p-4 text-center ${scoreBg(s.score)}`}
            >
              <div className={`text-3xl font-black ${scoreText(s.score)}`}>
                {s.score}
                <span className="text-base font-normal text-gray-400">/10</span>
              </div>
              <div className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                {s.nome}
              </div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{s.desc}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ════════ 2. DIAGNOSTICO FINANCEIRO ════════ */}
      <SectionCard title="Diagnostico Financeiro - DRE em Cascata">
        <div className="space-y-2">
          {dreLinhas.map((l) => {
            const abs = Math.abs(l.valor);
            const pct = (abs / maxDRE) * 100;
            const isPos = l.valor >= 0;
            const barColor =
              l.tipo === 'resultado'
                ? isPos ? 'bg-green-500' : 'bg-red-500'
                : l.tipo === 'subtotal'
                  ? 'bg-blue-500'
                  : l.tipo === 'positivo'
                    ? 'bg-green-500'
                    : 'bg-red-400';

            return (
              <div key={l.label} className="flex items-center gap-3">
                <span
                  className={`w-36 shrink-0 text-sm ${
                    l.tipo === 'subtotal' || l.tipo === 'resultado'
                      ? 'font-bold text-gray-800 dark:text-gray-100'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {l.tipo === 'negativo' ? `(-) ${l.label}` : l.tipo === 'subtotal' || l.tipo === 'resultado' ? `= ${l.label}` : l.label}
                </span>
                <div className="flex-1">
                  <div className="h-5 w-full overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded transition-all duration-500 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span
                  className={`w-28 shrink-0 text-right text-sm font-semibold ${
                    l.valor < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {formatCurrency(l.valor)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Breakeven + Aportes cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
            <div className="text-sm font-semibold text-orange-700 dark:text-orange-300">
              Breakeven Necessario
            </div>
            <div className="mt-1 text-2xl font-black text-orange-800 dark:text-orange-200">
              {formatCurrency(breakevenNecessario)}
            </div>
            <div className="mt-1 text-xs text-orange-600 dark:text-orange-400">
              Receita minima para cobrir todos os custos
            </div>
          </div>
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
            <div className="text-sm font-semibold text-purple-700 dark:text-purple-300">
              Aportes dos Socios (4 meses)
            </div>
            <div className="mt-1 text-2xl font-black text-purple-800 dark:text-purple-200">
              {formatCurrency(aportes.total4Meses || 118288.89)}
            </div>
            <div className="mt-1 text-xs text-purple-600 dark:text-purple-400">
              {(aportes.detalhes || []).map((a) => `${a.mes}: ${formatCurrency(a.valor)}`).join(' | ')}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ════════ 3. ANALISE CRM ════════ */}
      <SectionCard title="Analise CRM - Funil de Negociacoes">
        {/* Funnel */}
        <div className="mb-6 space-y-3">
          {[
            { label: 'Criadas', valor: crm.criadas, color: 'blue', w: 100 },
            { label: 'Perdidas', valor: crm.perdidas, subLabel: formatCurrency(crm.valorPerdido), color: 'red', w: (crm.perdidas / crm.criadas) * 100 },
            { label: 'Vendidas', valor: crm.vendidas, subLabel: formatCurrency(crm.valorVendido), color: 'green', w: (crm.vendidas / crm.criadas) * 100 },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-sm font-medium text-gray-600 dark:text-gray-400">{f.label}</span>
              <div className="flex-1">
                <div className="h-8 w-full overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                  <div
                    className={`flex h-full items-center rounded px-3 text-sm font-bold text-white ${
                      f.color === 'blue' ? 'bg-blue-500' : f.color === 'red' ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${f.w}%` }}
                  >
                    {f.valor}
                    {f.subLabel && (
                      <span className="ml-2 text-xs font-normal opacity-80">({f.subLabel})</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recovery scenarios */}
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Cenarios de Recuperacao (Deals Perdidos)
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {crm.cenarios.map((c) => (
              <div key={c.percent} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center dark:border-gray-700 dark:bg-gray-800">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{c.percent}%</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{c.deals} deals</div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(c.valor)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ticket comparison */}
        <div className="flex items-center gap-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <div className="text-center">
            <div className="text-xs text-gray-500">Ticket CRM</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">R$ {crm.ticketCRM}</div>
          </div>
          <div className="text-2xl font-light text-gray-300">vs</div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Ticket Site</div>
            <div className="text-xl font-bold text-gray-600 dark:text-gray-300">R$ {crm.ticketSite}</div>
          </div>
          <div className="text-sm text-gray-500">
            CRM gera ticket <span className="font-bold text-blue-600 dark:text-blue-400">2,5x maior</span>
          </div>
        </div>
      </SectionCard>

      {/* ════════ 4. ANALISE PORTFOLIO ════════ */}
      <SectionCard title="Analise Portfolio">
        {/* Curva ABC */}
        <div className="mb-6 space-y-3">
          <ProgressBar
            value={abc.a}
            max={abc.total}
            color="green"
            label="Classe A"
            detail={`${abc.a} SKUs`}
            showPercent
          />
          <ProgressBar
            value={abc.b}
            max={abc.total}
            color="orange"
            label="Classe B"
            detail={`${abc.b} SKUs`}
            showPercent
          />
          <ProgressBar
            value={abc.c}
            max={abc.total}
            color="red"
            label="Classe C"
            detail={`${abc.c} SKUs`}
            showPercent
          />
        </div>

        {/* Top 10 produtos */}
        <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Top 10 Produtos</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="pb-2 pr-3">#</th>
                <th className="pb-2 pr-3">Produto</th>
                <th className="pb-2 pr-3 text-right">Qtd</th>
                <th className="pb-2 pr-3 text-right">Receita</th>
                <th className="pb-2 pr-3 text-right">Markup</th>
                <th className="pb-2 text-right">% Fat.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {topProdutos.slice(0, 10).map((p, i) => (
                <tr key={p.sku} className="text-gray-700 dark:text-gray-300">
                  <td className="py-1.5 pr-3 text-gray-400">{i + 1}</td>
                  <td className="py-1.5 pr-3 font-medium">{p.nome}</td>
                  <td className="py-1.5 pr-3 text-right">{p.qtd}</td>
                  <td className="py-1.5 pr-3 text-right">{formatCurrency(p.receita)}</td>
                  <td className="py-1.5 pr-3 text-right">{p.markup?.toFixed(1)}%</td>
                  <td className="py-1.5 text-right">{p.fatPercent?.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stock alerts */}
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <h4 className="mb-1 text-sm font-semibold text-red-700 dark:text-red-300">
            Alerta de Estoque
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs text-red-600 dark:text-red-400">Total SKUs</div>
              <div className="font-bold text-gray-800 dark:text-gray-200">{formatNumber(estoque.totalSKUs || 0)}</div>
            </div>
            <div>
              <div className="text-xs text-red-600 dark:text-red-400">Com Estoque</div>
              <div className="font-bold text-green-600">{formatNumber(estoque.comEstoque || 0)}</div>
            </div>
            <div>
              <div className="text-xs text-red-600 dark:text-red-400">Sem Estoque</div>
              <div className="font-bold text-red-600">{formatNumber(estoque.semEstoque || 0)}</div>
            </div>
            <div>
              <div className="text-xs text-red-600 dark:text-red-400">Valor em Estoque</div>
              <div className="font-bold text-gray-800 dark:text-gray-200">{formatCurrency(estoque.valorVenda || 0)}</div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ════════ 5. MATRIZ DE GAPS ════════ */}
      <SectionCard title="Matriz de Gaps">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="pb-2 pr-3">Urgencia</th>
                <th className="pb-2 pr-3">Gap</th>
                <th className="pb-2 pr-3">Impacto R$</th>
                <th className="pb-2 pr-3">Acao</th>
                <th className="pb-2">Prazo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {gaps.map((g) => (
                <tr key={g.gap} className="text-gray-700 dark:text-gray-300">
                  <td className="py-2 pr-3">
                    <Badge type={g.urgencia}>{g.urgencia.toUpperCase()}</Badge>
                  </td>
                  <td className="py-2 pr-3 font-medium">{g.gap}</td>
                  <td className="py-2 pr-3 text-sm">{g.impacto}</td>
                  <td className="py-2 pr-3 text-sm">{g.acao}</td>
                  <td className="py-2 text-sm font-semibold">{g.prazo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ════════ 6. SIMULADOR DE RECEITA ════════ */}
      <SectionCard title="Simulador de Receita">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Sliders */}
          <div className="space-y-4">
            {sliders.map((s) => (
              <div key={s.key}>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.label}</label>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{sim[s.key]}</span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={sim[s.key]}
                  onChange={(e) => setSim((prev) => ({ ...prev, [s.key]: parseFloat(e.target.value) }))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600 dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{s.min}</span>
                  <span>{s.max}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Results */}
          <div className="space-y-3">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Receita Site (conv.)</span>
                  <span className="font-semibold">{formatCurrency(simulacao.recSite)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Recuperacao CRM</span>
                  <span className="font-semibold">{formatCurrency(simulacao.recCRM)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Reativacao Base</span>
                  <span className="font-semibold">{formatCurrency(simulacao.recReativacao)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Receita B2B</span>
                  <span className="font-semibold">{formatCurrency(simulacao.recB2B)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Crescimento Organico</span>
                  <span className="font-semibold">{formatCurrency(simulacao.recCrescimento)}</span>
                </div>
              </div>
            </div>

            <div
              className={`rounded-lg border-2 p-4 text-center ${
                simulacao.breakeven
                  ? 'border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
                  : 'border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-900/20'
              }`}
            >
              <div className="text-sm text-gray-600 dark:text-gray-400">Receita Projetada</div>
              <div className={`text-3xl font-black ${simulacao.breakeven ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(simulacao.projetada)}
              </div>
              <div className="mt-1 text-sm">
                {simulacao.breakeven ? (
                  <span className="font-semibold text-green-600">Acima do breakeven ({formatCurrency(simulacao.totalCustos)})</span>
                ) : (
                  <span className="font-semibold text-red-600">Abaixo do breakeven ({formatCurrency(simulacao.totalCustos)})</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ════════ 7. PLANO DE ACAO 90 DIAS ════════ */}
      <SectionCard title="Plano de Acao 90 Dias">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {acoes.map((a) => (
            <div
              key={a.num}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {a.num}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100">{a.titulo}</h4>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{a.desc}</p>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Impacto</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{a.impacto}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Custo</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{a.custo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Prazo</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{a.prazo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Responsavel</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{a.responsavel}</span>
                </div>
              </div>
              <div className="mt-3">
                <Badge type={a.badge}>{a.badge === 'critico' ? 'URGENTE' : a.badge === 'alto' ? 'ALTA PRIORIDADE' : 'MEDIO PRAZO'}</Badge>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/**
 * MUNDO DOS OLEOS - DADOS FALLBACK (HARDCODED)
 * Fonte: Extratos CEF, Relatorios Bling, Analise Financeira
 * Periodo base: MAR/2026 (01-21)
 */

export const DADOS = {
  empresa: {
    razaoSocial: "MOL COMERCIO VAR DE PROD NAT LTD",
    nomeFantasia: "Mundo dos Oleos",
    cnpj: "33.460.511/0001-45",
    endereco: "CLSW 504, Bl. B, Lj. 46 - Brasilia/DF",
    banco: { nome: "CEF", agencia: "01502", conta: "000578237293-8" },
    equipe: 3,
    anosOperacao: 20,
    totalSKUs: 8106,
    baseClientes: 28275,
    taxaRecompra: 44
  },

  baseClientesReal: {
    totalRegistros: 8000,
    clientesUnicos: 28275,
    duplicados: 500,
    pessoaFisica: 7830,
    pessoaJuridica: 166,
    estrangeiro: 4,
    comEmail: 6127,
    percentEmail: 76.6,
    comCelular: 6148,
    percentCelular: 76.8,
    todosAtivos: true,
    porUF: [
      { uf: "DF", qtd: 3092, percent: 38.7 },
      { uf: "SP", qtd: 1786, percent: 22.3 },
      { uf: "MG", qtd: 672, percent: 8.4 },
      { uf: "RJ", qtd: 543, percent: 6.8 },
      { uf: "GO", qtd: 243, percent: 3.0 },
      { uf: "PR", qtd: 239, percent: 3.0 },
      { uf: "BA", qtd: 211, percent: 2.6 },
      { uf: "RS", qtd: 192, percent: 2.4 },
      { uf: "SC", qtd: 170, percent: 2.1 },
      { uf: "PE", qtd: 114, percent: 1.4 }
    ]
  },

  fluxoCaixa: {
    periodoAtual: "MAR/2026 (01-21)",
    saldoInicial: 25829.68,
    saldoFinal: 5896.21,
    variacao: -19933.47,
    historico: [
      { mes: "DEZ/25", saldoInicial: 1904.63, saldoFinal: 23440.83, variacao: 21536.20, aportes: 61570.21, receita: null, pedidos: null, ticket: null },
      { mes: "JAN/26", saldoInicial: 23440.83, saldoFinal: 27653.69, variacao: 4212.86, aportes: 41125.51, receita: null, pedidos: null, ticket: null },
      { mes: "FEV/26", saldoInicial: null, saldoFinal: null, variacao: null, aportes: null, receita: 70923.25, pedidos: 370, ticket: 191.68 },
      { mes: "MAR/26", saldoInicial: 25829.68, saldoFinal: 5896.21, variacao: -19933.47, aportes: 15593.17, receita: 43890.65, pedidos: 264, ticket: 166.25 }
    ]
  },

  receita: {
    bruta: 43890.65,
    pedidos: 264,
    ticketMedio: 166.25,
    cmv: 9977.58,
    lucroBruto: 33913.07,
    markup: 77.3
  },

  comparativo: {
    receitaAnterior: 70923.25,
    receitaAtual: 43890.65,
    variacaoReceita: -38.1,
    pedidosAnterior: 370,
    pedidosAtual: 264,
    variacaoPedidos: -28.6,
    ticketAnterior: 191.68,
    ticketAtual: 166.25,
    variacaoTicket: -13.3
  },

  custos: {
    fixos: [
      { categoria: "Marketing", item: "Webi Marketing Digital", valor: 8850.00, percent: 20.2, criticidade: "alta" },
      { categoria: "Tecnologia", item: "RD Station (RD Gestao)", valor: 6072.01, percent: 13.8, criticidade: "media" },
      { categoria: "Ocupacao", item: "Aluguel (Alpha Brasilia)", valor: 2665.10, percent: 6.1, criticidade: "baixa" },
      { categoria: "Ocupacao", item: "Condominio", valor: 1059.13, percent: 2.4, criticidade: "baixa" },
      { categoria: "Administrativo", item: "Contabilidade (Arbrent)", valor: 1150.00, percent: 2.6, criticidade: "baixa" },
      { categoria: "Utilities", item: "Energia (Neoenergia)", valor: 236.60, percent: 0.5, criticidade: "baixa" },
      { categoria: "Utilities", item: "Agua (CAESB)", valor: 128.32, percent: 0.3, criticidade: "baixa" },
      { categoria: "Utilities", item: "Telefone/Internet", valor: 408.51, percent: 0.9, criticidade: "baixa" },
      { categoria: "Bancario", item: "Cesta de Servicos CEF", valor: 189.00, percent: 0.4, criticidade: "baixa" },
      { categoria: "Seguro", item: "Caixa Vida e Previdencia", valor: 133.00, percent: 0.3, criticidade: "baixa" }
    ],
    totalFixo: 20891.67,

    variaveis: [
      { fornecedor: "EBPM Comercial", tipo: "Embalagens/Insumos", valor: 10338.98 },
      { fornecedor: "Sta Efigenia", tipo: "Materia-prima/Oleos", valor: 2895.97 },
      { fornecedor: "Via Aroma", tipo: "Oleos Essenciais", valor: 2241.54 },
      { fornecedor: "Correios", tipo: "Frete/Envios", valor: 4859.05 },
      { fornecedor: "Casa da Quimica", tipo: "Insumos", valor: 659.00 },
      { fornecedor: "China Atacadista", tipo: "Embalagens", valor: 256.18 }
    ],
    totalVariavel: 21250.72,

    financeiras: [
      { item: "Emprestimo SIEMP", valor: 5365.30, tipo: "debito_auto" },
      { item: "Cartao CAIXA VISA", valor: 7980.58, tipo: "fatura" },
      { item: "Tarifas bancarias", valor: 268.96, tipo: "tarifas" }
    ],
    totalFinanceiro: 13614.84,

    impostos: 6716.13
  },

  dre: {
    receitaBruta: 43890.65,
    impostos: -6716.13,
    receitaLiquida: 37174.52,
    cmv: -16462.27,
    lucroBruto: 20712.25,
    despesasOp: {
      marketing: -15780.52,
      ocupacao: -4089.15,
      logistica: -7273.63,
      pessoal: -6999.18,
      financeiras: -13614.84,
      outras: -1420.73
    },
    resultado: -28466.80
  },

  canais: {
    atuais: [
      { canal: "Shopify", pedidos: 257, receita: 43535.67, percent: 99.2, ticket: 169.44 },
      { canal: "Mercado Livre", pedidos: 6, receita: 249.63, percent: 0.6, ticket: 41.61 },
      { canal: "TikTok Shop", pedidos: 1, receita: 105.35, percent: 0.2, ticket: 105.35 }
    ],
    b2b: [
      { canal: "Farmacias de Manipulacao", potencial: "alto", ticketEst: 2500, freq: "quinzenal", produtos: "Oleos vegetais granel, Extratos", estrategia: "Prospeccao + kit amostras", clienteRef: "Pharmacorum (R$ 1.345)" },
      { canal: "Clinicas de Estetica", potencial: "alto", ticketEst: 1800, freq: "mensal", produtos: "Rosa Mosqueta, Jojoba, Massagem", estrategia: "Parceria + desconto profissional", clienteRef: null },
      { canal: "SPAs e Day SPAs", potencial: "medio", ticketEst: 1200, freq: "mensal", produtos: "Oleos essenciais, Blends", estrategia: "Degustacao + fidelidade", clienteRef: null },
      { canal: "Lojas Naturais", potencial: "medio", ticketEst: 3500, freq: "quinzenal", produtos: "Linha completa revenda", estrategia: "Atacado margem 30%", clienteRef: null },
      { canal: "Saloes de Beleza", potencial: "medio", ticketEst: 800, freq: "mensal", produtos: "Oleos capilares, Argan", estrategia: "Representante regional", clienteRef: null },
      { canal: "Industria Cosmetica", potencial: "alto", ticketEst: 8000, freq: "mensal", produtos: "Oleos 5L/20L, B2B2C", estrategia: "Contrato + escala de preco", clienteRef: null },
      { canal: "Terapeutas/Aromaterapeutas", potencial: "medio", ticketEst: 500, freq: "mensal", produtos: "Oleos essenciais, Kits", estrategia: "Certificacao + desconto", clienteRef: null },
      { canal: "Academias/Studios", potencial: "baixo", ticketEst: 600, freq: "bimestral", produtos: "Oleos relaxantes", estrategia: "Parceria pos-treino", clienteRef: null }
    ]
  },

  regioes: [
    { uf: "DF", pedidos: 256, receita: 32167.18, percent: 42.5, freteMedio: 1.26, pecas: 653 },
    { uf: "SP", pedidos: 33, receita: 7147.64, percent: 9.4, freteMedio: 16.70, pecas: 110 },
    { uf: "MG", pedidos: 12, receita: 6554.33, percent: 8.7, freteMedio: 13.81, pecas: 80 },
    { uf: "CE", pedidos: 7, receita: 5580.62, percent: 7.4, freteMedio: 75.61, pecas: 29 },
    { uf: "AM", pedidos: 4, receita: 4024.39, percent: 5.3, freteMedio: 87.05, pecas: 28 },
    { uf: "RS", pedidos: 3, receita: 3946.09, percent: 5.2, freteMedio: 9.56, pecas: 16 },
    { uf: "RJ", pedidos: 10, receita: 2542.12, percent: 3.4, freteMedio: 16.57, pecas: 28 },
    { uf: "MS", pedidos: 3, receita: 1976.43, percent: 2.6, freteMedio: 11.68, pecas: 6 },
    { uf: "BA", pedidos: 4, receita: 1683.80, percent: 2.2, freteMedio: 0, pecas: 34 },
    { uf: "GO", pedidos: 7, receita: 1298.16, percent: 1.7, freteMedio: 9.99, pecas: 19 },
    { uf: "PE", pedidos: 6, receita: 1296.89, percent: 1.7, freteMedio: 26.71, pecas: 13 },
    { uf: "SC", pedidos: 2, receita: 1154.70, percent: 1.5, freteMedio: 31.15, pecas: 6 },
    { uf: "PR", pedidos: 7, receita: 957.76, percent: 1.3, freteMedio: 24.14, pecas: 15 },
    { uf: "ES", pedidos: 5, receita: 876.82, percent: 1.2, freteMedio: 31.30, pecas: 18 }
  ],

  evolucaoRegional: {
    periodo1: { total: 44170.27, estados: 17, topUF: "DF", topValor: 21391.64, label: "Jan/26" },
    periodo2: { total: 60577.74, estados: 18, topUF: "DF", topValor: 29936.03, label: "Fev/26" },
    periodo3: { total: 75654.50, estados: 22, topUF: "DF", topValor: 32167.18, label: "Mar/26" }
  },

  topProdutos: [
    { sku: "08488", nome: "Blend Facial 60ml", qtd: 14, receita: 1398.60, markup: 100.0, fatPercent: 3.47, categoria: "Blends" },
    { sku: "05091", nome: "OE Lavanda Mont Blanc 10ml", qtd: 17, receita: 882.30, markup: 78.0, fatPercent: 2.19, categoria: "Oleos Essenciais" },
    { sku: "00500", nome: "Oleo Semente de Uva 5L", qtd: 2, receita: 807.80, markup: 71.87, fatPercent: 2.01, categoria: "Oleos Vegetais" },
    { sku: "05074", nome: "OE Geranio 10ml", qtd: 7, receita: 741.30, markup: 77.83, fatPercent: 1.84, categoria: "Oleos Essenciais" },
    { sku: "00205", nome: "Oleo de Jojoba 1L", qtd: 2, receita: 725.80, markup: 78.19, fatPercent: 1.80, categoria: "Oleos Vegetais" },
    { sku: "01065", nome: "Oleo de Moringa 250ml", qtd: 6, receita: 661.90, markup: 69.15, fatPercent: 1.64, categoria: "Oleos Vegetais" },
    { sku: "05062", nome: "OE Alecrim 10ml", qtd: 21, receita: 648.90, markup: 83.50, fatPercent: 1.61, categoria: "Oleos Essenciais" },
    { sku: "05090", nome: "OE Olibano 10ml", qtd: 6, receita: 647.40, markup: 77.95, fatPercent: 1.61, categoria: "Oleos Essenciais" },
    { sku: "00177", nome: "Oleo Mamona (Ricino) 1L", qtd: 4, receita: 603.60, markup: 75.37, fatPercent: 1.50, categoria: "Oleos Vegetais" },
    { sku: "06892", nome: "OE Jambu 5ml", qtd: 1, receita: 535.90, markup: 100.0, fatPercent: 1.33, categoria: "Oleos Essenciais" },
    { sku: "00395", nome: "Oleo Rosa Mosqueta 60ml", qtd: 20, receita: 532.50, markup: 72.41, fatPercent: 1.32, categoria: "Oleos Vegetais" },
    { sku: "00518", nome: "Alcool de Cereais 1L", qtd: 9, receita: 494.10, markup: 100.0, fatPercent: 1.23, categoria: "Insumos" },
    { sku: "00191", nome: "Oleo Semente de Uva 1L", qtd: 4, receita: 479.60, markup: 74.01, fatPercent: 1.19, categoria: "Oleos Vegetais" },
    { sku: "00810", nome: "Oleo Mamona (Ricino) 250ml", qtd: 9, receita: 476.10, markup: 80.10, fatPercent: 1.18, categoria: "Oleos Vegetais" },
    { sku: "00747", nome: "Oleo Amendoas Doce 250ml", qtd: 11, receita: 471.90, markup: 78.95, fatPercent: 1.17, categoria: "Oleos Vegetais" },
    { sku: "03246", nome: "Ext. Glic. Iris Florentino 1L", qtd: 1, receita: 423.90, markup: 78.32, fatPercent: 1.05, categoria: "Extratos" },
    { sku: "00253", nome: "Oleo de Alecrim 60ml", qtd: 13, receita: 388.70, markup: 74.83, fatPercent: 0.96, categoria: "Oleos Vegetais" },
    { sku: "00710", nome: "Oleo de Ojon/Batana 60ml", qtd: 12, receita: 382.80, markup: 75.09, fatPercent: 0.95, categoria: "Oleos Vegetais" },
    { sku: "00359", nome: "Oleo Mamona (Ricino) 60ml", qtd: 14, receita: 376.60, markup: 74.26, fatPercent: 0.93, categoria: "Oleos Vegetais" },
    { sku: "05095", nome: "OE Menta Piperita 10ml", qtd: 13, receita: 375.70, markup: 76.06, fatPercent: 0.93, categoria: "Oleos Essenciais" }
  ],

  curvaABC: { classeA: 132, classeB: 98, classeC: 78, total: 308 },

  estoque: {
    totalSKUs: 8106,
    comEstoque: 2001,
    semEstoque: 6105,
    totalUnidades: 7925,
    valorCusto: 1293727.87,
    valorVenda: 4485361.90,
    margemImplicita: 71,
    topPorValor: [
      { sku: "00500", nome: "Oleo Semente de Uva 5L", estoque: 16, custo: 1818.08, valor: 6462.40, totalValor: 103398.40 },
      { sku: "00263", nome: "Oleo Amendoas Doce 60ml", estoque: 64, custo: 420.16, valor: 1593.60, totalValor: 101990.40 },
      { sku: "00888", nome: "OE Salsa 250ml", estoque: 7, custo: 2791.45, valor: 12641.30, totalValor: 88489.10 },
      { sku: "00395", nome: "Oleo Rosa Mosqueta 60ml", estoque: 48, custo: 352.56, valor: 1387.20, totalValor: 66585.60 },
      { sku: "06198", nome: "OE Neroli 5ml", estoque: 13, custo: 13.00, valor: 4938.70, totalValor: 64203.10 }
    ]
  },

  categorias: [
    { nome: "Oleos Vegetais", produtos: 121, qtdVendida: 495, receita: 31875.54, percentual: 52.0 },
    { nome: "Oleos Essenciais", produtos: 70, qtdVendida: 184, receita: 9394.43, percentual: 15.3 },
    { nome: "Tinturas", produtos: 30, qtdVendida: 47, receita: 5448.96, percentual: 8.9 },
    { nome: "Extratos Glicolicos", produtos: 25, qtdVendida: 29, receita: 3036.91, percentual: 5.0 },
    { nome: "Embalagens", produtos: 37, qtdVendida: 89, receita: 2842.55, percentual: 4.6 },
    { nome: "Extratos Fluidos", produtos: 20, qtdVendida: 20, receita: 2019.39, percentual: 3.3 },
    { nome: "Extratos Oleosos", produtos: 13, qtdVendida: 17, receita: 1541.78, percentual: 2.5 },
    { nome: "Essencias", produtos: 27, qtdVendida: 40, receita: 1129.41, percentual: 1.8 },
    { nome: "Manteigas", produtos: 8, qtdVendida: 17, receita: 1064.07, percentual: 1.7 },
    { nome: "Home Spray", produtos: 12, qtdVendida: 16, receita: 702.41, percentual: 1.1 },
    { nome: "Blends", produtos: 2, qtdVendida: 7, receita: 695.56, percentual: 1.1 }
  ],

  topClientes: [
    { nome: "Consumidor Final (agregado)", valor: 47836.35, produtos: 1076, tipo: "B2C", loja: "Shopify", pedidos: 240, ticketMedio: 199.32, recompra: true },
    { nome: "ALZIRA DE BRITO GONCALVES", valor: 2901.57, produtos: 8, tipo: "B2B", loja: "Shopify", pedidos: 3, ticketMedio: 967.19, recompra: true, uf: "AM" },
    { nome: "Murilo Tulio", valor: 2448.70, produtos: 3, tipo: "B2C", loja: "Shopify", pedidos: 2, ticketMedio: 1224.35, recompra: true, uf: "MS" },
    { nome: "Helio Henrique Silva Oliveira", valor: 1975.60, produtos: 13, tipo: "B2C", loja: "Shopify", pedidos: 4, ticketMedio: 493.90, recompra: true, uf: "DF" },
    { nome: "Israel Almeida de Brito Goncalves", valor: 1836.17, produtos: 17, tipo: "B2C", loja: "Shopify", pedidos: 5, ticketMedio: 367.23, recompra: true, uf: "AM" },
    { nome: "Farmacia Pharmacorum", valor: 1345.00, produtos: 10, tipo: "B2B", loja: "Shopify", pedidos: 2, ticketMedio: 672.50, recompra: true, uf: "SP" },
    { nome: "Neusa de Sousa Leonardo", valor: 1098.98, produtos: 5, tipo: "B2C", loja: "Shopify", pedidos: 2, ticketMedio: 549.49, recompra: true, uf: "DF" },
    { nome: "Andrea Coelho de Sousa", valor: 1029.25, produtos: 9, tipo: "B2C", loja: "Shopify", pedidos: 3, ticketMedio: 343.08, recompra: true, uf: "DF" },
    { nome: "Sara Costa de Souza Giotti", valor: 934.70, produtos: 8, tipo: "B2C", loja: "Shopify", pedidos: 2, ticketMedio: 467.35, recompra: false, uf: "DF" },
    { nome: "Luciano de Paula Costa da Silva", valor: 840.47, produtos: 3, tipo: "B2C", loja: "Shopify", pedidos: 1, ticketMedio: 840.47, recompra: false, uf: "GO" }
  ],

  alertas: [
    { tipo: "critico", titulo: "Deficit Operacional", desc: "Prejuizo de R$ 28.467/mes", acao: "Reduzir custos + aumentar receita" },
    { tipo: "critico", titulo: "Marketing Caro", desc: "Webi: R$ 8.850/mes = 20% receita", acao: "Renegociar para success fee" },
    { tipo: "critico", titulo: "Dividas Elevadas", desc: "R$ 13.346/mes = 30% receita", acao: "Refinanciar parcelas menores" },
    { tipo: "alto", titulo: "Queda de Receita", desc: "Receita caiu 38% vs Fev", acao: "Reativar base + campanhas" },
    { tipo: "alto", titulo: "Dependencia Shopify", desc: "99,2% das vendas", acao: "Diversificar canais" },
    { tipo: "medio", titulo: "Concentracao Regional", desc: "DF = 42% dos pedidos", acao: "Expandir para SP, MG, RJ" },
    { tipo: "positivo", titulo: "Markup Saudavel", desc: "77,3% medio", acao: "Manter precificacao" },
    { tipo: "positivo", titulo: "Base Grande", desc: "28.275 clientes, 44% recompra", acao: "Campanhas reativacao" }
  ],

  aportes: {
    total4Meses: 118288.89,
    detalhes: [
      { mes: "DEZ/25", valor: 61570.21 },
      { mes: "JAN/26", valor: 41125.51 },
      { mes: "MAR/26", valor: 15593.17 }
    ]
  },

  metas: {
    fase1: {
      nome: "CRM + CRO",
      periodo: "Dias 1-30",
      objetivo: "Recuperar receita com base existente",
      kpis: [
        { metrica: "Taxa conversao site", atual: 1.8, meta: 2.5, unidade: "%" },
        { metrica: "Reativacao base", atual: 0, meta: 2000, unidade: "clientes" },
        { metrica: "Negociacoes CRM", atual: 35, meta: 60, unidade: "deals" }
      ]
    },
    fase2: {
      nome: "B2B + Portfolio",
      periodo: "Dias 31-60",
      objetivo: "Expandir para clientes B2B",
      kpis: [
        { metrica: "Novos clientes B2B", atual: 2, meta: 10, unidade: "clientes" },
        { metrica: "Ticket medio B2B", atual: 1345, meta: 2500, unidade: "R$" },
        { metrica: "Receita B2B", atual: 4246, meta: 25000, unidade: "R$" }
      ]
    },
    fase3: {
      nome: "Escala",
      periodo: "Dias 61-90",
      objetivo: "Crescimento sustentavel",
      kpis: [
        { metrica: "Receita total", atual: 43890, meta: 90000, unidade: "R$" },
        { metrica: "Breakeven", atual: 0, meta: 1, unidade: "sim/nao" },
        { metrica: "Canais ativos", atual: 3, meta: 5, unidade: "canais" }
      ]
    }
  },

  tarefas: [
    { id: 1, texto: "Extratos bancarios (PDF ou CSV)", prioridade: "alta", status: "concluido" },
    { id: 2, texto: "Relatorios Bling - Faturamento", prioridade: "alta", status: "concluido" },
    { id: 3, texto: "Relatorios Bling - Estoque", prioridade: "media", status: "concluido" },
    { id: 4, texto: "Planilha custos operacionais", prioridade: "alta", status: "concluido" },
    { id: 5, texto: "Export RD Station - Negociacoes", prioridade: "alta", status: "pendente" },
    { id: 6, texto: "Relatorio Shopify - Conversao", prioridade: "alta", status: "concluido" },
    { id: 7, texto: "Lista de fornecedores", prioridade: "baixa", status: "concluido" },
    { id: 8, texto: "Export RD Station - Base contatos", prioridade: "media", status: "pendente" },
    { id: 9, texto: "Relatorio Shopify - Carrinho abandonado", prioridade: "media", status: "pendente" },
    { id: 10, texto: "Custos de embalagem detalhado", prioridade: "baixa", status: "pendente" }
  ],

  fornecedores: [
    { nome: "Via Aroma", cidade: "Porto Alegre", uf: "RS", tipo: "Oleos Essenciais" },
    { nome: "Laszlo", cidade: "Belo Horizonte", uf: "MG", tipo: "Aromaterapia" },
    { nome: "Terra Flor", cidade: "Brasilia", uf: "DF", tipo: "Oleos Essenciais" },
    { nome: "BioEssencia", cidade: "Jau", uf: "SP", tipo: "Cosmeticos Naturais" },
    { nome: "Arte dos Aromas", cidade: "Diadema", uf: "SP", tipo: "Oleos/Aromas" },
    { nome: "EBPM Comercial", cidade: "Sao Paulo", uf: "SP", tipo: "Embalagens" },
    { nome: "Qualicoco", cidade: "Sao Paulo", uf: "SP", tipo: "Oleos de Coco" }
  ]
}

export default DADOS

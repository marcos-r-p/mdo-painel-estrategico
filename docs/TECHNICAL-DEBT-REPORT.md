# Technical Debt Report — Brownfield Discovery

**Projeto:** Mundo dos Oleos — Painel Estrategico
**Data:** 2026-03-24 (atualizado com analise de banco)
**Branch:** `feat/user-management`
**Stack:** React 19 + Vite 8 + TailwindCSS 4 + Supabase + React Query 5 + Recharts
**Banco:** PostgreSQL 17.6 (Supabase, sa-east-1) — 26 tabelas, 13 views, 12 functions, ~40 MB
**Codebase:** ~11K linhas, 76 arquivos TS/TSX, 19 páginas
**Orchestrador:** Orion (@aiox-master)

---

## Equipe de Análise

| Agente | Fase | Foco | Avaliação Geral |
|--------|------|------|-----------------|
| @architect (Aria) | 1 — Arquitetura | Estrutura, stack, segurança, tipos | **ADEQUATE** |
| @data-engineer (Dara) | 2 — Database | Schema, RLS, indexes, views, functions | **CRITICAL** |
| @ux-design-expert (Uma) | 3 — Frontend/UX | Componentes, design system, a11y | **NEEDS_IMPROVEMENT** |
| @qa (Quinn) | 7 — Qualidade | Testes, lint, typecheck, code quality | **CRITICAL** |
| @analyst (Alex) | — — Padrões | Duplicação, imports, dead code, performance | **HIGH DEBT** |

---

## Squad de Resolucao — Data Engineering

**Missao:** Resolver todos os debitos tecnicos do backend de dados identificados por Dara.
**Documento de referencia:** `docs/TECHNICAL-DEBT-DATABASE.md`

### Composicao do Squad

| Engenheiro | Especialidade | Debitos Atribuidos | Sprint |
|------------|--------------|-------------------|--------|
| **DE-1 — Security Engineer** | RLS, policies, tokens, SECURITY DEFINER | DB-C1, DB-C2, DB-H5, DB-M4 | Sprint 1 (semana 1) |
| **DE-2 — Performance Engineer** | Indexes, queries, views, paginacao | DB-H1, DB-M2, DB-M3, DB-L1 | Sprint 1-2 (semanas 1-2) |
| **DE-3 — Schema Architect** | Types, timestamps, triggers, unificacao | DB-H2, DB-H3, DB-M1, DB-L2, DB-L3, DB-L4 | Sprint 2-3 (semanas 2-3) |

### Cronograma de Execucao

```
Semana 1 ─────────────────────────────────────────
  DE-1: [DB-C1 Tokens] [DB-C2 RLS 16 tabelas] ──── BLOQUEADOR
  DE-2: [DB-H1 Indexes 4 tabelas] ────────────────
  DE-3: [DB-H2 TypeScript types] [DB-H3 Header fix]

Semana 2 ─────────────────────────────────────────
  DE-1: [DB-H5 search_path] ──────────────────────
  DE-2: [DB-M2 Views duplicadas] [DB-M3 Paginacao]
  DE-3: [DB-M1 updated_at + triggers] ────────────

Semana 3 ─────────────────────────────────────────
  DE-2: [DB-L1 Schema Shopify FKs] ───────────────
  DE-3: [DB-L2 Cleanup] [DB-L3 Retention] ────────
  DE-1: [DB-M4 Validacao + smoke tests] ──────────
```

### Analise de Impacto por Resolucao

#### DE-1 — Security Engineer

| Debito | Resolucao | Impacto no Sistema | Metricas Antes → Depois |
|--------|-----------|-------------------|------------------------|
| **DB-C1** Tokens expostos | Restringir `bling_tokens` e `shopify_tokens` a `service_role` only | **Elimina risco critico** de roubo de credenciais das APIs Bling e Shopify. Atacante nao consegue mais ler tokens via REST anonimo | Seguranca: CRITICAL → ADEQUATE |
| **DB-C2** 16 tabelas `allow_all` | Migrar para `authenticated` SELECT + `service_role` write | **Protege 130K+ registros** de PII (nomes, emails, celulares, enderecos). Bloqueia escrita maliciosa de dados. Mantém leitura para usuarios autenticados | Tabelas protegidas: 10/26 → 26/26 |
| **DB-H5** SECURITY DEFINER sem search_path | Adicionar `SET search_path = public` em `is_admin()` e `rdstation_dashboard_periodo()` | Elimina vetor de search_path injection em funcoes privilegiadas | Functions seguras: 1/3 → 3/3 |
| **DB-M4** Smoke tests de seguranca | Criar test suite para validar RLS com roles diferentes | Previne regressoes de seguranca em futuras migrations | Cobertura RLS testada: 0% → 100% |

**Impacto consolidado DE-1:**
- Scorecard "Seguranca": **ADEQUATE → GOOD**
- Reduz risco OWASP A01 (Broken Access Control) de CRITICO para BAIXO
- Protege ~130.000 registros de PII + 2 tokens de API

#### DE-2 — Performance Engineer

| Debito | Resolucao | Impacto no Sistema | Metricas Antes → Depois |
|--------|-----------|-------------------|------------------------|
| **DB-H1** Indexes ausentes | Criar 5 indexes compostos em `clientes`, `shopify_pedidos`, `shopify_clientes` | **Acelera dashboard 5-10x** para queries de resumo mensal, clientes por mes, e vendas por UF. Elimina full-scans em tabelas de 36K-50K rows | Full-scans: 6+ queries → 0 |
| **DB-M2** Views duplicadas | Consolidar 3 pares de views Shopify (6 views → 3 canonicas) | **Elimina ambiguidade** sobre source-of-truth. Dados consistentes entre dashboard e paginas de detalhe | Views Shopify: 6 (3 pares duplicados) → 3 canonicas |
| **DB-M3** Queries sem paginacao | Implementar paginacao real + selecao de colunas em `fetchShopify*` | **Reduz transferencia de dados em ~80%** (de 2-3 MB por fetch para ~500 KB). Elimina truncamento silencioso de dados | Payload medio: ~3 MB → ~500 KB |
| **DB-L1** FKs ausentes no Shopify | Adicionar `shopify_pedidos` → `shopify_clientes` via email | Melhora integridade referencial e habilita JOINs eficientes | FKs no schema Shopify: 0 → 1 |

**Impacto consolidado DE-2:**
- Scorecard "Performance": **MEDIUM → GOOD**
- Tempo de carregamento do dashboard: estimado **3-5s → <1s** (com indexes)
- Transferencia de dados por sessao: **~10 MB → ~2 MB**
- Resolve M4 do relatorio original (fetches de 5000 rows)

#### DE-3 — Schema Architect

| Debito | Resolucao | Impacto no Sistema | Metricas Antes → Depois |
|--------|-----------|-------------------|------------------------|
| **DB-H2** TypeScript types fantasma | Corrigir `VwResumoMensal` e `VwClientesMes` para corresponder as views/functions reais | **Corrige badge de resultado no Header** (atualmente mostra sempre R$0). Elimina campos fantasma que causam bugs silenciosos | Campos fantasma: 7 → 0 |
| **DB-H3** Calculo de resultado quebrado | Usar campo `receita` da view real em vez de `receita_total` inexistente | **Dashboard mostra lucro/prejuizo real** no badge do header. Atualmente e sempre zero | Resultado no Header: sempre R$0 → valor real |
| **DB-M1** `updated_at` + triggers | Adicionar coluna + trigger automatico em 16 tabelas | **Habilita sync incremental** — edge functions podem buscar apenas registros modificados desde ultimo sync. Auditoria de quando dados mudaram | Tabelas com updated_at: 10/26 → 26/26 |
| **DB-L2** Tabelas vazias / cleanup | Documentar ou remover `importacoes`, consolidar views | Reduz complexidade cognitiva do schema. Clareza sobre o que e usado vs abandonado | Tabelas vazias documentadas: 0/5 → 5/5 |
| **DB-L3** Retention policy para logs | Criar funcao de limpeza para `access_logs` e `*_sync_log` (30 dias) | Previne crescimento ilimitado de tabelas de log. Estimado ~10K rows/mes em `access_logs` | Retention: nenhum → 30 dias auto |
| **DB-L4** Avaliar unificacao Bling/Shopify | Spike tecnico: viabilidade de tabelas canonicas com campo `fonte` | Documenta decisao arquitetural: se unificar ou manter separado. Informa roadmap de longo prazo | Decisao documentada: nao → sim |

**Impacto consolidado DE-3:**
- Scorecard "Type System": **ADEQUATE → GOOD**
- Resolve H9 do relatorio original (Supabase types manuais)
- Badge de resultado no Header passa a funcionar (impacto visual imediato)
- Habilita otimizacao de sync incremental (reduz chamadas API externas)

---

## Scorecard Consolidado

| Área | Rating Atual | Rating Pos-Resolucao | Agente |
|------|-------------|---------------------|--------|
| Tech Stack & Dependências | GOOD | GOOD | Aria + Alex |
| Estrutura do Projeto | GOOD | GOOD | Aria |
| Arquitetura de Componentes | ADEQUATE | ADEQUATE | Aria + Uma |
| Design System | NEEDS_IMPROVEMENT | NEEDS_IMPROVEMENT | Uma |
| State Management | ADEQUATE | ADEQUATE | Aria |
| Roteamento | GOOD | GOOD | Aria |
| API Layer | GOOD | GOOD | Aria + Alex |
| Type System | ADEQUATE | **GOOD** | Aria + Alex + DE-3 |
| Build & Tooling | GOOD | GOOD | Aria |
| Segurança | ADEQUATE | **GOOD** | Aria + Quinn + DE-1 |
| Segurança de Dados (DB) | **CRITICAL** | **GOOD** | Dara + DE-1 |
| Performance de Dados (DB) | **NEEDS_IMPROVEMENT** | **GOOD** | Dara + DE-2 |
| Schema & Integridade (DB) | **NEEDS_IMPROVEMENT** | **ADEQUATE** | Dara + DE-3 |
| Testes & Cobertura | **CRITICAL** | **CRITICAL** | Quinn |
| Acessibilidade (a11y) | **CRITICAL** | **CRITICAL** | Uma |
| Responsividade | NEEDS_IMPROVEMENT | NEEDS_IMPROVEMENT | Uma |
| Performance | MEDIUM | **GOOD** | Alex + DE-2 |
| Dead Code | MEDIUM | MEDIUM | Alex |
| Duplicação de Código | **HIGH** | **MEDIUM** | Alex + DE-2 |

---

## Débitos por Severidade

### CRITICAL (Bloqueiam qualidade mínima)

| # | Débito | Origem | Impacto | Responsavel |
|---|--------|--------|---------|-------------|
| C1 | **`npm run typecheck` quebrado** — `tsconfig.node.json` conflita com parent | Frontend | Nenhuma verificação de tipos funciona | @dev |
| C2 | **10/14 páginas usam dados estáticos (seed)** — renderizam `DADOS` hardcoded | Frontend | Dashboard mostra números falsos | @dev |
| C3 | **~8% cobertura de testes** — 6 test files para 76 source files | QA | Regressões não detectadas | @qa |
| C4 | **`dashboard.test.ts` quebrado** — mock usa `from()` mas código usa `rpc()` | QA | 6 testes falhando; CI vermelho | @qa |
| C5 | **Acessibilidade severamente deficiente** — 14 atributos ARIA em 19 páginas | UX | Usuários com deficiência excluidos | @ux |
| C6 | **6 erros de ESLint** — `React` não importado em arquivos admin | Frontend | Código não compila limpo | @dev |
| DB-C1 | **Tokens de API expostos** — `bling_tokens` e `shopify_tokens` com `allow_all` publico | **Database** | **Atacante pode roubar tokens OAuth e acessar APIs externas** | **DE-1** |
| DB-C2 | **16 tabelas com acesso publico irrestrito** — 130K+ registros de PII expostos | **Database** | **Qualquer anonimo pode ler/escrever dados de clientes, pedidos, custos** | **DE-1** |

### HIGH (Devem ser resolvidos antes de novas features)

| # | Débito | Origem | Impacto | Responsavel |
|---|--------|--------|---------|-------------|
| H1 | **Header God Component** (395 linhas) | Frontend | Difícil manter e testar | @dev |
| H2 | **Credencial hardcoded** — Bling OAuth client_id no código | Frontend | Credential leak | @dev |
| H3 | **Token RD Station na URL** — query parameter | Frontend | Token vaza via logs/history | @dev |
| H4 | **Dark mode inconsistente** | Frontend | Bugs visuais em trocas de tema | @dev |
| H5 | **Path alias `@/*` nunca usado** | Frontend | Viola Constitution Article VI | @dev |
| H6 | **Sem Table/Button reutilizáveis** | Frontend | Duplicação massiva | @dev |
| H7 | **Admin modals sem ARIA** | UX | Inacessível para screen readers | @ux |
| H8 | **3 estilos de error handling na API** | Frontend | Inconsistência; difícil debug | @dev |
| H9 | **Supabase types manuais** — drift entre schema e TypeScript | Frontend+DB | Tipos divergem do banco real | @dev + DE-3 |
| H10 | **`AdminGuard` não checa `authLoading`** | Frontend | Flash de redirect incorreto | @dev |
| DB-H1 | **Indexes ausentes em tabelas de alto volume** — `clientes` (37K), `shopify_pedidos` (36K), `shopify_clientes` (50K) sem indexes de busca | **Database** | **Full-scans em 6+ queries do dashboard; latencia 3-5s** | **DE-2** |
| DB-H2 | **TypeScript types fantasma** — `VwResumoMensal` tem 4 campos que nao existem na view | **Database** | **Badge de resultado no Header sempre mostra R$0** | **DE-3** |
| DB-H3 | **Calculo de resultado quebrado** — `receita_total - custo_total` usa campos inexistentes | **Database** | **Indicador financeiro principal e falso** | **DE-3** |

### MEDIUM (Devem ser planejados para sprints futuras)

| # | Débito | Origem | Impacto | Responsavel |
|---|--------|--------|---------|-------------|
| M1 | **Lógica de `access_logs` duplicada em 3 lugares** | Frontend | Inconsistente | @dev |
| M2 | **Inline SVG icons** (~200 linhas) | Frontend | Bundle bloat | @dev |
| M3 | **N+1 query em roles** | Frontend | Degrada com mais usuários | @dev |
| M4 | **Fetches de 5000 rows sem paginação** | Frontend | Não escala; memory pressure | @dev + DE-2 |
| M5 | **`console.log` em produção** | Frontend | Leak de dados no console | @dev |
| M6 | **`as any` casts** (3 instâncias) | Frontend | Erros de tipo ocultos | @dev |
| M7 | **Sem validação de env vars** | Frontend | Crash obscuro | @dev |
| M8 | **4 páginas bypass React Query** | Frontend | Sem retry/cache | @dev |
| M9 | **`.env.example` poluído** | DevOps | Confusão no onboarding | @devops |
| M10 | **Sem gráficos de séries temporais** | UX | UX subótima | @ux |
| M11 | **Tabelas mobile** sem card-view | UX | UX ruim em mobile | @ux |
| M12 | **Sem document title por página** | UX | Confuso com múltiplas tabs | @ux |
| M13 | **`window.confirm()` + modais custom** | UX | Inconsistência de UX | @ux |
| M14 | **Emoji icons na navegação** | UX | Renderização inconsistente | @ux |
| DB-M1 | **`updated_at` ausente em 16 tabelas** — sem trigger automatico | **Database** | **Impossivel rastrear modificacoes; sync incremental inviavel** | **DE-3** |
| DB-M2 | **6 views duplicadas** — 3 pares Shopify com filtros diferentes | **Database** | **Ambiguidade sobre source-of-truth; dados inconsistentes** | **DE-2** |
| DB-M3 | **Queries transferem 2-3 MB por fetch** — `SELECT *` com JSONB em tabelas grandes | **Database** | **Latencia alta; 86% dos dados silenciosamente truncados (5K de 36K rows)** | **DE-2** |
| DB-M4 | **SECURITY DEFINER sem search_path** em `is_admin()` e `rdstation_dashboard_periodo()` | **Database** | **Vetor de search_path injection** | **DE-1** |

### LOW (Nice-to-have / cleanup)

| # | Débito | Origem | Impacto | Responsavel |
|---|--------|--------|---------|-------------|
| L1 | **`papaparse` dependência morta** | Frontend | ~50KB no bundle | @dev |
| L2 | **3 hooks Shopify não usados** | Frontend | Dead code | @dev |
| L3 | **6 tipos exportados não usados** | Frontend | Dead code | @dev |
| L4 | **`ShopifyPedido` redefinido localmente** | Frontend | Shadowing | @dev |
| L5 | **`supabaseKey` não exportado** | Frontend | DRY violation | @dev |
| L6 | **staleTime redundante** | Frontend | Ruído | @dev |
| L7 | **`_fonteAtiva` variável não usada** | Frontend | Dead code | @dev |
| L8 | **CRMPage com 498 linhas** | Frontend | File grande | @dev |
| L9 | **`DateRange` interface duplicada** | Frontend | DRY violation | @dev |
| L10 | **Sem `clsx`/`cn()` utility** | Frontend | Verboso | @dev |
| DB-L1 | **FKs ausentes no schema Shopify** — `shopify_pedidos` sem FK para `shopify_clientes` | **Database** | **Sem integridade referencial; JOINs ineficientes** | **DE-2** |
| DB-L2 | **5 tabelas vazias nao documentadas** — `custos`, `fornecedores`, `importacoes`, etc. | **Database** | **Complexidade cognitiva do schema** | **DE-3** |
| DB-L3 | **Sem retention policy para logs** — `access_logs` e `*_sync_log` crescem indefinidamente | **Database** | **Crescimento ilimitado ~10K rows/mes** | **DE-3** |
| DB-L4 | **Schemas Bling/Shopify nao unificados** — hierarquias paralelas sem relacao | **Database** | **Maintenance burden dobrado por feature nova** | **DE-3** |

---

## Top 15 Ações Prioritárias

| # | Ação | Severidade | Esforço | Responsavel | Story Sugerida |
|---|------|-----------|---------|-------------|----------------|
| 1 | **Restringir tokens de API** — `bling_tokens` e `shopify_tokens` para `service_role` only | CRITICAL | S | DE-1 | Quick fix |
| 2 | **Restringir 16 tabelas** — `allow_all` → `authenticated` read + `service_role` write | CRITICAL | M | DE-1 | Story |
| 3 | **Corrigir `tsconfig.json`** — remover `composite: true` ou reestruturar project references | CRITICAL | S | @dev | Quick fix |
| 4 | **Corrigir `dashboard.test.ts`** — atualizar mocks para `supabase.rpc()` | CRITICAL | S | @qa | Quick fix |
| 5 | **Corrigir 6 erros ESLint** — adicionar `import React` nos arquivos admin | CRITICAL | S | @dev | Quick fix |
| 6 | **Criar indexes** em `clientes`, `shopify_pedidos`, `shopify_clientes` | HIGH | S | DE-2 | Story |
| 7 | **Corrigir TypeScript types** — `VwResumoMensal`, `VwClientesMes` vs views reais | HIGH | M | DE-3 | Story |
| 8 | **Corrigir badge de resultado** no Header — usar `receita` da view real | HIGH | S | DE-3 | Quick fix |
| 9 | **Migrar páginas seed para dados live** — criar API services + React Query hooks | CRITICAL | XL | @dev | Epic |
| 10 | **Implementar acessibilidade base** — ARIA em modais, focus trap, keyboard nav | CRITICAL | L | @ux | Epic |
| 11 | **Remover credenciais do código** — mover Bling client_id e RD token para env vars | HIGH | S | @dev | Story |
| 12 | **Adicionar `updated_at`** + trigger automatico em 16 tabelas | MEDIUM | M | DE-3 | Story |
| 13 | **Consolidar views duplicadas** — 6 views Shopify → 3 canonicas | MEDIUM | M | DE-2 | Story |
| 14 | **Implementar paginacao real** em queries Shopify/RDStation | MEDIUM | M | DE-2 + @dev | Story |
| 15 | **Adicionar testes para auth e route guards** | HIGH | L | @qa | Story |

---

## Metricas do Projeto

| Metrica | Valor Atual | Pos-Squad DB |
|---------|------------|-------------|
| Total de arquivos fonte | 76 | 76 |
| Total de linhas | ~11.000 | ~11.200 (+types corrigidos) |
| Paginas | 19 | 19 |
| Componentes reutilizáveis | 16 | 16 |
| Arquivos de teste | 6 (~8%) | 6 (~8%) |
| Testes passando | 301/313 (96%) | 301/313 (96%) |
| Testes falhando | 12 | 12 |
| Erros ESLint | 6 | 6 |
| TypeCheck | BLOQUEADO | BLOQUEADO |
| | | |
| **Frontend** | | |
| Débitos CRITICAL | 6 | 6 (sem mudanca — escopo frontend) |
| Débitos HIGH | 10 | 9 (H9 resolvido por DE-3) |
| Débitos MEDIUM | 14 | 13 (M4 resolvido por DE-2) |
| Débitos LOW | 10 | 9 (L7 resolvido — `_fonteAtiva` ja conectado) |
| | | |
| **Database (NOVO)** | | |
| Débitos DB-CRITICAL | **2** | **0** (DE-1 resolve tokens + RLS) |
| Débitos DB-HIGH | **3** | **0** (DE-2 indexes + DE-3 types/header) |
| Débitos DB-MEDIUM | **4** | **0** (DE-1/2/3 resolve todos) |
| Débitos DB-LOW | **4** | **0** (DE-2/3 resolve todos) |
| | | |
| **Totais** | | |
| Total debitos frontend | **40** | **37** (-3 resolvidos pelo squad DB) |
| Total debitos database | **13** | **0** (-13 resolvidos pelo squad DB) |
| **Total geral** | **53** | **37** |
| | | |
| **Seguranca de Dados** | | |
| Tabelas com RLS adequado | 10/26 (38%) | **26/26 (100%)** |
| Tokens de API protegidos | 0/2 (0%) | **2/2 (100%)** |
| Registros PII protegidos | ~0 | **~130.000** |
| Functions SECURITY DEFINER seguras | 1/3 (33%) | **3/3 (100%)** |
| | | |
| **Performance de Dados** | | |
| Indexes de busca | 1 (pedidos.cliente_id) | **6** (+5 novos) |
| Views canonicas (sem duplicatas) | 7/13 (54%) | **10/10 (100%)** |
| Queries com paginacao real | 1/55 (2%) | **~10/55 (18%)** |
| Payload medio por fetch | ~3 MB | **~500 KB** |
| | | |
| **Integridade de Schema** | | |
| Tabelas com `updated_at` | 10/26 (38%) | **26/26 (100%)** |
| Tabelas com trigger auto | 0/26 (0%) | **10/26 (38%)** |
| FKs no schema Shopify | 0 | **1** |
| Types TS alinhados com DB | parcial | **100%** |

---

## Impacto Consolidado do Squad de Data Engineering

### O que muda para o usuario final

| Antes | Depois |
|-------|--------|
| Badge de resultado no Header mostra **sempre R$0** | Mostra **lucro/prejuizo real** do mes selecionado |
| Trocar fonte Bling → Shopify **nao faz nada** | Dados trocam instantaneamente (ja corrigido nesta sessao) |
| Dashboard carrega em **3-5 segundos** | Carrega em **<1 segundo** (com indexes) |
| Dados Shopify silenciosamente **truncados em 14%** | Paginacao real — **100% dos dados acessiveis** |
| Qualquer pessoa pode **ler dados de clientes** | Apenas usuarios **autenticados** podem ler |

### O que muda para o time de desenvolvimento

| Antes | Depois |
|-------|--------|
| TypeScript types mentem (campos fantasma) | Types **refletem schema real** |
| `updated_at` nunca atualizado automaticamente | Trigger auto em **todas as tabelas** |
| 6 views com mesma funcao (qual e a certa?) | **1 view canonica** por funcao |
| Sync incremental **impossivel** (sem updated_at) | Sync incremental **habilitado** |
| Novo dev precisa entender 2 schemas paralelos | Documentacao de decisao **Bling vs Shopify** |

### Reducao de risco

| Risco | Severidade Atual | Severidade Pos-Squad |
|-------|-----------------|---------------------|
| OWASP A01 — Broken Access Control | **CRITICO** | BAIXO |
| Roubo de tokens API (Bling/Shopify) | **CRITICO** | ELIMINADO |
| Exposicao de PII (130K+ registros) | **CRITICO** | BAIXO |
| Search-path injection em functions | MEDIO | ELIMINADO |
| Dados inconsistentes entre views | MEDIO | BAIXO |
| Dados truncados sem aviso | MEDIO | ELIMINADO |

---

## Conclusão

O projeto tem uma **base arquitetural sólida** — stack moderno, separação clara de camadas (API/Query/Component), lazy loading, route guards, e padrões de design consistentes. A principal dívida técnica esta agora mapeada em **4 eixos**:

1. **Seguranca de dados (CRITICO)** — 16/26 tabelas com acesso publico irrestrito, tokens de API expostos, 130K+ registros de PII vulneraveis. **O Squad DE resolve 100% deste eixo.**
2. **Dados estáticos** — 10/14 páginas renderizam seed data ao invés de dados do banco, tornando o dashboard essencialmente um mockup estático
3. **Qualidade** — typecheck quebrado, testes insuficientes (~8%), e 12 testes falhando comprometem a confiabilidade
4. **Acessibilidade** — cobertura ARIA mínima e zero suporte a teclado em componentes interativos

### Impacto do Squad de Data Engineering (3 engenheiros, 3 semanas)

O squad DE elimina **13 debitos tecnicos de banco** e resolve colateralmente **3 debitos de frontend** (H9, M4, L7), reduzindo o total de **53 para 37 debitos** (-30%). Mais criticamente:

- **Elimina todos os riscos CRITICOS de seguranca** do backend de dados
- **Acelera o dashboard em 5-10x** com indexes adequados
- **Corrige o badge de resultado** que e o indicador financeiro principal
- **Habilita sync incremental** com triggers de `updated_at`
- **Reduz transferencia de dados em ~80%** com paginacao e selecao de colunas

O branch `feat/user-management` **não deve ser mergeado** até que os itens DB-C1 e DB-C2 sejam resolvidos (tokens e RLS), pois o sistema RBAC nao tem valor se os dados sao publicos.

---

*Gerado por Orion (@aiox-master) — Brownfield Discovery Consolidation*
*Agentes: Aria (@architect), Uma (@ux-design-expert), Quinn (@qa), Alex (@analyst), Dara (@data-engineer)*
*Squad DE: DE-1 (Security), DE-2 (Performance), DE-3 (Schema)*
*Referencia detalhada banco: `docs/TECHNICAL-DEBT-DATABASE.md`*

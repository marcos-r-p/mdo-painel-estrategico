# CRM Filters, Channels & Lead Volume — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add date range filtering, daily lead volume chart, channel analysis, and empty-state loss reasons to CRMPage.

**Architecture:** A single Postgres RPC `crm_filtered(p_from, p_to)` returns 7 filtered datasets as JSONB. CRMPage switches from 4 separate materialized view hooks to one `useCrmFiltered()` hook while keeping 2 materialized view hooks for non-date-dependent data (deals parados, origens). The insight engine gains 5 new rules for channels and lead volume.

**Tech Stack:** PostgreSQL RPC, Supabase JS `.rpc()`, TanStack React Query v5, Recharts v2, TypeScript

---

## File Structure

### New files to create:
| File | Responsibility |
|------|---------------|
| `src/types/crm-filtered.ts` | TypeScript interfaces for all 7 RPC result shapes + `CrmFilteredData` |
| `src/services/api/crm-filtered.ts` | `fetchCrmFiltered()` — calls Supabase RPC |
| `src/lib/insights/__tests__/crm-insights-v2.test.ts` | Unit tests for 5 new insight rules |

### Existing files to modify:
| File | Change |
|------|--------|
| `src/services/queries/useRDStationQueries.ts` | Add `useCrmFiltered()` hook |
| `src/lib/insights/crm-insights.ts` | Add `canais?`, `leadsDiario?` to input, add 5 new rules, update `crm-perdas-sem-motivo` |
| `src/pages/CRMPage.tsx` | Add date picker, replace 4 hooks with `useCrmFiltered()`, add `SecaoLeadsDiario` + `SecaoCanais`, update `SecaoPerdas` empty state |

### SQL migration:
| File | Content |
|------|---------|
| Applied via Supabase MCP | `crm_filtered()` RPC + GRANT |

---

## Task 1: SQL Migration — Create `crm_filtered` RPC

**Files:**
- Apply via Supabase MCP: `apply_migration`

- [ ] **Step 1: Apply the RPC migration**

Use `mcp__claude_ai_Supabase__apply_migration` with project_id `giecmntojoirganbgcrk` and name `crm_filtered_rpc`:

```sql
CREATE OR REPLACE FUNCTION crm_filtered(p_from date, p_to date)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'leads_diario', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT DATE(created_at) AS dia, COUNT(*) AS leads
        FROM rdstation_deals
        WHERE created_at >= p_from AND created_at < (p_to + INTERVAL '1 day')
        GROUP BY DATE(created_at)
        ORDER BY dia
      ) t
    ),
    'leads_mensal', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT date_trunc('month', created_at)::date AS mes, COUNT(*) AS leads
        FROM rdstation_deals
        WHERE created_at >= p_from AND created_at < (p_to + INTERVAL '1 day')
        GROUP BY 1 ORDER BY 1
      ) t
    ),
    'canais', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          CASE
            WHEN deal_source IS NULL OR deal_source = 'Desconhecido'
            THEN 'Sem canal definido'
            ELSE deal_source
          END AS canal,
          COUNT(*) AS total_leads,
          SUM(CASE WHEN win THEN 1 ELSE 0 END) AS vendas,
          ROUND(100.0 * SUM(CASE WHEN win THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS taxa_conversao,
          SUM(CASE WHEN win THEN amount ELSE 0 END) AS valor_vendas,
          ROUND(AVG(CASE WHEN win THEN amount END), 2) AS ticket_medio
        FROM rdstation_deals
        WHERE created_at >= p_from AND created_at < (p_to + INTERVAL '1 day')
        GROUP BY 1
        ORDER BY total_leads DESC
      ) t
    ),
    'funil', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          date_trunc('month', created_at)::date AS mes,
          stage_name AS etapa,
          COUNT(*) AS qtd,
          SUM(amount) AS valor_total,
          SUM(CASE WHEN win THEN 1 ELSE 0 END) AS vendas,
          SUM(CASE WHEN closed AND NOT win THEN 1 ELSE 0 END) AS perdas,
          SUM(CASE WHEN win THEN amount ELSE 0 END) AS valor_vendas
        FROM rdstation_deals
        WHERE created_at >= p_from AND created_at < (p_to + INTERVAL '1 day')
        GROUP BY 1, stage_name
        ORDER BY mes, qtd DESC
      ) t
    ),
    'evolucao', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          date_trunc('month', created_at)::date AS mes,
          COUNT(*) AS criados,
          SUM(CASE WHEN win THEN 1 ELSE 0 END) AS vendidos,
          SUM(CASE WHEN closed AND NOT win THEN 1 ELSE 0 END) AS perdidos,
          SUM(amount) AS valor_criado,
          SUM(CASE WHEN win THEN amount ELSE 0 END) AS valor_vendido,
          SUM(CASE WHEN closed AND NOT win THEN amount ELSE 0 END) AS valor_perdido
        FROM rdstation_deals
        WHERE created_at >= p_from AND created_at < (p_to + INTERVAL '1 day')
        GROUP BY 1 ORDER BY 1
      ) t
    ),
    'responsaveis', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          COALESCE(user_name, 'Sem responsavel') AS responsavel,
          COUNT(*) AS total_deals,
          SUM(CASE WHEN win THEN 1 ELSE 0 END) AS vendas,
          SUM(CASE WHEN closed AND NOT win THEN 1 ELSE 0 END) AS perdas,
          ROUND(100.0 * SUM(CASE WHEN win THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS taxa_conversao,
          ROUND(AVG(CASE WHEN win THEN amount END), 2) AS ticket_medio,
          SUM(CASE WHEN win THEN amount ELSE 0 END) AS valor_total_vendas
        FROM rdstation_deals
        WHERE created_at >= p_from AND created_at < (p_to + INTERVAL '1 day')
        GROUP BY 1
        ORDER BY valor_total_vendas DESC
      ) t
    ),
    'perdas', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          COALESCE(loss_reason, 'Sem motivo') AS motivo,
          COUNT(*) AS qtd,
          SUM(amount) AS valor_total,
          ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS percentual
        FROM rdstation_deals
        WHERE closed = true AND win = false
          AND created_at >= p_from AND created_at < (p_to + INTERVAL '1 day')
        GROUP BY 1
        ORDER BY qtd DESC
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION crm_filtered(date, date) TO authenticated;
```

- [ ] **Step 2: Verify RPC works**

Use `mcp__claude_ai_Supabase__execute_sql`:

```sql
SELECT jsonb_pretty(crm_filtered('2026-03-01'::date, '2026-03-25'::date));
```

Expected: JSONB object with 7 keys, each containing arrays.

- [ ] **Step 3: Verify each section has data**

```sql
SELECT
  jsonb_array_length(r->'leads_diario') AS leads_diario,
  jsonb_array_length(r->'canais') AS canais,
  jsonb_array_length(r->'funil') AS funil,
  jsonb_array_length(r->'evolucao') AS evolucao,
  jsonb_array_length(r->'responsaveis') AS responsaveis,
  jsonb_array_length(r->'perdas') AS perdas
FROM crm_filtered('2026-01-01'::date, '2026-03-25'::date) AS r;
```

---

## Task 2: TypeScript Types + API Service + Hook

**Files:**
- Create: `src/types/crm-filtered.ts`
- Create: `src/services/api/crm-filtered.ts`
- Modify: `src/services/queries/useRDStationQueries.ts`

- [ ] **Step 1: Create types**

Create `src/types/crm-filtered.ts`:

```typescript
// src/types/crm-filtered.ts

export interface CrmLeadDiario {
  dia: string
  leads: number
}

export interface CrmLeadMensal {
  mes: string
  leads: number
}

export interface CrmCanal {
  canal: string
  total_leads: number
  vendas: number
  taxa_conversao: number
  valor_vendas: number
  ticket_medio: number | null
}

export interface CrmFunilFiltered {
  mes: string
  etapa: string
  qtd: number
  valor_total: number
  vendas: number
  perdas: number
  valor_vendas: number
}

export interface CrmEvolucaoFiltered {
  mes: string
  criados: number
  vendidos: number
  perdidos: number
  valor_criado: number
  valor_vendido: number
  valor_perdido: number
}

export interface CrmResponsavelFiltered {
  responsavel: string
  total_deals: number
  vendas: number
  perdas: number
  taxa_conversao: number
  ticket_medio: number | null
  valor_total_vendas: number
}

export interface CrmPerdaFiltered {
  motivo: string
  qtd: number
  valor_total: number
  percentual: number | null
}

export interface CrmFilteredData {
  leads_diario: CrmLeadDiario[]
  leads_mensal: CrmLeadMensal[]
  canais: CrmCanal[]
  funil: CrmFunilFiltered[]
  evolucao: CrmEvolucaoFiltered[]
  responsaveis: CrmResponsavelFiltered[]
  perdas: CrmPerdaFiltered[]
}
```

- [ ] **Step 2: Create API service**

Create `src/services/api/crm-filtered.ts`:

```typescript
// src/services/api/crm-filtered.ts
import { supabase } from '../supabase'
import type { CrmFilteredData } from '../../types/crm-filtered'

export async function fetchCrmFiltered(dateFrom: string, dateTo: string): Promise<CrmFilteredData> {
  const { data, error } = await supabase.rpc('crm_filtered', {
    p_from: dateFrom,
    p_to: dateTo,
  })
  if (error) throw new Error(`fetchCrmFiltered: ${error.message}`)
  if (!data) throw new Error('fetchCrmFiltered: no data returned')
  return data as CrmFilteredData
}
```

- [ ] **Step 3: Add hook to useRDStationQueries.ts**

Add at the end of `src/services/queries/useRDStationQueries.ts`, after the existing hooks:

```typescript
import { fetchCrmFiltered } from '../api/crm-filtered'

// ── Filtered CRM hook (date range) ───────────────────────────

export function useCrmFiltered(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['crm', 'filtered', dateFrom, dateTo],
    queryFn: () => fetchCrmFiltered(dateFrom, dateTo),
    ...OPTS,
    enabled: !!dateFrom && !!dateTo,
  })
}
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep -E "(crm-filtered|useRDStation)" | head -10
```

Expected: no new type errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/crm-filtered.ts src/services/api/crm-filtered.ts src/services/queries/useRDStationQueries.ts
git commit -m "feat: add crm_filtered types, API service, and React Query hook"
```

---

## Task 3: Insight Engine — New Rules + Tests (TDD)

**Files:**
- Modify: `src/lib/insights/crm-insights.ts`
- Create: `src/lib/insights/__tests__/crm-insights-v2.test.ts`

- [ ] **Step 1: Write tests for 5 new rules**

Create `src/lib/insights/__tests__/crm-insights-v2.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateCrmInsights } from '../crm-insights'

const EMPTY_BASE = {
  funil: [],
  evolucao: [],
  dealsParados: [],
  responsaveis: [],
  origens: [],
  perdas: [],
}

describe('generateCrmInsights — new rules', () => {
  it('generates critico alert when >80% leads have no channel', () => {
    const canais = [
      { canal: 'Sem canal definido', total_leads: 90, vendas: 10, taxa_conversao: 11.1, valor_vendas: 5000, ticket_medio: 500 },
      { canal: 'Google Ads', total_leads: 10, vendas: 5, taxa_conversao: 50, valor_vendas: 3000, ticket_medio: 600 },
    ]
    const result = generateCrmInsights({ ...EMPTY_BASE, canais })
    const alert = result.find(i => i.id === 'crm-canal-sem-id')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('critico')
  })

  it('generates opportunity for high-conversion channel', () => {
    const canais = [
      { canal: 'Google Ads', total_leads: 10, vendas: 5, taxa_conversao: 50, valor_vendas: 5000, ticket_medio: 1000 },
      { canal: 'Sem canal definido', total_leads: 50, vendas: 2, taxa_conversao: 4, valor_vendas: 500, ticket_medio: 250 },
    ]
    const result = generateCrmInsights({ ...EMPTY_BASE, canais })
    const opp = result.find(i => i.id === 'crm-canal-alta-conversao-Google Ads')
    expect(opp).toBeDefined()
    expect(opp!.type).toBe('oportunidade')
  })

  it('generates alert for 3+ consecutive days without leads', () => {
    const leadsDiario = [
      { dia: '2026-03-01', leads: 10 },
      { dia: '2026-03-02', leads: 5 },
      // gap: 03, 04, 05 missing = 3 consecutive days
      { dia: '2026-03-06', leads: 8 },
    ]
    const result = generateCrmInsights({ ...EMPTY_BASE, leadsDiario })
    const alert = result.find(i => i.id === 'crm-leads-gap')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
  })

  it('generates tendencia for lead spike >2x average', () => {
    const leadsDiario = [
      { dia: '2026-03-01', leads: 10 },
      { dia: '2026-03-02', leads: 8 },
      { dia: '2026-03-03', leads: 12 },
      { dia: '2026-03-04', leads: 50 }, // >2x avg of ~20
    ]
    const result = generateCrmInsights({ ...EMPTY_BASE, leadsDiario })
    const trend = result.find(i => i.id === 'crm-leads-pico')
    expect(trend).toBeDefined()
    expect(trend!.type).toBe('tendencia')
  })

  it('generates alert when all perdas have "Sem motivo" (updated rule)', () => {
    const perdas = [
      { motivo: 'Sem motivo', qtd: 30, valor_total: 30000, percentual: 100 },
    ]
    const result = generateCrmInsights({ ...EMPTY_BASE, perdas })
    const alert = result.find(i => i.id === 'crm-perdas-sem-motivo')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
    expect(alert!.titulo).toBe('Perdas sem motivo registrado')
  })

  it('generates alert when perdas array is empty', () => {
    const result = generateCrmInsights({ ...EMPTY_BASE, perdas: [] })
    const alert = result.find(i => i.id === 'crm-perdas-sem-motivo')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
  })

  it('does NOT fire perdas rule when real motivos exist', () => {
    const perdas = [
      { motivo: 'Preço', qtd: 20, valor_total: 20000, percentual: 50 },
      { motivo: 'Sem motivo', qtd: 20, valor_total: 20000, percentual: 50 },
    ]
    const result = generateCrmInsights({ ...EMPTY_BASE, perdas })
    const alert = result.find(i => i.id === 'crm-perdas-sem-motivo')
    expect(alert).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/insights/__tests__/crm-insights-v2.test.ts
```

Expected: FAIL — new rules not implemented yet.

- [ ] **Step 3: Update `CrmInsightInput` and implement new rules**

Modify `src/lib/insights/crm-insights.ts`. Add to imports:

```typescript
import type { CrmCanal, CrmLeadDiario } from '../../types/crm-filtered'
```

Update the `CrmInsightInput` interface (add 2 optional fields):

```typescript
interface CrmInsightInput {
  funil: CrmFunilPeriodo[]
  evolucao: CrmEvolucaoMensal[]
  dealsParados: CrmDealParado[]
  responsaveis: CrmResponsavel[]
  origens: CrmOrigem[]
  perdas: CrmPerda[]
  canais?: CrmCanal[]
  leadsDiario?: CrmLeadDiario[]
}
```

**Replace** the existing Rule 5 (`crm-perdas-sem-motivo`, the `> 30%` threshold check) with this updated version:

```typescript
  // Rule 5: Perdas sem motivo (updated — fires when array is empty OR all are "Sem motivo")
  const allSemMotivo = input.perdas.length === 0 || input.perdas.every(p => p.motivo === 'Sem motivo')
  if (allSemMotivo) {
    const totalPerdas = input.perdas.reduce((a, p) => a + p.qtd, 0)
    insights.push({
      id: 'crm-perdas-sem-motivo',
      type: 'alerta',
      severity: 'atencao',
      titulo: 'Perdas sem motivo registrado',
      descricao: totalPerdas > 0
        ? `Nenhuma perda possui motivo registrado (${totalPerdas} deals perdidos).`
        : 'Nenhum motivo de perda registrado no periodo.',
      metrica: { atual: 100 },
      recomendacao: 'Configure motivos de perda no RD Station para analisar por que os deals são perdidos',
      prioridade: 7,
    })
  }
```

**Add** these new rules after Rule 6 (pipeline crescendo):

```typescript
  // Rule 7: Canal sem identificação (>80% leads)
  if (input.canais && input.canais.length > 0) {
    const totalLeads = input.canais.reduce((a, c) => a + c.total_leads, 0)
    const semCanal = input.canais.find(c => c.canal === 'Sem canal definido')
    if (semCanal && totalLeads > 0 && (semCanal.total_leads / totalLeads) * 100 > 80) {
      const pct = Math.round((semCanal.total_leads / totalLeads) * 100)
      insights.push({
        id: 'crm-canal-sem-id',
        type: 'alerta',
        severity: 'critico',
        titulo: `${pct}% dos leads sem canal`,
        descricao: `${pct}% dos leads (${semCanal.total_leads} de ${totalLeads}) nao tem canal de origem identificado.`,
        metrica: { atual: pct },
        recomendacao: 'Configure UTMs obrigatorios no RD Station para rastrear ROI por canal',
        prioridade: 9,
      })
    }

    // Rule 8: Canal com alta conversão (>30%, >=5 leads, not "Sem canal definido")
    for (const canal of input.canais) {
      if (canal.canal !== 'Sem canal definido' && canal.taxa_conversao > 30 && canal.total_leads >= 5) {
        insights.push({
          id: `crm-canal-alta-conversao-${canal.canal}`,
          type: 'oportunidade',
          severity: 'info',
          titulo: `${canal.canal} converte ${canal.taxa_conversao}%`,
          descricao: `Canal "${canal.canal}" tem ${canal.taxa_conversao}% de conversao com ${canal.total_leads} leads.`,
          metrica: { atual: canal.taxa_conversao },
          recomendacao: `Canal ${canal.canal} converte ${canal.taxa_conversao}%, considerar investir mais`,
          prioridade: 5,
        })
      }
    }
  }

  // Rule 9: Dias sem leads (3+ consecutive calendar days without leads)
  if (input.leadsDiario && input.leadsDiario.length >= 2) {
    const sorted = [...input.leadsDiario].sort((a, b) => a.dia.localeCompare(b.dia))
    let maxGap = 0
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].dia)
      const curr = new Date(sorted[i].dia)
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)) - 1
      if (diffDays > maxGap) maxGap = diffDays
    }
    if (maxGap >= 3) {
      insights.push({
        id: 'crm-leads-gap',
        type: 'alerta',
        severity: 'atencao',
        titulo: `${maxGap} dias sem leads`,
        descricao: `Houve um periodo de ${maxGap} dias consecutivos sem nenhum lead no periodo selecionado.`,
        metrica: { atual: maxGap },
        recomendacao: `${maxGap} dias sem leads, verificar se campanhas estavam ativas`,
        prioridade: 6,
      })
    }
  }

  // Rule 10: Pico de leads (dia com >2x a média)
  if (input.leadsDiario && input.leadsDiario.length >= 3) {
    const avg = input.leadsDiario.reduce((a, d) => a + d.leads, 0) / input.leadsDiario.length
    const pico = input.leadsDiario.reduce((best, d) => d.leads > best.leads ? d : best, input.leadsDiario[0])
    if (avg > 0 && pico.leads > avg * 2) {
      insights.push({
        id: 'crm-leads-pico',
        type: 'tendencia',
        severity: 'info',
        titulo: `Pico: ${pico.leads} leads em ${pico.dia}`,
        descricao: `Dia ${pico.dia} teve ${pico.leads} leads, mais de 2x a media de ${avg.toFixed(0)} leads/dia.`,
        metrica: { atual: pico.leads, anterior: avg },
        recomendacao: `Investigar o que causou o pico de ${pico.leads} leads em ${pico.dia}`,
        prioridade: 3,
      })
    }
  }
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/insights/__tests__/crm-insights-v2.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Run existing insight tests too**

```bash
npx vitest run src/lib/insights/__tests__/crm-insights.test.ts
```

Expected: all 7 existing tests still PASS (the updated perdas rule changes behavior — the old test for `> 30%` threshold needs updating if it exists. Check and update accordingly).

**Note:** The existing test `'generates alert for losses without reason > 30%'` tests the old rule that fired at 30%. Since we changed the rule to fire when ALL are "Sem motivo", update that test:

In `src/lib/insights/__tests__/crm-insights.test.ts`, find the test `'generates alert for losses without reason > 30%'` and update its perdas data so ALL motivos are "Sem motivo":

```typescript
  it('generates alert for losses without reason > 30%', () => {
    const perdas: CrmPerda[] = [
      { motivo: 'Sem motivo', qtd: 40, valor_total: 40000, percentual: 100 },
    ]

    const result = generateCrmInsights({
      funil: [], evolucao: [], dealsParados: [], responsaveis: [], origens: [], perdas,
    })

    const alert = result.find(i => i.id === 'crm-perdas-sem-motivo')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('atencao')
  })
```

- [ ] **Step 6: Run all insight tests**

```bash
npx vitest run src/lib/insights
```

Expected: all tests PASS (existing + 7 new = total, minus any adjusted).

**Note:** The `SecaoLeadsDiario` code references Recharts color constants (`GRID_STROKE`, `AXIS_TICK`, `TOOLTIP_BG`, `TOOLTIP_BORDER`, `BLUE`) that already exist in `CRMPage.tsx` lines 22-28. No new definitions needed.

- [ ] **Step 7: Commit**

```bash
git add src/lib/insights/crm-insights.ts src/lib/insights/__tests__/crm-insights-v2.test.ts src/lib/insights/__tests__/crm-insights.test.ts
git commit -m "feat: add 5 new CRM insight rules (channels, lead volume, perdas update) with tests"
```

---

## Task 4: CRMPage Redesign — Date Picker + New Sections + Data Migration

**Files:**
- Modify: `src/pages/CRMPage.tsx`

This is the largest task. It modifies CRMPage to:
1. Add date range picker with quick-select buttons
2. Replace 4 hooks (funil, evolucao, responsaveis, perdas) with `useCrmFiltered()`
3. Add `SecaoLeadsDiario` (daily bar chart)
4. Add `SecaoCanais` (channel table with alert banner)
5. Update `SecaoPerdas` with empty-state banner
6. Update `SecaoInsights` to combine filtered + materialized view data
7. Add empty states for all filtered sections
8. Reorder sections per spec

- [ ] **Step 1: Rewrite CRMPage.tsx**

Key changes to make (the implementer must read the current file first):

**Imports to add:**
```typescript
import { useState } from 'react'
import { useCrmFiltered, useCrmOrigens, useCrmDealsParados } from '../services/queries/useRDStationQueries'
import type { CrmLeadDiario, CrmCanal, CrmPerdaFiltered } from '../types/crm-filtered'
```

**Imports to remove:**
```typescript
// Remove: useCrmFunil, useCrmEvolucao, useCrmPerdas, useCrmResponsaveis
// Remove: CrmFunilPeriodo, CrmEvolucaoMensal, CrmPerda, CrmResponsavel type imports (use filtered equivalents)
```

**Date state (add inside CRMPage component):**
```typescript
const [dateFrom, setDateFrom] = useState(() => {
  const d = new Date(); d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
})
const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
```

**Hook calls (replace 4 old hooks with 1 filtered + keep 2):**
```typescript
const { data: filtered, isLoading: loadingFiltered } = useCrmFiltered(dateFrom, dateTo)
const { data: origens = [], isLoading: loadingOrigens } = useCrmOrigens()
const { data: dealsParados = [], isLoading: loadingDeals } = useCrmDealsParados()

const isLoading = loadingFiltered || loadingOrigens || loadingDeals
```

**Insight generation (update useMemo):**
```typescript
const insights = useMemo(() => {
  if (!filtered) return []
  return processInsights(
    generateCrmInsights({
      funil: filtered.funil,
      evolucao: filtered.evolucao,
      responsaveis: filtered.responsaveis,
      perdas: filtered.perdas,
      canais: filtered.canais,
      leadsDiario: filtered.leads_diario,
      dealsParados,
      origens,
    })
  )
}, [filtered, dealsParados, origens])
```

**Quick-select buttons helper:**
```typescript
function setQuickRange(days: number) {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  setDateFrom(from.toISOString().split('T')[0])
  setDateTo(to.toISOString().split('T')[0])
}
```

**Date picker header (add after page title):**
```tsx
<div className="flex flex-wrap items-center gap-3">
  <div className="flex items-center gap-2">
    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
      max={dateTo}
      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300" />
    <span className="text-gray-500 text-sm">até</span>
    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
      min={dateFrom} max={new Date().toISOString().split('T')[0]}
      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300" />
  </div>
  <div className="flex gap-1">
    {[{ label: '7d', days: 7 }, { label: '30d', days: 30 }, { label: '90d', days: 90 }, { label: '6m', days: 180 }].map(opt => (
      <button key={opt.label} onClick={() => setQuickRange(opt.days)}
        className="px-2.5 py-1 text-xs rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 transition">
        {opt.label}
      </button>
    ))}
  </div>
</div>
```

**SecaoLeadsDiario (new section):**
```tsx
function SecaoLeadsDiario({ data }: { data: CrmLeadDiario[] }) {
  if (data.length === 0) {
    return <Card title="Volume de Leads por Dia"><EstadoVazio mensagem="Nenhum lead no período selecionado" /></Card>
  }
  const chartData = data.map(d => ({
    dia: new Date(d.dia + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    leads: d.leads,
  }))
  return (
    <Card title="Volume de Leads por Dia">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="dia" tick={{ fill: AXIS_TICK, fontSize: 11 }} interval={Math.max(0, Math.floor(chartData.length / 15))} />
          <YAxis tick={{ fill: AXIS_TICK, fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: TOOLTIP_BG, border: `1px solid ${TOOLTIP_BORDER}`, borderRadius: '8px' }}
            formatter={(v: number) => [v, 'Leads']} />
          <Bar dataKey="leads" fill={BLUE} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
```

**SecaoCanais (new section):**
```tsx
function SecaoCanais({ data }: { data: CrmCanal[] }) {
  if (data.length === 0) {
    return <Card title="Análise por Canal"><EstadoVazio mensagem="Nenhum dado de canal no período" /></Card>
  }
  const totalLeads = data.reduce((a, c) => a + c.total_leads, 0)
  const semCanal = data.find(c => c.canal === 'Sem canal definido')
  const pctSemCanal = semCanal && totalLeads > 0 ? Math.round((semCanal.total_leads / totalLeads) * 100) : 0
  const maxLeads = Math.max(...data.map(c => c.total_leads), 1)

  return (
    <Card title="Análise por Canal">
      {pctSemCanal > 80 && (
        <div className="mb-4 rounded-lg border p-4 bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
          <p className="text-sm font-semibold">{pctSemCanal}% dos leads não têm canal identificado</p>
          <p className="text-xs mt-1 opacity-80">Configure UTMs obrigatórios no RD Station para rastrear ROI por canal</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 px-2">Canal</th>
              <th className="py-2 px-2 text-right">Leads</th>
              <th className="py-2 px-2 text-right">Vendas</th>
              <th className="py-2 px-2 text-right">Conversão</th>
              <th className="py-2 px-2 text-right">Valor Vendas</th>
              <th className="py-2 px-2 text-right">Ticket Médio</th>
              <th className="py-2 px-2 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((c, i) => {
              const isSemCanal = c.canal === 'Sem canal definido'
              return (
                <tr key={i} className={`border-b border-gray-100 dark:border-gray-700/50 ${isSemCanal ? 'bg-yellow-500/10' : ''}`}>
                  <td className="py-2.5 px-2 font-medium text-gray-700 dark:text-gray-200">{c.canal}</td>
                  <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">{formatNumber(c.total_leads)}</td>
                  <td className="py-2.5 px-2 text-right text-green-400">{formatNumber(c.vendas)}</td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.taxa_conversao >= 30 ? 'bg-green-900 text-green-300' : c.taxa_conversao > 0 ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-500'}`}>
                      {c.taxa_conversao}%
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-300">{formatCurrency(c.valor_vendas)}</td>
                  <td className="py-2.5 px-2 text-right text-gray-300">{c.ticket_medio != null ? formatCurrency(c.ticket_medio) : '—'}</td>
                  <td className="py-2.5 px-2">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(c.total_leads / maxLeads) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
```

**SecaoPerdas update:** The existing `SecaoPerdas` must check if all motivos are "Sem motivo":

```tsx
// Inside SecaoPerdas, before the donut chart:
const allSemMotivo = data.length === 0 || data.every(p => p.motivo === 'Sem motivo')
if (allSemMotivo) {
  return (
    <Card title="Motivos de Perda">
      <div className="rounded-lg border p-4 bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
        <p className="text-sm font-semibold">Nenhum motivo de perda registrado no RD Station</p>
        <p className="text-xs mt-1 opacity-80">Configure os motivos de perda nas configurações do RD Station para habilitar esta análise</p>
      </div>
    </Card>
  )
}
// Otherwise show donut + table as before
```

**Existing sections update:** `SecaoFunil`, `SecaoEvolucao`, `SecaoResponsaveis` now receive data from `filtered.*` instead of individual hooks. Their type props change slightly (e.g., `CrmFunilFiltered` instead of `CrmFunilPeriodo`). Since the shapes are compatible (both have `mes`, `etapa`, `qtd`, etc.), the internal rendering code stays mostly the same. Add empty-state checks at the start of each:

```tsx
if (data.length === 0) {
  return <Card title="..."><EstadoVazio mensagem="..." /></Card>
}
```

**Section render order in the main return:**
```tsx
return (
  <div className="space-y-6 animate-fade-in">
    {/* Header with title + date picker */}
    {/* SecaoInsights */}
    <SecaoLeadsDiario data={filtered?.leads_diario ?? []} />
    {/* SecaoFunil — data={filtered?.funil ?? []} */}
    {/* SecaoEvolucao — data={filtered?.evolucao ?? []} */}
    <SecaoCanais data={filtered?.canais ?? []} />
    {/* SecaoPerdas — data={filtered?.perdas ?? []} */}
    {/* SecaoResponsaveis — data={filtered?.responsaveis ?? []} */}
    {/* SecaoOrigens — data={origens} (unchanged) */}
    {/* SecaoDealsParados — data={dealsParados} (unchanged) */}
  </div>
)
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep "CRMPage" | head -10
```

Expected: no type errors from CRMPage.

- [ ] **Step 3: Run insight tests**

```bash
npx vitest run src/lib/insights
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CRMPage.tsx
git commit -m "feat: add date range filter, lead volume chart, channel analysis to CRMPage"
```

---

## Task 5: Final Verification

- [ ] **Step 1: Run all tests**

```bash
npx vitest run src/lib/insights
```

Expected: all insight tests pass (existing + new).

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit 2>&1 | grep -E "(crm-filtered|CRMPage|crm-insights)" | head -10
```

Expected: no errors in our files.

- [ ] **Step 3: Visual verification**

```bash
npm run dev
```

Open CRM page in browser. Verify:
- Date picker shows default 30-day range
- Quick-select buttons (7d, 30d, 90d, 6m) work
- Changing dates updates all filtered sections
- SecaoLeadsDiario shows daily bar chart
- SecaoCanais shows channel table with yellow banner for "Sem canal definido"
- SecaoPerdas shows yellow banner (since all motivos are "Sem motivo")
- Insights include "95% dos leads sem canal" alert
- SecaoOrigens and SecaoDealsParados still work (materialized views)
- No console errors

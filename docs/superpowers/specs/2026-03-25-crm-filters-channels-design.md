# CRM Filters, Channels & Lead Volume — Design Spec

## Goal

Add date range filtering, daily lead volume chart, channel analysis with conversion/ticket metrics, and empty-state handling for loss reasons to the CRM dashboard.

## Context

The current CRMPage uses materialized views with no period filtering. Key data gaps identified:

- **`deal_source`**: 79% NULL + 16% "Desconhecido" = 95% unidentified. Remaining 5% includes Google Ads, Tráfego Direto, Busca Orgânica, Referência.
- **`loss_reason`**: 100% NULL — no deals have loss reasons recorded.
- **Daily lead volume**: available via `created_at` on `rdstation_deals`, averaging 10-15 leads/day.

## Architecture

### Data Layer: RPC Function `crm_filtered(p_from date, p_to date)`

A single Postgres RPC replaces the need for parameterized views. Returns a JSONB object with 7 sections, all filtered by `created_at` within the given date range.

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
        WHERE created_at >= p_from AND created_at < p_to + 1
        GROUP BY DATE(created_at)
        ORDER BY dia
      ) t
    ),
    'leads_mensal', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT date_trunc('month', created_at)::date AS mes, COUNT(*) AS leads
        FROM rdstation_deals
        WHERE created_at >= p_from AND created_at < p_to + 1
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
        WHERE created_at >= p_from AND created_at < p_to + 1
        GROUP BY 1
        ORDER BY total_leads DESC
      ) t
    ),
    'funil', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          stage_name AS etapa,
          COUNT(*) AS qtd,
          SUM(amount) AS valor_total,
          SUM(CASE WHEN win THEN 1 ELSE 0 END) AS vendas,
          SUM(CASE WHEN closed AND NOT win THEN 1 ELSE 0 END) AS perdas,
          SUM(CASE WHEN win THEN amount ELSE 0 END) AS valor_vendas
        FROM rdstation_deals
        WHERE created_at >= p_from AND created_at < p_to + 1
        GROUP BY stage_name
        ORDER BY qtd DESC
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
        WHERE created_at >= p_from AND created_at < p_to + 1
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
        WHERE created_at >= p_from AND created_at < p_to + 1
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
          AND created_at >= p_from AND created_at < p_to + 1
        GROUP BY 1
        ORDER BY qtd DESC
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Access control:**
```sql
GRANT EXECUTE ON FUNCTION crm_filtered(date, date) TO authenticated;
```

### TypeScript Types

```typescript
// src/types/crm-filtered.ts

export interface CrmLeadDiario {
  dia: string        // "2026-03-10"
  leads: number
}

export interface CrmLeadMensal {
  mes: string        // "2026-03-01"
  leads: number
}

export interface CrmCanal {
  canal: string      // "Busca Paga | Google" or "Sem canal definido"
  total_leads: number
  vendas: number
  taxa_conversao: number
  valor_vendas: number
  ticket_medio: number | null
}

export interface CrmFunilFiltered {
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
  percentual: number
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

### API Service

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
  return data as CrmFilteredData
}
```

### React Query Hook

```typescript
// Added to src/services/queries/useRDStationQueries.ts
export function useCrmFiltered(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['crm', 'filtered', dateFrom, dateTo],
    queryFn: () => fetchCrmFiltered(dateFrom, dateTo),
    ...OPTS,
    enabled: !!dateFrom && !!dateTo,
  })
}
```

## Frontend — CRMPage Updates

### Date Range Filter (header)

Two `<input type="date">` fields in the page header beside the title. Default: last 30 days (`today - 30` to `today`).

Quick-select buttons below: **7d | 30d | 90d | 6m** — clicking fills both date inputs.

State managed with `useState`:
```typescript
const [dateFrom, setDateFrom] = useState(() => {
  const d = new Date(); d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
})
const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
```

### New Section: SecaoLeadsDiario

- **Position:** After SecaoInsights
- **Chart:** Recharts `BarChart` vertical — one bar per day
- **X-axis:** date formatted as "10/Mar"
- **Y-axis:** lead count
- **Bar color:** `#3b82f6` (blue)
- **Tooltip:** "10/Mar/26: 29 leads"
- **Empty state:** "Nenhum lead no período selecionado"

### New Section: SecaoCanais

- **Position:** After SecaoEvolucao
- **Layout:** Table with horizontal bar indicators
- **Columns:** Canal, Total Leads, Vendas, Taxa Conversão (badge), Valor Vendas, Ticket Médio, barra proporcional
- **"Sem canal definido" row:** highlighted with `bg-yellow-500/10` background
- **Banner alert** at top if "Sem canal definido" > 80%:
  - Yellow alert: "X% dos leads não têm canal identificado"
  - CTA: "Configure UTMs obrigatórios no RD Station para rastrear ROI por canal"
- **Empty state:** "Nenhum dado de canal no período"

### Updated Section: SecaoPerdas

- **If all motivos are "Sem motivo" (or perdas array is empty):**
  - Yellow banner: "Nenhum motivo de perda registrado no RD Station"
  - CTA: "Configure os motivos de perda nas configurações do RD Station para habilitar esta análise"
  - Hide donut chart, show only the banner
- **If has real motivos:** Show donut + table as current implementation

### Data Source Changes

| Section | Before (materialized view) | After (RPC filtered) |
|---------|---------------------------|---------------------|
| SecaoFunil | `useCrmFunil()` | `useCrmFiltered().funil` |
| SecaoEvolucao | `useCrmEvolucao()` | `useCrmFiltered().evolucao` |
| SecaoResponsaveis | `useCrmResponsaveis()` | `useCrmFiltered().responsaveis` |
| SecaoPerdas | `useCrmPerdas()` | `useCrmFiltered().perdas` |
| SecaoLeadsDiario | *new* | `useCrmFiltered().leads_diario` |
| SecaoCanais | *new* | `useCrmFiltered().canais` |
| SecaoOrigens | `useCrmOrigens()` — *unchanged* | Stays on materialized view |
| SecaoDealsParados | `useCrmDealsParados()` — *unchanged* | Stays on materialized view |
| SecaoInsights | Mixed — *updated* | Receives filtered + view data |

### Section Order (top to bottom)

1. Header with date range picker + quick buttons
2. SecaoInsights (combined from filtered + materialized views)
3. SecaoLeadsDiario (new — daily bar chart)
4. SecaoFunil (filtered)
5. SecaoEvolucao (filtered)
6. SecaoCanais (new — channel table)
7. SecaoPerdas (filtered, with empty-state handling)
8. SecaoResponsaveis (filtered)
9. SecaoOrigens (materialized view, unchanged)
10. SecaoDealsParados (materialized view, unchanged)

## Insight Engine Updates

### New Input Fields

```typescript
interface CrmInsightInput {
  // existing
  funil: CrmFunilPeriodo[]
  evolucao: CrmEvolucaoMensal[]
  dealsParados: CrmDealParado[]
  responsaveis: CrmResponsavel[]
  origens: CrmOrigem[]
  perdas: CrmPerda[]
  // new
  canais?: CrmCanal[]
  leadsDiario?: CrmLeadDiario[]
}
```

### New Insight Rules

| ID | Rule | Type | Severity | Condition |
|----|------|------|----------|-----------|
| `crm-canal-sem-id` | Canal sem identificação | alerta | critico | "Sem canal definido" > 80% of total leads |
| `crm-canal-alta-conversao` | Canal com alta conversão | oportunidade | info | Canal (not "Sem canal definido") with taxa_conversao > 30% and total_leads >= 5 |
| `crm-leads-gap` | Dias sem leads | alerta | atencao | 3+ consecutive days with 0 leads in the period |
| `crm-leads-pico` | Pico de leads | tendencia | info | Any day with > 2x the daily average of the period |
| `crm-perdas-sem-motivo` | Perdas sem motivo (updated) | alerta | atencao | All loss records have motivo = "Sem motivo" OR perdas array is empty while there are closed+lost deals |

### Existing Rules Unchanged

- `crm-deals-parados` (critico, >5 stale deals)
- `crm-conversao-queda` (atencao, >20% conversion drop)
- `crm-vendedor-sem-vendas` (atencao, seller with 0 sales)
- `crm-origem-alta-conversao` (oportunidade, origin >30%)
- `crm-pipeline-crescendo` (oportunidade, >20% pipeline growth)

## Security

- RPC function uses `SECURITY DEFINER`
- `GRANT EXECUTE ON FUNCTION crm_filtered(date, date) TO authenticated`
- Date inputs validated on frontend (no future dates, from <= to)

## Testing

- Unit tests for new insight rules (5 new tests)
- Unit tests for existing insight rules remain unchanged
- Type-check all new interfaces

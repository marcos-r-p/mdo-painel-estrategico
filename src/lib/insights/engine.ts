// src/lib/insights/engine.ts
import type { Insight } from './types'

const SEVERITY_WEIGHT: Record<string, number> = {
  critico: 3,
  atencao: 2,
  info: 1,
}

/**
 * Combine, deduplicate by id, and sort insights by priority (desc)
 * then by severity weight (desc).
 */
export function processInsights(...groups: Insight[][]): Insight[] {
  const all = groups.flat()
  const unique = new Map<string, Insight>()
  for (const insight of all) {
    if (!unique.has(insight.id)) {
      unique.set(insight.id, insight)
    }
  }

  return Array.from(unique.values()).sort((a, b) => {
    if (b.prioridade !== a.prioridade) return b.prioridade - a.prioridade
    return (SEVERITY_WEIGHT[b.severity] ?? 0) - (SEVERITY_WEIGHT[a.severity] ?? 0)
  })
}

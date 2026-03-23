import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://sskcyftrgohcttghacoz.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNza2N5ZnRyZ29oY3R0Z2hhY296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzQ1MTIsImV4cCI6MjA4OTcxMDUxMn0.70NyFgxG_gKWegpW5A9dUsYKLeTjPyzfdn9i1MIDfTI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
export { SUPABASE_URL }

export const db = {
  async getAll(table) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) { console.error(`Erro ao ler ${table}:`, error); return [] }
    return data || []
  },
  async insert(table, rows) {
    const { data, error } = await supabase.from(table).insert(rows).select()
    if (error) { console.error(`Erro ao inserir em ${table}:`, error); return null }
    return data
  },
  async upsert(table, rows, onConflict) {
    const { data, error } = await supabase.from(table).upsert(rows, { onConflict }).select()
    if (error) { console.error(`Erro ao upsert em ${table}:`, error); return null }
    return data
  },
  async clearTable(table) {
    const { error } = await supabase.from(table).delete().neq('id', 0)
    if (error) console.error(`Erro ao limpar ${table}:`, error)
  },
  async logImport(nomeArquivo, tipoDetectado, totalLinhas, totalColunas, confianca) {
    return await db.insert('importacoes', [{
      nome_arquivo: nomeArquivo,
      tipo_detectado: tipoDetectado,
      total_linhas: totalLinhas,
      total_colunas: totalColunas,
      confianca,
      dados_aplicados: true,
    }])
  },
}

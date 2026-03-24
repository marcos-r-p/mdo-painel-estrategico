import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the supabase module before importing the functions under test
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  supabaseUrl: 'https://test.supabase.co',
}))

import { fetchResumoMensal, fetchDadosMes, fetchConnectionStatus } from './dashboard'
import { supabase } from '../supabase'

const mockFrom = vi.mocked(supabase.from)

describe('fetchResumoMensal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns typed data on success', async () => {
    const fakeRows = [
      { mes: '2026-03', clientes: 80, receita: 45000, pedidos: 100, ticket_medio: 450, b2b: 30, b2c: 50, com_celular: 60, estados: 5 },
    ]

    const mockOrder = vi.fn().mockResolvedValue({ data: fakeRows, error: null })
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValue({ select: mockSelect } as any)

    const result = await fetchResumoMensal()
    expect(result).toEqual(fakeRows)
    expect(result).toHaveLength(1)
    expect(result[0].mes).toBe('2026-03')
  })

  it('returns empty array when data is null', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValue({ select: mockSelect } as any)

    const result = await fetchResumoMensal()
    expect(result).toEqual([])
  })

  it('throws on supabase error', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: { message: 'connection lost' } })
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValue({ select: mockSelect } as any)

    await expect(fetchResumoMensal()).rejects.toThrow('Erro ao carregar resumo mensal: connection lost')
  })
})

describe('fetchDadosMes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns clientes and estados on success', async () => {
    const fakeClientes = [{ mes: '2026-03', nome: 'Test', tipo: 'B2C', uf: 'DF', total_gasto: 100, total_pedidos: 1, ultima_compra: '2026-03-15' }]
    const fakeUfs = [{ mes: '2026-03', uf: 'DF', pedidos: 5, receita: 1000, clientes: 3 }]

     
    mockFrom.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: table === 'vw_clientes_mes' ? fakeClientes : fakeUfs,
          error: null,
        }),
      }),
    }) as any)

    const result = await fetchDadosMes('2026-03')
    expect(result.clientes).toEqual(fakeClientes)
    expect(result.estados).toEqual(fakeUfs)
  })

  it('throws when clientes query fails', async () => {
     
    mockFrom.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(
          table === 'vw_clientes_mes'
            ? { data: null, error: { message: 'clientes error' } }
            : { data: [], error: null }
        ),
      }),
    }) as any)

    await expect(fetchDadosMes('2026-03')).rejects.toThrow('Erro ao carregar clientes do mês: clientes error')
  })

  it('throws when UF query fails', async () => {
     
    mockFrom.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(
          table === 'vw_uf_mensal'
            ? { data: null, error: { message: 'uf error' } }
            : { data: [], error: null }
        ),
      }),
    }) as any)

    await expect(fetchDadosMes('2026-03')).rejects.toThrow('Erro ao carregar UFs do mês: uf error')
  })
})

describe('fetchConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns connected status when all tokens exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bling_tokens') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
            }),
          }),
        } as any
      }
      if (table === 'shopify_tokens') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
            }),
          }),
        } as any
      }
      if (table === 'rdstation_deals') {
        return {
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
          }),
        } as any
      }
      return { select: vi.fn() } as any
    })

    const result = await fetchConnectionStatus()
    expect(result).toEqual({ bling: true, shopify: true, rdstation: true })
  })

  it('returns disconnected status when no tokens exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bling_tokens' || table === 'shopify_tokens') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        } as any
      }
      if (table === 'rdstation_deals') {
        return {
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        } as any
      }
      return { select: vi.fn() } as any
    })

    const result = await fetchConnectionStatus()
    expect(result).toEqual({ bling: false, shopify: false, rdstation: false })
  })

  it('returns all disconnected when supabase throws', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('network error')
    })

    const result = await fetchConnectionStatus()
    expect(result).toEqual({ bling: false, shopify: false, rdstation: false })
  })
})

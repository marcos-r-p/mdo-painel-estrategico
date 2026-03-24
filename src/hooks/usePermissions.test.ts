import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createElement } from 'react'

// Mock useAuth
const mockUseAuth = vi.fn()
vi.mock('./useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock supabase
const mockFrom = vi.fn()
vi.mock('../services/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { usePermissions } from './usePermissions'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns hasAccess function', () => {
    mockUseAuth.mockReturnValue({ userProfile: null, isAdmin: false })

    const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() })

    expect(typeof result.current.hasAccess).toBe('function')
  })

  it('admin can access all pages (bypass)', () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role_id: 'admin-id' },
      isAdmin: true,
    })

    const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() })

    expect(result.current.hasAccess('dashboard')).toBe(true)
    expect(result.current.hasAccess('clientes')).toBe(true)
    expect(result.current.hasAccess('analise-ia')).toBe(true)
    expect(result.current.hasAccess('anything-random')).toBe(true)
    expect(result.current.isAdmin).toBe(true)
    // Admin has null allowedPages (no restriction)
    expect(result.current.allowedPages).toBeNull()
  })

  it('non-admin user always has access to dashboard', () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role_id: 'reader-id' },
      isAdmin: false,
    })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [{ page_key: 'clientes' }], error: null }),
      }),
    })

    const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() })

    // Dashboard is always accessible for non-admin
    expect(result.current.hasAccess('dashboard')).toBe(true)
  })

  it('non-admin user can only access permitted pages after query resolves', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role_id: 'reader-id' },
      isAdmin: false,
    })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ page_key: 'clientes' }, { page_key: 'produtos' }],
          error: null,
        }),
      }),
    })

    const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.hasAccess('clientes')).toBe(true)
    expect(result.current.hasAccess('produtos')).toBe(true)
    expect(result.current.hasAccess('analise-ia')).toBe(false)
    // dashboard always allowed
    expect(result.current.hasAccess('dashboard')).toBe(true)
  })

  it('query is disabled when userProfile has no role_id', () => {
    mockUseAuth.mockReturnValue({
      userProfile: null,
      isAdmin: false,
    })

    const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() })

    // Should not call supabase when no role_id
    expect(mockFrom).not.toHaveBeenCalled()
    expect(result.current.hasAccess('dashboard')).toBe(true)
    expect(result.current.hasAccess('clientes')).toBe(false)
  })
})

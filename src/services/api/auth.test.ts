import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase
const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()
const mockResetPasswordForEmail = vi.fn()
const mockUpdateUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: () => mockSignOut(),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
  supabaseUrl: 'https://test.supabase.co',
}))

import { loginWithEmail, logout, resetPasswordForEmail, updateUserPassword, fetchUserProfile } from './auth'

describe('loginWithEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns data on successful login', async () => {
    const fakeData = { user: { id: '123' }, session: { access_token: 'tok' } }
    mockSignInWithPassword.mockResolvedValue({ data: fakeData, error: null })

    const result = await loginWithEmail('test@example.com', 'password123')
    expect(result).toEqual(fakeData)
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('throws on auth error', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    })

    await expect(loginWithEmail('bad@example.com', 'wrong')).rejects.toEqual({
      message: 'Invalid credentials',
    })
  })
})

describe('logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves on successful logout', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    await expect(logout()).resolves.toBeUndefined()
    expect(mockSignOut).toHaveBeenCalledOnce()
  })

  it('throws on sign-out error', async () => {
    mockSignOut.mockResolvedValue({ error: { message: 'Network error' } })

    await expect(logout()).rejects.toEqual({ message: 'Network error' })
  })
})

describe('resetPasswordForEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves on success', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null })

    await expect(resetPasswordForEmail('user@test.com', 'https://app.com/reset')).resolves.toBeUndefined()
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@test.com', {
      redirectTo: 'https://app.com/reset',
    })
  })

  it('throws on error', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'Rate limited' } })

    await expect(resetPasswordForEmail('user@test.com', 'https://app.com/reset')).rejects.toEqual({
      message: 'Rate limited',
    })
  })
})

describe('updateUserPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves on success', async () => {
    mockUpdateUser.mockResolvedValue({ error: null })

    await expect(updateUserPassword('newpass123')).resolves.toBeUndefined()
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpass123' })
  })

  it('throws on error', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Weak password' } })

    await expect(updateUserPassword('123')).rejects.toEqual({ message: 'Weak password' })
  })
})

describe('fetchUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns profile found by ID', async () => {
    const fakeProfile = {
      id: 'user-1',
      email: 'user@test.com',
      nome: 'Test User',
      role_id: 'role-1',
      ativo: true,
      deleted_at: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      roles: { nome: 'admin' },
    }

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: fakeProfile, error: null }),
          }),
        }),
      }),
    })

    const result = await fetchUserProfile('user-1')
    expect(result.role_nome).toBe('admin')
    expect(result.id).toBe('user-1')
    expect((result as Record<string, unknown>).roles).toBeUndefined()
  })

  it('falls back to email lookup when ID lookup fails', async () => {
    const fakeProfile = {
      id: 'user-1',
      email: 'user@test.com',
      nome: 'Test User',
      role_id: 'role-1',
      ativo: true,
      deleted_at: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      roles: { nome: 'leitor' },
    }

    // First call (by ID) fails, second call (by email) succeeds
    let callCount = 0
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            // ID lookup — returns error
            return {
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'not found' },
                }),
              }),
            }
          }
          // Email lookup — returns success
          return {
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: fakeProfile, error: null }),
            }),
          }
        }),
      }),
    })

    const result = await fetchUserProfile('user-1', 'user@test.com')
    expect(result.role_nome).toBe('leitor')
  })

  it('throws when both lookups fail', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'not found' },
            }),
          }),
        }),
      }),
    })

    await expect(fetchUserProfile('user-1', 'bad@test.com')).rejects.toThrow(
      'Erro ao carregar perfil: not found',
    )
  })

  it('throws when ID lookup fails and no email provided', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'not found' },
            }),
          }),
        }),
      }),
    })

    await expect(fetchUserProfile('user-1')).rejects.toThrow(
      'Erro ao carregar perfil: not found',
    )
  })
})

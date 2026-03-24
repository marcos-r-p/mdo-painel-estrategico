import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase
const mockFrom = vi.fn()
vi.mock('../supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
  supabaseUrl: 'https://test.supabase.co',
}))

import { listRoles, createRole, updateRole, deleteRole } from './roles'

describe('listRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns roles with user counts and flattened permissions', async () => {
    const fakeRoles = [
      {
        id: 'role-1',
        nome: 'admin',
        descricao: null,
        is_system: true,
        created_at: '2026-01-01',
        role_permissions: [{ page_key: 'dashboard' }, { page_key: 'clientes' }],
      },
      {
        id: 'role-2',
        nome: 'leitor',
        descricao: 'Read only',
        is_system: false,
        created_at: '2026-01-01',
        role_permissions: [{ page_key: 'dashboard' }],
      },
    ]

    const fakeUserProfiles = [
      { role_id: 'role-1' },
      { role_id: 'role-1' },
      { role_id: 'role-2' },
    ]

    // First call: roles with permissions
    // Second call: user_profiles for count
    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: fakeRoles, error: null }),
            }),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ data: fakeUserProfiles, error: null }),
        }),
      }
    })

    const result = await listRoles()

    expect(result).toHaveLength(2)
    expect(result[0].nome).toBe('admin')
    expect(result[0].permissions).toEqual(['dashboard', 'clientes'])
    expect(result[0].user_count).toBe(2)
    expect(result[1].nome).toBe('leitor')
    expect(result[1].permissions).toEqual(['dashboard'])
    expect(result[1].user_count).toBe(1)
  })

  it('throws when roles query fails', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      }),
    })

    await expect(listRoles()).rejects.toEqual({ message: 'DB error' })
  })
})

describe('createRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates role and inserts permissions', async () => {
    const fakeRole = { id: 'new-role', nome: 'editor', descricao: 'Editor role' }
    const mockInsertPerms = vi.fn().mockResolvedValue({ error: null })

    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: fakeRole, error: null }),
            }),
          }),
        }
      }
      return { insert: mockInsertPerms }
    })

    const result = await createRole('editor', 'Editor role', ['dashboard', 'clientes'])
    expect(result).toEqual(fakeRole)
    expect(mockInsertPerms).toHaveBeenCalledWith([
      { role_id: 'new-role', page_key: 'dashboard' },
      { role_id: 'new-role', page_key: 'clientes' },
    ])
  })

  it('creates role without permissions when pageKeys is empty', async () => {
    const fakeRole = { id: 'new-role', nome: 'basic', descricao: null }

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: fakeRole, error: null }),
        }),
      }),
    })

    const result = await createRole('basic', null, [])
    expect(result).toEqual(fakeRole)
    // from should only be called once (for roles table), not for permissions
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })
})

describe('updateRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates role name, deletes old permissions, inserts new ones', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    const mockDeletePerms = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    const mockInsertPerms = vi.fn().mockResolvedValue({ error: null })

    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) return { update: mockUpdate }
      if (callIndex === 2) return { delete: mockDeletePerms }
      return { insert: mockInsertPerms }
    })

    await expect(
      updateRole('role-1', 'Editor Updated', 'New desc', ['dashboard', 'produtos']),
    ).resolves.toBeUndefined()

    expect(mockInsertPerms).toHaveBeenCalledWith([
      { role_id: 'role-1', page_key: 'dashboard' },
      { role_id: 'role-1', page_key: 'produtos' },
    ])
  })

  it('throws when update fails', async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
      }),
    })

    await expect(
      updateRole('role-1', 'New Name', null, []),
    ).rejects.toEqual({ message: 'Update failed' })
  })
})

describe('deleteRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes role when no users are assigned', async () => {
    const mockDeleteFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        }
      }
      return { delete: mockDeleteFn }
    })

    await expect(deleteRole('role-1')).resolves.toBeUndefined()
  })

  it('throws when role has users assigned', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ count: 3, error: null }),
        }),
      }),
    })

    await expect(deleteRole('role-1')).rejects.toThrow(
      'Não é possível deletar role com usuários atribuídos',
    )
  })

  it('throws when count query fails', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ count: null, error: { message: 'DB error' } }),
        }),
      }),
    })

    await expect(deleteRole('role-1')).rejects.toEqual({ message: 'DB error' })
  })
})

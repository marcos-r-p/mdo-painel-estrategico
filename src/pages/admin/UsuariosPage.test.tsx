import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'

// Mock useAuth
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'current-user-id' },
    isAdmin: true,
    isAuthenticated: true,
    authLoading: false,
  }),
}))

// Mock React Query hooks for user management
const mockUsers = [
  {
    id: 'user-1',
    email: 'alice@test.com',
    nome: 'Alice Silva',
    role_id: 'role-admin',
    role_nome: 'admin',
    ativo: true,
    deleted_at: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 'user-2',
    email: 'bob@test.com',
    nome: 'Bob Santos',
    role_id: 'role-leitor',
    role_nome: 'leitor',
    ativo: true,
    deleted_at: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 'user-3',
    email: 'carol@test.com',
    nome: 'Carol Oliveira',
    role_id: 'role-leitor',
    role_nome: 'leitor',
    ativo: false,
    deleted_at: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
]

const mockRoles = [
  { id: 'role-admin', nome: 'admin' },
  { id: 'role-leitor', nome: 'leitor' },
]

const mockMutateAsync = vi.fn()

vi.mock('../../services/queries/useUserManagementQueries', () => ({
  useUsers: () => ({
    data: mockUsers,
    isLoading: false,
    error: null,
  }),
  useDeactivateUser: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useReactivateUser: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useDeleteUser: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}))

vi.mock('../../services/queries/useRolesQueries', () => ({
  useRoles: () => ({ data: mockRoles }),
}))

// Mock admin modals
vi.mock('../../components/admin/UserModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="user-modal">User Modal</div> : null,
}))

vi.mock('../../components/admin/DeleteConfirmModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="delete-modal">Delete Modal</div> : null,
}))

import UsuariosPage from './UsuariosPage'

describe('UsuariosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders user list with names and emails', () => {
    renderWithProviders(<UsuariosPage />)

    expect(screen.getByText('Alice Silva')).toBeInTheDocument()
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
    expect(screen.getByText('Bob Santos')).toBeInTheDocument()
    expect(screen.getByText('bob@test.com')).toBeInTheDocument()
  })

  it('renders page title and description', () => {
    renderWithProviders(<UsuariosPage />)

    expect(screen.getByText('Usuários')).toBeInTheDocument()
    expect(screen.getByText('Gerencie os usuários e suas permissões de acesso')).toBeInTheDocument()
  })

  it('displays role badges', () => {
    renderWithProviders(<UsuariosPage />)

    // Both "admin" and "leitor" badges should be visible
    expect(screen.getByText('admin')).toBeInTheDocument()
    // Multiple "leitor" badges for Bob and Carol
    expect(screen.getAllByText('leitor').length).toBeGreaterThanOrEqual(1)
  })

  it('search filter narrows displayed users', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UsuariosPage />)

    const searchInput = screen.getByPlaceholderText('Buscar por nome ou email...')
    await user.type(searchInput, 'alice')

    expect(screen.getByText('Alice Silva')).toBeInTheDocument()
    expect(screen.queryByText('Bob Santos')).not.toBeInTheDocument()
  })

  it('status filter shows only active users by default (excludes deactivated Carol)', () => {
    renderWithProviders(<UsuariosPage />)

    // Default filter is "ativo" — Carol (ativo=false) should not appear
    expect(screen.getByText('Alice Silva')).toBeInTheDocument()
    expect(screen.getByText('Bob Santos')).toBeInTheDocument()
    expect(screen.queryByText('Carol Oliveira')).not.toBeInTheDocument()
  })

  it('shows user count footer', () => {
    renderWithProviders(<UsuariosPage />)

    // 2 active users shown (default "ativo" filter excludes Carol)
    expect(screen.getByText('2 usuários encontrados')).toBeInTheDocument()
  })

  it('opens new user modal when button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UsuariosPage />)

    const newUserBtn = screen.getByText('Novo Usuário')
    await user.click(newUserBtn)

    expect(screen.getByTestId('user-modal')).toBeInTheDocument()
  })
})

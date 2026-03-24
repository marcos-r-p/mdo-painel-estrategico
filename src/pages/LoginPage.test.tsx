import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'

// ─── Mocks ─────────────────────────────────────────────────────
const mockLogin = vi.fn()
const mockNavigate = vi.fn()
const mockToggleDarkMode = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    userProfile: null,
    authLoading: false,
    isAdmin: false,
    isAuthenticated: false,
    isPasswordRecovery: false,
    logout: vi.fn(),
    loadProfile: vi.fn(),
    clearPasswordRecovery: vi.fn(),
  }),
}))

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    darkMode: false,
    toggleDarkMode: mockToggleDarkMode,
  }),
}))

vi.mock('../services/api/auth', () => ({
  resetPasswordForEmail: vi.fn(),
}))

// ─── Helper ────────────────────────────────────────────────────
function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

// ─── Tests ─────────────────────────────────────────────────────
describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form with email and password fields', () => {
    renderLoginPage()

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('shows error on failed login', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Credenciais invalidas'))
    renderLoginPage()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(screen.getByText('Credenciais invalidas')).toBeInTheDocument()
    })
  })

  it('navigates to /app on successful login', async () => {
    mockLogin.mockResolvedValueOnce({ user: { id: '1' } })
    renderLoginPage()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'correct' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app')
    })
  })

  it('switches to forgot password mode', () => {
    renderLoginPage()

    fireEvent.click(screen.getByText('Esqueceu sua senha?'))

    expect(screen.getByText('Recuperar senha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar link de recuperacao' })).toBeInTheDocument()
  })

  it('switches back to login from forgot password mode', () => {
    renderLoginPage()

    fireEvent.click(screen.getByText('Esqueceu sua senha?'))
    expect(screen.getByText('Recuperar senha')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Voltar ao login'))
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('sends forgot password email and shows confirmation', async () => {
    const { resetPasswordForEmail } = await import('../services/api/auth')
    vi.mocked(resetPasswordForEmail).mockResolvedValueOnce(undefined as any)

    renderLoginPage()

    fireEvent.click(screen.getByText('Esqueceu sua senha?'))
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@test.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link de recuperacao' }))

    await waitFor(() => {
      expect(screen.getByText(/Enviamos um link de recuperacao/)).toBeInTheDocument()
    })
  })
})

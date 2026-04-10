import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { updateUserPassword } from '../services/api/auth';

export default function ResetPasswordPage() {
  useDocumentTitle('Redefinir Senha');
  const { isPasswordRecovery, clearPasswordRecovery, user, authLoading } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);

  // After 3 seconds, if no valid password recovery session, show expired message
  useEffect(() => {
    if (authLoading) return;

    const timer = setTimeout(() => {
      if (!isPasswordRecovery && !user) {
        setExpired(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [authLoading, isPasswordRecovery, user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas nao coincidem.');
      return;
    }

    setLoading(true);

    try {
      await updateUserPassword(password);
      setPassword('');
      setConfirmPassword('');
      clearPasswordRecovery();
      setSuccess(true);

      setTimeout(() => {
        navigate('/app');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const inputClassName = `
    w-full rounded-lg border border-gray-300 bg-white px-3 py-2
    text-sm text-gray-800 shadow-sm
    placeholder:text-gray-400
    focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500
    dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
    dark:placeholder:text-gray-500
    dark:focus:border-brand-400 dark:focus:ring-brand-400
  `;

  const buttonClassName = `
    w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold
    text-white shadow-sm transition-colors
    hover:bg-brand-700
    disabled:cursor-not-allowed disabled:opacity-50
    dark:bg-brand-500 dark:hover:bg-brand-600
  `;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-orange-50 px-4 dark:bg-gray-900 dark:from-gray-900 dark:to-gray-900">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 shadow-md">
              <span className="text-xl font-bold text-white">MdO</span>
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-800 dark:text-gray-100">
              Mundo dos Oleos
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Painel Estrategico de Consultoria
            </p>
          </div>

          {/* Expired link */}
          {expired && (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                Link expirado ou invalido. Solicite um novo link.
              </div>
              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Voltar ao login
                </Link>
              </div>
            </div>
          )}

          {/* Success message */}
          {!expired && success && (
            <div className="space-y-4">
              <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-3 text-sm text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
                Senha redefinida com sucesso! Redirecionando...
              </div>
            </div>
          )}

          {/* Loading while waiting for recovery session */}
          {!expired && !success && !isPasswordRecovery && (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            </div>
          )}

          {/* Reset password form */}
          {!expired && !success && isPasswordRecovery && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-center text-lg font-semibold text-gray-800 dark:text-gray-100">
                Redefinir senha
              </h2>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nova senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Minimo 8 caracteres"
                  className={inputClassName}
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirmar nova senha
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                  className={inputClassName}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className={buttonClassName}>
                {loading ? 'Redefinindo...' : 'Redefinir senha'}
              </button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Voltar ao login
                </Link>
              </div>
            </form>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
            Acesso somente por convite do administrador
          </p>
        </div>
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDarkMode}
        className="
          fixed bottom-4 right-4 flex h-10 w-10 items-center justify-center
          rounded-full border border-gray-200 bg-white shadow-md
          transition-colors hover:bg-gray-100
          dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700
        "
        aria-label="Alternar modo escuro"
      >
        {darkMode ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
    </div>
  );
}

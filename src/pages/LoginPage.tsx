import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { resetPasswordForEmail } from '../services/api/auth';

type Mode = 'login' | 'forgotPassword' | 'resetSent';

export default function LoginPage() {
  const { login } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPasswordForEmail(email, `${window.location.origin}/reset-password`);
      setMode('resetSent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar link de recuperacao.');
    } finally {
      setLoading(false);
    }
  };

  const inputClassName = `
    w-full rounded-lg border border-gray-300 bg-white px-3 py-2
    text-sm text-gray-800 shadow-sm
    placeholder:text-gray-400
    focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500
    dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
    dark:placeholder:text-gray-500
    dark:focus:border-green-400 dark:focus:ring-green-400
  `;

  const buttonClassName = `
    w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold
    text-white shadow-sm transition-colors
    hover:bg-green-700
    disabled:cursor-not-allowed disabled:opacity-50
    dark:bg-green-500 dark:hover:bg-green-600
  `;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-orange-50 px-4 dark:bg-gray-900 dark:from-gray-900 dark:to-gray-900">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-md">
              <span className="text-xl font-bold text-white">MdO</span>
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-800 dark:text-gray-100">
              Mundo dos Oleos
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Painel Estrategico de Consultoria
            </p>
          </div>

          {/* Mode: login */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className={inputClassName}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="********"
                  className={inputClassName}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setError(''); setMode('forgotPassword'); }}
                  className="text-sm text-green-600 hover:text-green-700 dark:text-green-400"
                >
                  Esqueceu sua senha?
                </button>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className={buttonClassName}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          )}

          {/* Mode: forgotPassword */}
          {mode === 'forgotPassword' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <h2 className="text-center text-lg font-semibold text-gray-800 dark:text-gray-100">
                Recuperar senha
              </h2>

              <div>
                <label htmlFor="email-forgot" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  id="email-forgot"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className={inputClassName}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className={buttonClassName}>
                {loading ? 'Enviando...' : 'Enviar link de recuperacao'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setError(''); setMode('login'); }}
                  className="text-sm text-green-600 hover:text-green-700 dark:text-green-400"
                >
                  Voltar ao login
                </button>
              </div>
            </form>
          )}

          {/* Mode: resetSent */}
          {mode === 'resetSent' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
                Enviamos um link de recuperacao para seu email. Verifique sua caixa de entrada.
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setError(''); setMode('login'); }}
                  className="text-sm text-green-600 hover:text-green-700 dark:text-green-400"
                >
                  Voltar ao login
                </button>
              </div>
            </div>
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

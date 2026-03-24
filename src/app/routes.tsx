import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { RouteErrorFallback } from '../components/ui/ErrorFallback'
import Spinner from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'

// Lazy-load all pages
const LoginPage = lazy(() => import('../pages/LoginPage'))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const FluxoCaixaPage = lazy(() => import('../pages/FluxoCaixaPage'))
const ClientesPage = lazy(() => import('../pages/ClientesPage'))
const AnaliseB2CPage = lazy(() => import('../pages/AnaliseB2CPage'))
const MatrizRFMPage = lazy(() => import('../pages/MatrizRFMPage'))
const CanaisB2BPage = lazy(() => import('../pages/CanaisB2BPage'))
const ProdutosPage = lazy(() => import('../pages/ProdutosPage'))
const AnaliseTemporalPage = lazy(() => import('../pages/AnaliseTemporalPage'))
const ShopifyPage = lazy(() => import('../pages/ShopifyPage'))
const CRMPage = lazy(() => import('../pages/CRMPage'))
const FunilPage = lazy(() => import('../pages/FunilPage'))
const AnaliseIAPage = lazy(() => import('../pages/AnaliseIAPage'))
const MetasPage = lazy(() => import('../pages/MetasPage'))
const AlertasPage = lazy(() => import('../pages/AlertasPage'))
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'))

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-lg">MdO</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  { path: '/login', element: <Suspense fallback={<Spinner />}><LoginPage /></Suspense> },
  {
    path: '/app',
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'fluxo-caixa', element: <FluxoCaixaPage /> },
      { path: 'clientes', element: <ClientesPage /> },
      { path: 'analise-b2c', element: <AnaliseB2CPage /> },
      { path: 'matriz-rfm', element: <MatrizRFMPage /> },
      { path: 'canais-b2b', element: <CanaisB2BPage /> },
      { path: 'produtos', element: <ProdutosPage /> },
      { path: 'analise-temporal', element: <AnaliseTemporalPage /> },
      { path: 'shopify', element: <ShopifyPage /> },
      { path: 'crm', element: <CRMPage /> },
      { path: 'funil', element: <FunilPage /> },
      { path: 'analise-ia', element: <AnaliseIAPage /> },
      { path: 'metas', element: <MetasPage /> },
      { path: 'alertas', element: <AlertasPage /> },
    ],
  },
  { path: '/reset-password', element: <Suspense fallback={<Spinner />}><ResetPasswordPage /></Suspense> },
  { path: '*', element: <Navigate to="/app" replace /> },
])

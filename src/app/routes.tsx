import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { RouteErrorFallback } from '../components/ui/ErrorFallback'
import Spinner from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'
import { usePermissions } from '../hooks/usePermissions'

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
const UsuariosPage = lazy(() => import('../pages/admin/UsuariosPage'))
const RolesPage = lazy(() => import('../pages/admin/RolesPage'))
const LogsAcessoPage = lazy(() => import('../pages/admin/LogsAcessoPage'))

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

function PageGuard({ pageKey, children }: { pageKey: string; children: ReactNode }) {
  const { hasAccess, isLoading } = usePermissions()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!hasAccess(pageKey)) return <Navigate to="/app/dashboard" replace />
  return <>{children}</>
}

function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin, authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!isAdmin) return <Navigate to="/app/dashboard" replace />
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
      { path: 'fluxo-caixa', element: <PageGuard pageKey="fluxo-caixa"><FluxoCaixaPage /></PageGuard> },
      { path: 'clientes', element: <PageGuard pageKey="clientes"><ClientesPage /></PageGuard> },
      { path: 'analise-b2c', element: <PageGuard pageKey="analise-b2c"><AnaliseB2CPage /></PageGuard> },
      { path: 'matriz-rfm', element: <PageGuard pageKey="matriz-rfm"><MatrizRFMPage /></PageGuard> },
      { path: 'canais-b2b', element: <PageGuard pageKey="canais-b2b"><CanaisB2BPage /></PageGuard> },
      { path: 'produtos', element: <PageGuard pageKey="produtos"><ProdutosPage /></PageGuard> },
      { path: 'analise-temporal', element: <PageGuard pageKey="analise-temporal"><AnaliseTemporalPage /></PageGuard> },
      { path: 'shopify', element: <PageGuard pageKey="shopify"><ShopifyPage /></PageGuard> },
      { path: 'crm', element: <PageGuard pageKey="crm"><CRMPage /></PageGuard> },
      { path: 'funil', element: <PageGuard pageKey="funil"><FunilPage /></PageGuard> },
      { path: 'analise-ia', element: <PageGuard pageKey="analise-ia"><AnaliseIAPage /></PageGuard> },
      { path: 'metas', element: <PageGuard pageKey="metas"><MetasPage /></PageGuard> },
      { path: 'alertas', element: <PageGuard pageKey="alertas"><AlertasPage /></PageGuard> },
      {
        path: 'admin',
        element: <AdminGuard><Outlet /></AdminGuard>,
        children: [
          { path: 'usuarios', element: <UsuariosPage /> },
          { path: 'roles', element: <RolesPage /> },
          { path: 'logs', element: <LogsAcessoPage /> },
        ],
      },
    ],
  },
  { path: '/reset-password', element: <Suspense fallback={<Spinner />}><ResetPasswordPage /></Suspense> },
  { path: '*', element: <Navigate to="/app" replace /> },
])

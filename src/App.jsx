import { useState, useCallback } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useTheme } from './contexts/ThemeContext'
import { useSupabaseData } from './hooks/useSupabaseData'
import { usePeriodoGlobal } from './hooks/usePeriodoGlobal'
import { useShopifyData } from './hooks/useShopifyData'
import { DADOS } from './data/constants'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import FluxoCaixaPage from './pages/FluxoCaixaPage'
import ClientesPage from './pages/ClientesPage'
import AnaliseB2CPage from './pages/AnaliseB2CPage'
import MatrizRFMPage from './pages/MatrizRFMPage'
import CanaisB2BPage from './pages/CanaisB2BPage'
import ProdutosPage from './pages/ProdutosPage'
import AnaliseTemporalPage from './pages/AnaliseTemporalPage'
import ShopifyPage from './pages/ShopifyPage'
import FunilPage from './pages/FunilPage'
import AnaliseIAPage from './pages/AnaliseIAPage'
import MetasPage from './pages/MetasPage'
import AlertasPage from './pages/AlertasPage'

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'fluxo', label: 'Fluxo de Caixa', icon: '💰' },
  { id: 'clientes', label: 'Clientes', icon: '👥' },
  { id: 'b2c', label: 'Análise B2C', icon: '🛒' },
  { id: 'rfm', label: 'Matriz RFM', icon: '🎯' },
  { id: 'b2b', label: 'Canais B2B', icon: '🏢' },
  { id: 'produtos', label: 'Produtos', icon: '📦' },
  { id: 'temporal', label: 'Análise Temporal', icon: '📈' },
  { id: 'shopify', label: 'Shopify', icon: '🟢' },
  { id: 'funil', label: 'Funil', icon: '🔻' },
  { id: 'analise', label: 'Análise IA', icon: '🤖' },
  { id: 'metas', label: 'Metas 90 Dias', icon: '🎯' },
  { id: 'alertas', label: 'Alertas', icon: '🚨' },
]

export default function App() {
  const { user, userProfile, isAdmin, isAuthenticated, authLoading, logout } = useAuth()
  const { darkMode } = useTheme()
  const { dbData, dbStatus, recarregar } = useSupabaseData()
  const periodo = usePeriodoGlobal()
  const shopify = useShopifyData()

  const [activeSection, setActiveSection] = useState('dashboard')
  const [fonteAtiva, setFonteAtiva] = useState('bling')
  const [showUserMgmt, setShowUserMgmt] = useState(false)

  const dados = DADOS

  const handleLogout = useCallback(async () => {
    try {
      await logout()
    } catch (err) {
      console.error('Erro ao sair:', err)
    }
  }, [logout])

  // Loading state
  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-lg">MdO</span>
          </div>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Carregando...</p>
        </div>
      </div>
    )
  }

  // Login gate
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Resumo mensal for resultado display in header
  const resumoAtual = periodo.resumoMensal?.find(r => r.mes === periodo.mesSelecionado)
  const resultado = resumoAtual
    ? (resumoAtual.receita_total || 0) - (resumoAtual.custo_total || 0)
    : null

  const periodoHeader = {
    mesesDisponiveis: periodo.mesesDisponiveis,
    mesSelecionado: periodo.mesSelecionado,
    setMesSelecionado: periodo.setMesSelecionado,
    resultado,
  }

  const pageProps = {
    dados,
    dbData,
    periodo,
    shopify,
    fonteAtiva,
    darkMode,
    isAdmin,
  }

  const renderPage = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardPage {...pageProps} />
      case 'fluxo':
        return <FluxoCaixaPage {...pageProps} />
      case 'clientes':
        return <ClientesPage {...pageProps} />
      case 'b2c':
        return <AnaliseB2CPage {...pageProps} />
      case 'rfm':
        return <MatrizRFMPage {...pageProps} />
      case 'b2b':
        return <CanaisB2BPage {...pageProps} />
      case 'produtos':
        return <ProdutosPage {...pageProps} />
      case 'temporal':
        return <AnaliseTemporalPage {...pageProps} />
      case 'shopify':
        return <ShopifyPage {...pageProps} />
      case 'funil':
        return <FunilPage {...pageProps} />
      case 'analise':
        return <AnaliseIAPage {...pageProps} />
      case 'metas':
        return <MetasPage {...pageProps} />
      case 'alertas':
        return <AlertasPage {...pageProps} />
      default:
        return <DashboardPage {...pageProps} />
    }
  }

  return (
    <AppLayout
      sections={SECTIONS}
      activeSection={activeSection}
      setActiveSection={setActiveSection}
      dbStatus={dbStatus}
      fonteAtiva={fonteAtiva}
      setFonteAtiva={setFonteAtiva}
      periodo={periodoHeader}
      recarregar={recarregar}
      userProfile={userProfile}
      user={user}
      isAdmin={isAdmin}
      onLogout={handleLogout}
      onToggleUserMgmt={() => setShowUserMgmt(prev => !prev)}
    >
      {renderPage()}
    </AppLayout>
  )
}

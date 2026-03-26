import { useState, Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import Spinner from '../ui/Spinner'
import PageHeader from '../ui/PageHeader'
import { usePageTracking } from '../../hooks/usePageTracking'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  usePageTracking()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:p-4 focus:bg-white focus:text-black focus:rounded-md focus:shadow-lg focus:top-2 focus:left-2"
      >
        Pular para conteúdo principal
      </a>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="lg:pl-16 flex flex-col min-h-screen transition-all duration-300">
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main id="main-content" className="flex-1 w-full" tabIndex={-1}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <PageHeader />
            <Suspense fallback={<Spinner />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}

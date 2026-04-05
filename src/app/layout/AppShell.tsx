import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { SaveToast } from './SaveToast'
import { ToastContainer } from '@/app/components/Toast'
import { ErrorBoundary } from '@/app/components/ErrorBoundary'
import { syncAllFromSupabase } from '@/modules/sprints/services/persistence'
import { syncAllFromSupabase as syncStatusReports } from '@/modules/status-report/services/statusReportPersistence'
import { syncAllReleases } from '@/modules/releases/services/releasePersistence'

export function AppShell() {
  useEffect(() => {
    // Ao iniciar o app, sincroniza dados do Supabase para o localStorage.
    syncAllFromSupabase()
    syncStatusReports()
    syncAllReleases()

    // Re-sync when coming back online
    function handleOnline() {
      syncAllFromSupabase()
      syncStatusReports()
      syncAllReleases()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-5 px-[22px]">
          <ErrorBoundary moduleName="Página">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <SaveToast />
      <ToastContainer />
    </div>
  )
}

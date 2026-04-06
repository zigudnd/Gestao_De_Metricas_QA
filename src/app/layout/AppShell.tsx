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
import { useActiveSquadStore } from '@/modules/squads/store/activeSquadStore'

export function AppShell() {
  const loadSquads = useActiveSquadStore((s) => s.loadSquads)

  useEffect(() => {
    // Ao iniciar o app, sincroniza dados do Supabase para o localStorage.
    syncAllFromSupabase()
    syncStatusReports()
    syncAllReleases()
    loadSquads()

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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--color-bg)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
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

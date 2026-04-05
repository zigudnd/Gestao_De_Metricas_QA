import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { SaveToast } from './SaveToast'
import { ToastContainer } from '@/app/components/Toast'
import { ErrorBoundary } from '@/app/components/ErrorBoundary'
import { syncAllFromSupabase } from '@/modules/sprints/services/persistence'
import { syncAllFromSupabase as syncStatusReports } from '@/modules/status-report/services/statusReportPersistence'
import { syncAllReleases } from '@/modules/releases/services/releasePersistence'
import { flushOfflineQueue as flushSprintQueue } from '@/modules/sprints/services/persistence'
import { flushOfflineQueue as flushReportQueue } from '@/modules/status-report/services/statusReportPersistence'
import { flushOfflineQueue as flushReleaseQueue } from '@/modules/releases/services/releasePersistence'

export function AppShell() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    // Ao iniciar o app, sincroniza dados do Supabase para o localStorage.
    syncAllFromSupabase()
    syncStatusReports()
    syncAllReleases()

    // Re-sync when coming back online — first flush queued offline writes, then pull
    async function handleOnline() {
      setIsOnline(true)
      await Promise.allSettled([
        flushSprintQueue(),
        flushReportQueue(),
        flushReleaseQueue(),
      ])
      syncAllFromSupabase()
      syncStatusReports()
      syncAllReleases()
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
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
      {!isOnline && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-amber-100 border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 shadow-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          Offline
        </div>
      )}
    </div>
  )
}

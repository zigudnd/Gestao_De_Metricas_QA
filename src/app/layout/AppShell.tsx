import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { SaveToast } from './SaveToast'
import { ToastContainer } from '@/app/components/Toast'
import { syncAllFromSupabase } from '@/modules/sprints/services/persistence'
import { syncAllFromSupabase as syncStatusReports } from '@/modules/status-report/services/statusReportPersistence'

export function AppShell() {
  useEffect(() => {
    // Ao iniciar o app, sincroniza dados do Supabase para o localStorage.
    syncAllFromSupabase()
    syncStatusReports()
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--color-bg)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          <Outlet />
        </main>
      </div>
      <SaveToast />
      <ToastContainer />
    </div>
  )
}

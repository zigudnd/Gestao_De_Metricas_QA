import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { SaveToast } from './SaveToast'
import { syncAllFromSupabase } from '@/modules/sprints/services/persistence'

export function AppShell() {
  useEffect(() => {
    // Ao iniciar o app, sincroniza todas as sprints do Supabase para o localStorage.
    // Garante que sprints criadas por outros usuários apareçam na lista.
    syncAllFromSupabase()
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
    </div>
  )
}

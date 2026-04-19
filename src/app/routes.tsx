import { createHashRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppShell } from './layout/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthPage } from '@/modules/auth/pages/AuthPage'
import { DashboardHome } from '@/app/pages/DashboardHome'
import { HomePage } from '@/modules/sprints/pages/HomePage'
import { SprintDashboard } from '@/modules/sprints/pages/SprintDashboard'
import { ChangePasswordPage } from '@/modules/auth/pages/ChangePasswordPage'
import { StatusReportHomePage } from '@/modules/status-report/pages/StatusReportHomePage'
import { ReleasesPage } from '@/modules/releases/pages/ReleasesPage'
import { ProfilePage } from '@/modules/auth/pages/ProfilePage'
import { FeatureGate } from '@/app/components/FeatureGate'

// Lazy loaded — heavy or rarely visited routes
const ComparePage = lazy(() => import('@/modules/sprints/pages/ComparePage').then(m => ({ default: m.ComparePage })))
const ReleaseDashboard = lazy(() => import('@/modules/releases/pages/ReleaseDashboard').then(m => ({ default: m.ReleaseDashboard })))
const StatusReportPage = lazy(() => import('@/modules/status-report/pages/StatusReportPage').then(m => ({ default: m.StatusReportPage })))
const SquadsPage = lazy(() => import('@/modules/squads/pages/SquadsPage').then(m => ({ default: m.SquadsPage })))
const DocsPage = lazy(() => import('@/app/pages/DocsPage').then(m => ({ default: m.DocsPage })))
const PRsPage = lazy(() => import('@/modules/releases/pages/PRsPage').then(m => ({ default: m.PRsPage })))

const LazyFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
    <span style={{ color: 'var(--color-text-2)', fontSize: 14 }}>Carregando...</span>
  </div>
)

function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LazyFallback />}>{children}</Suspense>
}

export const router = createHashRouter([
  // Tela de autenticação (pública)
  {
    path: '/login',
    element: <AuthPage />,
  },
  // Troca de senha obrigatória (fora do AppShell para UX limpa)
  {
    path: '/change-password',
    element: (
      <ProtectedRoute>
        <ChangePasswordPage />
      </ProtectedRoute>
    ),
  },
  // App protegido
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardHome /> },
      { path: 'sprints', element: <FeatureGate feature="sprints"><HomePage /></FeatureGate> },
      { path: 'sprints/compare', element: <FeatureGate feature="sprints"><SuspenseWrap><ComparePage /></SuspenseWrap></FeatureGate> },
      { path: 'sprints/:sprintId', element: <FeatureGate feature="sprints"><SprintDashboard /></FeatureGate> },
      { path: 'squads', element: <SuspenseWrap><SquadsPage /></SuspenseWrap> },
      { path: 'status-report', element: <FeatureGate feature="status_report"><StatusReportHomePage /></FeatureGate> },
      { path: 'status-report/:reportId', element: <FeatureGate feature="status_report"><SuspenseWrap><StatusReportPage /></SuspenseWrap></FeatureGate> },
      { path: 'releases', element: <FeatureGate feature="releases"><ReleasesPage /></FeatureGate> },
      { path: 'releases/:releaseId', element: <FeatureGate feature="releases"><SuspenseWrap><ReleaseDashboard /></SuspenseWrap></FeatureGate> },
      { path: 'prs', element: <FeatureGate feature="prs"><SuspenseWrap><PRsPage /></SuspenseWrap></FeatureGate> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'docs', element: <FeatureGate feature="docs"><SuspenseWrap><DocsPage /></SuspenseWrap></FeatureGate> },
    ],
  },
])

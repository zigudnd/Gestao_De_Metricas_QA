import { createHashRouter } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthPage } from '@/modules/auth/pages/AuthPage'
import { DashboardHome } from '@/app/pages/DashboardHome'
import { HomePage } from '@/modules/sprints/pages/HomePage'
import { SprintDashboard } from '@/modules/sprints/pages/SprintDashboard'
import { DocsPage } from '@/app/pages/DocsPage'
import { ComparePage } from '@/modules/sprints/pages/ComparePage'
import { SquadsPage } from '@/modules/squads/pages/SquadsPage'
import { ProfilePage } from '@/modules/auth/pages/ProfilePage'
import { ChangePasswordPage } from '@/modules/auth/pages/ChangePasswordPage'
import { StatusReportHomePage } from '@/modules/status-report/pages/StatusReportHomePage'
import { StatusReportPage } from '@/modules/status-report/pages/StatusReportPage'
import { ReleasesPage } from '@/modules/releases/pages/ReleasesPage'
import { ReleaseDashboard } from '@/modules/releases/pages/ReleaseDashboard'

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
      { path: 'sprints', element: <HomePage /> },
      { path: 'sprints/compare', element: <ComparePage /> },
      { path: 'sprints/:sprintId', element: <SprintDashboard /> },
      { path: 'squads', element: <SquadsPage /> },
      { path: 'status-report', element: <StatusReportHomePage /> },
      { path: 'status-report/:reportId', element: <StatusReportPage /> },
      { path: 'releases', element: <ReleasesPage /> },
      { path: 'releases/:releaseId', element: <ReleaseDashboard /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'docs', element: <DocsPage /> },
    ],
  },
])

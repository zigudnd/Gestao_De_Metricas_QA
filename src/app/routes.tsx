import { createHashRouter, Navigate } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthPage } from '@/modules/auth/pages/AuthPage'
import { HomePage } from '@/modules/sprints/pages/HomePage'
import { SprintDashboard } from '@/modules/sprints/pages/SprintDashboard'
import { DocsPage } from '@/app/pages/DocsPage'
import { ComparePage } from '@/modules/sprints/pages/ComparePage'
import { SquadsPage } from '@/modules/squads/pages/SquadsPage'
import { ProfilePage } from '@/modules/auth/pages/ProfilePage'

export const router = createHashRouter([
  // Tela de autenticação (pública)
  {
    path: '/login',
    element: <AuthPage />,
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
      { index: true, element: <Navigate to="/sprints" replace /> },
      { path: 'sprints', element: <HomePage /> },
      { path: 'sprints/compare', element: <ComparePage /> },
      { path: 'sprints/:sprintId', element: <SprintDashboard /> },
      { path: 'squads', element: <SquadsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'docs', element: <DocsPage /> },
    ],
  },
])

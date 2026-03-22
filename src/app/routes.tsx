import { createHashRouter, Navigate } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { HomePage } from '@/modules/sprints/pages/HomePage'
import { SprintDashboard } from '@/modules/sprints/pages/SprintDashboard'
import { DocsPage } from '@/app/pages/DocsPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/sprints" replace /> },
      { path: 'sprints', element: <HomePage /> },
      { path: 'sprints/:sprintId', element: <SprintDashboard /> },
      { path: 'docs', element: <DocsPage /> },
    ],
  },
])

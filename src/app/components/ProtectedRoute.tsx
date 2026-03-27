import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/authStore'

/**
 * Redireciona para /login se não autenticado.
 * Redireciona para /change-password se must_change_password está ativo.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const location = useLocation()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  const mustChange = user.user_metadata?.must_change_password === true
  if (mustChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return <>{children}</>
}

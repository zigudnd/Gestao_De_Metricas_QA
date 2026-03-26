import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/authStore'

/**
 * Redireciona para /login se o usuário não estiver autenticado.
 * Enquanto a sessão está sendo verificada, renderiza nada (evita flash de redirect).
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

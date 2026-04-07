import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/authStore'

/**
 * Redireciona para /login se não autenticado.
 * Desconecta e redireciona se profile.active === false.
 * Redireciona para /change-password se must_change_password está ativo.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuthStore()
  const location = useLocation()

  // Sign out deactivated users
  useEffect(() => {
    if (profile && profile.active === false) {
      signOut()
    }
  }, [profile, signOut])

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  // While profile is loading, wait (avoid flash)
  if (!profile) return null

  // If deactivated, redirect to login (signOut effect will handle cleanup)
  if (profile.active === false) {
    return <Navigate to="/login" replace />
  }

  const mustChange = user.user_metadata?.must_change_password === true
  if (mustChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return <>{children}</>
}

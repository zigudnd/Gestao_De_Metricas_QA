import { Navigate } from 'react-router-dom'
import { useFeatureToggleStore, type FeatureKey } from '@/lib/featureToggleStore'

/**
 * Redireciona para / se o módulo estiver desabilitado pelo admin.
 */
export function FeatureGate({ feature, children }: { feature: FeatureKey; children: React.ReactNode }) {
  const isEnabled = useFeatureToggleStore((s) => s.isEnabled(feature))
  if (!isEnabled) return <Navigate to="/" replace />
  return <>{children}</>
}

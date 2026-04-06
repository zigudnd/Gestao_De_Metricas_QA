import { useEffect, useState } from 'react'
import { useSprintStore } from '@/modules/sprints/store/sprintStore'

export function SaveToast() {
  const lastSaved = useSprintStore((s) => s.lastSaved)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!lastSaved) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2000)
    return () => clearTimeout(t)
  }, [lastSaved])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        background: 'var(--color-bg-2)',
        color: '#fff',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'var(--font-family-sans)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      <span style={{ color: 'var(--color-green)', fontSize: 15 }}>✓</span>
      Salvo
    </div>
  )
}

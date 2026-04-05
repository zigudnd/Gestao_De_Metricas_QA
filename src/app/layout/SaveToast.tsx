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
      className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-[10px] px-[18px] py-[10px] text-[13px] font-semibold text-white shadow-[0_4px_20px_rgba(0,0,0,0.25)] pointer-events-none"
      style={{
        background: 'var(--color-bg-2)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      <span className="text-[15px] text-green">✓</span>
      Salvo
    </div>
  )
}

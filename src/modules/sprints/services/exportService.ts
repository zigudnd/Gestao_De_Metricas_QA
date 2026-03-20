import type { SprintState } from '../types/sprint.types'

export async function exportToImage(): Promise<void> {
  const el = document.getElementById('sprint-dashboard')
  if (!el) { alert('Elemento do dashboard não encontrado.'); return }

  try {
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(el, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#f7f6f2',
      logging: false,
    })
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `qa-dashboard-${new Date().toISOString().split('T')[0]}.jpg`
        a.click()
        URL.revokeObjectURL(url)
      },
      'image/jpeg',
      0.85,
    )
  } catch (e) {
    console.error('Erro ao exportar imagem:', e)
    alert('Erro ao exportar imagem. Verifique o console.')
  }
}

export function exportJSON(state: SprintState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `qa-dashboard-backup-${state.currentDate}.json`
  a.click()
  URL.revokeObjectURL(url)
}

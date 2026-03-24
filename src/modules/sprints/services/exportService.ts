import type { SprintState } from '../types/sprint.types'
import { normalizeState, saveToStorage, upsertSprintInMasterIndex } from './persistence'

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

export function importFromJSON(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target!.result as string) as SprintState
        const normalized = normalizeState(raw)
        const sprintId = 'sprint_' + Date.now()
        saveToStorage(sprintId, normalized)
        upsertSprintInMasterIndex(sprintId, normalized)
        resolve(sprintId)
      } catch {
        reject(new Error('Arquivo inválido. Certifique-se de importar um JSON exportado pelo ToStatos.'))
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'))
    reader.readAsText(file)
  })
}

export function exportCoverage(state: SprintState): void {
  const activeFeatures = state.features.filter((f) => f.status !== 'Cancelada')
  const rows: string[][] = []

  rows.push(['Suite', 'Funcionalidade', 'Total Casos', 'Concluído', 'Falhou', 'Bloqueado', 'Pendente', 'Cobertura (%)'])

  for (const suite of state.suites) {
    const feats = activeFeatures.filter((f) => String(f.suiteId) === String(suite.id))
    if (!feats.length) continue

    let suiteTotal = 0, suiteConcluido = 0, suiteFalhou = 0, suiteBloqueado = 0, suitePendente = 0

    for (const feat of feats) {
      const cases = feat.cases ?? []
      const total     = cases.length
      const concluido = cases.filter((c) => c.status === 'Concluído').length
      const falhou    = cases.filter((c) => c.status === 'Falhou').length
      const bloqueado = cases.filter((c) => c.status === 'Bloqueado').length
      const pendente  = cases.filter((c) => c.status === 'Pendente').length
      const cobertura = total > 0 ? Math.round(((concluido + falhou) / total) * 100) : 0

      rows.push([suite.name, feat.name, String(total), String(concluido), String(falhou), String(bloqueado), String(pendente), String(cobertura)])

      suiteTotal     += total
      suiteConcluido += concluido
      suiteFalhou    += falhou
      suiteBloqueado += bloqueado
      suitePendente  += pendente
    }

    const suiteCob = suiteTotal > 0 ? Math.round(((suiteConcluido + suiteFalhou) / suiteTotal) * 100) : 0
    rows.push([`[TOTAL ${suite.name}]`, '', String(suiteTotal), String(suiteConcluido), String(suiteFalhou), String(suiteBloqueado), String(suitePendente), String(suiteCob)])
    rows.push([])
  }

  const csv = rows.map((r) => r.map((v) => `"${(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cobertura-suites-${state.currentDate}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportSuiteAsCSV(suiteName: string, features: SprintState['features']): void {
  const rows: string[][] = [['Funcionalidade', 'Cenário', 'Complexidade', 'Gherkin']]

  for (const feat of features) {
    for (const c of feat.cases ?? []) {
      rows.push([feat.name, c.name, c.complexity ?? 'Baixa', c.gherkin ?? ''])
    }
  }

  if (rows.length === 1) {
    alert('Nenhum caso de teste encontrado nesta suite.')
    return
  }

  const csv = rows.map((r) => r.map((v) => `"${(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `suite-${suiteName.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`
  a.click()
  URL.revokeObjectURL(url)
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

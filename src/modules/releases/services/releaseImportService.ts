import { parseFeatureText, parseCSVText } from '@/modules/sprints/services/importService'
import type { Feature } from '@/modules/sprints/types/sprint.types'

// ─── Import result ──────────────────────────────────────────────────────────

export interface ReleaseImportResult {
  features: Array<Omit<Feature, 'id'>>
  totalScenarios: number
  summary: string[]
}

// ─── File import handler ────────────────────────────────────────────────────

export function importFileForRelease(
  file: File,
  suiteId: number,
  callbacks: {
    onSuccess: (result: ReleaseImportResult) => void
    onError: (message: string) => void
  },
): void {
  const name = file.name.toLowerCase()

  if (name.endsWith('.feature')) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const result = parseFeatureText(ev.target!.result as string, suiteId)
        if (result.totalScenarios === 0) {
          callbacks.onError('Nenhum cenario encontrado no arquivo.')
          return
        }
        callbacks.onSuccess(result)
      } catch (err: unknown) {
        callbacks.onError(String(err instanceof Error ? err.message : err))
      }
    }
    reader.readAsText(file)
  } else if (name.endsWith('.csv')) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const result = parseCSVText(ev.target!.result as string, suiteId)
        callbacks.onSuccess(result)
      } catch (err: unknown) {
        callbacks.onError(String(err instanceof Error ? err.message : err))
      }
    }
    reader.readAsText(file, 'UTF-8')
  } else {
    callbacks.onError('Formato nao suportado. Use: .feature ou .csv')
  }
}

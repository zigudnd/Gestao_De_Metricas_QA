import type { Feature, TestCase } from '../types/sprint.types'

// ─── Sanitização de texto importado ──────────────────────────────────────────

function sanitize(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// ─── .feature parser ─────────────────────────────────────────────────────────

export interface ImportResult {
  features: Omit<Feature, 'id'>[]
  totalScenarios: number
  summary: string[]
}

export function parseFeatureText(text: string, suiteId: number): ImportResult {
  const featureRegex = /^(funcionalidade|feature)\s*:/i
  const scenarioRegex = /^(cenario|cenário|scenario|esquema do cenario|esquema do cenário|scenario outline)\s*:/i

  const featuresMap: Record<string, Array<{ name: string; gherkin: string }>> = {}
  const featuresOrder: string[] = []
  let currentFeatureName: string | null = null
  let currentScenario: { name: string; gherkin: string } | null = null

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (featureRegex.test(trimmed)) {
      if (currentScenario && currentFeatureName) {
        featuresMap[currentFeatureName].push(currentScenario)
        currentScenario = null
      }
      currentFeatureName = sanitize(trimmed.replace(featureRegex, '').trim()) || 'Nova Funcionalidade Importada'
      if (!featuresMap[currentFeatureName]) {
        featuresMap[currentFeatureName] = []
        featuresOrder.push(currentFeatureName)
      }
    } else if (scenarioRegex.test(trimmed)) {
      if (currentScenario && currentFeatureName) featuresMap[currentFeatureName].push(currentScenario)
      if (!currentFeatureName) {
        currentFeatureName = 'Nova Funcionalidade Importada'
        if (!featuresMap[currentFeatureName]) {
          featuresMap[currentFeatureName] = []
          featuresOrder.push(currentFeatureName)
        }
      }
      currentScenario = { name: sanitize(trimmed.replace(scenarioRegex, '').trim()), gherkin: trimmed + '\n' }
    } else if (currentScenario) {
      currentScenario.gherkin += line + '\n'
    }
  }
  if (currentScenario && currentFeatureName) featuresMap[currentFeatureName].push(currentScenario)

  const featuresWithScenarios = featuresOrder.filter((name) => featuresMap[name].length > 0)

  const features: Omit<Feature, 'id'>[] = []
  let totalScenarios = 0
  const summary: string[] = []
  const now = Date.now()

  featuresWithScenarios.forEach((featureName, _fi) => {
    const scenarios = featuresMap[featureName]
    const cases: TestCase[] = scenarios.map((sc, i) => ({
      id: now + totalScenarios + i + Math.floor(Math.random() * 10000),
      name: sc.name || 'Cenário Sem Nome',
      complexity: 'Baixa',
      status: 'Pendente',
      executionDay: '',
      gherkin: sc.gherkin.trim(),
    }))
    features.push({
      suiteId, name: featureName,
      tests: 0, manualTests: 0, exec: 0,
      execution: {}, manualExecData: {}, gherkinExecs: {},
      mockupImage: '', status: 'Ativa', blockReason: '', activeFilter: 'Todos',
      cases,
    })
    totalScenarios += scenarios.length
    summary.push(`• "${featureName}" — ${scenarios.length} cenário(s)`)
  })

  return { features, totalScenarios, summary }
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSVRaw(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]
    if (ch === '"') {
      if (inQuotes && next === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (ch === ',' && !inQuotes) {
      row.push(current); current = ''
    } else if (ch === '\r' && next === '\n' && !inQuotes) {
      i++; row.push(current); rows.push(row); row = []; current = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      row.push(current); rows.push(row); row = []; current = ''
    } else {
      current += ch
    }
  }
  if (current || row.length > 0) { row.push(current); rows.push(row) }
  return rows
}

export function parseCSVText(text: string, suiteId: number): ImportResult {
  const rows = parseCSVRaw(text).filter((r) => r.some((c) => c.trim()))
  if (rows.length < 2) throw new Error('Arquivo CSV vazio ou inválido.')
  if (rows[0].length < 2) throw new Error('O arquivo CSV precisa ter pelo menos 2 colunas:\nColuna 1 → Funcionalidade\nColuna 2 → Cenário')

  const header = rows[0].map((h) => h.toLowerCase().trim())
  const colGherkin = header.findIndex((h) => /gherkin|passos|steps|descri/.test(h))
  const colComplex = header.findIndex((h) => /complexidade|complexity/.test(h))

  return buildFromRows(rows.slice(1), 0, 1, colGherkin, colComplex, suiteId, 'Importado de CSV')
}

// ─── Shared builder ───────────────────────────────────────────────────────────

const VALID_COMPLEXITIES = ['Baixa', 'Moderada', 'Alta'] as const

function buildFromRows(
  rows: unknown[][],
  colFeature: number,
  colScenario: number,
  colGherkin: number,
  colComplex: number,
  suiteId: number,
  defaultFeatureName: string,
): ImportResult {
  const featuresMap: Record<string, TestCase[]> = {}
  const featuresOrder: string[] = []
  let totalScenarios = 0
  const now = Date.now()

  rows.forEach((cols, idx) => {
    const featureName = sanitize(String((cols[colFeature] as string) || '').trim()) || defaultFeatureName
    const scenarioName = sanitize(String((cols[colScenario] as string) || '').trim())
    if (!scenarioName) return

    const gherkin = colGherkin >= 0 ? String((cols[colGherkin] as string) || '').trim() : ''
    const rawComplex = colComplex >= 0 ? String((cols[colComplex] as string) || '').trim() : ''
    const complexity = VALID_COMPLEXITIES.find((c) => c.toLowerCase() === rawComplex.toLowerCase()) ?? 'Baixa'

    if (!featuresMap[featureName]) {
      featuresMap[featureName] = []
      featuresOrder.push(featureName)
    }
    featuresMap[featureName].push({
      id: now + idx + Math.floor(Math.random() * 10000),
      name: scenarioName, complexity, status: 'Pendente', executionDay: '', gherkin,
    })
    totalScenarios++
  })

  if (totalScenarios === 0) throw new Error('Nenhum cenário encontrado no arquivo.')

  const features: Omit<Feature, 'id'>[] = featuresOrder.map((name) => ({
    suiteId, name, tests: 0, manualTests: 0, exec: 0,
    execution: {}, manualExecData: {}, gherkinExecs: {},
    mockupImage: '', status: 'Ativa', blockReason: '', activeFilter: 'Todos',
    cases: featuresMap[name],
  }))

  const summary = featuresOrder.map(
    (name) => `• "${name}" — ${featuresMap[name].length} cenário(s)`,
  )

  return { features, totalScenarios, summary }
}

/**
 * Seed Releases por Fase — 5 releases de exemplo, uma por etapa do pipeline.
 *
 * Como usar:
 *   1. Abra http://localhost:5173 no browser
 *   2. Abra o DevTools (F12) > Console
 *   3. Cole TODO o conteúdo deste arquivo e pressione Enter
 *   4. Recarregue a página (F5)
 */

(function seedReleasesFases() {
  const INDEX_KEY = 'releaseMasterIndex'
  const STORAGE_KEY = (id) => `releaseData_${id}`
  const now = new Date().toISOString()
  let counter = 0
  const makeId = () => 'rel_demo_' + (++counter)

  const RELEASES = [
    {
      id: makeId(),
      version: 'v5.0.0',
      title: 'Release v5.0 — Corte',
      description: 'Exemplo: release na fase de Corte',
      status: 'corte',
      cutoffDate: '2026-04-01',
      buildDate: '',
      homologacaoStart: '',
      homologacaoEnd: '',
      betaDate: '',
      productionDate: '2026-05-01',
      rolloutPct: 0,
    },
    {
      id: makeId(),
      version: 'v5.1.0',
      title: 'Release v5.1 — Geracao',
      description: 'Exemplo: release na fase de Geracao de Versao',
      status: 'em_desenvolvimento',
      cutoffDate: '2026-03-20',
      buildDate: '2026-03-25',
      homologacaoStart: '',
      homologacaoEnd: '',
      betaDate: '',
      productionDate: '2026-04-25',
      rolloutPct: 0,
    },
    {
      id: makeId(),
      version: 'v5.2.0',
      title: 'Release v5.2 — Homologacao',
      description: 'Exemplo: release na fase de Homologacao',
      status: 'em_homologacao',
      cutoffDate: '2026-03-10',
      buildDate: '2026-03-15',
      homologacaoStart: '2026-03-18',
      homologacaoEnd: '2026-04-01',
      betaDate: '',
      productionDate: '2026-04-10',
      rolloutPct: 0,
    },
    {
      id: makeId(),
      version: 'v5.3.0',
      title: 'Release v5.3 — Beta',
      description: 'Exemplo: release na fase de Beta/Regressivo',
      status: 'em_regressivo',
      cutoffDate: '2026-03-01',
      buildDate: '2026-03-05',
      homologacaoStart: '2026-03-08',
      homologacaoEnd: '2026-03-20',
      betaDate: '2026-03-22',
      productionDate: '2026-04-05',
      rolloutPct: 0,
    },
    {
      id: makeId(),
      version: 'v5.4.0',
      title: 'Release v5.4 — Em Producao',
      description: 'Exemplo: release em producao com rollout gradual',
      status: 'em_producao',
      cutoffDate: '2026-02-15',
      buildDate: '2026-02-20',
      homologacaoStart: '2026-02-23',
      homologacaoEnd: '2026-03-05',
      betaDate: '2026-03-08',
      productionDate: '2026-03-15',
      rolloutPct: 40,
    },
  ]

  const index = []

  for (const r of RELEASES) {
    const release = {
      ...r,
      squads: [
        { id: `sq_ios_${r.version}`, squadId: 'squad_ios', squadName: 'Squad iOS', status: 'not_started', suites: [], features: [], bugs: [], blockers: [], notes: '', hasNewFeatures: true },
        { id: `sq_and_${r.version}`, squadId: 'squad_android', squadName: 'Squad Android', status: 'not_started', suites: [], features: [], bugs: [], blockers: [], notes: '', hasNewFeatures: true },
      ],
      checkpoints: [],
      statusHistory: [],
      nonBlockingFeatures: [],
      createdAt: now,
      updatedAt: now,
    }

    localStorage.setItem(STORAGE_KEY(r.id), JSON.stringify(release))

    // Persistir no Supabase via API (se o servidor estiver rodando)
    fetch('/api/release-flush', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        id: r.id,
        data: release,
        status: r.status,
        version: r.version,
        production_date: r.productionDate || null,
      }),
    }).catch(() => {}) // silencioso se servidor não estiver rodando

    index.push({
      id: r.id,
      version: r.version,
      title: r.title,
      status: r.status,
      productionDate: r.productionDate,
      squadCount: 2,
      updatedAt: now,
    })
  }

  // Merge with existing index
  const existing = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]')
  const existingIds = new Set(existing.map(e => e.id))
  const merged = [...existing, ...index.filter(i => !existingIds.has(i.id))]
  localStorage.setItem(INDEX_KEY, JSON.stringify(merged))

  console.log(`✅ ${RELEASES.length} releases de exemplo inseridas:`)
  RELEASES.forEach(r => console.log(`  ${r.version} — ${r.status} (${r.title})`))
  console.log('Recarregue a pagina (F5) para ver no menu Releases.')
})()

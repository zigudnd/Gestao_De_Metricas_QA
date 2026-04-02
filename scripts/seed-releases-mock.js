/**
 * Seed Releases Mock — 7 releases com dados realistas para demonstração.
 *
 * Como usar:
 *   1. Abra http://localhost:5173 no browser
 *   2. DevTools (F12) > Console
 *   3. Cole TODO o conteúdo deste arquivo e pressione Enter
 *   4. Recarregue a página (F5)
 */

(function seedReleasesMock() {
  const INDEX_KEY = 'releaseMasterIndex'
  const STORAGE_KEY = (id) => `releaseData_${id}`
  const now = new Date().toISOString()
  let c = 0
  const id = () => 'rel_mock_' + Date.now() + '_' + (++c)

  const RELEASES = [
    // 1. Concluída — rollout 100%
    {
      id: id(),
      version: 'v4.0.0',
      title: 'Release App Fevereiro',
      description: 'Release principal de fevereiro com melhorias de performance no login e novo fluxo de onboarding.',
      status: 'concluida',
      platforms: ['iOS', 'Android'],
      cutoffDate: '2026-02-01',
      buildDate: '2026-02-05',
      homologacaoStart: '2026-02-08',
      homologacaoEnd: '2026-02-20',
      betaDate: '2026-02-22',
      productionDate: '2026-02-28',
      rolloutPct: 100,
      statusHistory: [
        { from: 'planejada', to: 'corte', timestamp: '2026-02-01T10:00:00Z', reason: '' },
        { from: 'corte', to: 'em_desenvolvimento', timestamp: '2026-02-05T10:00:00Z', reason: '' },
        { from: 'em_desenvolvimento', to: 'em_homologacao', timestamp: '2026-02-08T10:00:00Z', reason: '' },
        { from: 'em_homologacao', to: 'em_regressivo', timestamp: '2026-02-22T10:00:00Z', reason: '' },
        { from: 'em_regressivo', to: 'em_producao', timestamp: '2026-02-28T10:00:00Z', reason: '' },
        { from: 'em_producao', to: 'concluida', timestamp: '2026-03-05T10:00:00Z', reason: 'Rollout 100%' },
      ],
    },
    // 2. Concluída — rollout 100%
    {
      id: id(),
      version: 'v4.1.0',
      title: 'Release App Marco',
      description: 'Correcoes de bugs criticos no modulo de pagamentos e ajustes de acessibilidade.',
      status: 'concluida',
      platforms: ['iOS', 'Android', 'BFF'],
      cutoffDate: '2026-03-01',
      buildDate: '2026-03-04',
      homologacaoStart: '2026-03-06',
      homologacaoEnd: '2026-03-18',
      betaDate: '2026-03-20',
      productionDate: '2026-03-25',
      rolloutPct: 100,
      statusHistory: [
        { from: 'planejada', to: 'em_homologacao', timestamp: '2026-03-06T10:00:00Z', reason: '' },
        { from: 'em_homologacao', to: 'em_producao', timestamp: '2026-03-25T10:00:00Z', reason: '' },
        { from: 'em_producao', to: 'concluida', timestamp: '2026-03-28T10:00:00Z', reason: 'Rollout 100%' },
      ],
    },
    // 3. Em produção — rollout gradual 40%
    {
      id: id(),
      version: 'v4.2.0',
      title: 'Release App Abril',
      description: 'Nova funcionalidade de Pix parcelado + redesign da home.\nAcompanhar metricas de crash-free apos cada incremento de rollout.',
      status: 'em_producao',
      platforms: ['iOS', 'Android', 'Back', 'BFF'],
      cutoffDate: '2026-03-20',
      buildDate: '2026-03-25',
      homologacaoStart: '2026-03-27',
      homologacaoEnd: '2026-04-08',
      betaDate: '2026-04-10',
      productionDate: '2026-04-15',
      rolloutPct: 40,
      statusHistory: [
        { from: 'planejada', to: 'corte', timestamp: '2026-03-20T10:00:00Z', reason: '' },
        { from: 'corte', to: 'em_desenvolvimento', timestamp: '2026-03-25T10:00:00Z', reason: '' },
        { from: 'em_desenvolvimento', to: 'em_homologacao', timestamp: '2026-03-27T10:00:00Z', reason: '' },
        { from: 'em_homologacao', to: 'em_regressivo', timestamp: '2026-04-10T10:00:00Z', reason: '' },
        { from: 'em_regressivo', to: 'em_producao', timestamp: '2026-04-15T10:00:00Z', reason: '' },
      ],
    },
    // 4. Em regressivo (Beta)
    {
      id: id(),
      version: 'v4.3.0',
      title: 'Release App Maio - CDC',
      description: 'Modulo CDC (Credito Direto ao Consumidor) + integracao com bureau de credito.\nTestes regressivos em andamento - times iOS e BFF pendentes.',
      status: 'em_regressivo',
      platforms: ['iOS', 'Android', 'BFF', 'Back'],
      cutoffDate: '2026-04-10',
      buildDate: '2026-04-15',
      homologacaoStart: '2026-04-18',
      homologacaoEnd: '2026-04-30',
      betaDate: '2026-05-02',
      productionDate: '2026-05-10',
      rolloutPct: 0,
      statusHistory: [
        { from: 'planejada', to: 'corte', timestamp: '2026-04-10T10:00:00Z', reason: '' },
        { from: 'corte', to: 'em_homologacao', timestamp: '2026-04-18T10:00:00Z', reason: '' },
        { from: 'em_homologacao', to: 'em_regressivo', timestamp: '2026-05-02T10:00:00Z', reason: '' },
      ],
    },
    // 5. Em homologação
    {
      id: id(),
      version: 'v4.4.0',
      title: 'Release App Maio - FGTS',
      description: 'Tombamento FGTS digital + ajustes no fluxo de saque-aniversario.\nAmbiente de homologacao disponibilizado dia 05/05.',
      status: 'em_homologacao',
      platforms: ['iOS', 'Android', 'Front', 'Back', 'Infra'],
      cutoffDate: '2026-04-25',
      buildDate: '2026-04-30',
      homologacaoStart: '2026-05-05',
      homologacaoEnd: '2026-05-18',
      betaDate: '',
      productionDate: '2026-05-25',
      rolloutPct: 0,
      statusHistory: [
        { from: 'planejada', to: 'corte', timestamp: '2026-04-25T10:00:00Z', reason: '' },
        { from: 'corte', to: 'em_desenvolvimento', timestamp: '2026-04-30T10:00:00Z', reason: '' },
        { from: 'em_desenvolvimento', to: 'em_homologacao', timestamp: '2026-05-05T10:00:00Z', reason: '' },
      ],
    },
    // 6. Planejada (prevista)
    {
      id: id(),
      version: 'v4.5.0',
      title: 'Release App Junho',
      description: 'Prevista para junho. Escopo em definicao: novo modulo de investimentos + dark mode.',
      status: 'planejada',
      platforms: ['iOS', 'Android', 'Front', 'BFF', 'Back'],
      cutoffDate: '2026-05-20',
      buildDate: '2026-05-25',
      homologacaoStart: '2026-05-28',
      homologacaoEnd: '2026-06-10',
      betaDate: '2026-06-12',
      productionDate: '2026-06-20',
      rolloutPct: 0,
      statusHistory: [],
    },
    // 7. Planejada (prevista)
    {
      id: id(),
      version: 'v4.6.0',
      title: 'Release App Julho',
      description: 'Release de julho. Escopo preliminar: biometria facial + push notifications v2.',
      status: 'planejada',
      platforms: ['iOS', 'Android'],
      cutoffDate: '2026-06-15',
      buildDate: '',
      homologacaoStart: '',
      homologacaoEnd: '',
      betaDate: '',
      productionDate: '2026-07-15',
      rolloutPct: 0,
      statusHistory: [],
    },
  ]

  const index = []

  for (const r of RELEASES) {
    const release = {
      ...r,
      squads: [],
      checkpoints: [],
      nonBlockingFeatures: [],
      createdAt: now,
      updatedAt: now,
    }

    localStorage.setItem(STORAGE_KEY(r.id), JSON.stringify(release))

    // Persist to Supabase if server is running
    fetch('/api/release-flush', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        id: r.id, data: release, status: r.status,
        version: r.version, production_date: r.productionDate || null,
      }),
    }).catch(() => {})

    index.push({
      id: r.id,
      version: r.version,
      title: r.title,
      status: r.status,
      productionDate: r.productionDate,
      squadCount: 0,
      updatedAt: now,
    })
  }

  // Merge with existing index
  const existing = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]')
  const existingIds = new Set(existing.map(e => e.id))
  const merged = [...existing, ...index.filter(i => !existingIds.has(i.id))]
  localStorage.setItem(INDEX_KEY, JSON.stringify(merged))

  console.log(`✅ ${RELEASES.length} releases mock inseridas:`)
  RELEASES.forEach(r => console.log(`  ${r.version} — ${r.title} [${r.status}] ${r.platforms.join(', ')}`))
  console.log('\nRecarregue a pagina (F5) para ver no menu Releases.')
})()

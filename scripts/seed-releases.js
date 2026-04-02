/**
 * Seed Releases — Calendário App Banco Pan
 *
 * Como usar:
 *   1. Abra http://localhost:5173 no browser
 *   2. Abra o DevTools (F12) > Console
 *   3. Cole TODO o conteúdo deste arquivo e pressione Enter
 *   4. Recarregue a página (F5)
 *
 * As releases aparecerão no menu Releases na sidebar.
 */

(function seedReleases() {
  const INDEX_KEY = 'releaseMasterIndex'
  const STORAGE_KEY = (id) => `releaseData_${id}`
  const now = new Date().toISOString()
  let counter = 0
  const makeId = () => 'rel_' + Date.now() + '_' + (++counter)

  function parseDate(s, year) {
    if (!s || s === '--') return ''
    const parts = s.trim().split('/')
    if (parts.length !== 2) return ''
    return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  }

  function parseDateRange(s, year) {
    if (!s || s === '--') return { start: '', end: '' }
    const parts = s.split(' a ').map(p => p.trim())
    return { start: parseDate(parts[0], year), end: parseDate(parts[parts.length - 1], year) }
  }

  const RAW = [
    // Release 1 — v3.0
    { num: 1, plat: 'iOS',     ver: '3.0', corte: '19/12', build: '22/12 a 26/12', homolog: '23/12 a 09/01', beta: '12/01 a 16/01', prod: '25/01', st: 'Publicado',      yr: '2025' },
    { num: 1, plat: 'Android', ver: '3.0', corte: '27/01', build: '28/01 a 03/02', homolog: '04/02 a 11/02', beta: '09/02 a 13/02', prod: '26/02', st: 'Publicado',      yr: '2026' },
    // Release 2 — v3.1
    { num: 2, plat: 'iOS',     ver: '3.1', corte: '06/02', build: '26/01 a 28/01', homolog: '05/02 a 11/02', beta: '12/02 a 25/02', prod: '01/03', st: 'Publicado',      yr: '2026' },
    { num: 2, plat: 'Android', ver: '3.1', corte: '20/02', build: '23/02 a 25/02', homolog: '26/02 a 13/03', beta: '09/03 a 13/03', prod: '18/03', st: 'Publicado',      yr: '2026' },
    // Release 3 — v3.2
    { num: 3, plat: 'iOS',     ver: '3.2', corte: '13/02', build: '18/02 a 23/02', homolog: '24/02 a 20/03', beta: '10/03 a 20/03', prod: '25/03', st: 'Publicado',      yr: '2026' },
    { num: 3, plat: 'Android', ver: '3.2', corte: '06/03', build: '09/03 a 11/03', homolog: '12/03 a 20/03', beta: '23/03 a 27/03', prod: '01/04', st: 'Em Regressivo',  yr: '2026' },
    // Release 4 — v3.3
    { num: 4, plat: 'iOS',     ver: '3.3', corte: '27/02', build: '03/03 a 11/03', homolog: '12/03 a 30/03', beta: '25/03 a 30/03', prod: '31/03', st: 'Em Regressivo',  yr: '2026' },
    { num: 4, plat: 'Android', ver: '3.3', corte: '27/03', build: '30/03 a 01/04', homolog: '02/04 a 09/04', beta: '10/04 a 20/04', prod: '22/04 a 24/04', st: 'Previsto', yr: '2026' },
    // Release 5 — v3.4
    { num: 5, plat: 'iOS',     ver: '3.4', corte: '',      build: '',              homolog: '',              beta: '',              prod: '',      st: 'Uniu escopo',     yr: '2026' },
    { num: 5, plat: 'Android', ver: '3.4', corte: '10/04', build: '13/04 a 15/04', homolog: '16/04 a 23/04', beta: '24/04 a 05/05', prod: '06/05 a 08/05', st: 'Previsto', yr: '2026' },
    // Release 6 — v3.5
    { num: 6, plat: 'iOS',     ver: '3.5', corte: '03/04', build: '06/04 a 08/04', homolog: '09/04 a 15/04', beta: '16/04 a 27/04', prod: '28/04', st: 'Previsto',       yr: '2026' },
    { num: 6, plat: 'Android', ver: '3.5', corte: '24/04', build: '27/04 a 29/04', homolog: '30/04 a 07/05', beta: '08/05 a 18/05', prod: '19/05 a 21/05', st: 'Previsto', yr: '2026' },
    // Release 7 — v3.6
    { num: 7, plat: 'iOS',     ver: '3.6', corte: '17/04', build: '20/04 a 23/04', homolog: '24/04 a 30/04', beta: '04/05 a 12/05', prod: '13/05', st: 'Previsto',       yr: '2026' },
    { num: 7, plat: 'Android', ver: '3.6', corte: '08/05', build: '11/05 a 13/05', homolog: '14/05 a 20/05', beta: '21/05 a 30/05', prod: '01/06 a 03/06', st: 'Previsto', yr: '2026' },
  ]

  function mapStatus(label) {
    if (label === 'Publicado') return 'concluida'
    if (label === 'Em Regressivo') return 'em_regressivo'
    if (label === 'Uniu escopo') return 'uniu_escopo'
    return 'planejada'
  }

  function mapSquadStatus(label) {
    if (label === 'Publicado') return 'approved'
    if (label === 'Em Regressivo') return 'testing'
    if (label === 'Uniu escopo') return 'not_started'
    return 'not_started'
  }

  // Group by release number
  const grouped = new Map()
  for (const r of RAW) {
    if (!grouped.has(r.num)) grouped.set(r.num, [])
    grouped.get(r.num).push(r)
  }

  const index = []

  for (const [, platforms] of grouped) {
    const first = platforms[0]
    const id = makeId()
    const yr = first.yr

    // Release-level dates: earliest corte, latest production
    const cortes = platforms.map(p => parseDate(p.corte, p.yr)).filter(Boolean).sort()
    const prods = platforms.map(p => {
      const r = parseDateRange(p.prod, p.yr)
      return r.end || r.start
    }).filter(Boolean).sort().reverse()

    const buildR = parseDateRange(first.build, yr)
    const homologR = parseDateRange(first.homolog, yr)
    const betaR = parseDateRange(first.beta, yr)

    // Status: pick worst non-completed
    const statusLabel = platforms.find(p => p.st !== 'Publicado')?.st || first.st

    const squads = platforms.map(p => ({
      id: `sq_${p.plat.toLowerCase()}_${first.ver.replace('.', '')}`,
      squadId: `squad_${p.plat.toLowerCase()}`,
      squadName: `Squad ${p.plat}`,
      status: mapSquadStatus(p.st),
      suites: [],
      features: [],
      bugs: [],
      blockers: [],
      notes: '',
      hasNewFeatures: first.num >= 3,
    }))

    const release = {
      id,
      version: `v${first.ver}`,
      title: `Release App v${first.ver}`,
      description: `Calendario de Releases - App Banco Pan`,
      status: mapStatus(statusLabel),
      cutoffDate: cortes[0] || '',
      buildDate: buildR.start,
      homologacaoStart: homologR.start,
      homologacaoEnd: homologR.end,
      betaDate: betaR.start,
      productionDate: prods[0] || '',
      squads,
      checkpoints: [],
      statusHistory: [],
      nonBlockingFeatures: [],
      rolloutPct: mapStatus(statusLabel) === 'concluida' ? 100 : 0,
      createdAt: now,
      updatedAt: now,
    }

    localStorage.setItem(STORAGE_KEY(id), JSON.stringify(release))

    // Persistir no Supabase via API
    fetch('/api/release-flush', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        id, data: release, status: release.status,
        version: release.version, production_date: release.productionDate || null,
      }),
    }).catch(() => {})

    index.push({
      id,
      version: release.version,
      title: release.title,
      status: release.status,
      productionDate: release.productionDate,
      squadCount: squads.length,
      updatedAt: now,
    })
  }

  // Merge with existing index (don't overwrite)
  const existing = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]')
  const existingIds = new Set(existing.map(e => e.id))
  const merged = [...existing, ...index.filter(i => !existingIds.has(i.id))]
  localStorage.setItem(INDEX_KEY, JSON.stringify(merged))

  console.log(`✅ ${index.length} releases inseridas com sucesso!`)
  console.log('Releases:', index.map(i => `${i.version} (${i.status})`).join(', '))
  console.log('Recarregue a pagina (F5) para ver no menu Releases.')
})()

import { useState, useMemo, useCallback, useRef, memo } from 'react'
import type { Release, ReleaseStatus, CalendarSlot } from '../../types/release.types'
import { showToast } from '@/app/components/Toast'
import { PLATFORM_ICON, PLATFORM_COLOR, ALL_PLATFORMS, type Platform } from '../../constants/platforms'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CronogramaTabProps {
  releases: Release[]
  onReleaseClick: (id: string) => void
  onAddRelease: (data: { title: string; version: string; platforms: string[]; cutoffDate: string; buildDate: string; homologacaoStart: string; homologacaoEnd: string; betaDate: string; productionDate: string }) => void
  onDeleteRelease: (id: string) => void
  onUpdateRelease: (id: string, fields: Partial<Release>) => void
  onDuplicateRelease: (id: string) => void
  // Calendar slots management
  calendarSlots?: CalendarSlot[]
  onAddCalendarSlot?: (slot: Omit<CalendarSlot, 'id' | 'createdAt'>) => void
  onUpdateCalendarSlot?: (id: string, updates: Partial<CalendarSlot>) => void
  onRemoveCalendarSlot?: (id: string) => void
  onCreateReleaseFromSlot?: (slotId: string) => void
}

interface CronogramaRow {
  releaseNum: number
  releaseTitle: string
  platform: Platform
  version: string
  corte: string
  geracao: string
  homolog: string
  beta: string
  prod: string
  status: ReleaseStatus
  releaseId: string
  currentPhase: string | null
  note: string | null
}

type SortColumn = 'release' | 'version'
type StatusFilter = 'todos' | 'concluida' | 'em_regressivo' | 'planejada' | 'uniu_escopo'
type PlatformFilter = 'todas' | Platform

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const parts = iso.split('-')
  if (parts.length < 3) return '—'
  return `${parts[2]}/${parts[1]}`
}

function fmtRange(start: string, end: string): string {
  const s = fmtDate(start)
  const e = fmtDate(end)
  if (s === '—' && e === '—') return '—'
  if (s === '—') return e
  if (e === '—') return s
  return `${s} a ${e}`
}

function extractReleaseNum(version: string): number {
  const match = version.match(/v?(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}


function normalizePlatform(name: string): Platform {
  const lower = name.toLowerCase().trim()
  if (/ios|apple/i.test(lower)) return 'iOS'
  if (/android/i.test(lower)) return 'Android'
  if (/front/i.test(lower)) return 'Front'
  if (/bff/i.test(lower)) return 'BFF'
  if (/back/i.test(lower)) return 'Back'
  if (/infra/i.test(lower)) return 'Infra'
  return 'Front' // fallback
}

function getCurrentPhase(release: Release): string | null {
  const now = new Date()
  const dates: [string, string][] = [
    ['beta', release.betaDate],
    ['homolog', release.homologacaoStart],
  ]
  for (const [phase, dateStr] of dates) {
    if (!dateStr) continue
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      if (release.status === 'em_regressivo' && phase === 'homolog') return 'homolog'
      if (release.status === 'em_producao' && phase === 'beta') return 'beta'
    }
  }
  return null
}

function buildRows(releases: Release[]): CronogramaRow[] {
  const rows: CronogramaRow[] = []
  for (const rel of releases) {
    const platforms = rel.platforms && rel.platforms.length > 0
      ? rel.platforms
      : rel.squads.length > 0
        ? rel.squads.map((sq) => sq.squadName)
        : ['iOS'] // fallback
    for (const plat of platforms) {
      const platform = normalizePlatform(plat)
      rows.push({
        releaseNum: extractReleaseNum(rel.version),
        releaseTitle: rel.title || `Release ${rel.version}`,
        platform,
        version: rel.version,
        corte: fmtDate(rel.cutoffDate),
        geracao: fmtDate(rel.buildDate),
        homolog: fmtRange(rel.homologacaoStart, rel.homologacaoEnd),
        beta: fmtDate(rel.betaDate),
        prod: fmtDate(rel.productionDate),
        status: rel.status,
        releaseId: rel.id,
        currentPhase: getCurrentPhase(rel),
        note: rel.status === 'uniu_escopo' ? `uniu escopo com a ${rel.version}` : null,
      })
    }
  }
  return rows
}

const STATUS_LABEL: Record<string, string> = {
  concluida: 'Publicado',
  em_regressivo: 'Em Regressivo',
  planejada: 'Previsto',
  uniu_escopo: 'Uniu Escopo',
  em_desenvolvimento: 'Em Desenvolvimento',
  corte: 'Corte',
  em_homologacao: 'Em Homologação',
  aprovada: 'Aprovada',
  em_producao: 'Em Produção',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  concluida: { bg: 'var(--color-green-light)', text: 'var(--color-green)' },
  em_regressivo: { bg: 'var(--color-amber-light)', text: 'var(--color-amber)' },
  planejada: { bg: 'var(--color-surface-2)', text: 'var(--color-text-2)' },
  uniu_escopo: { bg: '#8b5cf618', text: '#8b5cf6' },
  em_desenvolvimento: { bg: 'var(--color-blue-light)', text: 'var(--color-blue)' },
  corte: { bg: 'var(--color-red-light)', text: 'var(--color-red)' },
  em_homologacao: { bg: 'var(--color-blue-light)', text: 'var(--color-blue-text)' },
  aprovada: { bg: 'var(--color-green-light)', text: 'var(--color-green)' },
  em_producao: { bg: 'var(--color-yellow-light)', text: 'var(--color-yellow)' },
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatusBadge = memo(function StatusBadge({ status }: { status: ReleaseStatus }) {
  const colors = STATUS_COLORS[status] ?? { bg: 'var(--color-surface-2)', text: 'var(--color-text-2)' }
  const label = STATUS_LABEL[status] ?? status
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      background: colors.bg,
      color: colors.text,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
})

const KpiCard = memo(function KpiCard({ label, value, accentColor }: {
  label: string
  value: number
  accentColor: string
}) {
  return (
    <div style={{
      flex: '1 1 0', minWidth: 120,
      padding: '14px 16px', borderRadius: 10,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderLeft: `4px solid ${accentColor}`,
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
})

const FilterPill = memo(function FilterPill({ label, active, onClick }: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '4px 12px',
        borderRadius: 16,
        border: active ? '1.5px solid var(--color-blue)' : '1px solid var(--color-border-md)',
        background: active ? 'var(--color-blue-light)' : 'var(--color-surface)',
        color: active ? 'var(--color-blue-text)' : 'var(--color-text-2)',
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
})

// ─── Detail Panel ────────────────────────────────────────────────────────────

const DetailPanel = memo(function DetailPanel({ row, onClose }: { row: CronogramaRow; onClose: () => void }) {
  const detailItems: [string, string][] = [
    ['Release', row.releaseTitle],
    ['Plataforma', row.platform],
    ['Versão', row.version],
    ['Corte', row.corte],
    ['Geração', row.geracao],
    ['Homologação', row.homolog],
    ['Beta', row.beta],
    ['Produção', row.prod],
    ['Status', STATUS_LABEL[row.status] ?? row.status],
  ]

  return (
    <div style={{
      borderLeft: '4px solid var(--color-blue)',
      background: 'var(--color-surface-2)',
      borderRadius: 'var(--radius-md)',
      padding: '14px 18px',
      marginBottom: 14,
      animation: 'fadeUp 0.2s ease both',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
            {row.releaseTitle} — {(PLATFORM_ICON as Record<string, string>)[row.platform] ?? '📦'} {row.platform} — {row.version}
          </span>
          <StatusBadge status={row.status} />
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar detalhes"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, color: 'var(--color-text-3)', padding: '2px 6px',
            borderRadius: 4, transition: 'all 0.15s',
          }}
        >
          ✕
        </button>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: 10,
      }}>
        {detailItems.map(([label, value]) => (
          <div key={label}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2,
            }}>
              {label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

// ─── Main Component ──────────────────────────────────────────────────────────

// ─── CSV Template & Import ──────────────────────────────────────────────────

const CSV_HEADERS = ['RELEASE', 'PLATAFORMA', 'VERSÃO', 'CORTE', 'GERAÇÃO VERSÃO', 'TESTES HOMOLOGAÇÃO', 'BETA(PRÉ-PROD)', 'PRODUÇÃO', 'STATUS']
const CSV_EXAMPLES = [
  ['Release 3.0.1', 'Android', '3.0.1', '20/01/2026', '26/01/2026', '02/02/2026', '09/02/2026', '20/02/2026', 'Publicado'],
  ['Release 3.0.2', 'Android', '3.0.2', '21/01/2026', '27/01/2026', '03/02/2026', '10/02/2026', '21/02/2026', 'Publicado'],
  ['Release 3.0.3', 'iOS',     '3.0.3', '22/01/2026', '28/01/2026', '04/02/2026', '11/02/2026', '22/02/2026', 'Previsto'],
]

function downloadTemplate() {
  const bom = '\uFEFF'
  const header = CSV_HEADERS.map((h) => `"${h}"`).join(',')
  const dataRows = CSV_EXAMPLES.map((row) => row.map((v) => `"${v}"`).join(','))
  const csv = bom + header + '\n' + dataRows.join('\n') + '\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'template-cronograma-releases.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    const next = line[i + 1]
    if (ch === '"') {
      if (inQuotes && next === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim()); current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

interface ParsedRelease {
  title: string
  version: string
  platforms: string[]
  cutoffDate: string
  buildDate: string
  homologacaoStart: string
  homologacaoEnd: string
  betaDate: string
  productionDate: string
}

/** Converte dd/mm/yyyy, dd/mm, yyyy-mm-dd ou serial Excel para ISO yyyy-mm-dd */
function parseDateBR(raw: string): string {
  const s = raw.trim()
  if (!s || s === '—') return ''
  // Já é ISO (yyyy-mm-dd)?
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // dd/mm/yyyy
  const full = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (full) return `${full[3]}-${full[2].padStart(2, '0')}-${full[1].padStart(2, '0')}`
  // dd/mm (assume ano atual)
  const short = s.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (short) {
    const year = new Date().getFullYear()
    return `${year}-${short[2].padStart(2, '0')}-${short[1].padStart(2, '0')}`
  }
  // Número serial do Excel (ex: 46082 = dias desde 01/01/1900)
  const num = parseFloat(s)
  if (!isNaN(num) && num > 40000 && num < 60000) {
    // Excel epoch: 01/01/1900, mas Excel tem bug do ano 1900 (conta 29/02/1900 que não existe)
    const excelEpoch = new Date(1899, 11, 30) // 30/12/1899
    const d = new Date(excelEpoch.getTime() + num * 86400000)
    return d.toISOString().split('T')[0]
  }
  return ''
}

/**
 * Parseia CSV com layout:
 *   Linha 1: A, B, C, D, E, F, G, H, I (letras de coluna)
 *   Linha 2: RELEASE, PLATAFORMA, VERSÃO, CORTE, GERAÇÃO VERSÃO, TESTES HOMOLOGAÇÃO, BETA (PRÉ-PROD), PRODUÇÃO, STATUS
 *   Linha 3+: dados
 *
 * Datas aceitas: dd/mm/yyyy, dd/mm, yyyy-mm-dd
 * TESTES HOMOLOGAÇÃO: "dd/mm a dd/mm" ou data única
 * Linhas com mesmo RELEASE+VERSÃO agrupadas (múltiplas plataformas)
 */
function parseImportCSV(text: string): ParsedRelease[] {
  const lines = text.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim())
  if (lines.length < 2) throw new Error('Arquivo precisa ter cabeçalho + pelo menos 1 linha de dados.')

  // Detectar cabeçalho: pula linhas que começam com RELEASE ou letras (A, B, C)
  let dataStart = 0
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const first = parseCSVLine(lines[i])[0].trim().toUpperCase()
    if (first === 'A' || first === 'B' || first === 'RELEASE' || first.startsWith('RELEASE')) {
      dataStart = i + 1
    }
  }
  if (dataStart === 0) dataStart = 1 // fallback: skip 1 header line
  const rows = lines.slice(dataStart)
  // Agrupa por release+versão para unificar plataformas
  const grouped = new Map<string, { title: string; version: string; platforms: string[]; cutoffDate: string; buildDate: string; homologacaoStart: string; homologacaoEnd: string; betaDate: string; productionDate: string }>()

  for (const row of rows) {
    const cols = parseCSVLine(row)
    if (cols.length < 3) continue

    const title = cols[0] || ''
    const platform = cols[1] || ''
    const version = cols[2] || ''
    if (!title && !version) continue

    const cutoffDate = parseDateBR(cols[3] || '')
    const buildDate = parseDateBR(cols[4] || '')

    // TESTES HOMOLOGAÇÃO: pode ser "05/04 a 12/04" ou data única
    const homologRaw = cols[5] || ''
    let homologacaoStart = ''
    let homologacaoEnd = ''
    if (homologRaw.includes(' a ')) {
      const [s, e] = homologRaw.split(' a ').map((d) => d.trim())
      homologacaoStart = parseDateBR(s)
      homologacaoEnd = parseDateBR(e)
    } else {
      homologacaoStart = parseDateBR(homologRaw)
      homologacaoEnd = ''
    }

    const betaDate = parseDateBR(cols[6] || '')
    const productionDate = parseDateBR(cols[7] || '')

    const key = `${title}||${version}`
    const existing = grouped.get(key)
    if (existing) {
      if (platform && !existing.platforms.includes(platform)) {
        existing.platforms.push(platform)
      }
    } else {
      grouped.set(key, {
        title: title || `Release ${version}`,
        version,
        platforms: platform ? [platform] : ['iOS'],
        cutoffDate,
        buildDate,
        homologacaoStart,
        homologacaoEnd,
        betaDate,
        productionDate,
      })
    }
  }

  const results = Array.from(grouped.values())
  if (results.length === 0) throw new Error('Nenhuma release encontrada no arquivo.')
  return results
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CronogramaTab({ releases, onReleaseClick, onAddRelease, onDeleteRelease, onUpdateRelease, onDuplicateRelease, calendarSlots = [], onAddCalendarSlot, onUpdateCalendarSlot, onRemoveCalendarSlot, onCreateReleaseFromSlot }: CronogramaTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('todas')
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<SortColumn | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null)
  // Row hover handled by CSS class .cron-row
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  // Add form fields
  const [addTitle, setAddTitle] = useState('')
  const [addVersion, setAddVersion] = useState('')
  const [addCorte, setAddCorte] = useState('')
  const [addBuild, setAddBuild] = useState('')
  const [addHomoStart, setAddHomoStart] = useState('')
  const [addHomoEnd, setAddHomoEnd] = useState('')
  const [addBeta, setAddBeta] = useState('')
  const [addProd, setAddProd] = useState('')
  const [addPlatforms, setAddPlatforms] = useState<string[]>([])
  const importInputRef = useRef<HTMLInputElement>(null)

  // Calendar slot management state
  const [showSlotForm, setShowSlotForm] = useState(false)
  const [editSlotId, setEditSlotId] = useState<string | null>(null)
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null)
  const [slotLabel, setSlotLabel] = useState('')
  const [slotVersion, setSlotVersion] = useState('')
  const [slotCutoff, setSlotCutoff] = useState('')
  const [slotHomoStart, setSlotHomoStart] = useState('')
  const [slotHomoEnd, setSlotHomoEnd] = useState('')
  const [slotProd, setSlotProd] = useState('')

  function resetSlotForm() {
    setSlotLabel(''); setSlotVersion(''); setSlotCutoff('')
    setSlotHomoStart(''); setSlotHomoEnd(''); setSlotProd('')
    setEditSlotId(null); setShowSlotForm(false)
  }

  function openEditSlot(slot: CalendarSlot) {
    setEditSlotId(slot.id)
    setSlotLabel(slot.label)
    setSlotVersion(slot.version)
    setSlotCutoff(slot.cutoffDate)
    setSlotHomoStart(slot.homologacaoStart)
    setSlotHomoEnd(slot.homologacaoEnd)
    setSlotProd(slot.productionDate)
    setShowSlotForm(true)
  }

  function handleSaveSlot() {
    if (!slotLabel.trim() || !slotVersion.trim() || !slotCutoff || !slotProd) return
    if (editSlotId && onUpdateCalendarSlot) {
      onUpdateCalendarSlot(editSlotId, {
        label: slotLabel.trim(),
        version: slotVersion.trim(),
        cutoffDate: slotCutoff,
        homologacaoStart: slotHomoStart,
        homologacaoEnd: slotHomoEnd,
        productionDate: slotProd,
      })
      showToast('Slot atualizado', 'success')
    } else if (onAddCalendarSlot) {
      onAddCalendarSlot({
        label: slotLabel.trim(),
        version: slotVersion.trim(),
        cutoffDate: slotCutoff,
        homologacaoStart: slotHomoStart,
        homologacaoEnd: slotHomoEnd,
        productionDate: slotProd,
      })
      showToast('Slot criado', 'success')
    }
    resetSlotForm()
  }

  function handleDeleteSlot(id: string) {
    if (onRemoveCalendarSlot) {
      onRemoveCalendarSlot(id)
      showToast('Slot excluido', 'success')
    }
    setDeleteSlotId(null)
  }

  function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseImportCSV(ev.target!.result as string)
        let count = 0
        for (const rel of parsed) {
          onAddRelease(rel)
          count++
        }
        showToast(`${count} release(s) importada(s) do CSV`, 'success')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro ao importar CSV', 'error')
      }
    }
    reader.onerror = () => showToast('Erro ao ler o arquivo.', 'error')
    reader.readAsText(file, 'UTF-8')
    if (importInputRef.current) importInputRef.current.value = ''
  }

  const allRows = useMemo(() => buildRows(releases), [releases])

  const filteredRows = useMemo(() => {
    let rows = [...allRows]

    // Status filter
    if (statusFilter !== 'todos') {
      rows = rows.filter(r => r.status === statusFilter)
    }

    // Platform filter
    if (platformFilter !== 'todas') {
      rows = rows.filter(r => r.platform === platformFilter)
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(r =>
        String(r.releaseNum).includes(q) ||
        r.version.toLowerCase().includes(q) ||
        r.platform.toLowerCase().includes(q) ||
        (STATUS_LABEL[r.status] ?? r.status).toLowerCase().includes(q) ||
        r.corte.includes(q) ||
        r.prod.includes(q)
      )
    }

    // Sort
    if (sortCol) {
      rows.sort((a, b) => {
        const va = sortCol === 'release' ? String(a.releaseNum) : a.version
        const vb = sortCol === 'release' ? String(b.releaseNum) : b.version
        const cmp = va.localeCompare(vb, undefined, { numeric: true })
        return sortAsc ? cmp : -cmp
      })
    }

    return rows
  }, [allRows, statusFilter, platformFilter, search, sortCol, sortAsc])

  // KPI counts
  const kpis = useMemo(() => ({
    publicados: filteredRows.filter(r => r.status === 'concluida').length,
    emRegressivo: filteredRows.filter(r => r.status === 'em_regressivo').length,
    previstos: filteredRows.filter(r => r.status === 'planejada').length,
    total: filteredRows.length,
  }), [filteredRows])

  const handleSort = useCallback((col: SortColumn) => {
    setSortCol(prev => {
      if (prev === col) {
        setSortAsc(a => !a)
        return col
      }
      setSortAsc(true)
      return col
    })
  }, [])

  const handleRowClick = useCallback((idx: number) => {
    setSelectedRowIdx(prev => prev === idx ? null : idx)
  }, [])

  const selectedRow = selectedRowIdx !== null ? filteredRows[selectedRowIdx] ?? null : null

  // Reset selection when filters change
  const handleStatusFilter = useCallback((v: StatusFilter) => {
    setStatusFilter(v)
    setSelectedRowIdx(null)
  }, [])

  const handlePlatformFilter = useCallback((v: PlatformFilter) => {
    setPlatformFilter(v)
    setSelectedRowIdx(null)
  }, [])

  const handleSearch = useCallback((v: string) => {
    setSearch(v)
    setSelectedRowIdx(null)
  }, [])

  // ─── Render ──────────────────────────────────────────────────────────────

  const statusFilters: { label: string; value: StatusFilter }[] = [
    { label: 'Todos', value: 'todos' },
    { label: '✔ Publicado', value: 'concluida' },
    { label: '◉ Em Regressivo', value: 'em_regressivo' },
    { label: '○ Previsto', value: 'planejada' },
    { label: '⊕ Uniu Escopo', value: 'uniu_escopo' },
  ]

  const platformFilters: { label: string; value: PlatformFilter }[] = [
    { label: 'Todas', value: 'todas' },
    ...ALL_PLATFORMS.map((p) => ({ label: `${PLATFORM_ICON[p]} ${p}`, value: p as PlatformFilter })),
  ]

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--color-text-3)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textAlign: 'left',
    borderBottom: '2px solid var(--color-border-md)',
    whiteSpace: 'nowrap',
    background: 'var(--color-surface)',
  }

  const sortableTh: React.CSSProperties = {
    ...thStyle,
    cursor: 'pointer',
    userSelect: 'none',
  }

  const tdStyle: React.CSSProperties = {
    padding: '9px 12px',
    fontSize: 13,
    borderBottom: '1px solid var(--color-border)',
    verticalAlign: 'middle',
  }

  return (
    <div>
      <style>{`
        .cron-row:hover { background: var(--color-blue-light) !important; }
        .cron-btn-edit:hover { background: var(--color-blue-light) !important; color: var(--color-blue) !important; }
        .cron-btn-dup:hover { background: var(--color-blue-light) !important; color: var(--color-blue) !important; }
        .cron-btn-del:hover { background: var(--color-red-light) !important; color: var(--color-red) !important; }
      `}</style>
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        marginBottom: 14,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)' }}>
          Status:
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {statusFilters.map(f => (
            <FilterPill
              key={f.value}
              label={f.label}
              active={statusFilter === f.value}
              onClick={() => handleStatusFilter(f.value)}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, marginLeft: 6 }}>
          {platformFilters.map(f => (
            <FilterPill
              key={f.value}
              label={f.label}
              active={platformFilter === f.value}
              onClick={() => handlePlatformFilter(f.value)}
            />
          ))}
        </div>

        <div style={{
          marginLeft: 'auto',
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border-md)',
          background: 'var(--color-surface)',
          fontSize: 13,
        }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-3)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Buscar versão, data..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, color: 'var(--color-text)', width: 160,
            }}
          />
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <KpiCard label="Publicados" value={kpis.publicados} accentColor="var(--color-green)" />
        <KpiCard label="Em Regressivo" value={kpis.emRegressivo} accentColor="var(--color-amber)" />
        <KpiCard label="Previstos" value={kpis.previstos} accentColor="var(--color-text-3)" />
        <KpiCard label="Total" value={kpis.total} accentColor="var(--color-blue)" />
      </div>

      {/* ── Actions: Add + Template + Import ──────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Download template */}
        <button
          onClick={downloadTemplate}
          aria-label="Baixar template CSV"
          style={{
            padding: '7px 14px', borderRadius: 7,
            border: '1px solid var(--color-border-md)',
            background: 'transparent', color: 'var(--color-text-2)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-family-sans)',
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v8m0 0L5 7.5m3 2.5l3-2.5" />
            <path d="M2 11v2.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V11" />
          </svg>
          Template CSV
        </button>

        {/* Import CSV */}
        <label
          aria-label="Importar releases de CSV"
          style={{
            padding: '7px 14px', borderRadius: 7,
            border: '1px solid var(--color-border-md)',
            background: 'transparent', color: 'var(--color-text-2)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-family-sans)',
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 10V2m0 0L5 4.5M8 2l3 2.5" />
            <path d="M2 11v2.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V11" />
          </svg>
          Importar CSV
          <input
            ref={importInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleImportCSV}
          />
        </label>

        {/* Add manual */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '7px 16px', borderRadius: 7, border: 'none',
            background: showAddForm ? 'var(--color-surface-2)' : 'var(--color-blue)',
            color: showAddForm ? 'var(--color-text-2)' : '#fff',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-family-sans)',
            transition: 'all 0.15s',
          }}
        >
          {showAddForm ? 'Cancelar' : '+ Nova Release'}
        </button>
      </div>

      {showAddForm && (
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-blue)',
          borderRadius: 10, padding: '16px 18px', marginBottom: 14,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>
            Adicionar Release ao Cronograma
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase' }}>Título *</label>
              <input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder="Release App v4.0" style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase' }}>Versão *</label>
              <input value={addVersion} onChange={(e) => setAddVersion(e.target.value)} placeholder="v4.0.0" style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase' }}>Corte *</label>
              <input type="date" value={addCorte} onChange={(e) => setAddCorte(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase' }}>Geracao</label>
              <input type="date" value={addBuild} onChange={(e) => setAddBuild(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase' }}>Homolog. início</label>
              <input type="date" value={addHomoStart} onChange={(e) => setAddHomoStart(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase' }}>Homolog. fim</label>
              <input type="date" value={addHomoEnd} onChange={(e) => setAddHomoEnd(e.target.value)} min={addHomoStart || undefined} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase' }}>Beta</label>
              <input type="date" value={addBeta} onChange={(e) => setAddBeta(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase' }}>Produção *</label>
              <input type="date" value={addProd} onChange={(e) => setAddProd(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }} />
            </div>
          </div>
          {/* Plataformas */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 6, textTransform: 'uppercase' }}>Plataformas</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {ALL_PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAddPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])}
                  aria-pressed={addPlatforms.includes(p)}
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                    border: addPlatforms.includes(p) ? '2px solid var(--color-blue)' : '1px solid var(--color-border-md)',
                    background: addPlatforms.includes(p) ? 'var(--color-blue-light)' : 'transparent',
                    color: addPlatforms.includes(p) ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                    transition: 'all 0.15s',
                  }}
                >
                  {PLATFORM_ICON[p]} {p}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              if (!addTitle.trim() || !addVersion.trim() || !addCorte || !addProd) return
              onAddRelease({ title: addTitle.trim(), version: addVersion.trim(), platforms: addPlatforms, cutoffDate: addCorte, buildDate: addBuild, homologacaoStart: addHomoStart, homologacaoEnd: addHomoEnd, betaDate: addBeta, productionDate: addProd })
              setAddTitle(''); setAddVersion(''); setAddCorte(''); setAddBuild(''); setAddHomoStart(''); setAddHomoEnd(''); setAddBeta(''); setAddProd(''); setAddPlatforms([])
              setShowAddForm(false)
            }}
            disabled={!addTitle.trim() || !addVersion.trim() || !addCorte || !addProd}
            aria-label="Adicionar nova release ao cronograma"
            style={{
              padding: '7px 18px', borderRadius: 7, border: 'none',
              background: addTitle.trim() && addVersion.trim() && addCorte && addProd ? 'var(--color-blue)' : 'var(--color-border)',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
              transition: 'all 0.15s',
            }}
          >
            Adicionar
          </button>
        </div>
      )}

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      {deleteConfirmId && (
        <div style={{
          padding: '12px 16px', marginBottom: 14, borderRadius: 8,
          background: 'var(--color-red-light)', border: '1px solid var(--color-red-mid)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 13, color: 'var(--color-red)', fontWeight: 600, flex: 1 }}>
            Excluir esta release permanentemente?
          </span>
          <button
            onClick={() => { onDeleteRelease(deleteConfirmId); setDeleteConfirmId(null); setSelectedRowIdx(null) }}
            style={{
              padding: '5px 14px', borderRadius: 6, border: 'none',
              background: 'var(--color-red)', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
              transition: 'all 0.15s',
            }}
          >
            Excluir
          </button>
          <button
            onClick={() => setDeleteConfirmId(null)}
            style={{
              padding: '5px 14px', borderRadius: 6,
              border: '1px solid var(--color-border-md)',
              background: 'transparent', color: 'var(--color-text-2)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
              transition: 'all 0.15s',
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* ── Detail Panel ───────────────────────────────────────────────────── */}
      {selectedRow && (
        <DetailPanel
          row={selectedRow}
          onClose={() => setSelectedRowIdx(null)}
        />
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        background: 'var(--color-surface)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={sortableTh} onClick={() => handleSort('release')} aria-sort={sortCol === 'release' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                  Release {sortCol === 'release' ? (sortAsc ? '↑' : '↓') : '↕'}
                </th>
                <th style={thStyle}>Plataforma</th>
                <th style={sortableTh} onClick={() => handleSort('version')} aria-sort={sortCol === 'version' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                  Versão {sortCol === 'version' ? (sortAsc ? '↑' : '↓') : '↕'}
                </th>
                <th style={thStyle}>Corte</th>
                <th style={thStyle}>Geração Versão</th>
                <th style={thStyle}>Testes Homologação</th>
                <th style={thStyle}>Beta (Pré-Prod)</th>
                <th style={thStyle}>Produção</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ ...tdStyle, textAlign: 'center', padding: '32px 12px', color: 'var(--color-text-3)' }}>
                    Nenhuma release encontrada.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isSelected = selectedRowIdx === idx
                  const isEmRegressivo = row.status === 'em_regressivo'

                  let bgColor = 'transparent'
                  if (isSelected) bgColor = 'var(--color-amber-light)'
                  else if (isEmRegressivo) bgColor = 'var(--color-blue-light)'

                  const hasNote = !!row.note

                  return (
                    <tr
                      key={`${row.releaseId}-${row.platform}-${idx}`}
                      className="cron-row"
                      onClick={() => handleRowClick(idx)}
                      style={{
                        cursor: 'pointer',
                        background: bgColor,
                        transition: 'background 0.12s',
                      }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.releaseTitle}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {PLATFORM_ICON[row.platform] ?? '📦'}{' '}
                          <span style={{ color: PLATFORM_COLOR[row.platform] ?? 'var(--color-text-2)', fontWeight: 500 }}>
                            {row.platform}
                          </span>
                        </span>
                      </td>
                      <td style={tdStyle}>{row.version}</td>

                      {hasNote ? (
                        <td
                          colSpan={5}
                          style={{
                            ...tdStyle,
                            textAlign: 'left',
                            paddingLeft: 14,
                            color: 'var(--color-amber)',
                            fontStyle: 'italic',
                            fontSize: 12,
                          }}
                        >
                          📎 {row.note}
                        </td>
                      ) : (
                        <>
                          <td style={tdStyle}>{row.corte}</td>
                          <td style={tdStyle}>{row.geracao}</td>
                          <td style={
                            row.currentPhase === 'homolog'
                              ? { ...tdStyle, background: 'var(--color-yellow-light)', fontWeight: 700, color: 'var(--color-yellow)' }
                              : tdStyle
                          }>
                            {row.homolog}
                          </td>
                          <td style={
                            row.currentPhase === 'beta'
                              ? { ...tdStyle, background: 'var(--color-yellow-light)', fontWeight: 700, color: 'var(--color-yellow)' }
                              : tdStyle
                          }>
                            {row.beta}
                          </td>
                          <td style={tdStyle}>{row.prod}</td>
                        </>
                      )}

                      <td style={tdStyle}>
                        <StatusBadge status={row.status} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button
                            className="cron-btn-edit"
                            onClick={() => onReleaseClick(row.releaseId)}
                            title="Editar release"
                            aria-label="Editar release"
                            style={{
                              width: 26, height: 26, borderRadius: 5, border: 'none',
                              background: 'transparent', cursor: 'pointer',
                              color: 'var(--color-text-3)', fontSize: 12,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.15s, color 0.15s',
                            }}
                          >✎</button>
                          <button
                            className="cron-btn-dup"
                            onClick={() => onDuplicateRelease(row.releaseId)}
                            title="Duplicar release"
                            aria-label="Duplicar release"
                            style={{
                              width: 26, height: 26, borderRadius: 5, border: 'none',
                              background: 'transparent', cursor: 'pointer',
                              color: 'var(--color-text-3)', fontSize: 12,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.15s, color 0.15s',
                            }}
                          >⧉</button>
                          <button
                            className="cron-btn-del"
                            onClick={() => setDeleteConfirmId(row.releaseId)}
                            title="Excluir release"
                            aria-label="Excluir release"
                            style={{
                              width: 26, height: 26, borderRadius: 5, border: 'none',
                              background: 'transparent', cursor: 'pointer',
                              color: 'var(--color-text-3)', fontSize: 12,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.15s, color 0.15s',
                            }}
                          >🗑</button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Calendar Slots (Programacao Oficial) ────────────────────────── */}
      {(calendarSlots.length > 0 || onAddCalendarSlot) && (
        <div style={{ marginTop: 28 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                Programacao de Releases
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                background: 'var(--color-blue-light)', color: 'var(--color-blue-text)',
              }}>
                {calendarSlots.length}
              </span>
            </div>
            {onAddCalendarSlot && !showSlotForm && (
              <button
                onClick={() => { resetSlotForm(); setShowSlotForm(true) }}
                style={{
                  padding: '7px 16px', borderRadius: 7, border: 'none',
                  background: 'var(--color-blue)', color: '#fff',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-family-sans)',
                  transition: 'all 0.15s',
                }}
              >
                + Novo Slot
              </button>
            )}
          </div>

          {/* Slot form (add/edit) */}
          {showSlotForm && (
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-blue)',
              borderRadius: 10, padding: '16px 18px', marginBottom: 14,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>
                {editSlotId ? 'Editar Slot' : 'Novo Slot de Release'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase' }}>Nome *</label>
                  <input value={slotLabel} onChange={(e) => setSlotLabel(e.target.value)} placeholder="Release App Marco" style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase' }}>Versão *</label>
                  <input value={slotVersion} onChange={(e) => setSlotVersion(e.target.value)} placeholder="v4.2.0" style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase' }}>Corte *</label>
                  <input type="date" value={slotCutoff} onChange={(e) => setSlotCutoff(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase' }}>Homolog. início</label>
                  <input type="date" value={slotHomoStart} onChange={(e) => setSlotHomoStart(e.target.value)} min={slotCutoff || undefined} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase' }}>Homolog. fim</label>
                  <input type="date" value={slotHomoEnd} onChange={(e) => setSlotHomoEnd(e.target.value)} min={slotHomoStart || undefined} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase' }}>Produção *</label>
                  <input type="date" value={slotProd} onChange={(e) => setSlotProd(e.target.value)} min={slotHomoEnd || undefined} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={resetSlotForm} style={{
                  padding: '7px 14px', borderRadius: 7,
                  border: '1px solid var(--color-border-md)',
                  background: 'transparent', color: 'var(--color-text-2)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                }}>
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSlot}
                  disabled={!slotLabel.trim() || !slotVersion.trim() || !slotCutoff || !slotProd}
                  style={{
                    padding: '7px 18px', borderRadius: 7, border: 'none',
                    background: slotLabel.trim() && slotVersion.trim() && slotCutoff && slotProd ? 'var(--color-blue)' : 'var(--color-border)',
                    color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-family-sans)',
                  }}
                >
                  {editSlotId ? 'Salvar' : 'Criar Slot'}
                </button>
              </div>
            </div>
          )}

          {/* Delete slot confirmation */}
          {deleteSlotId && (
            <div style={{
              padding: '12px 16px', marginBottom: 14, borderRadius: 8,
              background: 'var(--color-red-light)', border: '1px solid var(--color-red-mid)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 13, color: 'var(--color-red)', fontWeight: 600, flex: 1 }}>
                Excluir este slot permanentemente?
              </span>
              <button
                onClick={() => handleDeleteSlot(deleteSlotId)}
                style={{
                  padding: '5px 14px', borderRadius: 6, border: 'none',
                  background: 'var(--color-red)', color: '#fff',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-family-sans)',
                }}
              >
                Excluir
              </button>
              <button
                onClick={() => setDeleteSlotId(null)}
                style={{
                  padding: '5px 14px', borderRadius: 6,
                  border: '1px solid var(--color-border-md)',
                  background: 'transparent', color: 'var(--color-text-2)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                }}
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Slot list */}
          {calendarSlots.length === 0 && !showSlotForm && (
            <div style={{
              textAlign: 'center', padding: '24px 16px',
              color: 'var(--color-text-3)', fontSize: 13,
            }}>
              Nenhum slot de release programado. Clique em &quot;+ Novo Slot&quot; para planejar.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {calendarSlots.map((slot) => {
              const linkedRelease = releases.find((r) => r.id === slot.releaseId)
              return (
                <div key={slot.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderLeft: slot.releaseId ? '3px solid var(--color-green)' : '3px solid var(--color-blue)',
                  borderRadius: 8,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                        {slot.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-3)' }}>
                        {slot.version}
                      </span>
                      {linkedRelease ? (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                          background: 'var(--color-green-light)', color: 'var(--color-green)',
                        }}>
                          Vinculada
                        </span>
                      ) : (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                          background: 'var(--color-surface-2)', color: 'var(--color-text-3)',
                        }}>
                          Planejado
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>Corte: {fmtDate(slot.cutoffDate)}</span>
                      <span>Homolog: {fmtRange(slot.homologacaoStart, slot.homologacaoEnd)}</span>
                      <span>Prod: {fmtDate(slot.productionDate)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {!slot.releaseId && onCreateReleaseFromSlot && (
                      <button
                        onClick={() => onCreateReleaseFromSlot(slot.id)}
                        title="Criar release a partir deste slot"
                        aria-label="Criar release a partir deste slot"
                        className="cron-btn-edit"
                        style={{
                          padding: '4px 10px', borderRadius: 5, border: 'none',
                          background: 'transparent', cursor: 'pointer',
                          color: 'var(--color-blue)', fontSize: 11, fontWeight: 600,
                          transition: 'background 0.15s',
                        }}
                      >
                        Criar Release
                      </button>
                    )}
                    {onUpdateCalendarSlot && (
                      <button
                        onClick={() => openEditSlot(slot)}
                        title="Editar slot"
                        aria-label="Editar slot"
                        className="cron-btn-edit"
                        style={{
                          width: 26, height: 26, borderRadius: 5, border: 'none',
                          background: 'transparent', cursor: 'pointer',
                          color: 'var(--color-text-3)', fontSize: 12,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                      >
                        ✎
                      </button>
                    )}
                    {onRemoveCalendarSlot && (
                      <button
                        onClick={() => setDeleteSlotId(slot.id)}
                        title="Excluir slot"
                        aria-label="Excluir slot"
                        className="cron-btn-del"
                        style={{
                          width: 26, height: 26, borderRadius: 5, border: 'none',
                          background: 'transparent', cursor: 'pointer',
                          color: 'var(--color-text-3)', fontSize: 12,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

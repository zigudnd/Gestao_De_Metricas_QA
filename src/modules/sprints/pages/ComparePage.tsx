import { useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { loadSprintsForComparison, type SprintKPIs } from '../services/compareService'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

// ─── Color helpers ────────────────────────────────────────────────────────────

function colorHealth(v: number): string {
  return v >= 80 ? 'var(--color-green)' : v >= 60 ? '#f59e0b' : 'var(--color-red)'
}
function colorExec(v: number): string {
  return v >= 80 ? 'var(--color-green)' : v >= 50 ? '#f59e0b' : 'var(--color-red)'
}
function colorCapacidade(v: number): string {
  return v >= 90 ? 'var(--color-green)' : v >= 70 ? '#f59e0b' : 'var(--color-red)'
}
function colorInverted(v: number): string {
  return v === 0 ? 'var(--color-green)' : v <= 3 ? '#f59e0b' : 'var(--color-red)'
}
function colorMttr(v: number): string {
  return v === 0 ? 'var(--color-green)' : v <= 24 ? '#f59e0b' : 'var(--color-red)'
}
function colorRetest(v: number): string {
  return v === 0 ? 'var(--color-green)' : v <= 20 ? '#f59e0b' : 'var(--color-red)'
}
function colorBlocked(v: number): string {
  return v === 0 ? 'var(--color-green)' : v <= 8 ? '#f59e0b' : 'var(--color-red)'
}

// ─── KPI row definitions ──────────────────────────────────────────────────────

interface KPIRowDef {
  label: string
  key: keyof SprintKPIs
  unit: string
  colorFn: (v: number) => string
}

const KPI_ROWS: KPIRowDef[] = [
  { label: 'QA Health Score',      key: 'healthScore',       unit: '%', colorFn: colorHealth },
  { label: 'Executados',           key: 'execPercent',       unit: '%', colorFn: colorExec },
  { label: 'Total de Testes',      key: 'totalTests',        unit: '',  colorFn: () => 'var(--color-text)' },
  { label: 'Testes Executáveis',   key: 'testesExecutaveis', unit: '',  colorFn: () => 'var(--color-text)' },
  { label: 'Capacidade Real',      key: 'capacidadeReal',    unit: '%', colorFn: colorCapacidade },
  { label: 'Bugs Abertos',         key: 'openBugs',          unit: '',  colorFn: colorInverted },
  { label: 'Bugs Resolvidos',      key: 'resolvedBugs',      unit: '',  colorFn: () => 'var(--color-text)' },
  { label: 'MTTR Global',          key: 'mttrGlobal',        unit: 'h', colorFn: colorMttr },
  { label: 'Índice de Retrabalho', key: 'retestIndex',       unit: '%', colorFn: colorRetest },
  { label: 'Horas Bloqueadas',     key: 'totalBlockedHours', unit: 'h', colorFn: colorBlocked },
]

// ─── Chart palette ────────────────────────────────────────────────────────────

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

// ─── Chart helpers ────────────────────────────────────────────────────────────

function lineOptions(title: string, maxY?: number) {
  return {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 11 }, boxWidth: 12 } },
      title: { display: false },
      datalabels: { display: false },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      y: {
        min: 0,
        ...(maxY !== undefined ? { max: maxY } : {}),
        ticks: { color: '#9ca3af', font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
      x: {
        ticks: { color: '#9ca3af', font: { size: 10 }, maxRotation: 30 },
        grid: { display: false },
      },
    },
  }
}

function barOptions(title: string) {
  return {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 11 }, boxWidth: 12 } },
      datalabels: { display: false },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      y: {
        min: 0,
        ticks: { color: '#9ca3af', font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
      x: {
        ticks: { color: '#9ca3af', font: { size: 10 }, maxRotation: 30 },
        grid: { display: false },
      },
    },
  }
}

function singleLineData(labels: string[], values: number[], label: string, color: string, fill = false) {
  return {
    labels,
    datasets: [{
      label,
      data: values,
      borderColor: color,
      backgroundColor: fill ? color + '22' : 'transparent',
      pointBackgroundColor: color,
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0.35,
      fill,
    }],
  }
}

// ─── ChartCard ────────────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: '18px 20px 20px',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

// ─── ComparePage ─────────────────────────────────────────────────────────────

export function ComparePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const idsParam = searchParams.get('ids') || ''
  const ids = idsParam ? idsParam.split(',').filter(Boolean) : []
  const contentRef = useRef<HTMLDivElement>(null)

  const items = useMemo(() => loadSprintsForComparison(ids), [idsParam])

  async function handleExport() {
    const el = contentRef.current
    if (!el) return
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, backgroundColor: '#f7f6f2', logging: false })
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comparativo-sprints-${new Date().toISOString().split('T')[0]}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-2)', fontSize: 14 }}>Nenhuma sprint encontrada para comparação.</p>
        <button onClick={() => navigate('/sprints')} style={btnOutline}>← Voltar</button>
      </div>
    )
  }

  const labels = items.map((item) => {
    const t = item.entry.title
    return t.length > 18 ? t.slice(0, 18) + '…' : t
  })

  // Delta helpers
  const INVERTED_KEYS: Array<keyof SprintKPIs> = ['openBugs', 'mttrGlobal', 'retestIndex', 'totalBlockedHours', 'atrasoCasos']

  function deltaRow(key: keyof SprintKPIs): string {
    if (items.length < 2) return '—'
    const diff = (items[items.length - 1].kpis[key] as number) - (items[0].kpis[key] as number)
    return diff === 0 ? '0' : diff > 0 ? `+${diff}` : `${diff}`
  }

  function deltaColor(key: keyof SprintKPIs): string {
    if (items.length < 2) return 'var(--color-text-2)'
    const diff = (items[items.length - 1].kpis[key] as number) - (items[0].kpis[key] as number)
    if (diff === 0) return 'var(--color-text-2)'
    const inv = INVERTED_KEYS.includes(key)
    return inv ? (diff < 0 ? 'var(--color-green)' : 'var(--color-red)') : (diff > 0 ? 'var(--color-green)' : 'var(--color-red)')
  }

  // Chart datasets
  const kpi = (key: keyof SprintKPIs) => items.map((it) => it.kpis[key] as number)

  const bugsData = {
    labels,
    datasets: [
      {
        label: 'Bugs Abertos',
        data: kpi('openBugs'),
        borderColor: '#ef4444',
        backgroundColor: '#ef444422',
        pointBackgroundColor: '#ef4444',
        pointRadius: 5, pointHoverRadius: 7, tension: 0.35, fill: true,
      },
      {
        label: 'Bugs Resolvidos',
        data: kpi('resolvedBugs'),
        borderColor: '#10b981',
        backgroundColor: '#10b98122',
        pointBackgroundColor: '#10b981',
        pointRadius: 5, pointHoverRadius: 7, tension: 0.35, fill: true,
      },
    ],
  }

  const testesData = {
    labels,
    datasets: [
      {
        label: 'Total de Testes',
        data: kpi('totalTests'),
        backgroundColor: PALETTE.map((c) => c + 'cc'),
        borderColor: PALETTE,
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/sprints')} style={btnOutline}>← Voltar</button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Comparar Sprints</h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 3, marginBottom: 0 }}>
              {items.length} sprint{items.length !== 1 ? 's' : ''} · Evolução do time
            </p>
          </div>
        </div>
        <button onClick={handleExport} style={btnPrimary}>📸 Exportar PNG</button>
      </div>

      {/* Conteúdo exportável */}
      <div ref={contentRef}>
        {/* Legenda das sprints */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {items.map((item, i) => (
            <div key={item.entry.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 12px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{item.entry.title}</div>
                {item.entry.startDate && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                    {item.entry.startDate}{item.entry.endDate ? ` → ${item.entry.endDate}` : ''}
                  </div>
                )}
              </div>
              {item.entry.status === 'concluida' && (
                <span style={{ fontSize: 10, fontWeight: 700, background: '#d1fae5', color: '#065f46', padding: '2px 6px', borderRadius: 10 }}>✅ Concluída</span>
              )}
            </div>
          ))}
        </div>

        {/* KPI Table */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', marginBottom: 32 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>📊 Tabela Comparativa de KPIs</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Δ = variação entre primeira e última sprint</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)' }}>
                  <th style={thStyle}>KPI</th>
                  {items.map((item, i) => (
                    <th key={item.entry.id} style={thStyle}>
                      <div style={{ color: PALETTE[i % PALETTE.length], fontWeight: 700 }}>
                        {item.entry.title.length > 20 ? item.entry.title.slice(0, 20) + '…' : item.entry.title}
                      </div>
                      {item.entry.startDate && (
                        <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--color-text-3)', marginTop: 2 }}>{item.entry.startDate}</div>
                      )}
                    </th>
                  ))}
                  {items.length >= 2 && <th style={{ ...thStyle, color: 'var(--color-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Δ</th>}
                </tr>
              </thead>
              <tbody>
                {KPI_ROWS.map((row, rowIdx) => (
                  <tr key={row.key} style={{ background: rowIdx % 2 === 0 ? 'transparent' : 'var(--color-bg)' }}>
                    <td style={{ padding: '9px 16px', fontWeight: 600, color: 'var(--color-text-2)', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
                      {row.label}
                    </td>
                    {items.map((item) => {
                      const val = item.kpis[row.key] as number
                      return (
                        <td key={item.entry.id} style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: row.colorFn(val), borderBottom: '1px solid var(--color-border)', borderLeft: '1px solid var(--color-border)' }}>
                          {val}{row.unit}
                        </td>
                      )
                    })}
                    {items.length >= 2 && (
                      <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: deltaColor(row.key), borderBottom: '1px solid var(--color-border)', borderLeft: '1px solid var(--color-border)', fontSize: 12 }}>
                        {deltaRow(row.key)}{row.unit}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          <ChartCard title="📈 QA Health Score (%)">
            <Line data={singleLineData(labels, kpi('healthScore'), 'Health Score', '#3b82f6', true)} options={lineOptions('Health Score', 100)} />
          </ChartCard>

          <ChartCard title="✅ % Executados (sobre executáveis)">
            <Line data={singleLineData(labels, kpi('execPercent'), '% Executados', '#10b981', true)} options={lineOptions('Executados', 100)} />
          </ChartCard>

          <ChartCard title="🐞 Bugs Abertos × Resolvidos">
            <Line data={bugsData} options={lineOptions('Bugs')} />
          </ChartCard>

          <ChartCard title="⏱ MTTR Global (horas)">
            <Line data={singleLineData(labels, kpi('mttrGlobal'), 'MTTR (h)', '#f97316')} options={lineOptions('MTTR')} />
          </ChartCard>

          <ChartCard title="🔁 Índice de Retrabalho (%)">
            <Line data={singleLineData(labels, kpi('retestIndex'), 'Retrabalho %', '#8b5cf6')} options={lineOptions('Retrabalho', 100)} />
          </ChartCard>

          <ChartCard title="⚡ Capacidade Real (%)">
            <Line data={singleLineData(labels, kpi('capacidadeReal'), 'Capacidade Real', '#06b6d4', true)} options={lineOptions('Capacidade', 100)} />
          </ChartCard>

          <ChartCard title="🧪 Cobertura de Testes (Total)">
            <Bar data={testesData} options={barOptions('Total de Testes')} />
          </ChartCard>

          <ChartCard title="🚧 Horas Bloqueadas por Sprint">
            <Bar
              data={{
                labels,
                datasets: [{
                  label: 'Horas Bloqueadas',
                  data: kpi('totalBlockedHours'),
                  backgroundColor: kpi('totalBlockedHours').map((v) => v === 0 ? '#10b98166' : v <= 8 ? '#f59e0b66' : '#ef444466'),
                  borderColor: kpi('totalBlockedHours').map((v) => v === 0 ? '#10b981' : v <= 8 ? '#f59e0b' : '#ef4444'),
                  borderWidth: 1.5,
                  borderRadius: 6,
                }],
              }}
              options={barOptions('Horas Bloqueadas')}
            />
          </ChartCard>
        </div>
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const btnOutline: React.CSSProperties = {
  padding: '7px 16px',
  background: 'transparent',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-md)',
  borderRadius: 8,
  fontWeight: 500,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  flexShrink: 0,
}

const btnPrimary: React.CSSProperties = {
  padding: '7px 16px',
  background: 'var(--color-blue)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
}

const thStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '10px 14px',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-text)',
  borderBottom: '1px solid var(--color-border)',
  borderLeft: '1px solid var(--color-border)',
  whiteSpace: 'nowrap',
  minWidth: 120,
}

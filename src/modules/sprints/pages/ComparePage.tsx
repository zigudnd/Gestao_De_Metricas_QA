import { memo, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Line, Bar, Radar } from 'react-chartjs-2'
import { loadSprintsForComparison, type SprintKPIs } from '../services/compareService'
import { PALETTE, PALETTE_BG, colorHealth, colorExec, colorCapacidade, colorInverted, colorMttr, colorRetest, colorBlocked } from '@/lib/chartColors'

ChartJS.register(
  CategoryScale, LinearScale, RadialLinearScale,
  PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler,
  ChartDataLabels,
)

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
  { label: 'Total de Testes',      key: 'totalTests',        unit: '',  colorFn: () => '#374151' },
  { label: 'Testes Executáveis',   key: 'testesExecutaveis', unit: '',  colorFn: () => '#374151' },
  { label: 'Capacidade Real',      key: 'capacidadeReal',    unit: '%', colorFn: colorCapacidade },
  { label: 'Bugs Abertos',         key: 'openBugs',          unit: '',  colorFn: colorInverted },
  { label: 'Bugs Resolvidos',      key: 'resolvedBugs',      unit: '',  colorFn: () => '#374151' },
  { label: 'MTTR Global',          key: 'mttrGlobal',        unit: 'h', colorFn: colorMttr },
  { label: 'Índice de Retrabalho', key: 'retestIndex',       unit: '%', colorFn: colorRetest },
  { label: 'Horas Bloqueadas',     key: 'totalBlockedHours', unit: 'h', colorFn: colorBlocked },
  { label: 'Atraso (casos)',       key: 'atrasoCasos',       unit: '',  colorFn: colorInverted },
]

// ─── Chart options helpers ────────────────────────────────────────────────────

const BASE_DATALABEL = {
  display: true,
  font: { size: 11, weight: 700 as const },
  padding: 3,
  borderRadius: 4,
}

function lineOptions(title: string, maxY?: number, unit = '') {
  return {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 11 }, boxWidth: 12 } },
      title: { display: false },
      tooltip: { mode: 'index' as const, intersect: false },
      datalabels: {
        ...BASE_DATALABEL,
        align: 'top' as const,
        anchor: 'center' as const,
        color: (ctx: unknown) => (ctx as { dataset: { borderColor: string } }).dataset.borderColor,
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderColor: (ctx: unknown) => (ctx as { dataset: { borderColor: string } }).dataset.borderColor,
        borderWidth: 1,
        formatter: (v: number) => `${v}${unit}`,
      },
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

function barOptions(title: string, unit = '', stacked = false) {
  return {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 11 }, boxWidth: 12 } },
      tooltip: { mode: 'index' as const, intersect: false },
      datalabels: {
        ...BASE_DATALABEL,
        align: 'end' as const,
        anchor: 'end' as const,
        color: '#374151',
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderColor: 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        formatter: (v: number) => `${v}${unit}`,
      },
    },
    scales: {
      y: {
        min: 0,
        stacked,
        ticks: { color: '#9ca3af', font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
      x: {
        stacked,
        ticks: { color: '#9ca3af', font: { size: 10 }, maxRotation: 30 },
        grid: { display: false },
      },
    },
  }
}

function radarOptions(title: string) {
  return {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 11 }, boxWidth: 12 } },
      datalabels: { display: false as const },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      r: {
        beginAtZero: true,
        min: 0,
        max: 100,
        ticks: { stepSize: 20, font: { size: 10 }, color: '#9ca3af', backdropColor: 'transparent' },
        grid: { color: 'rgba(0,0,0,0.08)' },
        pointLabels: { font: { size: 11 }, color: '#374151' },
      },
    },
  }
}

// ─── ChartCard ────────────────────────────────────────────────────────────────

const ChartCard = memo(function ChartCard({ title, children, fullWidth }: { title: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: '18px 20px 20px',
      gridColumn: fullWidth ? '1 / -1' : undefined,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
})

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

  // ── Delta helpers ──────────────────────────────────────────────────────────

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
    return inv ? (diff < 0 ? '#10b981' : '#ef4444') : (diff > 0 ? '#10b981' : '#ef4444')
  }

  // ── Data helpers ───────────────────────────────────────────────────────────

  const kpi = (key: keyof SprintKPIs) => items.map((it) => it.kpis[key] as number)

  // Grouped bar: uma barra por sprint, para comparar múltiplos KPIs
  function groupedBarData(keys: Array<keyof SprintKPIs>, keyLabels: string[]) {
    return {
      labels,
      datasets: keys.map((key, ki) => ({
        label: keyLabels[ki],
        data: kpi(key),
        backgroundColor: PALETTE[ki % PALETTE.length] + 'cc',
        borderColor: PALETTE[ki % PALETTE.length],
        borderWidth: 1.5,
        borderRadius: 6,
      })),
    }
  }

  // Single KPI bar (uma cor por sprint)
  function singleBarData(key: keyof SprintKPIs, label: string, colorFn?: (v: number) => string) {
    const values = kpi(key)
    return {
      labels,
      datasets: [{
        label,
        data: values,
        backgroundColor: colorFn
          ? values.map((v) => colorFn(v) + 'aa')
          : PALETTE.map((c) => c + 'cc'),
        borderColor: colorFn
          ? values.map((v) => colorFn(v))
          : PALETTE,
        borderWidth: 1.5,
        borderRadius: 6,
      }],
    }
  }

  // Line trend (pontos por sprint no eixo X)
  function trendLineData(key: keyof SprintKPIs, label: string, color: string, fill = false) {
    const values = kpi(key)
    return {
      labels,
      datasets: [{
        label,
        data: values,
        borderColor: color,
        backgroundColor: fill ? color + '22' : 'transparent',
        pointBackgroundColor: values.map((v, i) => {
          const isLast = i === values.length - 1
          return isLast ? color : color + 'aa'
        }),
        pointRadius: values.map((_, i) => (i === values.length - 1 ? 7 : 5)),
        pointHoverRadius: 9,
        tension: 0.35,
        fill,
      }],
    }
  }

  // Radar: perfil de qualidade por sprint
  const radarData = {
    labels: ['Health Score', 'Executados %', 'Capacidade Real', 'Sem Atraso', 'Sem Bugs', 'Sem Bloqueios'],
    datasets: items.map((item, i) => {
      const k = item.kpis
      return {
        label: item.entry.title.length > 20 ? item.entry.title.slice(0, 20) + '…' : item.entry.title,
        data: [
          k.healthScore,
          k.execPercent,
          k.capacidadeReal,
          Math.max(0, 100 - Math.min(100, k.atrasoCasos * 5)),
          Math.max(0, 100 - Math.min(100, k.openBugs * 10)),
          Math.max(0, 100 - Math.min(100, k.totalBlockedHours * 5)),
        ],
        borderColor: PALETTE[i % PALETTE.length],
        backgroundColor: PALETTE_BG[i % PALETTE.length],
        pointBackgroundColor: PALETTE[i % PALETTE.length],
        pointRadius: 4,
      }
    }),
  }

  // Bugs stacked: abertos + resolvidos
  const bugsStackedData = {
    labels,
    datasets: [
      {
        label: 'Bugs Abertos',
        data: kpi('openBugs'),
        backgroundColor: '#ef444499',
        borderColor: '#ef4444',
        borderWidth: 1.5,
        borderRadius: 4,
      },
      {
        label: 'Bugs Resolvidos',
        data: kpi('resolvedBugs'),
        backgroundColor: '#10b98199',
        borderColor: '#10b981',
        borderWidth: 1.5,
        borderRadius: 4,
      },
    ],
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 0 48px' }}>
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

      {/* Exportável */}
      <div ref={contentRef}>

        {/* Legenda */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          {items.map((item, i) => (
            <div key={item.entry.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface)', border: `2px solid ${PALETTE[i % PALETTE.length]}33`, borderRadius: 10, padding: '7px 14px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
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
                  {items.length >= 2 && (
                    <th style={{ ...thStyle, color: 'var(--color-text-3)', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Δ</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {KPI_ROWS.map((row, rowIdx) => (
                  <tr key={row.key} style={{ background: rowIdx % 2 === 0 ? 'transparent' : 'var(--color-bg)' }}>
                    <td style={{ padding: '9px 16px', fontWeight: 600, color: 'var(--color-text-2)', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' as const }}>
                      {row.label}
                    </td>
                    {items.map((item) => {
                      const val = item.kpis[row.key] as number
                      return (
                        <td key={item.entry.id} style={{ padding: '9px 14px', textAlign: 'center' as const, fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: row.colorFn(val), borderBottom: '1px solid var(--color-border)', borderLeft: '1px solid var(--color-border)' }}>
                          {val}{row.unit}
                        </td>
                      )
                    })}
                    {items.length >= 2 && (
                      <td style={{ padding: '9px 14px', textAlign: 'center' as const, fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: deltaColor(row.key), borderBottom: '1px solid var(--color-border)', borderLeft: '1px solid var(--color-border)', fontSize: 12 }}>
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

          {/* 1. Radar: perfil de qualidade */}
          <ChartCard title="🕸 Perfil de Qualidade (Radar)">
            <Radar data={radarData} options={radarOptions('Qualidade')} />
          </ChartCard>

          {/* 2. Health Score — barras com valor */}
          <ChartCard title="❤️ QA Health Score por Sprint">
            <Bar
              data={singleBarData('healthScore', 'Health Score %', colorHealth)}
              options={barOptions('Health Score', '%')}
            />
          </ChartCard>

          {/* 3. % Executados — linha de tendência */}
          <ChartCard title="✅ Evolução: % Testes Executados">
            <Line
              data={trendLineData('execPercent', '% Executados', '#10b981', true)}
              options={lineOptions('Executados', 100, '%')}
            />
          </ChartCard>

          {/* 4. Capacidade Real — linha de tendência */}
          <ChartCard title="⚡ Evolução: Capacidade Real">
            <Line
              data={trendLineData('capacidadeReal', 'Capacidade Real %', '#06b6d4', true)}
              options={lineOptions('Capacidade Real', 100, '%')}
            />
          </ChartCard>

          {/* 5. Bugs: agrupado abertos vs resolvidos */}
          <ChartCard title="🐞 Bugs Abertos × Resolvidos por Sprint">
            <Bar data={bugsStackedData} options={barOptions('Bugs')} />
          </ChartCard>

          {/* 6. MTTR + Horas Bloqueadas agrupado */}
          <ChartCard title="⏱ MTTR Global (h) por Sprint">
            <Bar
              data={singleBarData('mttrGlobal', 'MTTR (h)', colorMttr)}
              options={barOptions('MTTR', 'h')}
            />
          </ChartCard>

          {/* 7. Retrabalho — barras */}
          <ChartCard title="🔁 Índice de Retrabalho (%)">
            <Bar
              data={singleBarData('retestIndex', 'Retrabalho %', colorRetest)}
              options={barOptions('Retrabalho', '%')}
            />
          </ChartCard>

          {/* 8. Horas bloqueadas */}
          <ChartCard title="🚧 Horas Bloqueadas por Sprint">
            <Bar
              data={singleBarData('totalBlockedHours', 'Horas Bloqueadas', colorBlocked)}
              options={barOptions('Bloqueadas', 'h')}
            />
          </ChartCard>

          {/* 9. Total de testes + executáveis — grouped */}
          <ChartCard title="🧪 Volume de Testes por Sprint" fullWidth>
            <Bar
              data={groupedBarData(
                ['totalTests', 'testesExecutaveis', 'totalExec'],
                ['Total de Testes', 'Executáveis', 'Executados'],
              )}
              options={barOptions('Volume de Testes')}
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

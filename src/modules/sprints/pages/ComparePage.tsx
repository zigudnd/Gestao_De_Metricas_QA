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
    <div
      className="card"
      style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}
    >
      <div className="text-[13px] font-bold text-[var(--color-text)] mb-4">{title}</div>
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
      <div className="max-w-[900px] mx-auto py-10 px-5 text-center">
        <p className="text-body">Nenhuma sprint encontrada para comparação.</p>
        <button onClick={() => navigate('/sprints')} className="btn btn-outline btn-md mt-4">← Voltar</button>
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
    <div className="max-w-[1280px] mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/sprints')} className="btn btn-outline btn-md">← Voltar</button>
          <div>
            <h1 className="heading-lg !text-xl">Comparar Sprints</h1>
            <p className="text-body mt-0.5">
              {items.length} sprint{items.length !== 1 ? 's' : ''} · Evolução do time
            </p>
          </div>
        </div>
        <button onClick={handleExport} className="btn btn-primary btn-md font-semibold">📸 Exportar PNG</button>
      </div>

      {/* Exportável */}
      <div ref={contentRef}>

        {/* Legenda */}
        <div className="flex flex-wrap gap-2.5 mb-6">
          {items.map((item, i) => (
            <div
              key={item.entry.id}
              className="flex items-center gap-2 bg-[var(--color-surface)] rounded-[10px] py-[7px] px-3.5"
              style={{ border: `2px solid ${PALETTE[i % PALETTE.length]}33` }}
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              <div>
                <div className="text-xs font-bold text-[var(--color-text)]">{item.entry.title}</div>
                {item.entry.startDate && (
                  <div className="text-[11px] text-[var(--color-text-3)]">
                    {item.entry.startDate}{item.entry.endDate ? ` → ${item.entry.endDate}` : ''}
                  </div>
                )}
              </div>
              {item.entry.status === 'concluida' && (
                <span className="badge badge-green">✅ Concluída</span>
              )}
            </div>
          ))}
        </div>

        {/* KPI Table */}
        <div className="card !p-0 overflow-hidden mb-8">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <span className="text-[13px] font-bold text-[var(--color-text)]">📊 Tabela Comparativa de KPIs</span>
            <span className="text-[11px] text-[var(--color-text-3)]">Δ = variação entre primeira e última sprint</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[var(--color-bg)]">
                  <th className="table-header text-center min-w-[120px]">KPI</th>
                  {items.map((item, i) => (
                    <th key={item.entry.id} className="table-header text-center min-w-[120px]">
                      <div style={{ color: PALETTE[i % PALETTE.length] }} className="font-bold">
                        {item.entry.title.length > 20 ? item.entry.title.slice(0, 20) + '…' : item.entry.title}
                      </div>
                      {item.entry.startDate && (
                        <div className="text-[10px] font-normal text-[var(--color-text-3)] mt-0.5">{item.entry.startDate}</div>
                      )}
                    </th>
                  ))}
                  {items.length >= 2 && (
                    <th className="table-header text-center min-w-[120px] text-[var(--color-text-3)] text-[11px] uppercase tracking-wide">Δ</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {KPI_ROWS.map((row, rowIdx) => (
                  <tr key={row.key} className={rowIdx % 2 === 0 ? '' : 'bg-[var(--color-bg)]'}>
                    <td className="table-cell font-semibold text-[var(--color-text-2)] whitespace-nowrap">
                      {row.label}
                    </td>
                    {items.map((item) => {
                      const val = item.kpis[row.key] as number
                      return (
                        <td
                          key={item.entry.id}
                          className="table-cell text-center font-bold font-[var(--font-family-mono)] border-l border-[var(--color-border)]"
                          style={{ color: row.colorFn(val) }}
                        >
                          {val}{row.unit}
                        </td>
                      )
                    })}
                    {items.length >= 2 && (
                      <td
                        className="table-cell text-center font-bold font-[var(--font-family-mono)] border-l border-[var(--color-border)] text-xs"
                        style={{ color: deltaColor(row.key) }}
                      >
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
        <div className="grid grid-cols-2 gap-5">

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

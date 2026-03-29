import type { StatusReportItem, StatusReportConfig, SectionDef } from '../types/statusReport.types'

interface ReportPreviewProps {
  config: StatusReportConfig
  sections: SectionDef[]
  items: StatusReportItem[]
}

const STACK_LABELS: Record<string, string> = {
  ios: 'iOS', android: 'Android', bff: 'BFF', back: 'Back',
}

function renderItem(item: StatusReportItem, index: number) {
  const stacks = item.stacks.map((s) => STACK_LABELS[s] ?? s).join(', ')
  const subItems = item.notes.split('\n').filter((l) => l.trim())

  return (
    <div key={item.id} style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 13, color: '#111', lineHeight: 1.5 }}>
        <strong>{index + 1}.</strong>{' '}
        {item.title}
        {item.pct > 0 && <span style={{ color: '#666' }}> ({item.pct}%)</span>}
        {item.resp && <span style={{ color: '#888' }}> · {item.resp}</span>}
        {stacks && (
          <span style={{
            marginLeft: 6, fontSize: 10, padding: '1px 5px',
            borderRadius: 3, background: '#eee', color: '#555',
          }}>
            {stacks}
          </span>
        )}
      </div>
      {subItems.map((line, i) => (
        <div key={i} style={{ fontSize: 12, color: '#444', paddingLeft: 18, lineHeight: 1.5 }}>
          • {line}
        </div>
      ))}
    </div>
  )
}

function SectionBlock({ label, color, sectionItems }: {
  label: string; color: string; sectionItems: StatusReportItem[]
}) {
  if (sectionItems.length === 0) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 13, fontWeight: 700, color: '#111',
        borderBottom: `2px solid ${color}`,
        paddingBottom: 4, marginBottom: 8,
      }}>
        {label}:
      </div>
      {sectionItems.map((item, i) => renderItem(item, i))}
    </div>
  )
}

export function ReportPreview({ config, sections, items }: ReportPreviewProps) {
  const leftSections = sections.filter((s) => s.side === 'left')
  const rightSections = sections.filter((s) => s.side === 'right')

  return (
    <div
      id="statusReportExportArea"
      style={{
        background: '#ffffff', color: '#111',
        padding: 32, maxWidth: 900, margin: '0 auto',
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
        border: '1px solid var(--color-border)', borderRadius: 8,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20, borderBottom: '2px solid var(--color-blue)', paddingBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>
          {config.title || 'Status Report'} – {config.date || '—'}
        </div>
        <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
          {config.squad}{config.squad && config.period ? ' · ' : ''}{config.period}
        </div>
      </div>

      {/* 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left column */}
        <div>
          {leftSections.map((sec) => (
            <SectionBlock
              key={sec.id}
              label={sec.label}
              color={sec.color}
              sectionItems={items.filter((i) => i.section === sec.id)}
            />
          ))}
        </div>

        {/* Right column */}
        <div>
          {rightSections.map((sec) => (
            <SectionBlock
              key={sec.id}
              label={sec.label + (sec.id === 'implanted' && config.period ? ` (${config.period})` : '')}
              color={sec.color}
              sectionItems={items.filter((i) => i.section === sec.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Gera texto formatado para clipboard */
export function generateClipboardText(config: StatusReportConfig, sections: SectionDef[], items: StatusReportItem[]): string {
  const lines: string[] = []

  lines.push(`${config.title || 'Status Report'} – ${config.date || ''}`)
  lines.push(config.squad + (config.period ? ` · ${config.period}` : ''))
  lines.push('')

  for (const sec of sections) {
    const sectionItems = items.filter((i) => i.section === sec.id)
    if (sectionItems.length === 0) continue

    let label = sec.label
    if (sec.id === 'implanted' && config.period) label += ` (${config.period})`
    lines.push(`${label}:`)

    sectionItems.forEach((item, i) => {
      const stacks = item.stacks.map((s) => STACK_LABELS[s] ?? s).join(', ')
      let line = `${i + 1}. ${item.title}`
      if (item.pct > 0) line += ` (${item.pct}%)`
      if (item.resp) line += ` · ${item.resp}`
      if (stacks) line += ` [${stacks}]`
      lines.push(line)

      const subItems = item.notes.split('\n').filter((l) => l.trim())
      subItems.forEach((sub) => {
        lines.push(`   • ${sub}`)
      })
    })
    lines.push('')
  }

  return lines.join('\n').trim()
}

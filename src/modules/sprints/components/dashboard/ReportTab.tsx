import { useSprintStore } from '../../store/sprintStore'

export function ReportTab() {
  const state = useSprintStore((s) => s.state)
  const updateReportText = useSprintStore((s) => s.updateReportText)
  const _commit = useSprintStore((s) => s._commit)

  const currentDate = state.currentDate
  const [y, m, d] = currentDate.split('-')
  const dateLabel = `${d}/${m}`

  // All report dates sorted descending
  const allDates = Object.keys(state.reports).sort().reverse()

  function changeDate(newDate: string) {
    const reports = { ...state.reports }
    if (reports[newDate] === undefined) reports[newDate] = ''
    _commit({ ...state, currentDate: newDate, reports })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Left: edit */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>📝 Report Diário — {dateLabel}</span>
          <input
            type="date"
            value={currentDate}
            onChange={(e) => changeDate(e.target.value)}
            style={{
              marginLeft: 'auto',
              padding: '4px 8px',
              border: '1px solid var(--color-border-md)',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--color-text)',
              background: 'var(--color-bg)',
              fontFamily: 'var(--font-family-sans)',
            }}
          />
        </div>
        <div style={{ padding: 16 }}>
          <textarea
            value={state.reports[currentDate] ?? ''}
            onChange={(e) => updateReportText(currentDate, e.target.value)}
            placeholder={`Escreva o report do dia ${dateLabel}…\n\nEx:\n• Executei X cenários na funcionalidade Y\n• Bug BUG-001 confirmado em produção\n• Bloqueio: ambiente indisponível 2h`}
            rows={16}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid var(--color-border-md)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--color-text)',
              background: '#eff6ff',
              fontFamily: 'var(--font-family-sans)',
              resize: 'vertical',
              lineHeight: 1.7,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Right: history */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>
          Histórico de Reports
        </div>
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 480, overflowY: 'auto' }}>
          {allDates.filter((d) => state.reports[d]?.trim()).length === 0 ? (
            <div style={{ color: 'var(--color-text-2)', fontSize: 13, textAlign: 'center', padding: 32 }}>
              Nenhum report preenchido ainda.
            </div>
          ) : (
            allDates
              .filter((dt) => state.reports[dt]?.trim())
              .map((dt) => {
                const [ry, rm, rd] = dt.split('-')
                const lbl = `${rd}/${rm}/${ry}`
                const isCurrent = dt === currentDate
                return (
                  <div
                    key={dt}
                    onClick={() => changeDate(dt)}
                    style={{
                      padding: '10px 14px',
                      background: isCurrent ? '#eff6ff' : 'var(--color-bg)',
                      border: `1px solid ${isCurrent ? '#bfdbfe' : 'var(--color-border)'}`,
                      borderLeft: `4px solid ${isCurrent ? 'var(--color-blue)' : 'var(--color-border-md)'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, color: isCurrent ? 'var(--color-blue)' : 'var(--color-text)', marginBottom: 4 }}>
                      📅 {lbl} {isCurrent && <span style={{ fontSize: 11, background: 'var(--color-blue)', color: '#fff', padding: '1px 6px', borderRadius: 10, marginLeft: 6 }}>Atual</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {state.reports[dt]}
                    </div>
                  </div>
                )
              })
          )}
        </div>
      </div>
    </div>
  )
}

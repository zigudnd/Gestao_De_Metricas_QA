import { useRef } from 'react'
import { useSprintStore } from '@/modules/sprints/store/sprintStore'
import { useSprintMetrics } from '@/modules/sprints/components/dashboard/useSprintMetrics'

function calcMTTR(openedAt?: string, resolvedAt?: string): number | null {
  if (!openedAt || !resolvedAt) return null
  const ms = new Date(resolvedAt + 'T00:00:00').getTime() - new Date(openedAt + 'T00:00:00').getTime()
  return isNaN(ms) || ms < 0 ? 0 : Math.round(ms / 86400000)
}

function formatDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

interface Props { onClose: () => void }

export function TermoConclusaoModal({ onClose }: Props) {
  const state = useSprintStore((s) => s.state)
  const { totalTests, totalExec, healthScore, totalRetests, totalBlockedHours, activeFeatures } = useSprintMetrics()
  const printRef = useRef<HTMLDivElement>(null)

  const cfg = state.config
  const bugs = state.bugs ?? []
  const blockers = state.blockers ?? []
  const alignments = state.alignments ?? []
  const suites = state.suites ?? []
  const responsibles = state.responsibles ?? []

  const bugsAbertos   = bugs.filter((b) => b.status === 'Aberto')
  const bugsEmAnd     = bugs.filter((b) => b.status === 'Em Andamento')
  const bugsResolvidos = bugs.filter((b) => b.status === 'Resolvido')
  const taxaResolucao  = bugs.length > 0 ? Math.round((bugsResolvidos.length / bugs.length) * 100) : 100
  const execPct        = totalTests > 0 ? Math.round((totalExec / totalTests) * 100) : 0

  const resolvedWithDates = bugs.filter((b) => b.status === 'Resolvido' && b.openedAt && b.resolvedAt)
  const mttrDays = resolvedWithDates.map((b) => calcMTTR(b.openedAt, b.resolvedAt)).filter((d): d is number => d !== null)
  const mttrGlobal = mttrDays.length ? (mttrDays.reduce((a, b) => a + b, 0) / mttrDays.length).toFixed(1) : null

  const hsColor = healthScore >= 90 ? '#15803d' : healthScore >= 70 ? '#a16207' : '#dc2626'
  const hsLabel = healthScore >= 90 ? 'Excelente' : healthScore >= 70 ? 'Atenção' : 'Crítico'

  const today = new Date().toLocaleDateString('pt-BR')

  // Suites com progresso
  const suiteSummary = suites.map((s) => {
    const feats = activeFeatures.filter((f) => String(f.suiteId) === String(s.id))
    const total      = feats.reduce((a, f) => a + (f.cases ?? []).length, 0)
    const concluido  = feats.reduce((a, f) => a + (f.cases ?? []).filter((c) => c.status === 'Concluído').length, 0)
    const falhou     = feats.reduce((a, f) => a + (f.cases ?? []).filter((c) => c.status === 'Falhou').length, 0)
    const bloqueado  = feats.reduce((a, f) => a + (f.cases ?? []).filter((c) => c.status === 'Bloqueado').length, 0)
    const pendente   = feats.reduce((a, f) => a + (f.cases ?? []).filter((c) => c.status === 'Pendente').length, 0)
    return { name: s.name, feats: feats.length, total, concluido, falhou, bloqueado, pendente }
  })

  // Numeração dinâmica — seções condicionais não criam gaps
  const hasAlignments = alignments.length > 0
  const hasSuites     = suiteSummary.length > 0
  const hasBlockers   = blockers.length > 0
  const hasReports    = Object.values(state.reports ?? {}).some((t) => t && t.trim())
  const hasNotes      = !!(state.notes?.actionPlan || state.notes?.premises)

  let _n = 2
  const sec = {
    identificacao:  1,
    resumo:         2,
    alinhamentos:   hasAlignments ? ++_n : 0,
    bugs:           ++_n,
    progresso:      hasSuites     ? ++_n : 0,
    blockers:       hasBlockers   ? ++_n : 0,
    reports:        hasReports    ? ++_n : 0,
    notas:          hasNotes      ? ++_n : 0,
  }

  function handlePrint() {
    const el = printRef.current
    if (!el) return
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return

    // Clone the content safely (no raw innerHTML injection)
    const clone = el.cloneNode(true) as HTMLElement

    // Remove any script tags from cloned content
    clone.querySelectorAll('script').forEach((s) => s.remove())

    win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Termo de Conclusão</title>')
    win.document.write('<style>body{font-family:"IBM Plex Sans",system-ui,sans-serif;padding:32px;color:#1a1a18;font-size:14px;line-height:1.6}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}h2{margin-top:24px}</style>')
    win.document.write('</head><body>')
    win.document.write(clone.innerHTML)
    win.document.write('</body></html>')
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  // Note: TermoConclusaoModal uses hardcoded print-safe colors (not CSS vars)
  // because its content is cloned into a new window for printing.
  // Inline styles are intentionally kept here for print fidelity.

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="modal-backdrop"
      style={{ alignItems: 'flex-start', padding: '24px 16px', overflowY: 'auto' }}
    >
      <div className="modal-container modal-lg !p-0 !gap-0">

        {/* Header do modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="heading-sm">📋 Termo de Conclusão da Sprint</div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn btn-primary btn-sm">
              🖨️ Imprimir / PDF
            </button>
            <button onClick={onClose} className="btn btn-ghost text-[18px]">✕</button>
          </div>
        </div>

        {/* Conteúdo do termo */}
        <div style={{ padding: '24px 32px', overflowY: 'auto', maxHeight: '80vh' }}>
          <div ref={printRef}>

            {/* Título */}
            <h1 style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', color: '#0c447c', marginBottom: 4 }}>
              TERMO DE CONCLUSÃO DE SPRINT
            </h1>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', marginBottom: 24 }}>
              ToStatos — QA Metrics Dashboard · Emitido em {today}
            </p>

            {/* Identificação */}
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', borderBottom: '2px solid #0c447c', paddingBottom: 4, marginBottom: 10 }}>
              {sec.identificacao}. IDENTIFICAÇÃO DA SPRINT
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 20 }}>
              <tbody>
                {[
                  ['Sprint / Projeto', cfg.title || '—'],
                  ['Squad / Time', cfg.squad || '—'],
                  ['Versão Alvo', cfg.targetVersion || '—'],
                  ['QA Responsável', cfg.qaName || '—'],
                  ['Período', `${formatDate(cfg.startDate)} a ${formatDate(cfg.endDate)}`],
                  ['Duração', `${cfg.sprintDays || 20} dias`],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, width: '35%', background: '#f9fafb', color: '#374151' }}>{label}</td>
                    <td style={{ padding: '8px 12px', color: '#1a1a1a' }}>{value}</td>
                  </tr>
                ))}
                {responsibles.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, width: '35%', background: '#f9fafb', color: '#374151' }}>{r.role || 'Responsável'}</td>
                    <td style={{ padding: '8px 12px', color: '#1a1a1a' }}>{r.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Resumo Executivo */}
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', borderBottom: '2px solid #0c447c', paddingBottom: 4, marginBottom: 12 }}>
              {sec.resumo}. RESUMO EXECUTIVO
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Total de Testes', value: totalTests, color: '#1e40af' },
                { label: 'Executados', value: `${totalExec} (${execPct}%)`, color: '#15803d' },
                { label: 'QA Health Score', value: `${healthScore}%`, color: hsColor },
                { label: 'Total de Bugs', value: bugs.length, color: '#dc2626' },
                { label: 'Bugs Resolvidos', value: bugsResolvidos.length, color: '#15803d' },
                { label: 'Taxa de Resolução', value: `${taxaResolucao}%`, color: taxaResolucao === 100 ? '#15803d' : '#a16207' },
                { label: 'MTTR Global', value: mttrGlobal !== null ? `${mttrGlobal}d` : '—', color: '#7c3aed' },
                { label: 'Horas Bloqueadas', value: `${totalBlockedHours}h`, color: '#dc2626' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', textAlign: 'center', background: '#fff' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '8px 14px', background: hsColor === '#15803d' ? '#f0fdf4' : hsColor === '#a16207' ? '#fefce8' : '#fef2f2', border: `1px solid ${hsColor}44`, borderRadius: 8, fontSize: 13, fontWeight: 600, color: hsColor, marginBottom: 20 }}>
              Status de Qualidade: {hsLabel} — QA Health Score {healthScore}%
            </div>

            {/* Alinhamentos */}
            {alignments.length > 0 && (
              <>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', borderBottom: '2px solid #0c447c', paddingBottom: 4, marginBottom: 10 }}>
                  {sec.alinhamentos}. ALINHAMENTOS TÉCNICOS
                </h2>
                <ul style={{ paddingLeft: 18, marginBottom: 20, lineHeight: 1.9, fontSize: 13, color: '#374151' }}>
                  {alignments.map((a) => <li key={a.id}>{a.text || '—'}</li>)}
                </ul>
              </>
            )}

            {/* Distribuição de Bugs */}
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', borderBottom: '2px solid #0c447c', paddingBottom: 4, marginBottom: 10 }}>
              {sec.bugs}. BUGS ENCONTRADOS
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  {['Severidade', 'Abertos', 'Em Andamento', 'Resolvidos', 'Total'].map((h) => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #d1d5db', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(['Crítica', 'Alta', 'Média', 'Baixa'] as const).map((sev) => {
                  const total  = bugs.filter((b) => b.severity === sev)
                  const ab     = total.filter((b) => b.status === 'Aberto').length
                  const em     = total.filter((b) => b.status === 'Em Andamento').length
                  const res    = total.filter((b) => b.status === 'Resolvido').length
                  if (!total.length) return null
                  return (
                    <tr key={sev} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '7px 10px', fontWeight: 700, border: '1px solid #d1d5db' }}>{sev}</td>
                      <td style={{ padding: '7px 10px', border: '1px solid #d1d5db', color: ab > 0 ? '#dc2626' : '#374151' }}>{ab}</td>
                      <td style={{ padding: '7px 10px', border: '1px solid #d1d5db', color: em > 0 ? '#d97706' : '#374151' }}>{em}</td>
                      <td style={{ padding: '7px 10px', border: '1px solid #d1d5db', color: '#15803d' }}>{res}</td>
                      <td style={{ padding: '7px 10px', border: '1px solid #d1d5db', fontWeight: 700 }}>{total.length}</td>
                    </tr>
                  )
                })}
                <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                  <td style={{ padding: '7px 10px', border: '1px solid #d1d5db' }}>Total</td>
                  <td style={{ padding: '7px 10px', border: '1px solid #d1d5db' }}>{bugsAbertos.length}</td>
                  <td style={{ padding: '7px 10px', border: '1px solid #d1d5db' }}>{bugsEmAnd.length}</td>
                  <td style={{ padding: '7px 10px', border: '1px solid #d1d5db' }}>{bugsResolvidos.length}</td>
                  <td style={{ padding: '7px 10px', border: '1px solid #d1d5db' }}>{bugs.length}</td>
                </tr>
              </tbody>
            </table>

            {/* Retestes */}
            {totalRetests > 0 && (
              <p style={{ fontSize: 13, color: '#374151', marginBottom: 20 }}>
                Total de retestes realizados: <strong>{totalRetests}</strong>
              </p>
            )}

            {/* Progresso por Suite */}
            {suiteSummary.length > 0 && (
              <>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', borderBottom: '2px solid #0c447c', paddingBottom: 4, marginBottom: 10 }}>
                  {sec.progresso}. PROGRESSO POR SUITE DE TESTES
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      {['Suite', 'Funcionalidades', 'Total Casos', 'Concluído', 'Falhou', 'Bloqueado', 'Pendente', 'Cobertura'].map((h) => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #d1d5db', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {suiteSummary.map((s) => {
                      const cob = s.total > 0 ? Math.round(((s.concluido + s.falhou) / s.total) * 100) : 0
                      return (
                        <tr key={s.name} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '7px 10px', fontWeight: 700, border: '1px solid #d1d5db' }}>{s.name || '—'}</td>
                          <td style={{ padding: '7px 10px', border: '1px solid #d1d5db', textAlign: 'center' }}>{s.feats}</td>
                          <td style={{ padding: '7px 10px', border: '1px solid #d1d5db', textAlign: 'center' }}>{s.total}</td>
                          <td style={{ padding: '7px 10px', border: '1px solid #d1d5db', textAlign: 'center', color: '#15803d', fontWeight: 600 }}>{s.concluido}</td>
                          <td style={{ padding: '7px 10px', border: '1px solid #d1d5db', textAlign: 'center', color: s.falhou > 0 ? '#dc2626' : '#374151' }}>{s.falhou}</td>
                          <td style={{ padding: '7px 10px', border: '1px solid #d1d5db', textAlign: 'center', color: s.bloqueado > 0 ? '#d97706' : '#374151' }}>{s.bloqueado}</td>
                          <td style={{ padding: '7px 10px', border: '1px solid #d1d5db', textAlign: 'center', color: s.pendente > 0 ? '#6b7280' : '#374151' }}>{s.pendente}</td>
                          <td style={{ padding: '7px 10px', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: 700, color: cob === 100 ? '#15803d' : cob >= 80 ? '#a16207' : '#dc2626' }}>{cob}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )}

            {/* Impedimentos */}
            {blockers.length > 0 && (
              <>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', borderBottom: '2px solid #0c447c', paddingBottom: 4, marginBottom: 10 }}>
                  {sec.blockers}. IMPEDIMENTOS / BLOCKERS
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      {['Data', 'Motivo', 'Horas'].map((h) => (
                        <th key={h} style={{ padding: '7px 10px', border: '1px solid #d1d5db', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {blockers.map((b) => (
                      <tr key={b.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '6px 10px', border: '1px solid #d1d5db', whiteSpace: 'nowrap' }}>{formatDate(b.date)}</td>
                        <td style={{ padding: '6px 10px', border: '1px solid #d1d5db' }}>{b.reason || '—'}</td>
                        <td style={{ padding: '6px 10px', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: 700 }}>{b.hours}h</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                      <td colSpan={2} style={{ padding: '7px 10px', border: '1px solid #d1d5db', textAlign: 'right' }}>Total bloqueado:</td>
                      <td style={{ padding: '7px 10px', border: '1px solid #d1d5db', textAlign: 'center' }}>{totalBlockedHours}h</td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}

            {/* Histórico de Reports */}
            {(() => {
              const entries = Object.entries(state.reports ?? {})
                .filter(([, text]) => text && text.trim())
                .sort(([a], [b]) => a.localeCompare(b))
              if (!entries.length) return null
              return (
                <>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', borderBottom: '2px solid #0c447c', paddingBottom: 4, marginBottom: 10 }}>
                    {sec.reports}. HISTÓRICO DE REPORTS
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {entries.map(([date, text]) => (
                      <div key={date} style={{ border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ background: '#f3f4f6', padding: '6px 12px', fontWeight: 700, fontSize: 12, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                          {formatDate(date)}
                        </div>
                        <p style={{ margin: 0, padding: '8px 12px', fontSize: 12, color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{text}</p>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}

            {/* Notas */}
            {(state.notes?.actionPlan || state.notes?.premises) && (
              <>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', borderBottom: '2px solid #0c447c', paddingBottom: 4, marginBottom: 10 }}>
                  {sec.notas}. OBSERVAÇÕES E PLANO DE AÇÃO
                </h2>
                {state.notes.premises && (
                  <div style={{ marginBottom: 12 }}>
                    <strong style={{ fontSize: 13 }}>Premissas:</strong>
                    <p style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', marginTop: 4 }}>{state.notes.premises}</p>
                  </div>
                )}
                {state.notes.actionPlan && (
                  <div style={{ marginBottom: 12 }}>
                    <strong style={{ fontSize: 13 }}>Plano de Ação:</strong>
                    <p style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', marginTop: 4 }}>{state.notes.actionPlan}</p>
                  </div>
                )}
              </>
            )}

            {/* Rodapé */}
            <div style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 32, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
              Documento gerado pelo ToStatos — QA Metrics Dashboard · {today} · Jhonny Robert
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

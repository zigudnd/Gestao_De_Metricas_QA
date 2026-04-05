import { useState, useMemo } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string
  name: string
  date: string         // ISO 'YYYY-MM-DD' para eventos com data fixa
  dateEnd?: string     // ISO 'YYYY-MM-DD' para eventos com período
  dateLabel?: string   // label descritivo (ex: "01 de janeiro (quinta-feira)")
  type: 'event' | 'holiday'
}

interface EventsTabProps {
  events: CalendarEvent[]
  onAdd: (event: Omit<CalendarEvent, 'id'>) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<CalendarEvent>) => void
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

export const DEFAULT_EVENTS: CalendarEvent[] = [
  { id: 'evt-1', name: 'Come cotas', date: '2026-05-29', dateEnd: '2026-11-27', dateLabel: '29/05 e 27/11', type: 'event' },
  { id: 'evt-2', name: 'Semana do consumidor', date: '2026-03-09', dateEnd: '2026-03-14', dateLabel: 'De 09 a 14 de março', type: 'event' },
  { id: 'evt-3', name: 'Black Friday', date: '2026-11-27', dateLabel: '27 de novembro', type: 'event' },
  { id: 'hol-01', name: 'Confraternização Universal', date: '2026-01-01', dateLabel: '01 de janeiro (quinta-feira)', type: 'holiday' },
  { id: 'hol-02', name: 'Carnaval', date: '2026-02-16', dateEnd: '2026-02-17', dateLabel: '16 e 17 de fevereiro', type: 'holiday' },
  { id: 'hol-03', name: 'Sexta-Feira da Paixão', date: '2026-04-03', dateLabel: '03 de abril (sexta-feira)', type: 'holiday' },
  { id: 'hol-04', name: 'Dia de Tiradentes', date: '2026-04-21', dateLabel: '21 de abril (terça-feira)', type: 'holiday' },
  { id: 'hol-05', name: 'Dia do Trabalhador', date: '2026-05-01', dateLabel: '01 de maio (sexta-feira)', type: 'holiday' },
  { id: 'hol-06', name: 'Corpus Christi', date: '2026-06-04', dateLabel: '04 de junho (quinta-feira)', type: 'holiday' },
  { id: 'hol-07', name: 'Revolução Constitucionalista', date: '2026-07-09', dateLabel: '09 de julho (quinta-feira)', type: 'holiday' },
  { id: 'hol-08', name: 'Independência do Brasil', date: '2026-09-07', dateLabel: '07 de setembro (segunda-feira)', type: 'holiday' },
  { id: 'hol-09', name: 'Nossa Sra. Aparecida', date: '2026-10-12', dateLabel: '12 de outubro (segunda-feira)', type: 'holiday' },
  { id: 'hol-10', name: 'Dia de Finados', date: '2026-11-02', dateLabel: '02 de novembro (segunda-feira)', type: 'holiday' },
  { id: 'hol-11', name: 'Proclamação da República', date: '2026-11-15', dateLabel: '15 de novembro (domingo)', type: 'holiday' },
  { id: 'hol-12', name: 'Dia da Consciência Negra', date: '2026-11-20', dateLabel: '20 de novembro (sexta-feira)', type: 'holiday' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  if (!dateStr) return 9999
  const target = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function proximityBadge(dateStr: string, dateEnd?: string): { label: string; bg: string; color: string } | null {
  const endDate = dateEnd || dateStr
  const daysToStart = daysUntil(dateStr)
  const daysToEnd = daysUntil(endDate)

  if (daysToEnd < 0) return { label: 'Encerrado', bg: 'var(--color-surface-2)', color: 'var(--color-text-3)' }
  if (daysToStart <= 0 && daysToEnd >= 0) return { label: 'Hoje', bg: 'var(--color-green-light)', color: 'var(--color-green)' }
  if (daysToStart <= 7) return { label: `Em ${daysToStart}d`, bg: '#fff7ed', color: '#c2410c' }
  if (daysToStart <= 30) return { label: `Em ${daysToStart}d`, bg: 'var(--color-amber-light)', color: 'var(--color-amber)' }
  return null
}

function fmtDate(iso: string): string {
  if (!iso) return '--'
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventsTab({ events, onAdd, onRemove, onUpdate }: EventsTabProps) {
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [showAddHoliday, setShowAddHoliday] = useState(false)
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventDateEnd, setEventDateEnd] = useState('')
  const [holidayName, setHolidayName] = useState('')
  const [holidayDate, setHolidayDate] = useState('')

  const calendarEvents = useMemo(
    () => events.filter((e) => e.type === 'event').sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [events],
  )
  const holidays = useMemo(
    () => events.filter((e) => e.type === 'holiday').sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [events],
  )

  function handleAddEvent() {
    if (!eventName.trim() || !eventDate) return
    onAdd({
      name: eventName.trim(),
      date: eventDate,
      dateEnd: eventDateEnd || undefined,
      dateLabel: eventDateEnd ? `${fmtDate(eventDate)} a ${fmtDate(eventDateEnd)}` : fmtDate(eventDate),
      type: 'event',
    })
    setEventName(''); setEventDate(''); setEventDateEnd('')
    setShowAddEvent(false)
  }

  function handleAddHoliday() {
    if (!holidayName.trim() || !holidayDate) return
    const d = new Date(holidayDate + 'T00:00:00')
    const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' })
    const full = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
    onAdd({
      name: holidayName.trim(),
      date: holidayDate,
      dateLabel: `${full} (${weekday})`,
      type: 'holiday',
    })
    setHolidayName(''); setHolidayDate('')
    setShowAddHoliday(false)
  }

  return (
    <div style={{ maxWidth: 700 }}>
      {/* ── Eventos ── */}
      <div style={{ marginBottom: 32 }}>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="heading-sm">Eventos</span>
            <span className="badge badge-blue">{calendarEvents.length}</span>
          </div>
          {!showAddEvent && (
            <button onClick={() => setShowAddEvent(true)} aria-label="Adicionar evento" className="btn btn-sm btn-primary">+ Evento</button>
          )}
        </div>

        {/* Add event form */}
        {showAddEvent && (
          <div className="card-sm" style={{ background: 'var(--color-bg)', marginBottom: 14 }}>
            <div className="flex gap-2 flex-wrap mb-2.5">
              <div style={{ flex: 2, minWidth: 160 }}>
                <label className="section-label">Nome *</label>
                <input autoFocus value={eventName} onChange={(e) => setEventName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
                  placeholder="Ex: Black Friday" className="input-field" />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label className="section-label">Data início *</label>
                <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="input-field" />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label className="section-label">Data fim (opcional)</label>
                <input type="date" value={eventDateEnd} min={eventDate || undefined}
                  onChange={(e) => setEventDateEnd(e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAddEvent(false)} className="btn btn-sm btn-outline">Cancelar</button>
              <button onClick={handleAddEvent} disabled={!eventName.trim() || !eventDate} className="btn btn-sm btn-primary">Adicionar</button>
            </div>
          </div>
        )}

        {/* Event cards */}
        {calendarEvents.length === 0 && !showAddEvent && (
          <div className="text-body text-muted" style={{ textAlign: 'center', padding: '20px 16px' }}>Nenhum evento cadastrado. Clique em &quot;+ Evento&quot; para adicionar.</div>
        )}
        <div className="flex flex-col gap-1.5">
          {calendarEvents.map((evt) => {
            const badge = proximityBadge(evt.date, evt.dateEnd)
            const isPast = daysUntil(evt.dateEnd || evt.date) < 0
            return (
              <div key={evt.id} className="flex items-center gap-2.5" style={{
                padding: '10px 14px',
                background: 'var(--color-surface)',
                border: '0.5px solid var(--color-border)',
                borderLeft: `3px solid var(--color-blue)`,
                borderRadius: 8,
                opacity: isPast ? 0.5 : 1,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="heading-sm" style={{ fontSize: 13 }}>{evt.name}</div>
                  <div className="text-small" style={{ marginTop: 2 }}>
                    {evt.dateLabel || fmtDate(evt.date)}
                    {evt.dateEnd && !evt.dateLabel && ` — ${fmtDate(evt.dateEnd)}`}
                  </div>
                </div>
                {badge && (
                  <span className="badge" style={{
                    background: badge.bg, color: badge.color, flexShrink: 0,
                  }}>{badge.label}</span>
                )}
                <button onClick={() => onRemove(evt.id)}
                  aria-label="Remover evento"
                  className="btn-destructive events-remove-btn"
                  style={{ width: 22, height: 22, padding: 0, borderRadius: 4, border: 'none', background: 'none', color: 'var(--color-red)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.3, transition: 'opacity 0.15s' }}
                >×</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Feriados ── */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="heading-sm">Feriados</span>
            <span className="badge badge-red">{holidays.length}</span>
          </div>
          {!showAddHoliday && (
            <button onClick={() => setShowAddHoliday(true)} aria-label="Adicionar feriado" className="btn btn-sm btn-primary">+ Feriado</button>
          )}
        </div>

        {/* Add holiday form */}
        {showAddHoliday && (
          <div className="card-sm" style={{ background: 'var(--color-bg)', marginBottom: 14 }}>
            <div className="flex gap-2 flex-wrap mb-2.5">
              <div style={{ flex: 2, minWidth: 160 }}>
                <label className="section-label">Nome *</label>
                <input autoFocus value={holidayName} onChange={(e) => setHolidayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddHoliday()}
                  placeholder="Ex: Dia de Tiradentes" className="input-field" />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label className="section-label">Data *</label>
                <input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAddHoliday(false)} className="btn btn-sm btn-outline">Cancelar</button>
              <button onClick={handleAddHoliday} disabled={!holidayName.trim() || !holidayDate} className="btn btn-sm btn-primary">Adicionar</button>
            </div>
          </div>
        )}

        {/* Holiday cards */}
        {holidays.length === 0 && !showAddHoliday && (
          <div className="text-body text-muted" style={{ textAlign: 'center', padding: '20px 16px' }}>Nenhum feriado cadastrado.</div>
        )}
        <div className="flex flex-col gap-1.5">
          {holidays.map((hol) => {
            const badge = proximityBadge(hol.date)
            const isPast = daysUntil(hol.date) < 0
            return (
              <div key={hol.id} className="flex items-center gap-2.5" style={{
                padding: '10px 14px',
                background: 'var(--color-surface)',
                border: '0.5px solid var(--color-border)',
                borderLeft: '3px solid var(--color-red)',
                borderRadius: 8,
                opacity: isPast ? 0.5 : 1,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="heading-sm" style={{ fontSize: 13 }}>{hol.name}</div>
                  <div className="text-small" style={{ marginTop: 2 }}>
                    {hol.dateLabel || fmtDate(hol.date)}
                  </div>
                </div>
                {badge && (
                  <span className="badge" style={{
                    background: badge.bg, color: badge.color, flexShrink: 0,
                  }}>{badge.label}</span>
                )}
                <button onClick={() => onRemove(hol.id)}
                  aria-label="Remover feriado"
                  className="events-remove-btn"
                  style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: 'none', color: 'var(--color-red)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.3, transition: 'opacity 0.15s' }}
                >×</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3.5 flex-wrap" style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
        {[
          { bg: '#fff7ed', color: '#c2410c', label: 'Em 7 dias' },
          { bg: 'var(--color-amber-light)', color: 'var(--color-amber)', label: 'Em 30 dias' },
          { bg: 'var(--color-green-light)', color: 'var(--color-green)', label: 'Hoje/Ativo' },
          { bg: 'var(--color-surface-2)', color: 'var(--color-text-3)', label: 'Encerrado' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-muted" style={{ fontSize: 11 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.bg, border: `1px solid ${l.color}`, flexShrink: 0 }} />
            {l.label}
          </div>
        ))}
      </div>
      <style>{`
        .events-remove-btn:hover { opacity: 1 !important; }
      `}</style>
    </div>
  )
}

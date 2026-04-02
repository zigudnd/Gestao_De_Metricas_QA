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
  { id: 'evt-2', name: 'Semana do consumidor', date: '2026-03-09', dateEnd: '2026-03-14', dateLabel: 'De 09 a 14 de marco', type: 'event' },
  { id: 'evt-3', name: 'Black Friday', date: '2026-11-27', dateLabel: '27 de novembro', type: 'event' },
  { id: 'hol-01', name: 'Confraternizacao Universal', date: '2026-01-01', dateLabel: '01 de janeiro (quinta-feira)', type: 'holiday' },
  { id: 'hol-02', name: 'Carnaval', date: '2026-02-16', dateEnd: '2026-02-17', dateLabel: '16 e 17 de fevereiro', type: 'holiday' },
  { id: 'hol-03', name: 'Sexta-Feira da Paixao', date: '2026-04-03', dateLabel: '03 de abril (sexta-feira)', type: 'holiday' },
  { id: 'hol-04', name: 'Dia de Tiradentes', date: '2026-04-21', dateLabel: '21 de abril (terca-feira)', type: 'holiday' },
  { id: 'hol-05', name: 'Dia do Trabalhador', date: '2026-05-01', dateLabel: '01 de maio (sexta-feira)', type: 'holiday' },
  { id: 'hol-06', name: 'Corpus Christi', date: '2026-06-04', dateLabel: '04 de junho (quinta-feira)', type: 'holiday' },
  { id: 'hol-07', name: 'Revolucao Constitucionalista', date: '2026-07-09', dateLabel: '09 de julho (quinta-feira)', type: 'holiday' },
  { id: 'hol-08', name: 'Independencia do Brasil', date: '2026-09-07', dateLabel: '07 de setembro (segunda-feira)', type: 'holiday' },
  { id: 'hol-09', name: 'Nossa Sra. Aparecida', date: '2026-10-12', dateLabel: '12 de outubro (segunda-feira)', type: 'holiday' },
  { id: 'hol-10', name: 'Dia de Finados', date: '2026-11-02', dateLabel: '02 de novembro (segunda-feira)', type: 'holiday' },
  { id: 'hol-11', name: 'Proclamacao da Republica', date: '2026-11-15', dateLabel: '15 de novembro (domingo)', type: 'holiday' },
  { id: 'hol-12', name: 'Dia da Consciencia Negra', date: '2026-11-20', dateLabel: '20 de novembro (sexta-feira)', type: 'holiday' },
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
  if (daysToStart <= 7) return { label: `Em ${daysToStart}d`, bg: 'var(--color-amber-light)', color: 'var(--color-amber)' }
  if (daysToStart <= 30) return { label: `Em ${daysToStart}d`, bg: 'var(--color-amber-light)', color: 'var(--color-amber)' }
  return null
}

function fmtDate(iso: string): string {
  if (!iso) return '--'
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventsTab({ events, onAdd, onRemove }: EventsTabProps) {
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Eventos</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
              background: 'var(--color-blue-light)', color: 'var(--color-blue-text)',
            }}>{calendarEvents.length}</span>
          </div>
          {!showAddEvent && (
            <button onClick={() => setShowAddEvent(true)} aria-label="Adicionar evento" style={btnAdd}>+ Evento</button>
          )}
        </div>

        {/* Add event form */}
        {showAddEvent && (
          <div style={formCard}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <div style={{ flex: 2, minWidth: 160 }}>
                <label style={labelSm}>Nome *</label>
                <input autoFocus value={eventName} onChange={(e) => setEventName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
                  placeholder="Ex: Black Friday" style={inputSm} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={labelSm}>Data inicio *</label>
                <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={inputSm} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={labelSm}>Data fim (opcional)</label>
                <input type="date" value={eventDateEnd} min={eventDate || undefined}
                  onChange={(e) => setEventDateEnd(e.target.value)} style={inputSm} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddEvent(false)} style={btnGhost}>Cancelar</button>
              <button onClick={handleAddEvent} disabled={!eventName.trim() || !eventDate} style={{
                ...btnPrimary, opacity: !eventName.trim() || !eventDate ? 0.5 : 1,
              }}>Adicionar</button>
            </div>
          </div>
        )}

        {/* Event cards */}
        {calendarEvents.length === 0 && !showAddEvent && (
          <div style={emptyState}>Nenhum evento cadastrado. Clique em &quot;+ Evento&quot; para adicionar.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {calendarEvents.map((evt) => {
            const badge = proximityBadge(evt.date, evt.dateEnd)
            const isPast = daysUntil(evt.dateEnd || evt.date) < 0
            return (
              <div key={evt.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                background: 'var(--color-surface)',
                border: '0.5px solid var(--color-border)',
                borderLeft: `3px solid var(--color-blue)`,
                borderRadius: 8,
                opacity: isPast ? 0.5 : 1,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{evt.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>
                    {evt.dateLabel || fmtDate(evt.date)}
                    {evt.dateEnd && !evt.dateLabel && ` — ${fmtDate(evt.dateEnd)}`}
                  </div>
                </div>
                {badge && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                    background: badge.bg, color: badge.color, flexShrink: 0,
                  }}>{badge.label}</span>
                )}
                <button onClick={() => onRemove(evt.id)} style={btnRemove}
                  aria-label="Remover evento"
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.3' }}
                >×</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Feriados ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Feriados</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
              background: 'var(--color-red-light)', color: 'var(--color-red)',
            }}>{holidays.length}</span>
          </div>
          {!showAddHoliday && (
            <button onClick={() => setShowAddHoliday(true)} aria-label="Adicionar feriado" style={btnAdd}>+ Feriado</button>
          )}
        </div>

        {/* Add holiday form */}
        {showAddHoliday && (
          <div style={formCard}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <div style={{ flex: 2, minWidth: 160 }}>
                <label style={labelSm}>Nome *</label>
                <input autoFocus value={holidayName} onChange={(e) => setHolidayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddHoliday()}
                  placeholder="Ex: Dia de Tiradentes" style={inputSm} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={labelSm}>Data *</label>
                <input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} style={inputSm} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddHoliday(false)} style={btnGhost}>Cancelar</button>
              <button onClick={handleAddHoliday} disabled={!holidayName.trim() || !holidayDate} style={{
                ...btnPrimary, opacity: !holidayName.trim() || !holidayDate ? 0.5 : 1,
              }}>Adicionar</button>
            </div>
          </div>
        )}

        {/* Holiday cards */}
        {holidays.length === 0 && !showAddHoliday && (
          <div style={emptyState}>Nenhum feriado cadastrado.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {holidays.map((hol) => {
            const badge = proximityBadge(hol.date)
            const isPast = daysUntil(hol.date) < 0
            return (
              <div key={hol.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                background: 'var(--color-surface)',
                border: '0.5px solid var(--color-border)',
                borderLeft: '3px solid var(--color-red)',
                borderRadius: 8,
                opacity: isPast ? 0.5 : 1,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{hol.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>
                    {hol.dateLabel || fmtDate(hol.date)}
                  </div>
                </div>
                {badge && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                    background: badge.bg, color: badge.color, flexShrink: 0,
                  }}>{badge.label}</span>
                )}
                <button onClick={() => onRemove(hol.id)} style={btnRemove}
                  aria-label="Remover feriado"
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.3' }}
                >×</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 20, paddingTop: 12, borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
        {[
          { bg: 'var(--color-amber-light)', color: 'var(--color-amber)', label: 'Em 7 dias' },
          { bg: 'var(--color-amber-light)', color: 'var(--color-amber)', label: 'Em 30 dias' },
          { bg: 'var(--color-green-light)', color: 'var(--color-green)', label: 'Hoje/Ativo' },
          { bg: 'var(--color-surface-2)', color: 'var(--color-text-3)', label: 'Encerrado' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-3)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.bg, border: `1px solid ${l.color}`, flexShrink: 0 }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const btnAdd: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 7, border: 'none',
  background: 'var(--color-blue)', color: '#fff',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  transition: 'all 0.15s',
}

const btnGhost: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 6,
  border: '1px solid var(--color-border-md)',
  background: 'transparent', color: 'var(--color-text-2)',
  fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
  transition: 'all 0.15s',
}

const btnPrimary: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 6, border: 'none',
  background: 'var(--color-blue)', color: '#fff',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  transition: 'all 0.15s',
}

const btnRemove: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 4, border: 'none',
  background: 'none', color: 'var(--color-red)', cursor: 'pointer',
  fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, opacity: 0.3, transition: 'opacity 0.15s',
}

const formCard: React.CSSProperties = {
  background: 'var(--color-bg)', border: '0.5px solid var(--color-border)',
  borderRadius: 10, padding: '14px 16px', marginBottom: 14,
}

const labelSm: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500,
  color: 'var(--color-text-2)', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.04em',
}

const inputSm: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '7px 10px', fontSize: 13,
  border: '0.5px solid var(--color-border)', borderRadius: 6,
  background: 'var(--color-surface)', color: 'var(--color-text)',
  outline: 'none', fontFamily: 'var(--font-family-sans)',
}

const emptyState: React.CSSProperties = {
  textAlign: 'center', padding: '20px 16px',
  color: 'var(--color-text-3)', fontSize: 13,
}

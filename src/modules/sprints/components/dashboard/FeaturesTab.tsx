import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSprintStore } from '../../store/sprintStore'
import type { Feature, TestCase, TestCaseStatus, TestCaseComplexity } from '../../types/sprint.types'
import { parseFeatureText, parseCSVText } from '../../services/importService'
import { exportCoverage, exportSuiteAsCSV } from '../../services/exportService'
import { sprintDayToDate, dateToSprintDayKey } from '../../services/persistence'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { showToast } from '@/app/components/Toast'
import { NewBugModal } from '@/app/components/NewBugModal'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FEATURE_TEMPLATE = `# language: pt
# Template de importação — .feature (Gherkin)
# Cada "Funcionalidade" vira uma funcionalidade na suite.
# Cada "Cenário" vira um caso de teste dentro dela.
# Remova este cabeçalho de comentários antes de importar.

Funcionalidade: Login do Usuário

  Cenário: Login com credenciais válidas
    Dado que estou na página de login
    Quando preencho email e senha válidos
    E clico em "Entrar"
    Então sou redirecionado para o dashboard

  Cenário: Login com senha incorreta
    Dado que estou na página de login
    Quando preencho email válido e senha incorreta
    E clico em "Entrar"
    Então vejo a mensagem "Credenciais inválidas"

Funcionalidade: Cadastro de Sprint

  Cenário: Criar sprint com dados obrigatórios
    Dado que estou na listagem de sprints
    Quando clico em "Nova Sprint"
    E preencho título, datas e squad
    E confirmo a criação
    Então a sprint aparece na lista
`

const CSV_TEMPLATE = `Funcionalidade,Cenário,Complexidade,Gherkin
Login do Usuário,Login com credenciais válidas,Moderada,"Dado que estou na página de login
Quando preencho email e senha válidos
Então sou redirecionado para o dashboard"
Login do Usuário,Login com senha incorreta,Baixa,"Dado que estou na página de login
Quando preencho senha incorreta
Então vejo mensagem de erro"
Cadastro de Sprint,Criar sprint com dados obrigatórios,Alta,"Dado que estou na listagem
Quando clico em Nova Sprint
E preencho os campos
Então a sprint aparece na lista"
`

function downloadTemplate(type: 'feature' | 'csv') {
  const content = type === 'feature' ? FEATURE_TEMPLATE : CSV_TEMPLATE
  const filename = type === 'feature' ? 'template-importacao.feature' : 'template-importacao.csv'
  const mime = type === 'feature' ? 'text/plain' : 'text/csv'
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function dayKeyToDate(dayKey: string, startDate: string, excludeWeekends: boolean): string {
  if (!dayKey || !startDate) return ''
  const n = parseInt(dayKey.replace('D', ''))
  if (isNaN(n) || n < 1) return ''
  return sprintDayToDate(startDate, n, excludeWeekends).toISOString().split('T')[0]
}

function dateToDayKey(dateStr: string, startDate: string, sprintDays: number, excludeWeekends: boolean): string | null {
  if (!dateStr || !startDate) return null
  return dateToSprintDayKey(dateStr, startDate, sprintDays, excludeWeekends)
}

const STATUS_COLORS: Record<string, string> = {
  Pendente: 'var(--color-text-3)',
  Concluído: 'var(--color-green-mid)',
  Falhou: 'var(--color-red-mid)',
  Bloqueado: 'var(--color-amber-mid)',
}

const STATUS_TEXT_COLORS: Record<string, string> = {
  Pendente: 'var(--color-text-2)',
  Concluído: 'var(--color-green)',
  Falhou: 'var(--color-red)',
  Bloqueado: 'var(--color-amber)',
}

const COMPLEXITY_COLORS: Record<string, string> = {
  Baixa: 'var(--color-green-mid)',
  Moderada: 'var(--color-amber-mid)',
  Alta: 'var(--color-red-mid)',
}

// ─── SVG icon components ──────────────────────────────────────────────────────

function IconExportCSV() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 11v1.5A1.5 1.5 0 003.5 14h8A1.5 1.5 0 0013 12.5V11"/><path d="M7.5 1v8m0 0L5 6.5m2.5 2.5L10 6.5"/>
    </svg>
  )
}

function IconChart() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="8" width="3" height="6" rx="1"/><rect x="6" y="4" width="3" height="10" rx="1"/><rect x="11" y="1" width="3" height="13" rx="1"/>
    </svg>
  )
}

function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 2.5l2 2L5 12H3v-2L10.5 2.5z"/>
    </svg>
  )
}

function IconDuplicate() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 10H2a1 1 0 01-1-1V2a1 1 0 011-1h7a1 1 0 011 1v1"/>
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4h13M5 4V2h5v2M6 7v5M9 7v5M2 4l1 9a1 1 0 001 1h7a1 1 0 001-1l1-9"/>
    </svg>
  )
}

function IconClone() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="9" height="9" rx="1.5"/><path d="M3 10H2a1 1 0 01-1-1V2a1 1 0 011-1h7a1 1 0 011 1v1"/>
    </svg>
  )
}

function IconAttach() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.5L6.5 12A3.5 3.5 0 011.5 7L7 1.5A2 2 0 0110 4.5L5 9.5A.5.5 0 014 9l4.5-4.5"/>
    </svg>
  )
}

// ─── New icons for UX reform (Lucide paths) ──────────────────────────────────
function Svg14({ children, rotate }: { children: React.ReactNode; rotate?: number }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
      style={rotate != null ? { transform: `rotate(${rotate}deg)`, transition: 'transform 0.15s' } : undefined}
    >{children}</svg>
  )
}
function IconChevron({ open }: { open: boolean }) {
  return <Svg14 rotate={open ? 90 : 0}><polyline points="9 18 15 12 9 6" /></Svg14>
}
function IconPlus() {
  return <Svg14><path d="M12 5v14M5 12h14" /></Svg14>
}
function IconMoreHoriz() {
  return <Svg14><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></Svg14>
}
function IconDownload() {
  return <Svg14><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></Svg14>
}
function IconFileText() {
  return <Svg14><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></Svg14>
}
function IconBarChart3() {
  return <Svg14><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></Svg14>
}
function IconPencil() {
  return <Svg14><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></Svg14>
}
function IconCopy() {
  return <Svg14><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Svg14>
}
function IconTrash2() {
  return <Svg14><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Svg14>
}
function IconFlask() {
  return (
    <Svg14>
      <path d="M10 2v7.31" />
      <path d="M14 9.3V1.99" />
      <path d="M8.5 2h7" />
      <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
      <path d="M5.52 16h12.96" />
    </Svg14>
  )
}
function IconGripDots() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/>
      <circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/>
      <circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/>
    </svg>
  )
}
function IconChevronDownSm() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.6, marginLeft: 2 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ─── Dropdown hook (outside click + Escape) ──────────────────────────────────
function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])
  return { open, setOpen, ref }
}

// ─── MetricChip, StackedProgressBar, Menu ────────────────────────────────────
type ChipTone = 'neutral' | 'ok' | 'warn' | 'danger'
const chipTones: Record<ChipTone, { bg: string; color: string; border: string; numColor: string }> = {
  neutral: { bg: 'var(--color-bg)', color: 'var(--color-text-2)', border: 'var(--color-border)', numColor: 'var(--color-text)' },
  ok: { bg: 'var(--color-green-light)', color: 'var(--color-green)', border: 'transparent', numColor: 'var(--color-green)' },
  warn: { bg: 'var(--color-amber-light)', color: 'var(--color-amber)', border: 'transparent', numColor: 'var(--color-amber)' },
  danger: { bg: 'var(--color-red-light)', color: 'var(--color-red)', border: 'transparent', numColor: 'var(--color-red)' },
}
function MetricChip({ tone = 'neutral', num, label, ariaLabel }: { tone?: ChipTone; num: number; label: string; ariaLabel: string }) {
  const t = chipTones[tone]
  return (
    <span
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 9px', borderRadius: 999,
        fontSize: 11, fontWeight: 600,
        background: t.bg, color: t.color,
        border: `1px solid ${t.border}`,
        fontFamily: 'var(--font-family-sans)',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span style={{ fontWeight: 700, color: t.numColor }}>{num}</span>
      {label}
    </span>
  )
}

function StackedProgressBar({ done, failed, blocked, total }: { done: number; failed: number; blocked: number; total: number }) {
  if (total === 0) return null
  const pct = (n: number) => (n / total) * 100
  const execPct = Math.round(((done + failed + blocked) / total) * 100)
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
      role="img"
      aria-label={`${done} de ${total} executados com sucesso. ${failed} falharam, ${blocked} bloqueados. ${execPct}% executados.`}
    >
      <span
        style={{
          position: 'relative',
          width: 140, height: 8,
          background: 'var(--color-surface-2)',
          borderRadius: 999,
          overflow: 'hidden',
          display: 'flex',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {done > 0 && <span style={{ width: `${pct(done)}%`, background: 'var(--color-green)' }} />}
        {failed > 0 && <span style={{ width: `${pct(failed)}%`, background: 'var(--color-red)' }} />}
        {blocked > 0 && <span style={{ width: `${pct(blocked)}%`, background: 'var(--color-amber)' }} />}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)', fontVariantNumeric: 'tabular-nums' }}>
        <b style={{ color: 'var(--color-text)', fontWeight: 700 }}>{done}</b>/{total}
      </span>
    </span>
  )
}

// Menu primitives (shared styles)
const menuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  right: 0,
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  boxShadow: '0 12px 32px rgba(17,24,39,.10), 0 2px 6px rgba(17,24,39,.05)',
  minWidth: 240,
  padding: 6,
  zIndex: 500,
}
const menuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 10px',
  width: '100%',
  fontSize: 13, fontWeight: 500,
  color: 'var(--color-text)',
  background: 'transparent',
  border: 'none', borderRadius: 6,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'var(--font-family-sans)',
  transition: 'background 0.12s',
}
const menuItemDangerStyle: React.CSSProperties = {
  ...menuItemStyle,
  color: 'var(--color-red)',
}
const menuLabelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700,
  color: 'var(--color-text-3)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  padding: '6px 10px 2px',
}
const menuSepStyle: React.CSSProperties = {
  height: 1, background: 'var(--color-border)', margin: '4px 2px',
}

// Ghost action button with hover
function ActionBtn({ onClick, title, children, danger, 'aria-label': ariaLabel }: React.PropsWithChildren<{ onClick?: () => void; title?: string; danger?: boolean; 'aria-label'?: string }>) {
  return (
    <>
      <button
        onClick={onClick}
        title={title}
        aria-label={ariaLabel}
        className={danger ? 'feat-action-btn-danger' : 'feat-action-btn'}
        style={{
          background: 'none',
          border: 'none',
          padding: 8,
          minWidth: 32,
          minHeight: 32,
          borderRadius: 8,
          cursor: 'pointer',
          color: 'var(--color-text-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s, color 0.15s',
          flexShrink: 0,
        }}
      >
        {children}
      </button>
      <style>{`
        .feat-action-btn:hover { background: var(--color-bg) !important; }
        .feat-action-btn-danger:hover { background: var(--color-red-light) !important; color: var(--color-red) !important; }
      `}</style>
    </>
  )
}

// ─── FeaturesTab ─────────────────────────────────────────────────────────────

interface FeaturesTabProps {
  isIntegrated?: boolean
  availableSquads?: Array<{ id: string; name: string }>
}

export function FeaturesTab({ isIntegrated, availableSquads }: FeaturesTabProps = {}) {
  const state = useSprintStore((s) => s.state)
  const toggleSuiteFilter = useSprintStore((s) => s.toggleSuiteFilter)
  const clearSuiteFilter = useSprintStore((s) => s.clearSuiteFilter)
  const activeSuiteFilter = useSprintStore((s) => s.activeSuiteFilter)
  const addSuite = useSprintStore((s) => s.addSuite)
  const updateSuite = useSprintStore((s) => s.updateSuite)
  const removeSuite = useSprintStore((s) => s.removeSuite)
  const duplicateSuite = useSprintStore((s) => s.duplicateSuite)
  const addFeature = useSprintStore((s) => s.addFeature)

  const suites = state.suites ?? []
  const hasFilter = activeSuiteFilter.size > 0

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createName, setCreateName] = useState('')

  function handleCreateSuite() {
    const trimmed = createName.trim()
    addSuite()
    // addSuite appends to state.suites — update the last one with the chosen name
    const latest = useSprintStore.getState().state
    const lastIdx = latest.suites.length - 1
    if (lastIdx >= 0) {
      updateSuite(lastIdx, 'name', trimmed || 'Sem nome')
    }
    setCreateName('')
    setCreateModalOpen(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Suite Filter + Management */}
      {suites.length >= 2 && (
        <div
          role="toolbar"
          aria-label="Filtro de suites"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 14px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10 }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', flexShrink: 0 }}>
            Filtrar:
          </span>
          {suites.map((suite) => {
            const active = activeSuiteFilter.size === 0 || activeSuiteFilter.has(String(suite.id))
            const count = state.features.filter((f) => String(f.suiteId) === String(suite.id)).length
            return (
              <button
                key={suite.id}
                onClick={() => toggleSuiteFilter(String(suite.id))}
                aria-pressed={active}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 999,
                  border: active ? '1px solid var(--color-blue)' : '1px solid var(--color-border)',
                  background: active ? 'var(--color-blue-light)' : 'var(--color-bg)',
                  color: active ? 'var(--color-blue)' : 'var(--color-text-2)',
                  fontWeight: 500, fontSize: 12, cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                  fontFamily: 'var(--font-family-sans)',
                }}
              >
                {suite.name || 'Suite'}
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 18, height: 16, padding: '0 5px',
                    fontSize: 10, fontWeight: 700,
                    background: active ? 'var(--color-blue)' : 'var(--color-surface)',
                    color: active ? '#fff' : 'var(--color-text-2)',
                    borderRadius: 8,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
          {hasFilter && (
            <button
              onClick={clearSuiteFilter}
              style={{
                marginLeft: 'auto',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, padding: '4px 10px', borderRadius: 6,
                border: 'none', background: 'transparent',
                color: 'var(--color-text-2)',
                cursor: 'pointer', fontWeight: 500, fontFamily: 'var(--font-family-sans)',
              }}
            >
              Limpar
            </button>
          )}
        </div>
      )}

      {/* Suite management — oculto em sprints integradas (suites = squads automáticos) */}
      {!isIntegrated && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={() => { setCreateName(''); setCreateModalOpen(true) }}
            style={btnPrimaryFilled}
            aria-label="Criar nova suite"
          >
            <IconPlus /> Nova Suite
          </button>
        </div>
      )}

      {/* Create Suite Modal */}
      {createModalOpen && createPortal(
        <div
          onClick={(e) => e.target === e.currentTarget && setCreateModalOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nova Suite"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '3px solid var(--color-blue)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>
              Nova Suite
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Dê um nome para a nova suite de testes. Você pode editar depois.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                htmlFor="new-suite-name"
                style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}
              >
                Nome da suite
              </label>
              <input
                id="new-suite-name"
                autoFocus
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ex: API · Mobile · Regressão"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleCreateSuite() }
                  else if (e.key === 'Escape') setCreateModalOpen(false)
                }}
                style={{ padding: '8px 10px', border: '1px solid var(--color-border-md)', borderRadius: 8, fontSize: 14, color: 'var(--color-text)', background: 'var(--color-bg)', fontFamily: 'var(--font-family-sans)', boxSizing: 'border-box', width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid var(--color-border-md)', background: 'transparent', color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSuite}
                style={btnPrimaryFilled}
                aria-label="Criar suite"
              >
                <IconPlus /> Criar Suite
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Suites with features */}
      {suites.map((suite, sIndex) => (
        <SuiteAccordion
          key={suite.id}
          suiteId={suite.id}
          suiteName={suite.name}
          suiteIndex={sIndex}
          onRename={(name) => updateSuite(sIndex, 'name', name)}
          onRemove={() => removeSuite(sIndex)}
          onDuplicate={() => duplicateSuite(sIndex)}
          onAddFeature={() => {
            addFeature(suite.id)
            // Auto-set squadId for integrated sprints based on suite name matching squad
            if (isIntegrated && availableSquads) {
              const matchingSquad = availableSquads.find((sq) => sq.name.toLowerCase() === suite.name.toLowerCase())
              if (matchingSquad) {
                const { state: s } = useSprintStore.getState()
                const suiteFeatures = s.features.filter(f => String(f.suiteId) === String(suite.id))
                const lastIdx = s.features.lastIndexOf(suiteFeatures[suiteFeatures.length - 1])
                if (lastIdx >= 0) {
                  useSprintStore.getState().updateFeature(lastIdx, 'squadId', matchingSquad.id)
                }
              }
            }
          }}
          isIntegrated={isIntegrated}
          availableSquads={availableSquads}
        />
      ))}
    </div>
  )
}

// ─── Template buttons (inline, no dropdown) ─────────────────────────────────

const templateBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px',
  border: '1px solid var(--color-border-md)', borderRadius: 8,
  background: 'var(--color-bg)', color: 'var(--color-text-2)',
  fontWeight: 600, fontSize: 12, cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)', whiteSpace: 'nowrap',
}

// ─── SuiteAccordion ───────────────────────────────────────────────────────────

function SuiteAccordion({
  suiteId, suiteName, suiteIndex, onRename, onRemove, onDuplicate, onAddFeature, isIntegrated, availableSquads,
}: {
  suiteId: number | string
  suiteName: string
  suiteIndex: number
  onRename: (name: string) => void
  onRemove: () => void
  onDuplicate: () => void
  onAddFeature: () => void
  isIntegrated?: boolean
  availableSquads?: Array<{ id: string; name: string }>
}) {
  const [open, setOpen] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(suiteName)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const kebabDrop = useDropdown()
  const importDrop = useDropdown()
  const state = useSprintStore((s) => s.state)
  const activeSuiteFilter = useSprintStore((s) => s.activeSuiteFilter)
  const importFeatures = useSprintStore((s) => s.importFeatures)
  const reorderFeatures = useSprintStore((s) => s.reorderFeatures)
  const importInputRef = useRef<HTMLInputElement>(null)

  const suiteFeatures = state.features.map((f, i) => ({ f, i }))
    .filter(({ f }) => String(f.suiteId) === String(suiteId))

  // Apply suite filter
  const isVisible = activeSuiteFilter.size === 0 || activeSuiteFilter.has(String(suiteId))
  if (!isVisible) return null

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const name = file.name.toLowerCase()
    if (name.endsWith('.feature')) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const result = parseFeatureText(ev.target!.result as string, suiteId)
          if (result.totalScenarios === 0) { showToast('Nenhum cenário encontrado no arquivo.', 'error'); return }
          importFeatures(suiteId, result.features)
          showToast(`${result.totalScenarios} cenário(s) importado(s) em ${result.features.length} funcionalidade(s)`, 'success')
        } catch (err: unknown) {
          showToast(String(err instanceof Error ? err.message : err), 'error')
        }
      }
      reader.readAsText(file)
    } else if (name.endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const result = parseCSVText(ev.target!.result as string, suiteId)
          importFeatures(suiteId, result.features)
          showToast(`${result.totalScenarios} cenário(s) importado(s) de CSV`, 'success')
        } catch (err: unknown) {
          showToast(String(err instanceof Error ? err.message : err), 'error')
        }
      }
      reader.readAsText(file, 'UTF-8')
    } else {
      showToast('Formato não suportado. Use: .feature ou .csv', 'error')
    }
    if (importInputRef.current) importInputRef.current.value = ''
  }

  const totalTests = suiteFeatures.reduce((a, { f }) => a + (f.tests || 0), 0)
  const totalExec = suiteFeatures.reduce((a, { f }) => a + (f.exec || 0), 0)
  const blockedCount = suiteFeatures.filter(({ f }) => f.status === 'Bloqueada').length

  const suiteBodyId = `suite-body-${suiteId}`
  const suiteDisplayName = suiteName || 'Suite sem nome'
  const featureCount = suiteFeatures.length
  const isEmpty = featureCount === 0

  function toggleOpen() { setOpen((o) => !o) }
  function startRename() { setNameVal(suiteName); setEditingName(true) }
  function handleReorderKey(domIdx: number, direction: -1 | 1) {
    const target = domIdx + direction
    if (target < 0 || target >= suiteFeatures.length) return
    reorderFeatures(suiteId, domIdx, target)
  }

  return (
    <div
      role="region"
      aria-label={suiteDisplayName}
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'visible', transition: 'border-color 0.12s' }}
    >
      {/* Suite header */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={suiteBodyId}
        aria-label={`Suite ${suiteDisplayName}. ${open ? 'Recolher' : 'Expandir'}.`}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if ((e.target as HTMLElement).closest('[data-stop-header-key]')) return
            e.preventDefault()
            toggleOpen()
          }
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px',
          background: 'var(--color-surface)',
          borderBottom: open ? '1px solid var(--color-border)' : 'none',
          cursor: 'pointer', userSelect: 'none', flexWrap: 'wrap',
          outline: 'none',
        }}
      >
        {/* Chevron */}
        <span
          aria-hidden="true"
          style={{
            width: 28, height: 28,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-2)', borderRadius: 6, flexShrink: 0,
          }}
        >
          <IconChevron open={open} />
        </span>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <span
            aria-hidden="true"
            style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--color-blue)', flexShrink: 0 }}
          />
          {editingName ? (
            <input
              autoFocus
              type="text"
              value={nameVal}
              data-stop-header-key
              aria-label="Nome da suite"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={() => { onRename(nameVal); setEditingName(false) }}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') { onRename(nameVal); setEditingName(false) }
                else if (e.key === 'Escape') { setNameVal(suiteName); setEditingName(false) }
              }}
              style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', border: '1px solid var(--color-border-md)', borderRadius: 6, padding: '2px 8px', fontFamily: 'var(--font-family-sans)', background: 'var(--color-surface)' }}
            />
          ) : (
            <>
              <strong
                onDoubleClick={(e) => { e.stopPropagation(); startRename() }}
                title="Clique duas vezes para renomear"
                style={{
                  fontSize: 15, fontWeight: 700, color: 'var(--color-text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: 320,
                }}
              >
                {suiteDisplayName}
              </strong>
              <button
                type="button"
                data-stop-header-key
                onClick={(e) => { e.stopPropagation(); startRename() }}
                aria-label={`Renomear suite ${suiteDisplayName}`}
                title="Renomear"
                className="suite-rename-btn"
                style={{
                  width: 26, height: 26,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 6,
                  color: 'var(--color-text-3)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.12s, color 0.12s, border-color 0.12s',
                }}
              >
                <IconPencil />
              </button>
            </>
          )}
        </div>

        {/* Metric chips */}
        <div
          onClick={(e) => e.stopPropagation()}
          role="group"
          aria-label="Métricas da suite"
          style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}
        >
          <MetricChip
            num={featureCount}
            label={featureCount === 1 ? 'func.' : 'func.'}
            ariaLabel={`${featureCount} ${featureCount === 1 ? 'funcionalidade' : 'funcionalidades'}`}
          />
          <MetricChip
            num={totalTests}
            label="testes"
            ariaLabel={`${totalTests} ${totalTests === 1 ? 'teste no total' : 'testes no total'}`}
          />
          <MetricChip
            tone={totalExec > 0 ? 'ok' : 'neutral'}
            num={totalExec}
            label="exec."
            ariaLabel={`${totalExec} ${totalExec === 1 ? 'teste executado' : 'testes executados'}`}
          />
          {blockedCount > 0 && (
            <MetricChip
              tone="danger"
              num={blockedCount}
              label={blockedCount === 1 ? 'bloqueada' : 'bloqueadas'}
              ariaLabel={`${blockedCount} ${blockedCount === 1 ? 'funcionalidade bloqueada' : 'funcionalidades bloqueadas'}`}
            />
          )}
        </div>

        {/* Kebab dropdown */}
        <div ref={kebabDrop.ref} onClick={(e) => e.stopPropagation()} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            data-stop-header-key
            onClick={() => kebabDrop.setOpen((v) => !v)}
            aria-label="Mais ações da suite"
            aria-haspopup="menu"
            aria-expanded={kebabDrop.open}
            className="suite-kebab-btn"
            style={{
              width: 32, height: 32,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 8,
              color: 'var(--color-text-2)',
              cursor: 'pointer',
              transition: 'background 0.12s, border-color 0.12s, color 0.12s',
            }}
          >
            <IconMoreHoriz />
          </button>
          {kebabDrop.open && (
            <div role="menu" style={menuStyle}>
              <div style={menuLabelStyle}>Exportar</div>
              <button
                role="menuitem"
                className="suite-menu-item"
                style={menuItemStyle}
                onClick={() => {
                  kebabDrop.setOpen(false)
                  const sFeatures = state.features.filter((f) => String(f.suiteId) === String(suiteId))
                  exportSuiteAsCSV(suiteName, sFeatures)
                }}
              >
                <IconDownload /> Baixar CSV (casos)
              </button>
              <button
                role="menuitem"
                className="suite-menu-item"
                style={menuItemStyle}
                onClick={() => {
                  kebabDrop.setOpen(false)
                  exportCoverage({ ...state, suites: [{ id: suiteId, name: suiteName }] })
                }}
              >
                <IconBarChart3 /> Baixar cobertura
              </button>
              <div style={menuSepStyle} />
              <button
                role="menuitem"
                className="suite-menu-item"
                style={menuItemStyle}
                onClick={() => { kebabDrop.setOpen(false); startRename() }}
              >
                <IconPencil /> Renomear
              </button>
              <button
                role="menuitem"
                className="suite-menu-item"
                style={menuItemStyle}
                onClick={() => { kebabDrop.setOpen(false); onDuplicate() }}
              >
                <IconCopy /> Duplicar
              </button>
              <div style={menuSepStyle} />
              <button
                role="menuitem"
                className="suite-menu-item-danger"
                style={menuItemDangerStyle}
                onClick={() => { kebabDrop.setOpen(false); setConfirmRemove(true) }}
              >
                <IconTrash2 /> Excluir suite
              </button>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div id={suiteBodyId} style={{ padding: '16px 18px 18px' }}>
          {isEmpty ? (
            <SuiteEmptyState
              onAddFeature={onAddFeature}
              onImportClick={() => importInputRef.current?.click()}
            />
          ) : (
            suiteFeatures.map(({ f, i }, domIdx) => (
              <div
                key={f.id}
                draggable
                onDragStart={(e) => { setDragIdx(domIdx); e.dataTransfer.effectAllowed = 'move' }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverIdx(domIdx) }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragIdx !== null && dragIdx !== domIdx) reorderFeatures(suiteId, dragIdx, domIdx)
                  setDragIdx(null); setDragOverIdx(null)
                }}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                style={{
                  opacity: dragIdx === domIdx ? 0.4 : 1,
                  outline: dragOverIdx === domIdx && dragIdx !== domIdx ? '2px dashed var(--color-blue)' : 'none',
                  outlineOffset: 2,
                  borderRadius: 8,
                  transition: 'opacity 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <button
                    aria-label={`Reordenar "${f.name || 'funcionalidade'}" (use setas ↑ e ↓ no teclado)`}
                    title="Arraste ou use ↑/↓"
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') { e.preventDefault(); handleReorderKey(domIdx, -1) }
                      else if (e.key === 'ArrowDown') { e.preventDefault(); handleReorderKey(domIdx, 1) }
                    }}
                    className="suite-drag-handle"
                    style={{
                      width: 28, height: 28,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: 10,
                      background: 'transparent', border: 'none', borderRadius: 6,
                      color: 'var(--color-text-3)',
                      cursor: 'grab', flexShrink: 0,
                      transition: 'background 0.12s, color 0.12s',
                    }}
                  >
                    <IconGripDots />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <FeatureAccordion feature={f} featureIndex={i} isIntegrated={isIntegrated} availableSquads={availableSquads} />
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Footer actions (when suite has features) */}
          {!isEmpty && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--color-border)' }}>
              <button
                onClick={(e) => { e.stopPropagation(); onAddFeature() }}
                aria-label="Adicionar nova funcionalidade"
                className="suite-add-feature"
                style={{
                  flex: 1, height: 40,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: 'var(--color-blue-light)',
                  color: 'var(--color-blue)',
                  border: '1px dashed var(--color-blue)',
                  borderRadius: 8,
                  fontWeight: 600, fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family-sans)',
                  transition: 'background 0.12s, color 0.12s, border-style 0.12s',
                }}
              >
                <IconPlus /> Adicionar Funcionalidade
              </button>

              <div ref={importDrop.ref} style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={() => importDrop.setOpen((v) => !v)}
                  aria-label="Opções de importação"
                  aria-haspopup="menu"
                  aria-expanded={importDrop.open}
                  style={btnOutlineNeutral}
                >
                  <IconDownload /> Importar <IconChevronDownSm />
                </button>
                {importDrop.open && (
                  <div role="menu" style={menuStyle}>
                    <button
                      role="menuitem"
                      className="suite-menu-item"
                      style={menuItemStyle}
                      onClick={() => { importDrop.setOpen(false); importInputRef.current?.click() }}
                    >
                      <IconFileText />
                      Importar arquivo
                      <span style={{ marginLeft: 'auto', color: 'var(--color-text-3)', fontSize: 11 }}>.feature · .csv</span>
                    </button>
                    <div style={menuSepStyle} />
                    <div style={menuLabelStyle}>Baixar template</div>
                    <button
                      role="menuitem"
                      className="suite-menu-item"
                      style={menuItemStyle}
                      onClick={() => { importDrop.setOpen(false); downloadTemplate('feature') }}
                    >
                      <IconDownload /> Template .feature (Gherkin)
                    </button>
                    <button
                      role="menuitem"
                      className="suite-menu-item"
                      style={menuItemStyle}
                      onClick={() => { importDrop.setOpen(false); downloadTemplate('csv') }}
                    >
                      <IconDownload /> Template .csv
                    </button>
                  </div>
                )}
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".feature,.csv"
                  style={{ display: 'none' }}
                  onChange={handleImport}
                />
              </div>
            </div>
          )}

          {/* Hidden file input also for empty state */}
          {isEmpty && (
            <input
              ref={importInputRef}
              type="file"
              accept=".feature,.csv"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          )}
        </div>
      )}

      <style>{`
        .suite-kebab-btn:hover { background: var(--color-bg); border-color: var(--color-border); color: var(--color-text); }
        .suite-drag-handle:hover, .suite-drag-handle:focus { background: var(--color-surface-2); color: var(--color-text-2); outline: none; }
        .suite-menu-item:hover { background: var(--color-bg); }
        .suite-menu-item-danger:hover { background: var(--color-red-light); }
        .suite-add-feature:hover { background: var(--color-blue); color: #fff; border-style: solid; }
        .suite-rename-btn:hover { background: var(--color-bg); color: var(--color-text); border-color: var(--color-border); }
      `}</style>

      {confirmRemove && (
        <ConfirmModal
          title="Excluir Suite"
          description={`Tem certeza que deseja excluir a suite "${suiteName || 'Sem nome'}" e todas as suas funcionalidades? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir Suite"
          onConfirm={() => { onRemove(); setConfirmRemove(false) }}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </div>
  )
}

// ─── SuiteEmptyState ──────────────────────────────────────────────────────────

function SuiteEmptyState({ onAddFeature, onImportClick }: { onAddFeature: () => void; onImportClick: () => void }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '28px 16px',
        border: '1px dashed var(--color-border-md)',
        borderRadius: 10,
        background: 'var(--color-bg)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 48, height: 48,
          margin: '0 auto 10px',
          borderRadius: 12,
          background: 'var(--color-blue-light)',
          color: 'var(--color-blue)',
          display: 'grid', placeItems: 'center',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2v7.31" /><path d="M14 9.3V1.99" /><path d="M8.5 2h7" /><path d="M14 9.3a6.5 6.5 0 1 1-4 0" /><path d="M5.52 16h12.96" />
        </svg>
      </div>
      <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
        Nenhuma funcionalidade ainda
      </h4>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
        Crie manualmente ou importe um arquivo <code style={{ background: 'var(--color-surface-2)', padding: '1px 5px', borderRadius: 4, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>.feature</code> ou <code style={{ background: 'var(--color-surface-2)', padding: '1px 5px', borderRadius: 4, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>.csv</code> para começar.
      </p>
      <div style={{ display: 'inline-flex', gap: 8 }}>
        <button onClick={onAddFeature} style={btnPrimaryFilled} aria-label="Adicionar nova funcionalidade">
          <IconPlus /> Adicionar Funcionalidade
        </button>
        <button onClick={onImportClick} style={btnOutlineNeutral} aria-label="Importar arquivo .feature ou .csv">
          <IconDownload /> Importar arquivo
        </button>
      </div>
    </div>
  )
}

// ─── FeatureAccordion ─────────────────────────────────────────────────────────

function FeatureAccordion({ feature, featureIndex, isIntegrated, availableSquads }: { feature: Feature; featureIndex: number; isIntegrated?: boolean; availableSquads?: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [blockModal, setBlockModal] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [cancelModal, setCancelModal] = useState(false)
  const [cancelAlignment, setCancelAlignment] = useState('')
  const state = useSprintStore((s) => s.state)
  const updateFeature = useSprintStore((s) => s.updateFeature)
  const removeFeature = useSprintStore((s) => s.removeFeature)
  const addTestCase = useSprintStore((s) => s.addTestCase)
  const addAlignmentFull = useSprintStore((s) => s.addAlignmentFull)
  const setMockupImage = useSprintStore((s) => s.setMockupImage)
  const removeMockupImage = useSprintStore((s) => s.removeMockupImage)

  const isBlocked = feature.status === 'Bloqueada'
  const isCancelled = feature.status === 'Cancelada'
  const startDate = state.config.startDate || ''
  const cases = feature.cases ?? []
  const activeFilter = feature.activeFilter || 'Todos'

  const statusBg = isBlocked ? 'var(--color-red-light)' : isCancelled ? 'var(--color-surface-2)' : undefined
  const statusBorder = isBlocked ? 'var(--color-red-mid)' : isCancelled ? 'var(--color-border-md)' : 'var(--color-border)'

  function handleMockupUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { showToast('Tipo de arquivo não permitido. Use PNG, JPG, WebP ou GIF.', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('Imagem muito grande. Máximo 5MB.', 'error'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ev.target?.result) setMockupImage(featureIndex, ev.target.result as string)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div
      style={{
        border: `1px solid ${statusBorder}`,
        borderRadius: 8,
        marginBottom: 10,
        background: statusBg ?? 'var(--color-surface)',
        opacity: isCancelled ? 0.75 : 1,
        overflow: 'hidden',
      }}
    >
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: '10px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: statusBg ?? 'var(--color-bg)',
          borderBottom: open ? `1px solid ${statusBorder}` : 'none',
          userSelect: 'none',
          gap: 8,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            aria-hidden="true"
            style={{
              width: 20, height: 20,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-text-3)',
              flexShrink: 0,
            }}
          >
            <IconChevron open={open} />
          </span>
          <span
            style={{
              fontWeight: 600,
              color: isBlocked ? 'var(--color-red)' : isCancelled ? 'var(--color-text-2)' : 'var(--color-text)',
              fontSize: 14,
              textDecoration: isCancelled ? 'line-through' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {feature.name || 'Funcionalidade sem nome'}
          </span>
          {isBlocked && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-red-mid)', flexShrink: 0, display: 'inline-block' }} />}
          {isCancelled && <span style={{ fontSize: 11, background: 'var(--color-surface-2)', color: 'var(--color-text-2)', padding: '2px 7px', borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>Cancelada</span>}
          {isIntegrated && availableSquads && availableSquads.length > 0 && (
            <select
              value={feature.squadId ?? ''}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation()
                updateFeature(featureIndex, 'squadId', e.target.value || undefined)
              }}
              style={{
                ...selectSm,
                width: 'auto',
                minWidth: 120,
                maxWidth: 180,
                fontSize: 11,
                padding: '3px 22px 3px 6px',
                flexShrink: 0,
                color: feature.squadId ? 'var(--color-blue)' : 'var(--color-text-3)',
                fontWeight: feature.squadId ? 600 : 400,
              }}
            >
              <option value="">Squad...</option>
              {availableSquads.map((sq) => (
                <option key={sq.id} value={sq.id}>{sq.name}</option>
              ))}
            </select>
          )}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Stacked progress bar */}
          {cases.length > 0 && (() => {
            const done = cases.filter(c => c.status === 'Concluído').length
            const failed = cases.filter(c => c.status === 'Falhou').length
            const blocked = cases.filter(c => c.status === 'Bloqueado').length
            return <StackedProgressBar done={done} failed={failed} blocked={blocked} total={cases.length} />
          })()}
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', flexShrink: 0 }}>
            {feature.tests} Testes
          </span>
        </span>
      </div>

      {/* Feature body */}
      {open && <div style={{ padding: '14px 16px' }}>
        {/* Feature settings */}
        <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flexGrow: 1, minWidth: 200 }}>
              <label style={labelSm}>Nome da Funcionalidade</label>
              <input
                type="text"
                value={feature.name}
                onChange={(e) => updateFeature(featureIndex, 'name', e.target.value)}
                placeholder="Ex: Tela de Login"
                style={inputSm}
              />
            </div>
            <div style={{ width: 160 }}>
              <label style={labelSm}>Status</label>
              <select
                value={feature.status}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === 'Bloqueada') {
                    setBlockReason('')
                    setBlockModal(true)
                  } else if (val === 'Cancelada') {
                    setCancelAlignment('')
                    setCancelModal(true)
                  } else {
                    updateFeature(featureIndex, 'status', val)
                    if (val === 'Ativa') updateFeature(featureIndex, 'blockReason', '')
                  }
                }}
                style={{
                  ...selectSm,
                  fontWeight: 700,
                  color: isBlocked ? 'var(--color-red)' : isCancelled ? 'var(--color-text-2)' : 'var(--color-green)',
                }}
              >
                <option value="Ativa">Ativa</option>
                <option value="Bloqueada">Bloqueada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
            {(isBlocked || isCancelled) && (
              <div style={{ flexGrow: 1, minWidth: 200 }}>
                <label style={labelSm}>{isBlocked ? 'Motivo do Bloqueio' : 'Motivo do Cancelamento'}</label>
                <input
                  type="text"
                  value={feature.blockReason}
                  onChange={(e) => updateFeature(featureIndex, 'blockReason', e.target.value)}
                  placeholder="Descreva o motivo…"
                  style={inputSm}
                />
              </div>
            )}
            <ActionBtn onClick={() => setConfirmRemove(true)} title="Excluir funcionalidade" danger aria-label="Excluir funcionalidade">
              <IconTrash />
            </ActionBtn>
          </div>

          {/* Mockup */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            <label style={{ ...labelSm, flexShrink: 0, margin: 0 }}>Imagem de Referência</label>
            {feature.mockupImage ? (
              <>
                <img
                  src={feature.mockupImage}
                  alt="Mockup"
                  style={{ height: 60, width: 'auto', maxWidth: 120, borderRadius: 6, border: '1px solid var(--color-border)', objectFit: 'contain', background: '#fff', cursor: 'zoom-in' }}
                />
                <label style={{ fontSize: 12, color: 'var(--color-blue)', cursor: 'pointer', fontWeight: 600 }}>
                  🔄 Substituir
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleMockupUpload} />
                </label>
                <button onClick={() => removeMockupImage(featureIndex)} style={{ fontSize: 12, color: 'var(--color-red)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  🗑️ Remover
                </button>
              </>
            ) : (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-2)', cursor: 'pointer', fontWeight: 500, background: 'none', border: '0.5px solid var(--color-border)', padding: '5px 12px', borderRadius: 8, fontFamily: 'var(--font-family-sans)', transition: 'background 0.15s' }}>
                <IconAttach />
                Anexar Mockup
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleMockupUpload} />
              </label>
            )}
          </div>
        </div>

        {/* Test cases */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Cenários Gherkin ({cases.length})
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>Filtrar:</label>
            <select
              value={activeFilter}
              onChange={(e) => updateFeature(featureIndex, 'activeFilter', e.target.value)}
              style={{
                fontSize: 12, padding: '4px 24px 4px 8px', borderRadius: 6,
                border: '1px solid var(--color-border-md)', background: 'var(--color-bg)',
                color: 'var(--color-text)', fontFamily: 'var(--font-family-sans)',
                cursor: 'pointer', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23999'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
              }}
            >
              <option value="Todos">Todos</option>
              <option value="Pendente">Pendentes</option>
              <option value="Concluído">Concluídos</option>
              <option value="Falhou">Falharam</option>
              <option value="Bloqueado">Bloqueados</option>
            </select>
          </div>
        </div>

        {cases.map((tc, ci) => {
          if (activeFilter !== 'Todos' && tc.status !== activeFilter) return null
          return (
            <TestCaseCard
              key={tc.id}
              testCase={tc}
              caseIndex={ci}
              featureIndex={featureIndex}
              featureName={feature.name || ''}
              startDate={startDate}
              endDate={state.config.endDate || ''}
              sprintDays={state.config.sprintDays || 20}
              excludeWeekends={state.config.excludeWeekends ?? true}
              mockupImage={feature.mockupImage}
            />
          )
        })}

        <button
          onClick={() => addTestCase(featureIndex)}
          style={{ width: '100%', marginTop: 8, padding: '10px', border: '2px dashed var(--color-border-md)', borderRadius: 8, background: 'transparent', color: 'var(--color-blue)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}
        >
          + Adicionar Caso de Teste
        </button>
      </div>}

      {blockModal && createPortal(
        <div
          onClick={(e) => e.target === e.currentTarget && setBlockModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div role="dialog" aria-modal="true" aria-label="Bloquear Funcionalidade" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '3px solid var(--color-red)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>🛑 Bloquear Funcionalidade</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Informe o motivo do bloqueio de <strong>"{feature.name || 'Sem nome'}"</strong>. Este campo é obrigatório.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Motivo do Bloqueio *
              </label>
              <textarea
                autoFocus
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Descreva o motivo do bloqueio…"
                rows={3}
                onKeyDown={(e) => { if (e.key === 'Escape') setBlockModal(false) }}
                style={{ padding: '8px 10px', border: '1px solid var(--color-border-md)', borderRadius: 8, fontSize: 13, color: 'var(--color-text)', background: 'var(--color-bg)', fontFamily: 'var(--font-family-sans)', resize: 'vertical', boxSizing: 'border-box', width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setBlockModal(false)}
                style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid var(--color-border-md)', background: 'transparent', color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}
              >
                Cancelar
              </button>
              <button
                disabled={!blockReason.trim()}
                onClick={() => {
                  updateFeature(featureIndex, 'status', 'Bloqueada')
                  updateFeature(featureIndex, 'blockReason', blockReason.trim())
                  setBlockModal(false)
                }}
                style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--color-red)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: blockReason.trim() ? 'pointer' : 'not-allowed', opacity: blockReason.trim() ? 1 : 0.5, fontFamily: 'var(--font-family-sans)' }}
              >
                Confirmar Bloqueio
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {cancelModal && createPortal(
        <div
          onClick={(e) => e.target === e.currentTarget && setCancelModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div role="dialog" aria-modal="true" aria-label="Cancelar Funcionalidade" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '3px solid var(--color-text-3)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 460, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>⛔ Cancelar Funcionalidade</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Registre o alinhamento técnico referente ao cancelamento de <strong>"{feature.name || 'Sem nome'}"</strong>.
              O registro ficará visível na aba <strong>Alinhamentos</strong>.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Alinhamento Técnico *
              </label>
              <textarea
                autoFocus
                value={cancelAlignment}
                onChange={(e) => setCancelAlignment(e.target.value)}
                placeholder={`Ex: Funcionalidade "${feature.name || ''}" cancelada por decisão do PO em alinhamento com o time técnico…`}
                rows={4}
                onKeyDown={(e) => { if (e.key === 'Escape') setCancelModal(false) }}
                style={{ padding: '8px 10px', border: '1px solid var(--color-border-md)', borderRadius: 8, fontSize: 13, color: 'var(--color-text)', background: 'var(--color-bg)', fontFamily: 'var(--font-family-sans)', resize: 'vertical', boxSizing: 'border-box', width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCancelModal(false)}
                style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid var(--color-border-md)', background: 'transparent', color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}
              >
                Voltar
              </button>
              <button
                disabled={!cancelAlignment.trim()}
                onClick={() => {
                  updateFeature(featureIndex, 'status', 'Cancelada')
                  updateFeature(featureIndex, 'blockReason', cancelAlignment.trim())
                  addAlignmentFull(`[Cancelamento] ${feature.name || 'Funcionalidade'}: ${cancelAlignment.trim()}`)
                  setCancelModal(false)
                }}
                style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--color-text-3)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: cancelAlignment.trim() ? 'pointer' : 'not-allowed', opacity: cancelAlignment.trim() ? 1 : 0.5, fontFamily: 'var(--font-family-sans)' }}
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {confirmRemove && (
        <ConfirmModal
          title="Excluir Funcionalidade"
          description={`Tem certeza que deseja excluir "${feature.name || 'Sem nome'}" e todos os seus casos de teste? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir Funcionalidade"
          onConfirm={() => { removeFeature(featureIndex); setConfirmRemove(false) }}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </div>
  )
}

// ─── TestCaseCard ─────────────────────────────────────────────────────────────

function TestCaseCard({
  testCase, caseIndex, featureIndex, featureName, startDate, endDate, sprintDays, excludeWeekends, mockupImage,
}: {
  testCase: TestCase
  caseIndex: number
  featureIndex: number
  featureName: string
  startDate: string
  endDate: string
  sprintDays: number
  excludeWeekends: boolean
  mockupImage: string
}) {
  const updateTestCase = useSprintStore((s) => s.updateTestCase)
  const removeTestCase = useSprintStore((s) => s.removeTestCase)
  const duplicateTestCase = useSprintStore((s) => s.duplicateTestCase)
  const addBugFull = useSprintStore((s) => s.addBugFull)
  const state = useSprintStore((s) => s.state)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [concluindoDate, setConcluindoDate] = useState<string | null>(null)
  const [showBugModal, setShowBugModal] = useState(false)

  const featureNames = state.features.map((f) => f.name).filter(Boolean)
  const knownAssignees = Array.from(new Set(state.bugs.map((b) => b.assignee?.trim()).filter(Boolean) as string[]))
  const knownStacks = Array.from(new Set(state.bugs.map((b) => b.stack).filter(Boolean) as string[]))

  const borderColor = STATUS_COLORS[testCase.status] ?? 'var(--color-blue)'
  const execDateVal = testCase.executionDay && startDate
    ? dayKeyToDate(testCase.executionDay, startDate, excludeWeekends)
    : ''

  function handleDateChange(dateVal: string) {
    if (!dateVal) {
      updateTestCase(featureIndex, caseIndex, 'executionDay', '')
      return
    }
    const dayKey = dateToDayKey(dateVal, startDate, sprintDays, excludeWeekends)
    updateTestCase(featureIndex, caseIndex, 'executionDay', dayKey ?? '')
  }

  function handleStatusChange(newStatus: TestCaseStatus) {
    if (newStatus === 'Concluído') {
      const today = new Date().toISOString().split('T')[0]
      setConcluindoDate(execDateVal || today)
    } else if (newStatus === 'Falhou') {
      updateTestCase(featureIndex, caseIndex, 'status', 'Falhou')
      // Atribuir data de execução automaticamente (o cenário foi executado e falhou)
      if (!testCase.executionDay && startDate) {
        const today = new Date().toISOString().split('T')[0]
        let dayKey = dateToDayKey(today, startDate, sprintDays, excludeWeekends)
        if (!dayKey) {
          const target = new Date(today + 'T00:00:00')
          const start = new Date(startDate + 'T00:00:00')
          dayKey = target < start ? 'D1' : `D${sprintDays}`
        }
        updateTestCase(featureIndex, caseIndex, 'executionDay', dayKey)
      }
      setShowBugModal(true)
    } else {
      updateTestCase(featureIndex, caseIndex, 'status', newStatus)
      // Limpar data de execução ao voltar para Pendente ou Bloqueado
      if (newStatus === 'Pendente' || newStatus === 'Bloqueado') {
        updateTestCase(featureIndex, caseIndex, 'executionDay', '')
      }
    }
  }

  function confirmConcluido() {
    if (!concluindoDate) return
    if (startDate) {
      let dayKey = dateToDayKey(concluindoDate, startDate, sprintDays, excludeWeekends)
      // Se a data está fora do range, clamp ao último dia da sprint
      if (!dayKey) {
        const target = new Date(concluindoDate + 'T00:00:00')
        const start = new Date(startDate + 'T00:00:00')
        dayKey = target < start ? 'D1' : `D${sprintDays}`
      }
      updateTestCase(featureIndex, caseIndex, 'executionDay', dayKey)
    }
    updateTestCase(featureIndex, caseIndex, 'status', 'Concluído')
    setConcluindoDate(null)
  }

  return (
    <div
      style={{
        background: testCase.status === 'Concluído' ? 'var(--color-bg)' : 'var(--color-surface)',
        border: `1px solid var(--color-border)`,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 8,
        padding: '12px 14px',
        marginBottom: 8,
        opacity: testCase.status === 'Concluído' ? 0.85 : 1,
      }}
    >
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 10 }}>
        <input
          type="text"
          value={testCase.name}
          onChange={(e) => updateTestCase(featureIndex, caseIndex, 'name', e.target.value)}
          placeholder="Título do Caso de Teste"
          style={{ ...inputSm, flexGrow: 1, minWidth: 200, fontWeight: 600 }}
        />
        <select
          value={testCase.complexity}
          onChange={(e) => updateTestCase(featureIndex, caseIndex, 'complexity', e.target.value as TestCaseComplexity)}
          style={{
            ...selectSm,
            width: 130,
            color: COMPLEXITY_COLORS[testCase.complexity] ?? 'var(--color-text-2)',
            fontWeight: 500,
            fontSize: 12,
            border: '0.5px solid var(--color-border)',
            padding: '4px 24px 4px 10px',
          }}
        >
          <option value="Baixa">Baixa</option>
          <option value="Moderada">Moderada</option>
          <option value="Alta">Alta</option>
        </select>
        <select
          value={testCase.status}
          onChange={(e) => handleStatusChange(e.target.value as TestCaseStatus)}
          style={{
            ...selectSm,
            width: 140,
            color: STATUS_TEXT_COLORS[testCase.status] ?? 'var(--color-text-2)',
            fontWeight: 500,
            fontSize: 12,
            border: '0.5px solid var(--color-border)',
            padding: '4px 24px 4px 10px',
          }}
        >
          <option value="Pendente">Pendente</option>
          <option value="Concluído">Concluído</option>
          <option value="Falhou">Falhou</option>
          <option value="Bloqueado">Bloqueado</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <input
            type="date"
            value={execDateVal}
            min={startDate || undefined}
            max={endDate || undefined}
            onChange={(e) => handleDateChange(e.target.value)}
            disabled={testCase.status === 'Pendente' || testCase.status === 'Bloqueado'}
            style={{ ...inputSm, width: 148, opacity: testCase.status === 'Pendente' || testCase.status === 'Bloqueado' ? 0.4 : 1 }}
            title={testCase.status === 'Pendente' || testCase.status === 'Bloqueado' ? 'Disponível após executar o caso (Concluído ou Falhou)' : !startDate ? 'Configure a Data de Início para ativar' : 'Data de execução'}
          />
          {testCase.executionDay && (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-blue)', background: 'var(--color-blue-light)', border: '1px solid var(--color-blue)', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>
              {testCase.executionDay}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <ActionBtn onClick={() => duplicateTestCase(featureIndex, caseIndex)} title="Clonar caso de teste" aria-label="Clonar caso de teste"><IconClone /></ActionBtn>
          <ActionBtn onClick={() => setConfirmRemove(true)} title="Remover caso de teste" danger aria-label="Remover caso de teste"><IconTrash /></ActionBtn>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <textarea
          value={testCase.gherkin}
          onChange={(e) => updateTestCase(featureIndex, caseIndex, 'gherkin', e.target.value)}
          placeholder="Escreva o cenário em Gherkin…"
          rows={4}
          style={{
            fontFamily: 'var(--font-family-mono)',
            fontSize: 13,
            resize: 'vertical',
            flex: 1,
            minWidth: 0,
            border: '1px solid var(--color-border-md)',
            borderRadius: 6,
            padding: 10,
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            boxSizing: 'border-box',
          }}
        />
        {mockupImage && (
          <div style={{ flexShrink: 0, width: 'clamp(100px, 30%, 220px)' }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>📎 Referência</div>
            <img src={mockupImage} alt="Mockup" style={{ width: '100%', borderRadius: 6, border: '1px solid var(--color-border)', objectFit: 'contain', maxHeight: 130, background: '#fff' }} />
          </div>
        )}
      </div>

      {confirmRemove && (
        <ConfirmModal
          title="Excluir Caso de Teste"
          description={`Tem certeza que deseja excluir o caso "${testCase.name || 'Sem título'}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir Caso"
          onConfirm={() => { removeTestCase(featureIndex, caseIndex); setConfirmRemove(false) }}
          onCancel={() => setConfirmRemove(false)}
        />
      )}

      {showBugModal && (
        <NewBugModal
          featureNames={featureNames}
          assignees={knownAssignees}
          stacks={knownStacks}
          currentDate={state.currentDate}
          initialDraft={{ feature: featureName, desc: testCase.name ? `Falhou: ${testCase.name}` : '' }}
          onConfirm={(draft) => { addBugFull(draft); setShowBugModal(false) }}
          onCancel={() => setShowBugModal(false)}
        />
      )}

      {concluindoDate !== null && (
        <div
          onClick={(e) => e.target === e.currentTarget && setConcluindoDate(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div role="dialog" aria-modal="true" aria-label="Data de Execução" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '3px solid var(--color-green)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>✅ Data de Execução</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Informe a data em que o caso <strong>"{testCase.name || 'Sem título'}"</strong> foi executado.
            </div>
            <input
              type="date"
              required
              value={concluindoDate}
              min={startDate || undefined}
              max={endDate || undefined}
              onChange={(e) => setConcluindoDate(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && concluindoDate) confirmConcluido() }}
              style={{ padding: '8px 10px', border: `1px solid ${concluindoDate ? 'var(--color-border-md)' : 'var(--color-red)'}`, borderRadius: 6, fontSize: 14, color: 'var(--color-text)', background: 'var(--color-bg)', fontFamily: 'var(--font-family-sans)' }}
              autoFocus
            />
            {!concluindoDate && (
              <div style={{ fontSize: 12, color: 'var(--color-red)', fontWeight: 500 }}>
                A data de execução é obrigatória para concluir o caso de teste.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConcluindoDate(null)}
                style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid var(--color-border-md)', background: 'transparent', color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmConcluido}
                disabled={!concluindoDate}
                style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: concluindoDate ? 'var(--color-green)' : 'var(--color-border)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: concluindoDate ? 'pointer' : 'default', fontFamily: 'var(--font-family-sans)' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelSm: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--color-text-2)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 6,
}

const inputSm: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid var(--color-border-md)',
  borderRadius: 6,
  fontSize: 13,
  color: 'var(--color-text)',
  background: 'var(--color-surface)',
  fontFamily: 'var(--font-family-sans)',
  boxSizing: 'border-box',
}

const selectSm: React.CSSProperties = {
  ...inputSm,
  padding: '6px 24px 6px 8px',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23999'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
}

const btnOutline: React.CSSProperties = {
  padding: '6px 14px',
  background: 'transparent',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-md)',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
}

const btnPrimaryFilled: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 34,
  padding: '0 14px',
  background: 'var(--color-blue)',
  color: '#fff',
  border: '1px solid var(--color-blue)',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  transition: 'background 0.12s, border-color 0.12s',
}

const btnOutlineNeutral: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 40,
  padding: '0 14px',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-md)',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  whiteSpace: 'nowrap',
}

const iconBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 6,
  borderRadius: 6,
  cursor: 'pointer',
  color: 'var(--color-text-2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

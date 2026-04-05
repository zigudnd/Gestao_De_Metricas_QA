import { useRef, useState } from 'react'
import type { Suite, Feature, TestCase } from '@/modules/sprints/types/sprint.types'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { ReleaseFeatureRow } from './ReleaseFeatureRow'

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  suite: Suite
  suiteIndex: number
  features: Array<{ f: Feature; i: number }>
  nonBlockingFeatureIds?: string[]
  onRenameSuite: (suiteIndex: number, name: string) => void
  onRemoveSuite: (suiteIndex: number) => void
  onAddFeature: (suiteId: number) => void
  onUpdateFeature: (featureIndex: number, field: keyof Feature, value: unknown) => void
  onRemoveFeature: (featureIndex: number) => void
  onAddTestCase: (featureIndex: number) => void
  onUpdateTestCase: (featureIndex: number, caseIndex: number, field: keyof TestCase, value: unknown) => void
  onRemoveTestCase: (featureIndex: number, caseIndex: number) => void
  onBugRequest: (featureName: string, testCaseName: string) => void
  onImportFile: (suiteId: number, file: File) => void
  index?: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function miniBarColor(pct: number): string {
  if (pct >= 100) return 'var(--color-green)'
  if (pct >= 60) return 'var(--color-amber-mid)'
  return 'var(--color-red)'
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReleaseSuiteCard({
  suite, suiteIndex, features, nonBlockingFeatureIds = [],
  onRenameSuite, onRemoveSuite, onAddFeature,
  onUpdateFeature, onRemoveFeature,
  onAddTestCase, onUpdateTestCase, onRemoveTestCase,
  onBugRequest, onImportFile, index = 0,
}: Props) {
  const [open, setOpen] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(suite.name)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const totalTests = features.reduce((a, { f }) => a + (f.cases?.length ?? 0), 0)
  const completedTests = features.reduce((a, { f }) => a + (f.cases?.filter((c) => c.status === 'Concluído').length ?? 0), 0)
  const blockedCount = features.filter(({ f }) => f.status === 'Bloqueada').length
  const progressPct = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0
  const barColor = miniBarColor(progressPct)

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onImportFile(suite.id, file)
    if (importInputRef.current) importInputRef.current.value = ''
  }

  return (
    <div
      className="anim-fade-up"
      style={{
        background: 'var(--color-surface)',
        border: '2px solid var(--color-border)',
        borderRadius: 10, overflow: 'hidden',
        animationDelay: `${index * 0.05}s`,
      }}
    >
      {/* Suite header */}
      <div
        className="flex items-center gap-2.5 flex-wrap"
        style={{
          padding: '14px 20px',
          background: 'var(--color-bg)', borderBottom: open ? '1px solid var(--color-border)' : 'none',
          cursor: 'pointer', userSelect: 'none',
        }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span role="img" aria-hidden="true" style={{ color: 'var(--color-blue)', fontWeight: 700, fontSize: 14 }}>{open ? '▾' : '▸'}</span>
        <span style={{ width: 4, height: 20, background: 'var(--color-blue)', borderRadius: 4, flexShrink: 0 }} />

        {editingName ? (
          <input
            autoFocus
            type="text"
            value={nameVal}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={() => { onRenameSuite(suiteIndex, nameVal); setEditingName(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { onRenameSuite(suiteIndex, nameVal); setEditingName(false) } }}
            className="input-field"
            style={{ fontSize: 15, fontWeight: 700, width: 'auto', padding: '2px 8px' }}
          />
        ) : (
          <strong className="heading-sm" style={{ fontSize: 15 }}>
            {suite.name || 'Suite sem nome'}
          </strong>
        )}

        {blockedCount > 0 && (
          <span className="badge badge-red">
            {blockedCount} {blockedCount === 1 ? 'bloqueada' : 'bloqueadas'}
          </span>
        )}

        {/* Inline mini progress: counter + bar + percentage */}
        <div className="flex items-center gap-1.5" style={{ marginLeft: 'auto' }}>
          <span className="text-muted" style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-family-mono)' }}>
            {completedTests}/{totalTests}
          </span>
          <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--color-surface-2)', overflow: 'hidden' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: barColor }}>
            {progressPct}%
          </span>
        </div>

        <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
          <ActionBtn
            onClick={() => { setNameVal(suite.name); setEditingName(true) }}
            title="Renomear suite"
          >
            <IconEdit />
          </ActionBtn>
          <ActionBtn onClick={() => setConfirmRemove(true)} title="Excluir suite" danger>
            <IconTrash />
          </ActionBtn>
        </div>
      </div>

      {open && (
        <div style={{ padding: '16px 20px 20px' }}>
          {features.map(({ f, i }) => (
            <ReleaseFeatureRow
              key={f.id}
              feature={f}
              featureIndex={i}
              isNonBlocking={nonBlockingFeatureIds.includes(String(f.id))}
              onUpdate={onUpdateFeature}
              onRemove={onRemoveFeature}
              onAddTestCase={onAddTestCase}
              onUpdateTestCase={onUpdateTestCase}
              onRemoveTestCase={onRemoveTestCase}
              onBugRequest={onBugRequest}
            />
          ))}
          <div className="flex gap-2" style={{ marginTop: 10 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onAddFeature(suite.id) }}
              style={{ flex: 1, padding: 12, border: '2px dashed var(--color-border-md)', borderRadius: 8, background: 'transparent', color: 'var(--color-blue)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}
            >
              + Adicionar Funcionalidade
            </button>
            <label
              title="Importar .feature ou .csv"
              className="btn btn-sm btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
            >
              Importar
              <input
                ref={importInputRef}
                type="file"
                accept=".feature,.csv"
                style={{ display: 'none' }}
                onChange={handleImport}
              />
            </label>
          </div>
        </div>
      )}

      {confirmRemove && (
        <ConfirmModal
          title="Excluir Suite"
          description={`Tem certeza que deseja excluir a suite "${suite.name || 'Sem nome'}" e todas as suas funcionalidades? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir Suite"
          onConfirm={() => { onRemoveSuite(suiteIndex); setConfirmRemove(false) }}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </div>
  )
}

// ─── Shared sub-components ──────────────────────────────────────────────────

function ActionBtn({ onClick, title, children, danger }: React.PropsWithChildren<{ onClick?: () => void; title?: string; danger?: boolean }>) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? (danger ? 'var(--color-red-light)' : 'var(--color-bg)') : 'none',
        border: 'none', padding: 6, borderRadius: 6, cursor: 'pointer',
        color: hov && danger ? 'var(--color-red)' : 'var(--color-text-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s, color 0.15s', flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 2.5l2 2L5 12H3v-2L10.5 2.5z"/>
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

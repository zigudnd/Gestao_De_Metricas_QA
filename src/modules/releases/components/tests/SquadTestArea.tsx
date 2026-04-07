import { useState } from 'react'
import type { Suite, Feature, TestCase, Bug } from '@/modules/sprints/types/sprint.types'
import { NewBugModal } from '@/app/components/NewBugModal'
import { ReleaseSuiteCard } from './ReleaseSuiteCard'
import { ReleaseBugsList } from './ReleaseBugsList'

// ─── Filter type ─────────────────────────────────────────────────────────────

type FilterChip = 'all' | 'pending' | 'passed' | 'failed'

const FILTER_CHIPS: { id: FilterChip; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendente' },
  { id: 'passed', label: 'Concluído' },
  { id: 'failed', label: 'Falhou' },
]

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  suites: Suite[]
  features: Feature[]
  bugs: Bug[]
  nonBlockingFeatureIds?: string[]
  // Suite actions
  onAddSuite: () => void
  onRenameSuite: (suiteIndex: number, name: string) => void
  onRemoveSuite: (suiteIndex: number) => void
  // Feature actions
  onAddFeature: (suiteId: number | string) => void
  onRemoveFeature: (featureIndex: number) => void
  onUpdateFeature: (featureIndex: number, field: keyof Feature, value: unknown) => void
  // TestCase actions
  onAddTestCase: (featureIndex: number) => void
  onRemoveTestCase: (featureIndex: number, caseIndex: number) => void
  onUpdateTestCase: (featureIndex: number, caseIndex: number, field: keyof TestCase, value: unknown) => void
  // Bug actions
  onAddBug: () => void
  onRemoveBug: (bugIndex: number) => void
  onUpdateBug: (bugIndex: number, field: keyof Bug, value: unknown) => void
  // Import
  onImportFile: (suiteId: number | string, file: File) => void
  // Import features in bulk (for adding parsed features)
  onImportFeatures?: (suiteId: number | string, features: Array<Omit<Feature, 'id'>>) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SquadTestArea({
  suites, features, bugs, nonBlockingFeatureIds = [],
  onAddSuite, onRenameSuite, onRemoveSuite,
  onAddFeature, onRemoveFeature, onUpdateFeature,
  onAddTestCase, onRemoveTestCase, onUpdateTestCase,
  onAddBug, onRemoveBug, onUpdateBug,
  onImportFile,
}: Props) {
  const [bugModalOpen, setBugModalOpen] = useState(false)
  const [bugModalDefaults, setBugModalDefaults] = useState<{ feature: string; desc: string }>({ feature: '', desc: '' })
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all')

  // Overall stats
  const totalTests = features.reduce((a, f) => a + (f.cases?.length ?? 0), 0)
  const completedTests = features.reduce((a, f) => a + (f.cases?.filter((c) => c.status === 'Concluído').length ?? 0), 0)
  const failedTests = features.reduce((a, f) => a + (f.cases?.filter((c) => c.status === 'Falhou').length ?? 0), 0)
  const blockedTests = features.reduce((a, f) => a + (f.cases?.filter((c) => c.status === 'Bloqueado').length ?? 0), 0)
  const openBugs = bugs.filter((b) => b.status !== 'Resolvido').length
  const overallPct = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0
  const executedTests = completedTests + failedTests

  const featureNames = features.map((f) => f.name).filter(Boolean)
  const knownAssignees = Array.from(new Set(bugs.map((b) => b.assignee?.trim()).filter(Boolean) as string[]))
  const knownStacks = Array.from(new Set(bugs.map((b) => b.stack).filter(Boolean) as string[]))

  function handleBugRequest(featureName: string, testCaseName: string) {
    setBugModalDefaults({
      feature: featureName,
      desc: testCaseName ? `Falhou: ${testCaseName}` : '',
    })
    setBugModalOpen(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Overall stats */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap', padding: '12px 16px',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 10,
      }}>
        <StatChip label="Total" value={totalTests} />
        <StatChip label="Concluidos" value={completedTests} color="var(--color-green)" />
        <StatChip label="Falhas" value={failedTests} color="var(--color-red)" />
        <StatChip label="Bloqueados" value={blockedTests} color="var(--color-amber)" />
        <StatChip label="Bugs abertos" value={openBugs} color="var(--color-red)" />
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 100, height: 8, background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${overallPct}%`, height: '100%', background: 'var(--color-green)', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-family-mono)' }}>
            {overallPct}%
          </span>
        </div>
      </div>

      {/* Toolbar with filter chips + action buttons */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8,
      }}>
        {/* Left side: filter chips + counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            display: 'flex', gap: 0,
            background: 'var(--color-surface-2)', borderRadius: 6,
            overflow: 'hidden',
          }}>
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveFilter(chip.id)}
                aria-pressed={activeFilter === chip.id}
                style={{
                  padding: '5px 12px',
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'var(--font-family-sans)',
                  cursor: 'pointer',
                  background: activeFilter === chip.id ? 'var(--color-blue)' : 'transparent',
                  color: activeFilter === chip.id ? '#fff' : 'var(--color-text-2)',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600,
            fontFamily: 'var(--font-family-mono)',
            color: 'var(--color-text-3)',
            marginLeft: 4,
          }}>
            {executedTests}/{totalTests} executados
          </span>
        </div>

        {/* Right side: action buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onAddSuite} style={btnOutline}>
            + Nova Suite
          </button>
        </div>
      </div>

      {/* Suites */}
      {suites.map((suite, sIndex) => {
        const suiteFeatures = features.map((f, i) => ({ f, i }))
          .filter(({ f }) => String(f.suiteId) === String(suite.id))

        return (
          <ReleaseSuiteCard
            key={suite.id}
            suite={suite}
            suiteIndex={sIndex}
            features={suiteFeatures}
            nonBlockingFeatureIds={nonBlockingFeatureIds}
            onRenameSuite={onRenameSuite}
            onRemoveSuite={onRemoveSuite}
            onAddFeature={onAddFeature}
            onUpdateFeature={onUpdateFeature}
            onRemoveFeature={onRemoveFeature}
            onAddTestCase={onAddTestCase}
            onUpdateTestCase={onUpdateTestCase}
            onRemoveTestCase={onRemoveTestCase}
            onBugRequest={handleBugRequest}
            onImportFile={onImportFile}
            index={sIndex}
          />
        )
      })}

      {suites.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-3)', fontSize: 13 }}>
          Nenhuma suite criada. Clique em &quot;+ Nova Suite&quot; para comecar.
        </div>
      )}

      {/* Bugs section */}
      <ReleaseBugsList
        bugs={bugs}
        onAddBug={onAddBug}
        onRemoveBug={onRemoveBug}
        onUpdateBug={onUpdateBug}
      />

      {/* Bug modal (triggered from failed test cases) */}
      {bugModalOpen && (
        <NewBugModal
          featureNames={featureNames}
          assignees={knownAssignees}
          stacks={knownStacks}
          currentDate={new Date().toISOString().split('T')[0]}
          initialDraft={{ feature: bugModalDefaults.feature, desc: bugModalDefaults.desc }}
          onConfirm={(draft) => {
            onAddBug()
            // The store adds a blank bug, so we update it immediately with draft values
            const newBugIdx = bugs.length // will be the newly added bug
            setTimeout(() => {
              onUpdateBug(newBugIdx, 'desc', draft.desc)
              onUpdateBug(newBugIdx, 'feature', draft.feature)
              onUpdateBug(newBugIdx, 'stack', draft.stack)
              onUpdateBug(newBugIdx, 'severity', draft.severity)
              onUpdateBug(newBugIdx, 'assignee', draft.assignee)
              onUpdateBug(newBugIdx, 'status', draft.status)
              if (draft.notes) onUpdateBug(newBugIdx, 'notes', draft.notes)
              if (draft.openedAt) onUpdateBug(newBugIdx, 'openedAt', draft.openedAt)
            }, 50)
            setBugModalOpen(false)
          }}
          onCancel={() => setBugModalOpen(false)}
        />
      )}
    </div>
  )
}

// ─── StatChip ───────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
      <span style={{ fontSize: 18, fontWeight: 700, color: color ?? 'var(--color-text)', fontFamily: 'var(--font-family-mono)' }}>
        {value}
      </span>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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

import { useState, useEffect } from 'react'
import { inputStyle, selectStyle, btnPrimary, btnOutline, labelSm } from '@/styles/shared'

// ─── Constants ───────────────────────────────────────────────────────────────

const REPOSITORIES = [
  'app-ios',
  'app-android',
  'bff-mobile',
  'api-gateway',
  'design-system',
  'infra-mobile',
  'Outro',
] as const

const CHANGE_TYPES = [
  { value: 'feature', label: 'Feature' },
  { value: 'fix', label: 'Fix' },
  { value: 'refactor', label: 'Refactor' },
  { value: 'hotfix', label: 'Hotfix' },
] as const

// ─── Types ───────────────────────────────────────────────────────────────────

interface PRFormData {
  pr_link: string
  repository: string
  description: string
  change_type: string
  squad_id: string
}

interface PRRegistrationFormProps {
  releaseId: string
  cutoffDate: string
  squads: Array<{ id: string; name: string }>
  defaultSquadId?: string
  onSubmit: (data: PRFormData) => Promise<void>
  onCancel: () => void
  editingPR?: {
    id: string
    pr_link: string
    repository: string
    description: string
    change_type: string
    squad_id: string
  } | null
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const formLabel: React.CSSProperties = {
  ...labelSm,
  textTransform: 'none',
  fontSize: 12,
  letterSpacing: 'normal',
}

const errorBox: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  marginBottom: 14,
  background: 'var(--color-red-light)',
  border: '1px solid var(--color-red-mid)',
  fontSize: 12,
  color: 'var(--color-red)',
}

const warningBanner: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  marginBottom: 14,
  background: 'var(--color-yellow-light)',
  border: '1px solid var(--color-amber-mid)',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--color-yellow)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const pillContainer: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
}

const pillBase: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 20,
  border: '1px solid var(--color-border-md)',
  background: 'transparent',
  color: 'var(--color-text-2)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  transition: 'all 0.15s',
}

const pillActive: React.CSSProperties = {
  ...pillBase,
  background: 'var(--color-blue)',
  color: '#fff',
  borderColor: 'var(--color-blue)',
  fontWeight: 600,
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 72,
  resize: 'vertical',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidURL(str: string): boolean {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isCutoffPast(cutoffDate: string): boolean {
  if (!cutoffDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = new Date(cutoffDate + 'T23:59:59')
  return cutoff < today
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PRRegistrationForm({
  cutoffDate,
  squads,
  defaultSquadId,
  onSubmit,
  onCancel,
  editingPR,
}: PRRegistrationFormProps) {
  const isEditing = !!editingPR
  const isPastCutoff = isCutoffPast(cutoffDate)

  // Form state
  const [prLink, setPrLink] = useState(editingPR?.pr_link ?? '')
  const [repository, setRepository] = useState(editingPR?.repository ?? '')
  const [customRepo, setCustomRepo] = useState('')
  const [description, setDescription] = useState(editingPR?.description ?? '')
  const [changeType, setChangeType] = useState(editingPR?.change_type ?? '')
  const [squadId, setSquadId] = useState(editingPR?.squad_id ?? defaultSquadId ?? '')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Determine if the editing PR has a custom repo (not in REPOSITORIES list)
  const [isCustomRepo, setIsCustomRepo] = useState(() => {
    if (editingPR?.repository && !REPOSITORIES.includes(editingPR.repository as typeof REPOSITORIES[number])) {
      return true
    }
    return false
  })

  useEffect(() => {
    if (isCustomRepo && editingPR?.repository) {
      setCustomRepo(editingPR.repository)
      setRepository('Outro')
    }
  }, [editingPR?.id, isCustomRepo, editingPR?.repository])

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!prLink.trim()) {
      errs.prLink = 'Link do PR e obrigatorio'
    } else if (!isValidURL(prLink.trim())) {
      errs.prLink = 'Link do PR deve ser uma URL valida (http/https)'
    }

    const effectiveRepo = repository === 'Outro' ? customRepo.trim() : repository
    if (!effectiveRepo) {
      errs.repo = 'Repositorio e obrigatorio'
    }

    if (!squadId) {
      errs.squad = 'Squad e obrigatorio'
    }

    if (!changeType) {
      errs.changeType = 'Tipo de mudanca e obrigatorio'
    }

    return errs
  }

  async function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setFieldErrors({})
    setSubmitError(null)
    setSubmitting(true)

    const effectiveRepo = repository === 'Outro' ? customRepo.trim() : repository

    try {
      await onSubmit({
        pr_link: prLink.trim(),
        repository: effectiveRepo,
        description: description.trim(),
        change_type: changeType,
        squad_id: squadId,
      })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Cutoff warning */}
      {isPastCutoff && (
        <div style={warningBanner}>
          <span style={{ fontSize: 16 }}>&#9888;</span>
          Prazo de cadastro encerrado para esta release
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <div style={errorBox}>{submitError}</div>
      )}

      {/* PR Link */}
      <div>
        <label htmlFor="reg-pr-link" style={formLabel}>Link do PR *</label>
        <input
          id="reg-pr-link"
          type="url"
          value={prLink}
          onChange={(e) => { setPrLink(e.target.value); setFieldErrors((prev) => { const { prLink: _, ...rest } = prev; return rest }) }}
          placeholder="https://github.com/org/repo/pull/123"
          autoFocus={!isEditing}
          aria-invalid={!!fieldErrors.prLink}
          aria-describedby={fieldErrors.prLink ? 'reg-pr-link-error' : undefined}
          style={inputStyle}
        />
        {fieldErrors.prLink && <span id="reg-pr-link-error" style={{ color: 'var(--color-red)', fontSize: 12 }}>{fieldErrors.prLink}</span>}
      </div>

      {/* Repository */}
      <div>
        <label htmlFor="reg-pr-repo" style={formLabel}>Repositorio *</label>
        <select
          id="reg-pr-repo"
          value={repository === 'Outro' || isCustomRepo ? 'Outro' : repository}
          onChange={(e) => {
            const val = e.target.value
            setRepository(val)
            setIsCustomRepo(val === 'Outro')
            if (val !== 'Outro') setCustomRepo('')
            setFieldErrors((prev) => { const { repo, ...rest } = prev; return rest })
          }}
          aria-invalid={!!fieldErrors.repo}
          aria-describedby={fieldErrors.repo ? 'reg-pr-repo-error' : undefined}
          style={selectStyle}
        >
          <option value="">Selecione...</option>
          {REPOSITORIES.map((repo) => (
            <option key={repo} value={repo}>{repo}</option>
          ))}
        </select>
        {fieldErrors.repo && <span id="reg-pr-repo-error" style={{ color: 'var(--color-red)', fontSize: 12 }}>{fieldErrors.repo}</span>}
        {(repository === 'Outro' || isCustomRepo) && (
          <input
            id="reg-pr-custom-repo"
            value={customRepo}
            onChange={(e) => { setCustomRepo(e.target.value); setFieldErrors((prev) => { const { repo, ...rest } = prev; return rest }) }}
            placeholder="Nome do repositorio"
            aria-label="Nome do repositorio customizado"
            style={{ ...inputStyle, marginTop: 8 }}
          />
        )}
      </div>

      {/* Squad */}
      <div>
        <label htmlFor="reg-pr-squad" style={formLabel}>Squad *</label>
        <select
          id="reg-pr-squad"
          value={squadId}
          onChange={(e) => { setSquadId(e.target.value); setFieldErrors((prev) => { const { squad, ...rest } = prev; return rest }) }}
          aria-invalid={!!fieldErrors.squad}
          aria-describedby={fieldErrors.squad ? 'reg-pr-squad-error' : undefined}
          style={selectStyle}
        >
          <option value="">Selecione...</option>
          {squads.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {fieldErrors.squad && <span id="reg-pr-squad-error" style={{ color: 'var(--color-red)', fontSize: 12 }}>{fieldErrors.squad}</span>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="reg-pr-desc" style={formLabel}>Descricao</label>
        <textarea
          id="reg-pr-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Breve descricao das mudancas incluidas no PR..."
          rows={3}
          style={textareaStyle as React.CSSProperties}
        />
      </div>

      {/* Change Type (pills) */}
      <div>
        <label id="reg-pr-change-type-label" style={formLabel}>Tipo de mudanca *</label>
        <div role="radiogroup" aria-labelledby="reg-pr-change-type-label" style={pillContainer}>
          {CHANGE_TYPES.map((ct) => (
            <button
              key={ct.value}
              type="button"
              onClick={() => { setChangeType(ct.value); setFieldErrors((prev) => { const { changeType: _, ...rest } = prev; return rest }) }}
              aria-pressed={changeType === ct.value}
              style={changeType === ct.value ? pillActive : pillBase}
            >
              {ct.label}
            </button>
          ))}
        </div>
        {fieldErrors.changeType && <span id="reg-pr-change-type-error" style={{ color: 'var(--color-red)', fontSize: 12 }}>{fieldErrors.changeType}</span>}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button
          type="button"
          onClick={onCancel}
          style={btnOutline}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || isPastCutoff}
          style={{
            ...btnPrimary,
            opacity: submitting || isPastCutoff ? 0.5 : 1,
            cursor: submitting || isPastCutoff ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting
            ? 'Salvando...'
            : isEditing
              ? 'Salvar alterações'
              : 'Cadastrar PR'}
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useSprintStore } from '../../store/sprintStore'
import { ConfirmModal } from '@/app/components/ConfirmModal'

const REASONS = [
  'Ambiente indisponível',
  'Bloqueio de dependência externa',
  'Falta de requisitos/documentação',
  'Bug crítico impedindo testes',
  'Indisponibilidade de recurso humano',
  'Aguardando aprovação de deploy',
]

export function BlockersTab() {
  const state = useSprintStore((s) => s.state)
  const addBlocker = useSprintStore((s) => s.addBlocker)
  const updateBlocker = useSprintStore((s) => s.updateBlocker)
  const removeBlocker = useSprintStore((s) => s.removeBlocker)
  const [deleteTarget, setDeleteTarget] = useState<{ index: number; reason: string } | null>(null)

  const total = state.blockers.reduce((a, b) => a + (b.hours || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Blockers / Impedimentos</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 4 }}>
            Total: <strong>{total}h</strong> bloqueadas · {state.blockers.length} registro(s)
          </p>
        </div>
        <button onClick={addBlocker} style={btnPrimary}>+ Adicionar Blocker</button>
      </div>

      {state.blockers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--color-text-2)', background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
          <p style={{ fontWeight: 600 }}>Nenhum blocker registrado</p>
          <p style={{ fontSize: 13 }}>Registre impedimentos que impactaram o andamento dos testes.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg)' }}>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Motivo</th>
                <th style={thStyle}>Horas</th>
                <th style={thStyle}>Ações</th>
              </tr>
            </thead>
            <tbody>
              <datalist id="blocker-reasons">
                {REASONS.map((r) => <option key={r} value={r} />)}
              </datalist>
              {state.blockers.map((b, i) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <input
                      type="date"
                      value={b.date}
                      onChange={(e) => updateBlocker(i, 'date', e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <input
                      type="text"
                      list="blocker-reasons"
                      value={b.reason}
                      onChange={(e) => updateBlocker(i, 'reason', e.target.value)}
                      placeholder="Selecione ou descreva o motivo…"
                      style={inputStyle}
                    />
                  </td>
                  <td style={{ padding: '10px 12px', width: 100 }}>
                    <input
                      type="number"
                      min={0}
                      value={b.hours}
                      onChange={(e) => updateBlocker(i, 'hours', Number(e.target.value))}
                      style={{ ...inputStyle, textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => setDeleteTarget({ index: i, reason: b.reason || 'Sem motivo' })}
                      style={{ padding: '5px 10px', color: 'var(--color-red)', border: '1px solid var(--color-red)', background: 'transparent', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-family-sans)' }}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-bg)' }}>
                <td colSpan={2} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-2)', fontSize: 13 }}>Total bloqueado:</td>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--color-text)', fontSize: 15 }}>{total}h</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Excluir Blocker"
          description={`Tem certeza que deseja excluir o blocker "${deleteTarget.reason}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir Blocker"
          onConfirm={() => { removeBlocker(deleteTarget.index); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--color-text-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const inputStyle: React.CSSProperties = {
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

const btnPrimary: React.CSSProperties = {
  padding: '7px 16px',
  background: 'var(--color-blue)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
}

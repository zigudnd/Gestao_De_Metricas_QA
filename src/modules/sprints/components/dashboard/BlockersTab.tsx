import { useState } from 'react'
import { useSprintStore } from '../../store/sprintStore'
import { ConfirmModal } from '@/app/components/ConfirmModal'

const REASONS = [
  'Ambiente indisponivel',
  'Bloqueio de dependencia externa',
  'Falta de requisitos/documentacao',
  'Bug critico impedindo testes',
  'Indisponibilidade de recurso humano',
  'Aguardando aprovacao de deploy',
]

export function BlockersTab() {
  const state = useSprintStore((s) => s.state)
  const addBlocker = useSprintStore((s) => s.addBlocker)
  const updateBlocker = useSprintStore((s) => s.updateBlocker)
  const removeBlocker = useSprintStore((s) => s.removeBlocker)
  const [deleteTarget, setDeleteTarget] = useState<{ index: number; reason: string } | null>(null)

  const total = state.blockers.reduce((a, b) => a + (b.hours || 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="heading-sm" style={{ fontSize: 15 }}>Blockers / Impedimentos</h3>
          <p className="text-body" style={{ marginTop: 4 }}>
            Total: <strong>{total}h</strong> bloqueadas · {state.blockers.length} registro(s)
          </p>
        </div>
        <button onClick={addBlocker} className="btn btn-md btn-primary font-semibold">+ Adicionar Blocker</button>
      </div>

      {state.blockers.length === 0 ? (
        <div className="card text-center" style={{ padding: '48px 20px', color: 'var(--color-text-2)' }}>
          <p style={{ fontWeight: 600 }}>Nenhum blocker registrado</p>
          <p className="text-body">Registre impedimentos que impactaram o andamento dos testes.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg)' }}>
                <th className="table-header">Data</th>
                <th className="table-header">Motivo</th>
                <th className="table-header">Horas</th>
                <th className="table-header">Acoes</th>
              </tr>
            </thead>
            <tbody>
              <datalist id="blocker-reasons">
                {REASONS.map((r) => <option key={r} value={r} />)}
              </datalist>
              {state.blockers.map((b, i) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="table-cell">
                    <input
                      type="date"
                      value={b.date}
                      onChange={(e) => updateBlocker(i, 'date', e.target.value)}
                      className="input-field"
                    />
                  </td>
                  <td className="table-cell">
                    <input
                      type="text"
                      list="blocker-reasons"
                      value={b.reason}
                      onChange={(e) => updateBlocker(i, 'reason', e.target.value)}
                      placeholder="Selecione ou descreva o motivo…"
                      className="input-field"
                    />
                  </td>
                  <td className="table-cell" style={{ width: 100 }}>
                    <input
                      type="number"
                      min={0}
                      value={b.hours}
                      onChange={(e) => updateBlocker(i, 'hours', Number(e.target.value))}
                      className="input-field text-center"
                    />
                  </td>
                  <td className="table-cell text-center">
                    <button
                      onClick={() => setDeleteTarget({ index: i, reason: b.reason || 'Sem motivo' })}
                      className="btn-destructive"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-bg)' }}>
                <td colSpan={2} className="table-cell text-right" style={{ fontWeight: 700, color: 'var(--color-text-2)', fontSize: 13 }}>Total bloqueado:</td>
                <td className="table-cell" style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 15 }}>{total}h</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Excluir Blocker"
          description={`Tem certeza que deseja excluir o blocker "${deleteTarget.reason}"? Esta acao nao pode ser desfeita.`}
          confirmLabel="Excluir Blocker"
          onConfirm={() => { removeBlocker(deleteTarget.index); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

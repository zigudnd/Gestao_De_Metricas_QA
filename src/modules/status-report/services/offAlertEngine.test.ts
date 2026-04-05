import { describe, it, expect } from 'vitest'
import { calcularAlerta, enriquecerOffs } from './offAlertEngine'
import type { PeriodoOff, MembroTime } from '../types/squadConfig.types'

// ─── calcularAlerta ─────────────────────────────────────────────────────────

describe('calcularAlerta', () => {
  it('returns "ativo" when today is between start and end', () => {
    const result = calcularAlerta('2026-04-01', '2026-04-10', '2026-04-05')
    expect(result.alerta).toBe('ativo')
    expect(result.diasRestantes).toBe(0)
    expect(result.duracaoDias).toBe(10)
  })

  it('returns "ativo" when start equals today', () => {
    const result = calcularAlerta('2026-04-05', '2026-04-10', '2026-04-05')
    expect(result.alerta).toBe('ativo')
    expect(result.diasRestantes).toBe(0)
  })

  it('returns "ativo" when end equals today', () => {
    const result = calcularAlerta('2026-04-01', '2026-04-05', '2026-04-05')
    expect(result.alerta).toBe('ativo')
    expect(result.diasRestantes).toBe(0)
  })

  it('returns "ativo" when start and end are both today (edge case)', () => {
    const result = calcularAlerta('2026-04-05', '2026-04-05', '2026-04-05')
    expect(result.alerta).toBe('ativo')
    expect(result.diasRestantes).toBe(0)
    expect(result.duracaoDias).toBe(1)
  })

  it('returns "warn7" when start is within 7 days', () => {
    const result = calcularAlerta('2026-04-10', '2026-04-20', '2026-04-05')
    expect(result.alerta).toBe('warn7')
    expect(result.diasRestantes).toBe(5)
    expect(result.duracaoDias).toBe(11)
  })

  it('returns "warn7" when start is exactly 7 days away', () => {
    const result = calcularAlerta('2026-04-12', '2026-04-20', '2026-04-05')
    expect(result.alerta).toBe('warn7')
    expect(result.diasRestantes).toBe(7)
  })

  it('returns "warn30" when start is within 30 days but more than 7', () => {
    const result = calcularAlerta('2026-04-25', '2026-05-05', '2026-04-05')
    expect(result.alerta).toBe('warn30')
    expect(result.diasRestantes).toBe(20)
  })

  it('returns "warn30" when start is exactly 30 days away', () => {
    const result = calcularAlerta('2026-05-05', '2026-05-15', '2026-04-05')
    expect(result.alerta).toBe('warn30')
    expect(result.diasRestantes).toBe(30)
  })

  it('returns "encerrado" when end date has passed', () => {
    const result = calcularAlerta('2026-03-01', '2026-03-10', '2026-04-05')
    expect(result.alerta).toBe('encerrado')
    expect(result.diasRestantes).toBeNull()
    expect(result.duracaoDias).toBe(10)
  })

  it('returns "normal" when start is more than 30 days out', () => {
    const result = calcularAlerta('2026-06-01', '2026-06-10', '2026-04-05')
    expect(result.alerta).toBe('normal')
    expect(result.diasRestantes).toBe(57)
    expect(result.duracaoDias).toBe(10)
  })

  it('computes duracaoDias correctly (inclusive)', () => {
    const result = calcularAlerta('2026-04-01', '2026-04-01', '2026-03-01')
    expect(result.duracaoDias).toBe(1)
  })
})

// ─── enriquecerOffs ─────────────────────────────────────────────────────────

function makeMembro(overrides: Partial<MembroTime> = {}): MembroTime {
  return {
    id: 'm1',
    tipo: 'efetivo',
    nome: 'Alice',
    papel: 'QA',
    ativo: true,
    createdAt: '2026-01-01',
    ...overrides,
  }
}

function makeOff(overrides: Partial<PeriodoOff> = {}): PeriodoOff {
  return {
    id: 'off1',
    membroId: 'm1',
    tipo: 'ferias',
    inicio: '2026-04-10',
    fim: '2026-04-20',
    createdAt: '2026-01-01',
    ...overrides,
  }
}

describe('enriquecerOffs', () => {
  const hoje = '2026-04-05'

  it('matches member by ID and enriches the off entry', () => {
    const membros = [makeMembro({ id: 'm1', nome: 'Alice' })]
    const offs = [makeOff({ membroId: 'm1' })]

    const result = enriquecerOffs(offs, membros, hoje)

    expect(result).toHaveLength(1)
    expect(result[0].membro.nome).toBe('Alice')
    expect(result[0].membro.id).toBe('m1')
    expect(result[0].alerta).toBe('warn7')
  })

  it('uses fallback member when ID does not match', () => {
    const membros = [makeMembro({ id: 'm999' })]
    const offs = [makeOff({ membroId: 'm1' })]

    const result = enriquecerOffs(offs, membros, hoje)

    expect(result[0].membro.nome).toBe('Desconhecido')
    expect(result[0].membro.id).toBe('')
  })

  it('filters out entries ended more than 30 days ago', () => {
    const membros = [makeMembro()]
    const offs = [
      makeOff({ id: 'old', inicio: '2026-01-01', fim: '2026-01-10' }), // ~85 days ago, filtered
      makeOff({ id: 'recent', inicio: '2026-04-10', fim: '2026-04-20' }), // future, kept
    ]

    const result = enriquecerOffs(offs, membros, hoje)

    expect(result.map((r) => r.id)).toEqual(['recent'])
  })

  it('keeps entries ended within the last 30 days', () => {
    const membros = [makeMembro()]
    const offs = [
      makeOff({ id: 'just-ended', inicio: '2026-03-20', fim: '2026-03-25' }), // 11 days ago, kept
    ]

    const result = enriquecerOffs(offs, membros, hoje)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('just-ended')
  })

  it('sorts by start date ascending, encerrados at the end', () => {
    const membros = [makeMembro()]
    const offs = [
      makeOff({ id: 'future', inicio: '2026-05-01', fim: '2026-05-10' }),
      makeOff({ id: 'ended', inicio: '2026-03-20', fim: '2026-03-25' }),
      makeOff({ id: 'soon', inicio: '2026-04-06', fim: '2026-04-08' }),
    ]

    const result = enriquecerOffs(offs, membros, hoje)

    expect(result.map((r) => r.id)).toEqual(['soon', 'future', 'ended'])
  })

  it('returns empty array when all offs are too old', () => {
    const membros = [makeMembro()]
    const offs = [
      makeOff({ id: 'ancient', inicio: '2025-01-01', fim: '2025-01-10' }),
    ]

    const result = enriquecerOffs(offs, membros, hoje)

    expect(result).toEqual([])
  })

  it('returns empty array when given no offs', () => {
    const result = enriquecerOffs([], [makeMembro()], hoje)
    expect(result).toEqual([])
  })
})

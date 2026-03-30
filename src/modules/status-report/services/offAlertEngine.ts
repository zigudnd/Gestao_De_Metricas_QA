import type {
  PeriodoOff, PeriodoOffComAlerta, MembroTime, AlertaProximidade,
} from '../types/squadConfig.types'

function diffDays(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}

export function calcularAlerta(
  inicio: string,
  fim: string,
  hoje: string,
): { alerta: AlertaProximidade; diasRestantes: number | null; duracaoDias: number } {
  const duracaoDias = diffDays(inicio, fim) + 1

  if (fim < hoje) {
    return { alerta: 'encerrado', diasRestantes: null, duracaoDias }
  }

  if (inicio <= hoje && hoje <= fim) {
    return { alerta: 'ativo', diasRestantes: 0, duracaoDias }
  }

  const diasAteInicio = diffDays(hoje, inicio)

  if (diasAteInicio <= 7) {
    return { alerta: 'warn7', diasRestantes: diasAteInicio, duracaoDias }
  }

  if (diasAteInicio <= 30) {
    return { alerta: 'warn30', diasRestantes: diasAteInicio, duracaoDias }
  }

  return { alerta: 'normal', diasRestantes: diasAteInicio, duracaoDias }
}

export function enriquecerOffs(
  offs: PeriodoOff[],
  membros: MembroTime[],
  hoje: string,
): PeriodoOffComAlerta[] {
  const membrosMap = new Map(membros.map((m) => [m.id, m]))
  const fallbackMembro: MembroTime = {
    id: '', tipo: 'efetivo', nome: 'Desconhecido', papel: '', ativo: false, createdAt: '',
  }

  // Filtrar encerrados há mais de 30 dias
  const limiteEncerrado = new Date(hoje + 'T00:00:00')
  limiteEncerrado.setDate(limiteEncerrado.getDate() - 30)
  const limiteStr = limiteEncerrado.toISOString().split('T')[0]

  return offs
    .filter((off) => off.fim >= limiteStr)
    .map((off) => {
      const { alerta, diasRestantes, duracaoDias } = calcularAlerta(off.inicio, off.fim, hoje)
      const membro = membrosMap.get(off.membroId) ?? fallbackMembro
      return { ...off, membro, alerta, diasRestantes, duracaoDias }
    })
    .sort((a, b) => {
      // Encerrados no final
      if (a.alerta === 'encerrado' && b.alerta !== 'encerrado') return 1
      if (a.alerta !== 'encerrado' && b.alerta === 'encerrado') return -1
      // Ordenar por inicio ASC
      return a.inicio.localeCompare(b.inicio)
    })
}

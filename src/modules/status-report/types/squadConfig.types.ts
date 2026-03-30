import type { SquadRole } from '@/modules/squads/services/squadsService'

export type StoryPointsMethod =
  | 'fibonacci'
  | 'tshirt'
  | 'linear'
  | 'powers_of_two'
  | 'planning_poker'

export interface Cerimonia {
  id: string
  nome: string
  dia: string
  duracao: string
}

export type TipoMembro = 'efetivo' | 'temporario'

export interface MembroTime {
  id: string
  tipo: TipoMembro
  userId?: string              // user_id do Supabase (efetivos sempre têm, temporários podem ter)
  nome: string
  email?: string               // read-only para efetivos
  papel: string                // papel funcional no contexto do Time
  squadRole?: SquadRole        // role no squad (qa_lead, qa, stakeholder) — só efetivos
  avatarColor?: string
  ativo: boolean
  // Campos exclusivos de temporários
  motivo?: string              // "Rotação", "Reforço", "Suporte técnico"
  periodoInicio?: string       // quando começa a rotação
  periodoFim?: string          // quando termina a rotação
  createdAt: string
}

export type TipoOff = 'ferias' | 'off' | 'licenca' | 'feriado'

export interface PeriodoOff {
  id: string
  membroId: string
  tipo: TipoOff
  inicio: string
  fim: string
  observacao?: string
  createdAt: string
}

export type AlertaProximidade = 'normal' | 'warn30' | 'warn7' | 'ativo' | 'encerrado'

export interface PeriodoOffComAlerta extends PeriodoOff {
  membro: MembroTime
  alerta: AlertaProximidade
  diasRestantes: number | null
  duracaoDias: number
}

export interface SquadConfigState {
  squadId: string | null

  // Combinados
  dor: string[]
  dod: string[]
  acordos: string[]
  cerimonias: Cerimonia[]
  storyPointsMethod: StoryPointsMethod
  storyPointsNotas: string

  // Time
  membros: MembroTime[]        // efetivos (do squad) + temporários (rotação)
  offs: PeriodoOff[]

  // Meta
  updatedAt: string
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { getMasterIndex } from '@/modules/sprints/services/persistence'
import { getMasterIndex as getReportIndex } from '@/modules/status-report/services/statusReportPersistence'
import { listMySquads, listAllUsers } from '@/modules/squads/services/squadsService'
import type { SprintIndexEntry } from '@/modules/sprints/types/sprint.types'
import type { StatusReportIndexEntry } from '@/modules/status-report/types/statusReport.types'

interface CardStats {
  sprints: { active: number; concluded: number }
  reports: { count: number; totalItems: number }
  cadastros: { squads: number; users: number }
}

function useStats(): CardStats {
  const [stats, setStats] = useState<CardStats>({
    sprints: { active: 0, concluded: 0 },
    reports: { count: 0, totalItems: 0 },
    cadastros: { squads: 0, users: 0 },
  })

  useEffect(() => {
    // Sync (localStorage)
    const sprintIndex: SprintIndexEntry[] = getMasterIndex()
    const active = sprintIndex.filter((s) => s.status !== 'concluida').length
    const concluded = sprintIndex.filter((s) => s.status === 'concluida').length

    const reportIndex: StatusReportIndexEntry[] = getReportIndex()
    const totalItems = reportIndex.reduce((a, r) => a + r.itemCount, 0)

    setStats((prev) => ({
      ...prev,
      sprints: { active, concluded },
      reports: { count: reportIndex.length, totalItems },
    }))

    // Async (Supabase)
    Promise.all([
      listMySquads().catch(() => []),
      listAllUsers().catch(() => []),
    ]).then(([squads, users]) => {
      setStats((prev) => ({
        ...prev,
        cadastros: { squads: squads.length, users: users.length },
      }))
    })
  }, [])

  return stats
}

// ─── SVG Icons (matching Sidebar style) ──────────────────────────────────────

const IconSprints = () => (
  <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2.5L3.5 5.5v4c0 4.2 2.8 7.2 6.5 8.5 3.7-1.3 6.5-4.3 6.5-8.5v-4L10 2.5z" />
    <circle cx="9.5" cy="9.5" r="2.8" />
    <path d="M11.5 11.5l2 2" strokeWidth="1.8" />
  </svg>
)

const IconStatusReport = () => (
  <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 16V12" strokeWidth="2.2" />
    <path d="M8 16V9" strokeWidth="2.2" />
    <path d="M12 16V6" strokeWidth="2.2" />
    <path d="M11 5l3-2.5" strokeWidth="1.6" />
    <path d="M12.5 2.5H14V4" strokeWidth="1.2" />
  </svg>
)

const IconSquads = () => (
  <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="6.5" r="2.5" />
    <path d="M5.5 16c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
    <circle cx="4" cy="8.5" r="1.8" />
    <path d="M1.5 15c0-1.8 1.1-3.2 2.5-3.5" />
    <circle cx="16" cy="8.5" r="1.8" />
    <path d="M18.5 15c0-1.8-1.1-3.2-2.5-3.5" />
  </svg>
)

const IconReleases = () => (
  <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2L6 8h3v5h2V8h3L10 2z" />
    <path d="M6 15h8" />
    <path d="M7 17h6" />
  </svg>
)

const IconDocs = () => (
  <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4c1.5-.8 3.5-1 5-1 1.5 0 2.5.5 2.5.5" />
    <path d="M3 4v12c1.5-.5 3.5-.5 5-.2 1.5.3 2.5.7 2.5.7" />
    <path d="M17 4c-1.5-.8-3.5-1-5-1-1.5 0-2.5.5-2.5.5" />
    <path d="M17 4v12c-1.5-.5-3.5-.5-5-.2-1.5.3-2.5.7-2.5.7" />
    <path d="M10.5 3.5v13" />
  </svg>
)

// ─── NavCard ─────────────────────────────────────────────────────────────────

interface NavCardProps {
  icon: React.ReactNode
  title: string
  description: string
  stats: { label: string; value: string | number }[]
  color: string
  onClick: () => void
}

function NavCard({ icon, title, description, stats, color, onClick }: NavCardProps) {
  return (
    <button
      onClick={onClick}
      aria-label={title}
      className="home-nav-card"
      style={{
        '--card-color': color,
        display: 'flex', flexDirection: 'column',
        padding: 20,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'var(--font-family-sans)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 160,
      } as React.CSSProperties}
    >
      {/* Color bar top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3, background: color,
      }} />

      {/* Icon + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>
            {description}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        {stats.map((s, i) => (
          <div key={i}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .home-nav-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; border-color: var(--card-color) !important; }
      `}</style>
    </button>
  )
}

// ─── DashboardHome ──────────────────────────────────────────────────────────

export function DashboardHome() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const stats = useStats()

  const firstName = (profile?.display_name ?? '').split(' ')[0] || 'Usuário'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: 'var(--color-text)',
          margin: 0,
        }}>
          Olá, {firstName}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '4px 0 0' }}>
          Hub de Qualidade — O que deseja fazer hoje?
        </p>
      </div>

      {/* Cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 14,
      }}>
        <NavCard
          icon={<IconSprints />}
          title="Cobertura QA"
          description="Gerencie a cobertura de testes das sprints"
          color="var(--color-blue)"
          stats={[
            { label: 'Ativas', value: stats.sprints.active },
            { label: 'Concluídas', value: stats.sprints.concluded },
          ]}
          onClick={() => navigate('/sprints')}
        />

        <NavCard
          icon={<IconStatusReport />}
          title="Status Report"
          description="Relatórios de status e visão geral dos projetos"
          color="var(--color-amber-mid)"
          stats={[
            { label: 'Reports', value: stats.reports.count },
            { label: 'Itens', value: stats.reports.totalItems },
          ]}
          onClick={() => navigate('/status-report')}
        />

        <NavCard
          icon={<IconReleases />}
          title="Releases"
          description="Calendário, homologação e ciclo de releases"
          color="var(--color-blue)"
          stats={[
            { label: 'Gerenciar', value: '\u2192' },
          ]}
          onClick={() => navigate('/releases')}
        />

        <NavCard
          icon={<IconSquads />}
          title="Cadastros"
          description="Squads, membros, perfis de acesso e usuários"
          color="var(--color-green-mid)"
          stats={[
            { label: 'Squads', value: stats.cadastros.squads },
            { label: 'Usuários', value: stats.cadastros.users },
          ]}
          onClick={() => navigate('/squads')}
        />

        <NavCard
          icon={<IconDocs />}
          title="Documentação"
          description="Guia do sistema"
          color="var(--color-blue)"
          stats={[
            { label: 'Consultar', value: '→' },
          ]}
          onClick={() => navigate('/docs')}
        />
      </div>
    </div>
  )
}

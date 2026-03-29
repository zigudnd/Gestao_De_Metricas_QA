import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { getMasterIndex } from '@/modules/sprints/services/persistence'
import { getMasterIndex as getReportIndex } from '@/modules/status-report/services/statusReportPersistence'
import type { SprintIndexEntry } from '@/modules/sprints/types/sprint.types'
import type { StatusReportIndexEntry } from '@/modules/status-report/types/statusReport.types'

interface CardStats {
  sprints: { active: number; concluded: number; totalBugs: number }
  reports: { count: number; totalItems: number }
}

function useStats(): CardStats {
  const [stats, setStats] = useState<CardStats>({
    sprints: { active: 0, concluded: 0, totalBugs: 0 },
    reports: { count: 0, totalItems: 0 },
  })

  useEffect(() => {
    const sprintIndex: SprintIndexEntry[] = getMasterIndex()
    const active = sprintIndex.filter((s) => s.status !== 'concluida').length
    const concluded = sprintIndex.filter((s) => s.status === 'concluida').length

    const reportIndex: StatusReportIndexEntry[] = getReportIndex()
    const totalItems = reportIndex.reduce((a, r) => a + r.itemCount, 0)

    setStats({
      sprints: { active, concluded, totalBugs: 0 },
      reports: { count: reportIndex.length, totalItems },
    })
  }, [])

  return stats
}

// ─── SVG Icons (matching Sidebar style) ──────────────────────────────────────

const IconSprints = () => (
  <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="3" width="15" height="14" rx="2" />
    <path d="M2.5 7.5h15" />
    <path d="M7 3v4.5" />
    <path d="M13 3v4.5" />
    <path d="M6 11h2" />
    <path d="M6 13.5h2" />
    <path d="M10 11h4" />
    <path d="M10 13.5h4" />
  </svg>
)

const IconStatusReport = () => (
  <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="2.5" width="14" height="15" rx="2" />
    <path d="M6.5 6.5h7" />
    <path d="M6.5 9.5h5" />
    <path d="M6.5 12.5h7" />
    <path d="M6.5 15.5h3" />
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
      style={{
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
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
        e.currentTarget.style.borderColor = color
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.borderColor = 'var(--color-border)'
      }}
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
          background: color + '15',
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
          O que deseja fazer hoje?
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
          title="Sprints"
          description="Dashboard de métricas QA"
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
          description="Relatórios de status do SM"
          color="#f59e0b"
          stats={[
            { label: 'Reports', value: stats.reports.count },
            { label: 'Itens', value: stats.reports.totalItems },
          ]}
          onClick={() => navigate('/status-report')}
        />

        <NavCard
          icon={<IconSquads />}
          title="Squads"
          description="Equipes e permissões"
          color="#10b981"
          stats={[
            { label: 'Gerenciar', value: '→' },
          ]}
          onClick={() => navigate('/squads')}
        />

        <NavCard
          icon={<IconDocs />}
          title="Documentação"
          description="Guia do sistema"
          color="#8b5cf6"
          stats={[
            { label: 'Consultar', value: '→' },
          ]}
          onClick={() => navigate('/docs')}
        />
      </div>
    </div>
  )
}

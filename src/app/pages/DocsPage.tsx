import { useState } from 'react'

// ─── Section types ────────────────────────────────────────────────────────────

interface DocSection {
  id: string
  icon: string
  title: string
  group?: string  // nome do grupo (Geral, Sprints, Status Reports, Squads)
  content: React.ReactNode
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12, marginTop: 0 }}>{children}</h2>
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6, marginTop: 16 }}>{children}</h3>
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.7, margin: '0 0 10px' }}>{children}</p>
}

function MetricCard({ name, icon, what, why, how }: { name: string; icon: string; what: string; why: string; how?: string }) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 12, background: 'var(--color-bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <strong style={{ fontSize: 14, color: 'var(--color-text)' }}>{name}</strong>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <P><strong>O que é:</strong> {what}</P>
        <P><strong>Por que medir:</strong> {why}</P>
        {how && <P><strong>Como é calculado:</strong> {how}</P>}
      </div>
    </div>
  )
}

function Chip({ label, color = 'var(--color-blue)' }: { label: string; color?: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${color}22`, color, border: `1px solid ${color}44`, marginRight: 6, marginBottom: 4 }}>
      {label}
    </span>
  )
}

// ─── Sections content ─────────────────────────────────────────────────────────

const SECTIONS: DocSection[] = [
  {
    id: 'overview',
    icon: '🧭',
    title: 'Sobre o Sistema',
    group: 'Geral',
    content: (
      <div>
        <H2>ToStatos — QA Metrics Dashboard</H2>
        <P>
          O <strong>ToStatos</strong> é uma plataforma de gestão de métricas de qualidade de software voltada para
          times de QA. Centraliza o acompanhamento de sprints, casos de teste, bugs, impedimentos e indicadores
          de saúde do processo de testes — tudo em tempo real, com persistência local e suporte a sincronização remota.
        </P>
        <P>
          Foi projetado para eliminar o uso de planilhas manuais no acompanhamento de QA, oferecendo uma visão
          estruturada e baseada em dados sobre a qualidade de cada entrega.
        </P>
        <H3>Principais funcionalidades</H3>
        <ul style={{ paddingLeft: 18, lineHeight: 2, fontSize: 13, color: 'var(--color-text-2)' }}>
          <li>Gestão de múltiplas Sprints com métricas independentes</li>
          <li>Suites de teste organizadas por plataforma (Android, iOS, BFF, etc.)</li>
          <li>Casos de teste com status, complexidade e cenários Gherkin</li>
          <li>Rastreamento de bugs com severidade, stack, MTTR e retestes</li>
          <li>Burndown Chart com progresso real vs ideal</li>
          <li>QA Health Score calculado automaticamente</li>
          <li>Registro de blockers/impedimentos com horas bloqueadas</li>
          <li>Daily Report por data e exportação de métricas</li>
          <li>Alinhamentos técnicos registrados por funcionalidade</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'kpis',
    icon: '📊',
    title: 'Metricas KPI',
    group: 'Cobertura QA',
    content: (
      <div>
        <H2>Cards de KPI — Dashboard de Resumo</H2>
        <P>Os cards de KPI (Key Performance Indicators) fornecem uma visão instantânea do estado da sprint atual. Cada card é atualizado em tempo real conforme os dados são inseridos.</P>

        <MetricCard
          name="Status da Sprint"
          icon="🏃"
          what="Indicador visual do ritmo atual da sprint: 'No Ritmo', 'Atenção' ou 'Em Atraso'."
          why="Permite ao QA Lead identificar imediatamente se a sprint está saudável ou se ações corretivas são necessárias."
          how="Compara a quantidade de testes executados até hoje com a meta diária acumulada (Meta por Dia × Dias decorridos)."
        />
        <MetricCard
          name="QA Health Score"
          icon="❤️"
          what="Pontuação de 0 a 100% que representa a saúde geral do processo de QA na sprint."
          why="Oferece uma nota única e objetiva sobre a qualidade da sprint, facilitando reportes para gestores e stakeholders."
          how="Calculado subtraindo penalidades de: bugs críticos, bugs de alta severidade, retestes excessivos, funcionalidades bloqueadas e atraso acumulado. Pesos configuráveis na aba Configurações."
        />
        <MetricCard
          name="Total de Testes"
          icon="🧪"
          what="Soma de todos os casos de teste cadastrados na sprint (gherkin + manuais)."
          why="Define o escopo total de validação. Serve como denominador base para todas as métricas de execução."
        />
        <MetricCard
          name="Meta por Dia"
          icon="🎯"
          what="Quantidade de testes que devem ser executados por dia para concluir a sprint no prazo."
          why="Calibra o ritmo diário da equipe. Sem essa referência, é impossível saber se o time está adiantado ou atrasado."
          how="Total de Testes ÷ Dias de Sprint configurados."
        />
        <MetricCard
          name="Executados"
          icon="✅"
          what="Total de casos de teste marcados como Concluído ou Falhou até o momento."
          why="Mede o avanço real da execução. Inclui casos que falharam pois eles foram de fato executados."
        />
        <MetricCard
          name="Restantes"
          icon="⏳"
          what="Quantidade de casos de teste ainda não executados (status Pendente ou Bloqueado)."
          why="Indica o volume de trabalho que ainda precisa ser realizado para completar o escopo."
          how="Total de Testes − Executados."
        />
        <MetricCard
          name="Atraso %"
          icon="📉"
          what="Percentual do escopo total que está em atraso em relação à meta acumulada."
          why="Transforma o atraso em uma métrica proporcional, comparável entre sprints de tamanhos diferentes."
          how="(Casos em Atraso ÷ Total de Testes) × 100."
        />
        <MetricCard
          name="Atraso em Casos"
          icon="🔢"
          what="Número absoluto de casos de teste que deveriam ter sido executados e ainda não foram."
          why="Quantifica o débito de execução de forma concreta, facilitando o planejamento de recuperação."
          how="(Meta por Dia × Dias decorridos) − Executados. Mínimo 0."
        />
        <MetricCard
          name="Bugs Abertos"
          icon="🐞"
          what="Contagem de bugs com status 'Aberto' ou 'Em Andamento'."
          why="Reflete a carga de defeitos ativos que precisam ser resolvidos antes da entrega."
        />
        <MetricCard
          name="Telas Bloqueadas"
          icon="🛑"
          what="Quantidade de funcionalidades com status 'Bloqueada'."
          why="Indica funcionalidades que não podem ser testadas, afetando diretamente o escopo executável."
        />
        <MetricCard
          name="Total Retestes"
          icon="🔁"
          what="Soma de todos os retestes realizados nos bugs da sprint."
          why="Retestes excessivos indicam instabilidade no ambiente ou na qualidade das correções. Penaliza o Health Score."
        />
        <MetricCard
          name="Horas Bloqueadas"
          icon="⏱️"
          what="Total de horas produtivas perdidas por impedimentos registrados."
          why="Materializa o impacto financeiro e de prazo dos blockers. Essencial para relatórios de retrospectiva."
        />
        <MetricCard
          name="MTTR Global"
          icon="🔧"
          what="Mean Time to Repair — Tempo Médio de Resolução de bugs, em dias."
          why="Mede a velocidade de resposta do time de desenvolvimento. Um MTTR alto indica gargalos no fluxo de correção."
          how="Média de (Data de Resolução − Data de Abertura) de todos os bugs com status Resolvido."
        />
        <MetricCard
          name="Defeitos Prevenidos"
          icon="🛡️"
          what="Total de bugs encontrados na sprint, independentemente do status (abertos, em andamento ou resolvidos)."
          why="Representa o valor gerado pelo QA ao interceptar defeitos antes de chegarem à produção. Quanto maior, melhor."
        />
        <MetricCard
          name="Impacto Prevenido"
          icon="⭐"
          what="Score ponderado que mede o valor dos defeitos prevenidos levando em conta a criticidade de cada bug."
          why="Diferencia uma sprint que encontrou 10 bugs críticos de uma que encontrou 10 bugs baixos — ambas têm o mesmo Defeitos Prevenidos, mas Impacto Prevenidos muito diferentes."
          how="Σ (peso_severidade × qtd_bugs_daquela_severidade). Pesos configuráveis na aba Configurações de cada sprint."
        />
        <MetricCard
          name="Índice de Retrabalho"
          icon="🔁"
          what="Percentual de ciclos de validação que foram retestes — mede o quanto do esforço do QA é consumido revalidando correções que já foram entregues."
          why="Revela a qualidade das correções entregues pelo time de desenvolvimento. Um índice alto significa que o QA está preso em retrabalho e não consegue avançar em cenários novos."
          how="Σ retests / (total_bugs + Σ retests) × 100. Interpretação: 0–10% Excelente | 10–20% Normal | 20–35% Atenção | 35%+ Crítico."
        />
      </div>
    ),
  },
  {
    id: 'charts',
    icon: '📈',
    title: 'Graficos',
    group: 'Cobertura QA',
    content: (
      <div>
        <H2>Gráficos e Visualizações</H2>

        <H3>📉 Burndown Chart</H3>
        <P>
          Mostra a evolução do volume de testes restantes ao longo dos dias da sprint, comparando a linha real com a linha ideal.
          A linha ideal representa o ritmo perfeito de execução. Pontos em vermelho indicam dias sem execução (possíveis blockers ou feriados).
          Permite identificar visualmente o ritmo de entrega e antecipar riscos de não conclusão do escopo.
        </P>

        <H3>🧪 Progresso de Testes por Funcionalidade</H3>
        <P>
          Gráfico de barras horizontais empilhadas que mostra a distribuição dos casos de teste por status
          (Concluído, Falhou, Bloqueado, Pendente) para cada funcionalidade. Agrupado por Suite de Testes.
          Permite identificar quais funcionalidades estão bloqueadas ou com alta taxa de falha.
        </P>

        <H3>🔴 Bloqueios por Motivo (Hoje)</H3>
        <P>
          Gráfico de rosca (doughnut) mostrando a distribuição das horas bloqueadas por motivo no dia atual.
          Útil para o Daily Report e para identificar padrões recorrentes de impedimento.
        </P>

        <H3>🐞 Bugs por Stack</H3>
        <P>
          Gráfico de barras agrupadas mostrando a distribuição de bugs por stack (Front, BFF, Back, Mobile, Infra)
          separados por status (Aberto, Em Andamento, Resolvido). Revela qual camada da aplicação concentra mais defeitos.
        </P>

        <H3>⚙️ MTTR por Stack e Criticidade</H3>
        <P>
          Gráfico de barras agrupadas mostrando o tempo médio de resolução (em dias) de bugs resolvidos,
          segmentado por stack e severidade. Ajuda a identificar onde o processo de correção é mais lento.
        </P>

        <H3>🥧 Bugs por Stack (Pizza)</H3>
        <P>
          Gráfico de pizza com a distribuição proporcional de todos os bugs registrados por stack.
          Oferece uma visão rápida de qual área concentra o maior volume de defeitos.
        </P>
      </div>
    ),
  },
  {
    id: 'tests',
    icon: '🧪',
    title: 'Gestao de Testes',
    group: 'Cobertura QA',
    content: (
      <div>
        <H2>Suites, Funcionalidades e Casos de Teste</H2>

        <H3>Suites de Testes</H3>
        <P>
          Uma Suite agrupa funcionalidades de uma mesma plataforma ou módulo (ex: Android, iOS, BFF, Web).
          Permitem filtrar a visão da dashboard por contexto, facilitando o acompanhamento de times que testam múltiplas plataformas em paralelo.
        </P>

        <H3>Funcionalidades</H3>
        <P>
          Representam telas, fluxos ou módulos do sistema que precisam ser validados. Cada funcionalidade pode ter:
        </P>
        <ul style={{ paddingLeft: 18, lineHeight: 2, fontSize: 13, color: 'var(--color-text-2)' }}>
          <li>Status: <Chip label="Ativa" color="var(--color-green)" /> <Chip label="Bloqueada" color="var(--color-red)" /> <Chip label="Cancelada" color="#6b7280" /></li>
          <li>Imagem de referência (mockup)</li>
          <li>Casos de Teste vinculados</li>
          <li>Motivo de bloqueio ou alinhamento de cancelamento</li>
        </ul>
        <P>Ao cancelar uma funcionalidade, o sistema exige o preenchimento de um alinhamento técnico que fica registrado na aba Alinhamentos.</P>

        <H3>Casos de Teste</H3>
        <P>
          Cada caso representa um cenário de validação. Possui:
        </P>
        <ul style={{ paddingLeft: 18, lineHeight: 2, fontSize: 13, color: 'var(--color-text-2)' }}>
          <li>Status: <Chip label="Pendente" color="var(--color-blue)" /> <Chip label="Concluído" color="var(--color-green)" /> <Chip label="Falhou" color="var(--color-red)" /> <Chip label="Bloqueado" color="var(--color-yellow)" /></li>
          <li>Complexidade: Baixa, Moderada, Alta</li>
          <li>Data de execução (convertida em D1, D2...)</li>
          <li>Cenário Gherkin (Given/When/Then)</li>
        </ul>
        <P>Ao marcar um caso como <strong>Concluído</strong>, o sistema solicita a data de execução.</P>
        <P>Ao marcar um caso como <strong>Falhou</strong>, o sistema abre o modal de cadastro de bug pré-preenchido com o nome da funcionalidade e do caso.</P>
      </div>
    ),
  },
  {
    id: 'bugs',
    icon: '🐞',
    title: 'Gestao de Bugs',
    group: 'Cobertura QA',
    content: (
      <div>
        <H2>Rastreamento de Bugs</H2>
        <P>
          O módulo de bugs rastreia todos os defeitos encontrados durante a sprint, com informações suficientes para
          análise de qualidade, MTTR e priorização de correções.
        </P>

        <H3>Campos de um Bug</H3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['ID', 'Identificador único editável (ex: BUG-123456)'],
            ['Descrição', 'Relato do defeito encontrado'],
            ['Funcionalidade', 'Tela ou módulo onde o bug foi encontrado'],
            ['Stack', 'Camada técnica: Front, BFF, Back, Mobile, Infra'],
            ['Severidade', 'Crítica, Alta, Média ou Baixa'],
            ['Status', 'Aberto, Em Andamento ou Resolvido'],
            ['Responsável', 'Dev ou time que irá corrigir'],
            ['Data de Abertura', 'Usada para calcular o MTTR'],
            ['Data de Resolução', 'Registrada ao mudar status para Resolvido'],
            ['Retestes', 'Contador de retestes. Incrementado automaticamente ao marcar status como Falhou, ou manualmente pelo QA.'],
            ['Notas', 'Observações, passos para reproduzir, contexto adicional'],
          ].map(([field, desc]) => (
            <div key={field} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px', background: 'var(--color-bg)' }}>
              <strong style={{ fontSize: 12, color: 'var(--color-text)', display: 'block', marginBottom: 4 }}>{field}</strong>
              <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>{desc}</span>
            </div>
          ))}
        </div>

        <H3>Fluxo de Status</H3>
        <P>
          <Chip label="Aberto" color="var(--color-red)" /> → <Chip label="Em Andamento" color="var(--color-yellow)" /> → <Chip label="Falhou" color="#f97316" /> → <Chip label="Resolvido" color="var(--color-green)" />
        </P>
        <P>Ao mover para <strong>Falhou</strong>, o sistema incrementa automaticamente o contador de retestes — evitando registro manual e alimentando o Índice de Retrabalho.</P>
        <P>Ao mover para <strong>Resolvido</strong>, o sistema solicita a data de resolução, que é usada no cálculo do MTTR.</P>
      </div>
    ),
  },
  {
    id: 'blockers',
    icon: '🛑',
    title: 'Blockers',
    group: 'Cobertura QA',
    content: (
      <div>
        <H2>Blockers / Impedimentos</H2>
        <P>
          Registra os impedimentos que interromperam ou atrasaram a execução dos testes durante a sprint.
          Cada registro contém uma data, o motivo do bloqueio e a quantidade de horas produtivas perdidas.
        </P>
        <H3>Por que registrar blockers?</H3>
        <ul style={{ paddingLeft: 18, lineHeight: 2, fontSize: 13, color: 'var(--color-text-2)' }}>
          <li>Evidenciar o impacto real de dependências externas no cronograma</li>
          <li>Embasar conversas de retrospectiva com dados concretos</li>
          <li>Alimentar o KPI "Horas Bloqueadas" do dashboard</li>
          <li>Identificar padrões recorrentes de impedimento ao longo das sprints</li>
        </ul>
        <H3>Motivos pré-definidos</H3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {['Ambiente indisponível', 'Bloqueio de dependência externa', 'Falta de requisitos/documentação',
            'Bug crítico impedindo testes', 'Indisponibilidade de recurso humano', 'Aguardando aprovação de deploy'].map((r) => (
            <Chip key={r} label={r} color="#6b7280" />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'alignments',
    icon: '🤝',
    title: 'Alinhamentos',
    group: 'Cobertura QA',
    content: (
      <div>
        <H2>Alinhamentos Técnicos</H2>
        <P>
          Espaço para registrar decisões técnicas, acordos entre QA e desenvolvimento, e comunicações relevantes
          ocorridas durante a sprint. Funciona como um log de decisões rastreável.
        </P>
        <P>
          Alinhamentos são criados automaticamente quando uma funcionalidade é cancelada (com o texto do motivo de cancelamento),
          ou manualmente pelo QA a qualquer momento.
        </P>
        <H3>Exemplos de uso</H3>
        <ul style={{ paddingLeft: 18, lineHeight: 2, fontSize: 13, color: 'var(--color-text-2)' }}>
          <li>Registro de escopo removido por decisão do PO</li>
          <li>Acordo de comportamento esperado diferente do especificado</li>
          <li>Confirmação de bug known issue ou won't fix</li>
          <li>Definição de critérios de aceite alterados durante a sprint</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'health',
    icon: '❤️',
    title: 'QA Health Score',
    group: 'Cobertura QA',
    content: (
      <div>
        <H2>QA Health Score — Fórmula e Pesos</H2>
        <P>
          O QA Health Score é um índice de 0 a 100% que representa a saúde do processo de qualidade na sprint.
          É calculado subtraindo penalidades de 100, onde cada fator negativo tem um peso configurável.
        </P>
        <H3>Fatores de penalização</H3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['Bugs Críticos', 'Cada bug crítico aberto penaliza o score proporcionalmente ao peso configurado.', '#ef4444'],
            ['Bugs Alta', 'Bugs de alta severidade têm penalidade menor que críticos.', '#f97316'],
            ['Bugs Média', 'Penalidade leve para bugs de severidade média.', '#f59e0b'],
            ['Bugs Baixa', 'Penalidade mínima para bugs de baixa severidade.', '#10b981'],
            ['Retestes', 'Retestes excessivos indicam instabilidade e penalizam o score.', '#8b5cf6'],
            ['Funcionalidades Bloqueadas', 'Cada tela bloqueada reduz o score.', '#ef4444'],
            ['Atraso', 'O percentual de atraso é convertido em penalidade.', '#3b82f6'],
          ].map(([factor, desc, color]) => (
            <div key={factor as string} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color as string, flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong style={{ fontSize: 13, color: 'var(--color-text)' }}>{factor as string}</strong>
                <P>{desc as string}</P>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.7, margin: '12px 0 10px' }}>Os pesos de cada fator são configuráveis na aba <strong>Configurações</strong> de cada sprint.</p>
        <H3>Interpretação</H3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
          <div style={{ padding: '8px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#15803d' }}>≥ 90% — Excelente</div>
          <div style={{ padding: '8px 14px', background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#a16207' }}>70–89% — Atenção</div>
          <div style={{ padding: '8px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{'< 70% — Crítico'}</div>
        </div>
      </div>
    ),
  },
  {
    id: 'prevention',
    icon: '⭐',
    title: 'Impacto Prevenido',
    group: 'Cobertura QA',
    content: (
      <div>
        <H2>Impacto Prevenido — Score de Prevenção de Defeitos</H2>
        <P>
          O Impacto Prevenido quantifica o <strong>valor gerado pelo QA</strong> ao encontrar bugs durante a sprint,
          ponderando cada defeito pela sua criticidade. Diferente do simples contador de bugs (Defeitos Prevenidos),
          o Impacto Prevenido reconhece que interceptar um bug crítico antes da produção tem impacto muito maior
          do que interceptar um bug de baixa severidade.
        </P>

        <H3>Fórmula</H3>
        <div style={{ padding: '12px 16px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, color: 'var(--color-text)', marginBottom: 12 }}>
          Impacto Prevenido = Σ (peso_severidade × qtd_bugs_daquela_severidade)
        </div>
        <P>Exemplo: 2 bugs Críticos (×10) + 1 bug Alto (×5) + 3 bugs Médios (×3) + 2 bugs Baixos (×1) = <strong>36 pts</strong></P>

        <H3>Pesos padrão por severidade</H3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {[
            ['Crítica', '10', '#ef4444'],
            ['Alta', '5', '#f97316'],
            ['Média', '3', '#f59e0b'],
            ['Baixa', '1', '#10b981'],
          ].map(([sev, peso, color]) => (
            <div key={sev} style={{ padding: '10px 16px', border: `1px solid ${color}44`, borderRadius: 8, background: `${color}11`, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{sev}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{peso}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>pontos</div>
            </div>
          ))}
        </div>
        <P>Os pesos são configuráveis individualmente na aba <strong>Configurações</strong> de cada sprint, na seção "Impacto Prevenido — Pesos por Severidade".</P>

        <H3>Diferença entre Defeitos Prevenidos e Impacto Prevenido</H3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '12px 14px', background: 'var(--color-bg)' }}>
            <strong style={{ fontSize: 13, color: 'var(--color-text)', display: 'block', marginBottom: 6 }}>🛡️ Defeitos Prevenidos</strong>
            <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>Contagem simples de todos os bugs encontrados. Sprint A com 10 bugs = Sprint B com 10 bugs.</span>
          </div>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '12px 14px', background: 'var(--color-bg)' }}>
            <strong style={{ fontSize: 13, color: 'var(--color-text)', display: 'block', marginBottom: 6 }}>⭐ Impacto Prevenido</strong>
            <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>Score ponderado. Sprint A com 10 bugs críticos tem score 100. Sprint B com 10 bugs baixos tem score 10.</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'status-report',
    icon: '📄',
    title: 'Status Report',
    group: 'Status Reports',
    content: (
      <div>
        <H2>Modulo Status Report</H2>
        <P>
          O Status Report e uma ferramenta de comunicacao semanal que consolida o andamento dos trabalhos do squad em um relatorio
          visual e exportavel. Diferente do modulo de Sprints (focado em execucao de testes QA), o Status Report tem foco em
          <strong> visibilidade para stakeholders e gerencia</strong> — mostrando o que esta em andamento, o que foi entregue,
          o que esta bloqueado e o que esta no backlog.
        </P>

        <H3>Listagem de Reports</H3>
        <P>
          A pagina inicial do modulo (<strong>/status-report</strong>) lista todos os reports criados, com filtros por status
          (Ativos, Concluidos, Favoritos), busca por titulo/squad e filtro por data. Cada report mostra titulo, squad, quantidade
          de itens e data da ultima atualizacao.
        </P>
        <P>Acoes disponiveis por report:</P>
        <ul style={{ paddingLeft: 18, lineHeight: 2, fontSize: 13, color: 'var(--color-text-2)' }}>
          <li><strong>Favoritar</strong> — marca o report com estrela para acesso rapido</li>
          <li><strong>Concluir / Reativar</strong> — muda o status do report (concluido fica com borda verde)</li>
          <li><strong>Duplicar</strong> — cria uma copia completa do report com todos os itens</li>
          <li><strong>Migrar itens</strong> — copia ou move itens de um report para outro (ex: transicao de sprint)</li>
          <li><strong>Excluir</strong> — remove permanentemente com confirmacao</li>
        </ul>

        <H3>Editor de Report</H3>
        <P>
          Ao abrir um report, o editor organiza os itens em <strong>secoes customizaveis</strong> (ex: Sprint Atual, Implantados,
          Debitos Tecnicos, Aguardando Producao, Fila de Teste, Backlog). Cada secao tem uma cor e pode ser posicionada na
          coluna esquerda ou direita do preview.
        </P>
        <P>
          O editor permite criar, editar e mover itens entre secoes. As setas de mover ficam visiveis ao passar o mouse sobre um item.
          Secoes podem ser criadas, renomeadas, recoloridas e reordenadas via o botao <strong>Gerenciar secoes</strong>.
        </P>

        <H3>Secoes padrao</H3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          <Chip label="Sprint Atual" color="#f59e0b" />
          <Chip label="Implantados" color="#10b981" />
          <Chip label="Debitos Tecnicos" color="#ef4444" />
          <Chip label="Aguardando Producao" color="#06b6d4" />
          <Chip label="Fila de Teste" color="#8b5cf6" />
          <Chip label="Backlog" color="#6b7280" />
        </div>
      </div>
    ),
  },
  {
    id: 'sr-items',
    icon: '📋',
    title: 'Itens do Report',
    group: 'Status Reports',
    content: (
      <div>
        <H2>Itens do Status Report</H2>
        <P>
          Cada item representa uma entrega, tarefa ou demanda que precisa ser acompanhada. Os itens sao o nucleo do Status Report —
          e a partir deles que o sistema calcula progresso, atrasos, dependencias e gera o relatorio visual.
        </P>

        <H3>Campos de um Item</H3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['Titulo', 'Nome descritivo da tarefa ou entrega'],
            ['Secao', 'Em qual secao o item esta (Sprint, Backlog, etc.)'],
            ['Prioridade', 'Alta, Media ou Baixa — define a borda colorida do item'],
            ['Stacks', 'Plataformas envolvidas: iOS, Android, BFF, Back'],
            ['% Conclusao', 'Progresso de 0 a 100% (slider com step de 5)'],
            ['Responsavel', 'Pessoa ou time responsavel pelo item'],
            ['Duracao (dias)', 'Estimativa em dias corridos'],
            ['Data de Inicio', 'Inicio manual ou calculado por predecessores'],
            ['Deadline', 'Data limite fixa (sobrescreve calculo automatico)'],
            ['Predecessores', 'Itens que precisam terminar antes deste comecar'],
            ['Notas', 'Sub-itens ou observacoes (cada linha = sub-item no preview)'],
            ['Link Jira', 'Referencia ao ticket no Jira ou ferramenta de gestao'],
          ].map(([field, desc]) => (
            <div key={field} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px', background: 'var(--color-bg)' }}>
              <strong style={{ fontSize: 12, color: 'var(--color-text)', display: 'block', marginBottom: 4 }}>{field}</strong>
              <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>{desc}</span>
            </div>
          ))}
        </div>

        <H3>Prioridade e cores</H3>
        <P>A borda esquerda de cada item indica sua prioridade:</P>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ padding: '8px 14px', borderLeft: '4px solid #ef4444', borderRadius: 8, background: 'var(--color-bg)', fontSize: 13, fontWeight: 600 }}>Alta</div>
          <div style={{ padding: '8px 14px', borderLeft: '4px solid #f59e0b', borderRadius: 8, background: 'var(--color-bg)', fontSize: 13, fontWeight: 600 }}>Media</div>
          <div style={{ padding: '8px 14px', borderLeft: '4px solid #10b981', borderRadius: 8, background: 'var(--color-bg)', fontSize: 13, fontWeight: 600 }}>Baixa</div>
        </div>

        <H3>Dependencias e Gantt</H3>
        <P>
          Itens podem ter <strong>predecessores</strong> — outros itens que precisam terminar antes dele comecar.
          Quando um item tem predecessores, sua data de inicio e calculada automaticamente como o dia seguinte ao fim
          do ultimo predecessor. Se a cadeia de dependencias forma um ciclo, o sistema detecta e sinaliza com badge <Chip label="CICLO" color="#b45309" />.
        </P>
        <P>
          A aba <strong>Gantt</strong> exibe todos os itens com datas em uma timeline visual, com barras de progresso,
          linhas de dependencia (curvas Bezier) e indicador do dia atual (linha vermelha). Itens atrasados recebem badge <Chip label="ATRASO" color="var(--color-red)" />.
        </P>

        <H3>Formulario de criacao</H3>
        <P>
          Ao adicionar um item, o formulario exibe campos essenciais (titulo, secao, prioridade, stacks, %, responsavel)
          e um toggle <strong>Mais opcoes</strong> que revela campos avancados (datas, predecessores, notas, Jira).
          Atalhos: <Chip label="Enter" color="var(--color-blue)" /> confirma, <Chip label="Ctrl+Enter" color="var(--color-blue)" /> submete, <Chip label="Esc" color="#6b7280" /> cancela.
        </P>
      </div>
    ),
  },
  {
    id: 'sr-dashboard',
    icon: '📊',
    title: 'Dashboard do Report',
    group: 'Status Reports',
    content: (
      <div>
        <H2>Dashboard de KPIs do Status Report</H2>
        <P>
          O dashboard aparece no topo do editor e mostra indicadores derivados automaticamente dos itens cadastrados.
          E colapsavel — clique no header para expandir/recolher. Quando colapsado, ainda mostra o resumo (total de itens + % concluido).
        </P>

        <H3>Indicadores</H3>
        <MetricCard
          name="Progresso Geral"
          icon="🎯"
          what="Media percentual de conclusao de todos os itens do report."
          why="Resposta imediata para 'estamos no prazo?' — a metrica mais pedida em cerimonias."
          how="Media aritmetica de item.pct de todos os itens."
        />
        <MetricCard
          name="Itens Atrasados"
          icon="🔴"
          what="Quantidade de itens cuja data de fim calculada ja passou e o progresso esta abaixo de 100%."
          why="Alerta visual que muda o tom da conversa de status para plano de acao."
        />
        <MetricCard
          name="Sem Data"
          icon="⚠️"
          what="Itens sem data de inicio e sem deadline definido."
          why="Item sem prazo e item invisivel no Gantt — parece controlado mas ninguem esta cobrando."
        />
        <MetricCard
          name="Risco Cadeia"
          icon="🔗"
          what="Itens que dependem de outros itens que estao atrasados."
          why="Efeito cascata — um atraso contamina N itens downstream. Permite acao preventiva."
        />
        <MetricCard
          name="Alta Prioridade Parados"
          icon="🚨"
          what="Itens com prioridade alta e progresso abaixo de 30%."
          why="O mais perigoso: prioridade declarada alta mas sem progresso real."
        />

        <H3>Barras horizontais</H3>
        <P>O dashboard tambem exibe tres colunas de barras horizontais:</P>
        <ul style={{ paddingLeft: 18, lineHeight: 2, fontSize: 13, color: 'var(--color-text-2)' }}>
          <li><strong>Por Secao</strong> — distribuicao de itens entre as secoes (cores da secao)</li>
          <li><strong>Por Responsavel</strong> — carga de trabalho por pessoa (top 6, com "+N outros")</li>
          <li><strong>Por Stack</strong> — cobertura por plataforma (iOS, Android, BFF, Back)</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'sr-preview',
    icon: '📤',
    title: 'Preview e Export',
    group: 'Status Reports',
    content: (
      <div>
        <H2>Preview e Exportacao do Report</H2>

        <H3>Preview Report</H3>
        <P>
          A aba <strong>Preview Report</strong> mostra o relatorio em formato visual de 2 colunas (esquerda/direita),
          pronto para compartilhar. Secoes sem itens sao ocultadas automaticamente. Cada item e numerado dentro da secao
          e mostra: titulo, progresso %, responsavel e stacks.
        </P>

        <H3>Copiar relatorio</H3>
        <P>
          O botao <strong>Copiar relatorio</strong> gera texto formatado para clipboard, pronto para colar em
          Slack, Teams ou email. O formato e texto puro com secoes, itens numerados e sub-itens.
        </P>

        <H3>Exportar JPG</H3>
        <P>
          O botao <strong>Exportar JPG</strong> captura a area do preview como imagem via html2canvas.
          Durante a geracao, o botao exibe "Gerando..." e fica desabilitado. A imagem e baixada automaticamente.
        </P>

        <H3>Indicador de sincronizacao</H3>
        <P>
          No header do editor, ao lado do titulo, um indicador mostra o estado de sincronizacao:
        </P>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-green)' }} />
            <span style={{ color: 'var(--color-text-2)' }}>Salvo HH:MM — dados sincronizados</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-amber-mid)' }} />
            <span style={{ color: 'var(--color-text-2)' }}>Salvando... — persistencia em andamento</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'sr-combinados',
    icon: '🤝',
    title: 'Combinados do Time',
    group: 'Status Reports',
    content: (
      <div>
        <H2>Combinados do Time</H2>
        <P>
          A aba <strong>Combinados do time</strong> documenta os acordos e padroes de trabalho do squad.
          Esses dados sao <strong>globais do squad</strong> — compartilhados entre todos os reports, nao pertencem
          a um report especifico. Servem como referencia rapida para onboarding de novos membros e para
          manter a consistencia entre sprints.
        </P>

        <H3>Secoes</H3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ border: '1px solid var(--color-border)', borderLeft: '4px solid #378ADD', borderRadius: 8, padding: '12px 14px', background: 'var(--color-bg)' }}>
            <strong style={{ fontSize: 13, color: 'var(--color-text)', display: 'block', marginBottom: 4 }}>Definition of Ready (DoR)</strong>
            <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>Criterios que uma historia precisa atender antes de entrar na sprint. Ex: "Historia tem criterios de aceite definidos e aprovados pelo PO".</span>
          </div>
          <div style={{ border: '1px solid var(--color-border)', borderLeft: '4px solid #10b981', borderRadius: 8, padding: '12px 14px', background: 'var(--color-bg)' }}>
            <strong style={{ fontSize: 13, color: 'var(--color-text)', display: 'block', marginBottom: 4 }}>Definition of Done (DoD)</strong>
            <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>Criterios que definem quando uma historia esta realmente pronta. Ex: "Codigo revisado, testes unitarios passando, smoke test pelo QA".</span>
          </div>
          <div style={{ border: '1px solid var(--color-border)', borderLeft: '4px solid #f59e0b', borderRadius: 8, padding: '12px 14px', background: 'var(--color-bg)' }}>
            <strong style={{ fontSize: 13, color: 'var(--color-text)', display: 'block', marginBottom: 4 }}>Cerimonias</strong>
            <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>Reunioes recorrentes do squad com nome, dia/horario e duracao. Ex: "Daily — Seg a Sex, 09h30, 15 min".</span>
          </div>
          <div style={{ border: '1px solid var(--color-border)', borderLeft: '4px solid #8b5cf6', borderRadius: 8, padding: '12px 14px', background: 'var(--color-bg)' }}>
            <strong style={{ fontSize: 13, color: 'var(--color-text)', display: 'block', marginBottom: 4 }}>Story Points</strong>
            <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>Escala de estimativa adotada pelo time. Opcoes: Fibonacci, T-Shirt, Linear, Powers of 2, Planning Poker. Apenas uma ativa por vez.</span>
          </div>
          <div style={{ border: '1px solid var(--color-border)', borderLeft: '4px solid #06b6d4', borderRadius: 8, padding: '12px 14px', background: 'var(--color-bg)' }}>
            <strong style={{ fontSize: 13, color: 'var(--color-text)', display: 'block', marginBottom: 4 }}>Acordos de Trabalho</strong>
            <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>Regras de convivencia e processo do time. Ex: "PR respondidos em ate 4h", "Daily com maximo de 15 min".</span>
          </div>
        </div>

        <H3>Como funciona</H3>
        <P>
          Todas as secoes sao colapsaveis independentemente. Itens podem ser adicionados via campo inline + Enter ou botao + Add.
          Itens podem ser editados clicando no texto e removidos com o botao × que aparece no hover.
          Os dados persistem no localStorage e sincronizam com Supabase em tempo real.
        </P>
      </div>
    ),
  },
  {
    id: 'sr-time',
    icon: '👥',
    title: 'Time e Calendario',
    group: 'Status Reports',
    content: (
      <div>
        <H2>Time e Calendario</H2>
        <P>
          A aba <strong>Time e Calendario</strong> registra os membros do squad e seus periodos de ausencia.
          Assim como os Combinados, esses dados sao <strong>globais do squad</strong>.
        </P>

        <H3>Membros do Time</H3>
        <P>
          Cada membro tem nome e papel (Dev Mobile iOS, QA, Tech Lead, etc.).
          O avatar exibe as 2 iniciais do nome com cor baseada no papel.
          Membros podem ser adicionados e removidos a qualquer momento.
        </P>
        <P>Papeis disponiveis:</P>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {['Dev Mobile iOS', 'Dev Mobile Android', 'Dev Backend', 'Dev BFF', 'QA', 'Tech Lead', 'Scrum Master', 'Product Owner', 'Designer'].map((p) => (
            <Chip key={p} label={p} color="var(--color-blue)" />
          ))}
        </div>

        <H3>Periodos de Off / Ferias</H3>
        <P>
          Registra ausencias planejadas dos membros (ferias, day off, licenca, feriado).
          Cada periodo tem membro, tipo, data de inicio e data de fim.
          A tabela exibe automaticamente alertas visuais baseados na proximidade do periodo:
        </P>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {[
            ['Agendado', 'Verde', 'Periodo agendado com mais de 30 dias de antecedencia', 'var(--color-green-light)', 'var(--color-green)'],
            ['Em 30 dias', 'Amarelo', 'Faltam 30 dias ou menos para o inicio do periodo', '#FAEEDA', '#92400E'],
            ['Em 7 dias', 'Laranja', 'Faltam 7 dias ou menos — urgente para planejamento', '#FDE8D8', '#C2410C'],
            ['Em curso', 'Verde', 'Periodo ativo — membro esta ausente agora', 'var(--color-green-light)', 'var(--color-green)'],
            ['Encerrado', 'Cinza', 'Periodo ja terminou (linha com opacidade reduzida)', 'var(--color-surface-2)', 'var(--color-text-3)'],
          ].map(([label, , desc, bg, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg)' }}>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                background: bg as string, color: color as string, flexShrink: 0, marginTop: 2,
              }}>{label}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>{desc}</span>
            </div>
          ))}
        </div>

        <H3>Coluna "Faltam"</H3>
        <P>
          Mostra quantos dias faltam para o inicio do periodo: <strong>Xd</strong> para dias no futuro,
          <strong> hoje</strong> quando o periodo comeca no dia atual, e <strong>—</strong> para periodos encerrados.
        </P>

        <H3>Ordenacao</H3>
        <P>
          A tabela e ordenada por data de inicio (proximas ferias primeiro). Periodos encerrados ficam no final da lista
          e sao automaticamente removidos apos 30 dias do fim.
        </P>
      </div>
    ),
  },
  {
    id: 'squads-overview',
    icon: '👥',
    title: 'Squads e Equipes',
    group: 'Cadastros',
    content: (
      <div>
        <H2>Squads — Gestao de Equipes</H2>
        <P>
          Squads sao equipes que agrupam membros e sprints. Cada squad tem nome, descricao e cor personalizada.
          <strong> Use quando:</strong> voce precisa organizar quem tem acesso a quais sprints e reports,
          controlar permissoes de exclusao por membro, ou separar visibilidade entre equipes diferentes.
        </P>

        <H3>Como funciona</H3>
        <P>
          A pagina de Squads (<strong>/squads</strong>) tem 3 abas:
        </P>
        <ul style={{ paddingLeft: 18, lineHeight: 2, fontSize: 13, color: 'var(--color-text-2)' }}>
          <li><strong>👥 Squads</strong> — cards expansiveis com membros, roles e permissoes inline</li>
          <li><strong>🔐 Perfis de Acesso</strong> — templates de permissao reutilizaveis (4 de sistema + custom)</li>
          <li><strong>👤 Usuarios</strong> — somente admin: criar, editar, ativar/desativar, resetar senha</li>
        </ul>

        <H3>Roles e Permissoes</H3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {[
            ['Admin (global)', 'Acesso total ao sistema: criar usuarios, gerenciar todos os squads, alterar roles globais. Definido no perfil do usuario, nao no squad.', 'var(--color-amber)'],
            ['QA Lead (squad)', 'Lider do squad: pode adicionar/remover membros, editar permissoes, excluir o squad. Atribuido automaticamente ao criador do squad.', 'var(--color-blue)'],
            ['QA (squad)', 'Membro padrao: executa operacoes dentro do squad conforme suas permissoes individuais. Pode sair do squad por conta propria.', 'var(--color-green)'],
            ['Stakeholder (squad)', 'Visibilidade: acesso de leitura ao squad e seus dados. Sem permissoes de exclusao por padrao.', 'var(--color-text-3)'],
          ].map(([role, desc, color]) => (
            <div key={role as string} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color as string, flexShrink: 0, marginTop: 4 }} />
              <div>
                <strong style={{ fontSize: 13, color: 'var(--color-text)' }}>{role as string}</strong>
                <P>{desc as string}</P>
              </div>
            </div>
          ))}
        </div>

        <H3>Permissoes Granulares</H3>
        <P>
          Cada membro de um squad tem 7 permissoes individuais de exclusao que controlam o que ele pode apagar:
        </P>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {['Sprints', 'Bugs', 'Funcionalidades', 'Casos de Teste', 'Suites', 'Bloqueios', 'Alinhamentos'].map((p) => (
            <Chip key={p} label={`Excluir ${p}`} color="var(--color-blue)" />
          ))}
        </div>
        <P>
          <strong>Dica:</strong> use os Perfis de Acesso para aplicar conjuntos de permissoes predefinidos ao adicionar membros,
          em vez de configurar cada permissao individualmente.
        </P>

        <H3>Perfis de Acesso (templates)</H3>
        <P>O sistema vem com 4 perfis de sistema (nao editaveis):</P>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[
            ['Somente Leitura', 'Nenhuma permissao de exclusao. Ideal para stakeholders.'],
            ['QA Padrao', 'Pode excluir bugs, casos de teste, bloqueios e alinhamentos.'],
            ['QA Senior', 'Pode excluir tudo exceto sprints.'],
            ['Acesso Total', 'Todas as permissoes. Equivalente a QA Lead.'],
          ].map(([name, desc]) => (
            <div key={name} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px', background: 'var(--color-bg)' }}>
              <strong style={{ fontSize: 12, color: 'var(--color-text)', display: 'block', marginBottom: 4 }}>{name}</strong>
              <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>{desc}</span>
            </div>
          ))}
        </div>
        <P>Admins podem criar perfis customizados na aba Perfis de Acesso.</P>

        <H3>Gestao de Usuarios (Admin)</H3>
        <P>
          Na aba Usuarios (visivel apenas para admins), e possivel:
        </P>
        <ul style={{ paddingLeft: 18, lineHeight: 2, fontSize: 13, color: 'var(--color-text-2)' }}>
          <li><strong>Criar usuario</strong> — com senha temporaria (troca obrigatoria no primeiro login)</li>
          <li><strong>Resetar senha</strong> — gera nova senha temporaria com flag de troca obrigatoria</li>
          <li><strong>Editar</strong> — alterar nome e role global (admin/user)</li>
          <li><strong>Ativar/Desativar</strong> — desativar sem excluir (preserva historico)</li>
          <li><strong>Filtrar</strong> — por role (Admin/User), status (Ativo/Inativo) e busca por nome/email/squad</li>
        </ul>

        <H3>Visibilidade de Sprints</H3>
        <P>
          Sprints vinculadas a um squad so sao visiveis para membros daquele squad.
          Admins veem todas as sprints. Sprints sem squad (pessoais/legado) sao visiveis para todos os usuarios autenticados.
        </P>
      </div>
    ),
  },
  {
    id: 'author',
    icon: '👤',
    title: 'Sobre o Autor',
    group: 'Sobre',
    content: (
      <div>
        <H2>Sobre o Autor</H2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: '20px 24px', background: 'var(--color-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#0c447c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20, flexShrink: 0 }}>
                JR
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text)' }}>Jhonny Robert</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 2 }}>QA Engineer · Software Developer</div>
                <a
                  href="https://www.linkedin.com/in/jhonny-robert/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12, fontWeight: 600, color: '#0a66c2', textDecoration: 'none' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  linkedin.com/in/jhonny-robert
                </a>
              </div>
            </div>
            <P>
              Profissional de Qualidade de Software com experiência em processos de QA, automação de testes e gestão de métricas em times ágeis.
              O ToStatos nasceu da necessidade real de uma ferramenta que centralizasse e tornasse visual o trabalho diário de um QA em sprints.
            </P>
            <P>
              O sistema foi construído com foco em praticidade: sem dependência de internet para uso básico, sem necessidade de conta ou cadastro,
              e com todos os dados salvos localmente no navegador do usuário.
            </P>
          </div>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: '16px 20px', background: 'var(--color-bg)' }}>
            <strong style={{ fontSize: 13, color: 'var(--color-text)', display: 'block', marginBottom: 8 }}>Stack utilizada no sistema</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['React 19', 'TypeScript', 'Vite', 'Zustand', 'Chart.js', 'React Router', 'Node.js/Express', 'Supabase'].map((t) => (
                <Chip key={t} label={t} color="var(--color-blue)" />
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'license',
    icon: '📜',
    title: 'Licenca de Uso',
    group: 'Sobre',
    content: (
      <div>
        <H2>Licença de Uso e Direitos Autorais</H2>
        <div style={{ border: '2px solid var(--color-border)', borderRadius: 12, padding: '20px 24px', background: 'var(--color-bg)', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', marginBottom: 12 }}>
            ToStatos — Proprietary Software License
          </div>
          <P>
            Copyright © 2025–{new Date().getFullYear()} <strong>Jhonny Robert</strong>. Todos os direitos reservados.
          </P>
          <P>
            Este software é de propriedade exclusiva do autor. O uso pessoal e interno é permitido sem restrições.
            Qualquer redistribuição, venda, sublicenciamento ou uso comercial do código-fonte ou do sistema compilado
            requer autorização prévia e expressa do autor.
          </P>
        </div>

        <H3>Permissões</H3>
        <ul style={{ paddingLeft: 18, lineHeight: 2, fontSize: 13, color: 'var(--color-text-2)' }}>
          <li>✅ Uso pessoal e interno em times de QA</li>
          <li>✅ Modificações para uso próprio sem redistribuição</li>
          <li>✅ Criação de sprints e gerenciamento de dados locais</li>
        </ul>

        <H3>Restrições</H3>
        <ul style={{ paddingLeft: 18, lineHeight: 2, fontSize: 13, color: 'var(--color-text-2)' }}>
          <li>❌ Redistribuição do código-fonte ou binários sem autorização</li>
          <li>❌ Uso comercial ou cobrança por acesso ao sistema</li>
          <li>❌ Remoção de avisos de direitos autorais</li>
          <li>❌ Atribuição de autoria a terceiros</li>
        </ul>

        <H3>Dados e Privacidade</H3>
        <P>
          Todos os dados inseridos no sistema são armazenados exclusivamente no navegador do usuário (localStorage).
          Nenhum dado é enviado a servidores externos, exceto quando a sincronização remota opcional for ativada
          com as credenciais do próprio usuário (Supabase self-hosted).
        </P>

        <div style={{ marginTop: 16, padding: '12px 16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 12, color: '#0369a1' }}>
          Para solicitações de licença comercial, parcerias ou contribuições, entre em contato com o autor.
        </div>
      </div>
    ),
  },
]

// ─── DocsPage ─────────────────────────────────────────────────────────────────

export function DocsPage() {
  const [active, setActive] = useState('overview')
  const current = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0]

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Nav sidebar */}
      <nav style={{ width: 220, flexShrink: 0, position: 'sticky', top: 0 }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(() => {
            let lastGroup = ''
            return SECTIONS.map((s) => {
              const showGroup = s.group && s.group !== lastGroup
              lastGroup = s.group ?? ''
              return (
                <div key={s.id}>
                  {showGroup && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      padding: s.id === 'overview' ? '6px 10px 4px' : '12px 10px 4px',
                    }}>
                      {s.group}
                    </div>
                  )}
                  <button
                    onClick={() => setActive(s.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: 'none',
                      background: active === s.id ? 'var(--color-blue-light)' : 'transparent',
                      color: active === s.id ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                      fontWeight: active === s.id ? 700 : 500,
                      fontSize: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--font-family-sans)',
                      width: '100%',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{s.icon}</span>
                    {s.title}
                  </button>
                </div>
              )
            })
          })()}
        </div>
      </nav>

      {/* Content */}
      <div
        style={{
          flex: 1,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: '24px 28px',
          minHeight: 400,
        }}
      >
        {current.content}
      </div>
    </div>
  )
}

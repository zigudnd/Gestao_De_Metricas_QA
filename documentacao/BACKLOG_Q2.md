# BACKLOG Q2 2026 — ToStatos
**PM:** Marina Caldas | **Criado:** 27/03/2026

---

## ÉPICO 1: Quality & Trust (Sprint 1-2)

### [STORY-01] Testes E2E de KPIs do Sprint Dashboard
**Como** QA Lead
**Quero** testes automatizados que validem os cálculos de KPIs (Health Score, MTTR, Capacidade Real, Indice de Retrabalho)
**Para** garantir que refatorações não quebrem métricas usadas em decisões críticas

**Critérios de aceite:**
- [ ] CA01 — Health Score calcula penalidades corretas por severidade de bug
- [ ] CA02 — Capacidade Real desconta features Bloqueadas e casos Bloqueados
- [ ] CA03 — MTTR calcula média em horas dos bugs Resolvidos com openedAt/resolvedAt
- [ ] CA04 — Índice de Retrabalho = retestes / (totalBugs + retestes) * 100
- [ ] CA05 — execPercent usa testesExecutaveis como base (não totalTests)

**Story Points:** 5 | **Prioridade:** Alta

---

### [STORY-02] Auditoria de Alterações (Audit Trail)
**Como** Admin
**Quero** ver um histórico de quem alterou o quê em cada sprint/report
**Para** rastrear mudanças, debugar problemas e cumprir LGPD

**Critérios de aceite:**
- [ ] CA01 — Tabela `audit_logs` no Supabase com: user_id, resource_type, resource_id, action, changes, created_at
- [ ] CA02 — Cada _commit do sprintStore e statusReportStore registra log
- [ ] CA03 — UI: aba ou painel com últimos 50 logs (filtro por recurso)
- [ ] CA04 — Admin pode ver logs de qualquer sprint/report do squad

**Critérios de não-aceite:**
- Não implementa rollback/undo de alterações (apenas visualização)
- Não altera dados existentes (apenas leitura)

**Story Points:** 8 | **Prioridade:** Alta

---

## ÉPICO 2: Analytics (Sprint 3)

### [STORY-03] Comparação de Sprints — Gráficos de Tendência
**Como** SM/PO
**Quero** selecionar 2-5 sprints e ver gráficos de evolução temporal dos KPIs
**Para** identificar tendências e apresentar resultados em retrospectivas

**Critérios de aceite:**
- [ ] CA01 — Seleção de 2 a 5 sprints na ComparePage via checkboxes
- [ ] CA02 — Gráfico de linha: Health Score ao longo das sprints selecionadas
- [ ] CA03 — Gráfico de linha: Bugs Abertos, Resolvidos, MTTR
- [ ] CA04 — Gráfico de barras: execPercent por sprint
- [ ] CA05 — Exportar gráficos como PNG
- [ ] CA06 — Empty state quando menos de 2 sprints selecionadas

**Story Points:** 5 | **Prioridade:** Média

---

### [STORY-04] Validação Avançada do Status Report
**Como** SM
**Quero** que o sistema detecte e previna configurações inválidas de itens
**Para** evitar relatórios com dados inconsistentes

**Critérios de aceite:**
- [ ] CA01 — Sobreposição de datas entre predecessores é sinalizada com warning
- [ ] CA02 — Itens sem data calculável exibem badge "Sem datas" (não somem)
- [ ] CA03 — Toast de feedback ao salvar item ("Salvo" verde por 2s)
- [ ] CA04 — Undo de exclusão de item (toast com botão "Desfazer" por 5s)

**Story Points:** 5 | **Prioridade:** Média

---

## PRIORIZAÇÃO MoSCoW

### Must Have
| História | Pontos | Sprint |
|----------|--------|--------|
| STORY-01 Testes E2E KPIs | 5 | Sprint 1 |
| STORY-02 Auditoria | 8 | Sprint 2 |

### Should Have
| História | Pontos | Sprint |
|----------|--------|--------|
| STORY-03 Comparação Tendência | 5 | Sprint 3 |
| STORY-04 Validação Status Report | 5 | Sprint 3 |

### Won't Have Now
| História | Motivo |
|----------|--------|
| Webhooks Slack/Teams | Descartado pelo PO |
| Mobile Responsivo | Descartado pelo PO |

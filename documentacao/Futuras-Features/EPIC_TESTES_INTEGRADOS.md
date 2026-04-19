# ÉPICO: Cobrança de Testes Integrados por Squad

**Objetivo:** Quando PRs são aprovados em uma release, o sistema deve identificar automaticamente quais squads participaram e cobrar o cadastro de testes integrados na sprint vinculada.

**Módulos impactados:** Releases, Sprints (integrado), Gestão de PRs
**Status:** Em desenvolvimento
**Pontos:** 8

---

## Fluxo de negócio

1. Dev cadastra PR na release em corte (vinculado ao squad)
2. Foundation aprova o PR
3. Sistema identifica: "Squad X teve PR aprovado na Release Y"
4. Quando alguém cria/acessa Sprint Integrada vinculada à Release Y:
   - Sistema mostra quais squads participaram (têm PRs aprovados)
   - Indica quais squads JÁ cadastraram testes integrados
   - Indica quais squads AINDA NÃO cadastraram

---

## Histórias

| ID | História | Pontos | Prioridade | Status |
|---|---|---|---|---|
| STORY-09 | Listar squads com PRs aprovados ao criar/acessar sprint integrada | 3 | Alta | A fazer |
| STORY-10 | Indicador de conformidade: squad cadastrou testes integrados? | 3 | Alta | A fazer |
| STORY-11 | Alerta visual no checkpoint quando squads têm PRs aprovados sem testes | 2 | Média | A fazer |

---

### [STORY-09] Listar squads com PRs aprovados na sprint integrada

**Como** QA Lead / SM
**Quero** ver quais squads têm PRs aprovados na release vinculada à sprint integrada
**Para** saber quem precisa cadastrar testes integrados

**Critérios de aceite:**
- [ ] Ao acessar uma sprint do tipo "integrado" vinculada a uma release, exibir seção "Squads Participantes"
- [ ] Listar squads que têm ao menos 1 PR aprovado na release
- [ ] Mostrar: nome do squad, quantidade de PRs aprovados, status de testes (pendente/cadastrado)
- [ ] Dados vêm da tabela release_prs (PRs aprovados) cruzada com features da sprint

---

### [STORY-10] Indicador de conformidade de testes integrados

**Como** QA Lead
**Quero** ver um indicador visual por squad mostrando se cadastrou testes integrados
**Para** cobrar os squads pendentes

**Critérios de aceite:**
- [ ] Verde "Conforme" quando o squad tem features/test cases cadastrados na sprint integrada
- [ ] Amarelo "Pendente" quando o squad tem PRs aprovados mas 0 testes cadastrados
- [ ] Contagem de testes por squad
- [ ] Badge resumo no topo: "X de Y squads com testes cadastrados"

---

### [STORY-11] Alerta visual no checkpoint

**Como** SM / QA Lead
**Quero** ver no checkpoint da release um alerta quando há squads sem testes integrados
**Para** não esquecer de cobrar antes da homologação

**Critérios de aceite:**
- [ ] No card da release no CheckpointTab, mostrar badge de alerta se há squads pendentes
- [ ] Tooltip ou expandir mostrando quais squads estão pendentes
- [ ] Alerta some quando todos os squads cadastraram testes

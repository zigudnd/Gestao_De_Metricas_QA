---
name: regressivo
description: Executa ciclo completo de regressão de QA — analisa mudanças, define casos de teste, valida, corrige bugs e retesta até tudo passar.
argument-hint: [área específica ou vazio para regressão completa]
---

Você é um QA Sênior especializado neste projeto (ToStatos / Gestão de Métricas QA).
Sua missão é executar um ciclo completo de regressão. Não pare até que todos os testes passem.

## CONTEXTO DO PROJETO

- **Stack:** HTML/CSS/JS puro (frontend) + Node.js/Express (backend local)
- **Arquivos principais:**
  - `public/index.html` — estrutura DOM, IDs, tab layout
  - `public/scripts/model.js` — estado global (`state`), `saveState()`, `normalizeState()`
  - `public/scripts/view.js` — todas as funções de renderização, filtros de suite, gráficos
  - `public/scripts/controller.js` — CRUD de suites/features/casos de teste, imports, exports
  - `server.js` — API Express local (GET/PUT `/api/dashboard/:key`)
- **Estrutura de dados:** `state.suites[]` → `state.features[](suiteId)` → `feature.cases[]`
- **Filtro de suite:** `window._activeSuiteFilter` (Set) controla quais suites aparecem nos KPIs/gráficos

## FASE 1 — LEVANTAMENTO DE MUDANÇAS

Execute os seguintes passos para entender o escopo:

1. `git log --oneline -10` — últimos commits
2. `git diff HEAD~1 --stat` — arquivos alterados no último commit
3. `git diff HEAD~1` — diff completo das mudanças
4. Se `$ARGUMENTS` foi fornecido, foque apenas na área mencionada

Liste claramente:
- Quais funções foram adicionadas, modificadas ou removidas
- Quais IDs do DOM foram adicionados/removidos
- Quais fluxos de dados foram alterados

## FASE 2 — MAPEAMENTO DE IMPACTO

Para cada mudança identificada, mapeie:

**Funções JS:**
- A função foi declarada com `window.nomeFuncao = function()`?
- Ela é chamada em algum `onclick=""` no HTML? O nome bate exatamente?
- Todos os parâmetros que ela recebe são passados corretamente nos `onclick`?

**IDs do DOM:**
- Todo `document.getElementById('id')` no JS tem um elemento com esse `id` no HTML?
- Todo `id=""` referenciado no HTML existe no DOM renderizado?

**Estado (`state`):**
- Novos campos adicionados ao state têm fallback em `normalizeState()`?
- `saveState()` itera corretamente sobre todos os campos novos?
- Dados antigos (sem os novos campos) seriam migrados corretamente?

**Gráficos e KPIs:**
- Funções de renderização usam `getFilteredFeatures()` em vez de `state.features` direto?
- A linha de `renderTables()` que usa índice flat mantém o `isSuiteActive(f.suiteId)` check?

## FASE 3 — EXECUÇÃO DOS TESTES

### 3.1 — Teste de Sintaxe e Referências

Leia cada arquivo alterado e verifique:

```
CHECKLIST DE SINTAXE:
[ ] Todos os `window.funcao = function()` têm chaves fechadas corretamente
[ ] Nenhum uso de variável antes de declaração
[ ] Template literals (backticks) fechadas corretamente
[ ] Nenhum `state.features` direto em funções de métricas (deve ser getFilteredFeatures())
[ ] Funções chamadas no HTML existem no controller.js ou view.js
```

### 3.2 — Teste de Fluxo de Estado

Simule mentalmente o ciclo de vida dos dados:

```
CHECKLIST DE ESTADO:
[ ] DEFAULT_STATE tem todos os campos necessários
[ ] normalizeState() tem fallback para cada novo campo
[ ] saveState() recalcula corretamente exec, tests, gherkinExecs
[ ] Migração de dados antigos (sem suites) funciona via normalizeState()
[ ] _activeSuiteFilter é inicializado como Set() vazio
```

### 3.3 — Teste das Suites de Teste (funcionalidade core)

```
CHECKLIST DE SUITES:
[ ] addSuite() cria suite com ID único e salva
[ ] updateSuite(index, field, value) atualiza corretamente
[ ] removeSuite(index) remove suite E todas suas features (filter por suiteId)
[ ] addFeature(suiteId) atribui suiteId correto à nova feature
[ ] Migração: features sem suiteId recebem o ID da primeira suite
[ ] renderTestCasesAccordion() agrupa features por suiteId corretamente
```

### 3.4 — Teste do Filtro de Suites

```
CHECKLIST DO FILTRO:
[ ] Com 1 suite: barra de filtro NÃO aparece
[ ] Com 2+ suites: barra de filtro aparece entre tabs-nav e tab-1
[ ] toggleSuiteFilter() não permite desmarcar a última suite ativa
[ ] getFilteredFeatures() retorna array vazio de features não-ativas
[ ] updateCalculations() usa getFilteredFeatures() — KPIs refletem o filtro
[ ] renderCharts() usa getFilteredFeatures() — gráficos refletem o filtro
[ ] renderTables() pula features com isSuiteActive(f.suiteId) === false
[ ] clearSuiteFilter() reseta _activeSuiteFilter para new Set()
```

### 3.5 — Teste de Import/Export

```
CHECKLIST DE IMPORT/EXPORT:
[ ] importFeature(event, suiteId) passa suiteId para _importFromFeatureText/CSV/XLSX
[ ] Features criadas no import recebem o suiteId da suite correta
[ ] exportSprintCoverage(suiteId) filtra features pelo suiteId informado
[ ] Nome do arquivo exportado usa o nome da suite (não o título da sprint)
[ ] Botões de import/export estão DENTRO das suites, não no header global
[ ] Header global contém apenas: Template .feature, Template CSV, Nova Suite de Testes
```

### 3.6 — Teste de Export de Imagem

```
CHECKLIST DE EXPORT DE IMAGEM:
[ ] scale: 1.5 (não 2.0)
[ ] formato: image/jpeg com qualidade 0.85
[ ] arquivo gerado tem extensão .jpg
```

### 3.7 — Teste do Servidor

```bash
# Verifique se o servidor inicia sem erros:
node server.js
# Deve imprimir: ✅ Back-end configurado para usar: LOCAL (Pasta data/)
# Deve imprimir: QA Dashboard rodando em http://localhost:3000

# Verifique as rotas:
curl -s http://localhost:3000/api/health
# Esperado: {"ok":true,"service":"qa-dashboard-api","storage":"local"}
```

## FASE 4 — DOCUMENTAÇÃO DE BUGS

Para cada problema encontrado, documente no formato:

```
🐛 BUG #N
Arquivo: caminho/do/arquivo.js (linha X)
Descrição: O que está errado
Impacto: O que quebra por causa disso
Reprodução: Como reproduzir
```

## FASE 5 — CORREÇÃO E RETESTE

Para cada bug documentado:

1. **Corrija** o problema no arquivo correspondente
2. **Reavalie** se a correção não quebra outra coisa (verifique dependências)
3. **Re-execute** os checklists afetados
4. **Confirme** que o bug está resolvido antes de passar ao próximo

> ⚠️ Não marque um bug como resolvido sem retestar. O ciclo só termina quando **todos os checklists estiverem 100% marcados**.

## FASE 6 — RELATÓRIO FINAL

Ao final, produza um relatório no formato:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RELATÓRIO DE REGRESSÃO — [data]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PASSOU:
- [lista de checklists aprovados]

🐛 BUGS ENCONTRADOS E CORRIGIDOS:
- Bug #1: [descrição] → [correção aplicada]
- Bug #2: ...

⚠️ PONTOS DE ATENÇÃO (não são bugs, mas merecem observação):
- ...

📊 RESULTADO: [APROVADO / REPROVADO]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## REGRAS DE OURO

- **Nunca** declare o teste como aprovado sem verificar todos os checklists
- **Nunca** faça uma correção sem retestar o fluxo completo afetado
- Se um bug for corrigido mas introduzir outro, registre o novo como Bug #N+1 e continue o ciclo
- Se `$ARGUMENTS` especificar uma área (ex: "suites", "filtro", "import"), foque apenas nessa área mas ainda execute o checklist completo dela
- Ao final do ciclo, informe claramente o resultado: **APROVADO** ou **REPROVADO com pendências**

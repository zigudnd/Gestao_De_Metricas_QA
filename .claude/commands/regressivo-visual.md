---
allowed-tools: Bash, Read, Write, Glob
description: Executa testes de regressão visual com Playwright de forma eficiente em tokens. Roda os testes existentes via CLI (sem MCP), analisa falhas apenas quando necessário, e gera relatório compacto. Use quando quiser verificar regressões após uma mudança no código.
argument-hint: [--generate] [--run] [--report] [--scope <tab|home|all>]
---

# Teste de regressão visual — QA Dashboard

## Argumento `--generate`
Se `$ARGUMENTS` contiver `--generate`: cria ou atualiza os snapshots de referência (baseline).
Se `$ARGUMENTS` contiver `--run`: executa os testes e compara com baseline.
Se `$ARGUMENTS` contiver `--report`: só exibe o último relatório salvo, sem rodar nada.
Se nenhum for passado: executa `--run` por padrão.

Escopo via `--scope`:
- `--scope home` → testa só a tela Home
- `--scope tab-exec` → só a aba Visão Executiva
- `--scope tab-cases` → só Casos de Teste
- `--scope tab-bugs` → só Bugs
- `--scope all` → todos (padrão)

---

## Regra de ouro — zero MCP durante regressão

**Nunca use o Playwright MCP para rodar testes de regressão.** O MCP retorna árvores de acessibilidade inline no contexto a cada chamada — isso multiplica o custo em tokens.

A estratégia correta é:
1. Os testes Playwright existem como arquivos `.spec.ts` no disco
2. Claude executa via `bash: npx playwright test` — o resultado vai para o terminal e para arquivos HTML/JSON no disco
3. Claude lê apenas o arquivo de resultado (`test-results/regression-report.json`) — não o DOM, não screenshots inline
4. Só abre screenshots individuais se um teste falhar e precisar diagnosticar

---

## Fase 1 — Verificar ambiente

```bash
# Verificar se Playwright está instalado
ls e2e/ 2>/dev/null && echo "pasta e2e existe" || echo "primeira execução"
npx playwright --version 2>/dev/null || echo "playwright não instalado"
ls test-results/baseline/ 2>/dev/null | wc -l
```

Se Playwright não estiver instalado:
```bash
npm install -D @playwright/test
npx playwright install chromium
```

Se a pasta `e2e/` não existir, criar a estrutura:
```bash
mkdir -p e2e/specs e2e/helpers test-results/baseline test-results/current
```

---

## Fase 2 — Setup dos testes (apenas na primeira vez ou com `--generate`)

### playwright.config.ts

Criar ou verificar se existe `playwright.config.ts` na raiz:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/specs',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [
    ['json', { outputFile: 'test-results/regression-report.json' }],
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
```

**Por que headless e sem vídeo/trace:** cada recurso ativo multiplica tokens quando Claude precisa interpretar falhas. Só screenshot on-failure garante que Claude tem evidência sem custo extra.

### e2e/helpers/setup.ts

```typescript
import { Page } from '@playwright/test';

export async function waitForApp(page: Page) {
  await page.waitForLoadState('networkidle');
}

export async function goToHome(page: Page) {
  await page.goto('/#home');
  await page.waitForSelector('[data-testid="sprint-grid"]', { timeout: 10_000 });
}

export async function goToSprint(page: Page, sprintId: string) {
  await page.goto(`/#sprint=${sprintId}`);
  await page.waitForSelector('[data-testid="dashboard-header"]', { timeout: 10_000 });
}

export async function openTab(page: Page, tab: string) {
  await page.click(`[data-testid="tab-${tab}"]`);
  await page.waitForSelector(`[data-testid="tab-content-${tab}"]`);
}
```

**Importante:** os `data-testid` devem existir nos componentes React. Se ainda não existem, adicionar durante a implementação. Eles são mais baratos que seletores CSS frágeis — economizam tokens em depuração de seletores quebrados.

---

## Fase 3 — Specs de regressão

### e2e/specs/home.spec.ts

```typescript
import { test, expect } from '@playwright/test';
import { goToHome } from '../helpers/setup';

test.describe('Home — regressão', () => {

  test('summary bar exibe 4 métricas', async ({ page }) => {
    await goToHome(page);
    const cards = page.locator('[data-testid="summary-card"]');
    await expect(cards).toHaveCount(4);
  });

  test('filtros de chip renderizam', async ({ page }) => {
    await goToHome(page);
    await expect(page.locator('[data-testid="filter-chip"]').first()).toBeVisible();
  });

  test('grid de sprints tem ao menos 1 card', async ({ page }) => {
    await goToHome(page);
    const cards = page.locator('[data-testid="sprint-card"]');
    await expect(cards.first()).toBeVisible();
  });

  test('card bloqueada tem borda vermelha', async ({ page }) => {
    await goToHome(page);
    const blocked = page.locator('[data-testid="sprint-card"][data-status="bloqueada"]').first();
    if (await blocked.count() > 0) {
      await expect(blocked).toHaveCSS('border-left-color', 'rgb(226, 74, 74)');
    }
  });

  test('filtro "Em andamento" esconde sprints concluídas', async ({ page }) => {
    await goToHome(page);
    await page.click('[data-testid="filter-chip"][data-filter="active"]');
    const concluded = page.locator('[data-testid="sprint-card"][data-status="concluida"]');
    await expect(concluded).toHaveCount(0);
  });

  test('modal de nova sprint abre e fecha', async ({ page }) => {
    await goToHome(page);
    await page.click('[data-testid="btn-new-sprint"]');
    await expect(page.locator('[data-testid="modal-new-sprint"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="modal-new-sprint"]')).toBeHidden();
  });

  test('snapshot visual — home completa', async ({ page }) => {
    await goToHome(page);
    await expect(page).toHaveScreenshot('home-full.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

});
```

### e2e/specs/dashboard-exec.spec.ts

```typescript
import { test, expect } from '@playwright/test';
import { goToSprint, openTab } from '../helpers/setup';

const SPRINT_ID = process.env.TEST_SPRINT_ID || 'sprint_test';

test.describe('Dashboard — Visão Executiva', () => {

  test('4 KPI cards visíveis', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await expect(page.locator('[data-testid="kpi-card"]')).toHaveCount(4);
  });

  test('Health Score ring chart renderiza', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'exec');
    await expect(page.locator('[data-testid="health-score-ring"]')).toBeVisible();
  });

  test('Health Score entre 0 e 100', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    const score = await page.locator('[data-testid="health-score-value"]').textContent();
    const n = parseInt(score || '0', 10);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThanOrEqual(100);
  });

  test('breakdown de penalidades visível', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'exec');
    await expect(page.locator('[data-testid="penalty-row"]').first()).toBeVisible();
  });

  test('Burndown Chart renderiza canvas', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'exec');
    await expect(page.locator('[data-testid="burndown-chart"] canvas')).toBeVisible();
  });

  test('lista de funcionalidades tem ao menos 1 item', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'exec');
    await expect(page.locator('[data-testid="feature-summary-row"]').first()).toBeVisible();
  });

  test('feature bloqueada exibe blockReason', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'exec');
    const blocked = page.locator('[data-testid="feature-summary-row"][data-blocked="true"]').first();
    if (await blocked.count() > 0) {
      await expect(blocked.locator('[data-testid="block-reason"]')).toBeVisible();
    }
  });

  test('tabela de acompanhamento diário exibe colunas D1..Dn', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'exec');
    await expect(page.locator('[data-testid="daily-tracking-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="day-column"]').first()).toBeVisible();
  });

  test('snapshot visual — aba executiva', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'exec');
    await expect(page.locator('[data-testid="tab-content-exec"]')).toHaveScreenshot('exec-tab.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

});
```

### e2e/specs/dashboard-cases.spec.ts

```typescript
import { test, expect } from '@playwright/test';
import { goToSprint, openTab } from '../helpers/setup';

const SPRINT_ID = process.env.TEST_SPRINT_ID || 'sprint_test';

test.describe('Dashboard — Casos de Teste', () => {

  test('acordeão de features renderiza', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'cases');
    await expect(page.locator('[data-testid="feature-accordion"]').first()).toBeVisible();
  });

  test('expandir acordeão exibe casos de teste', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'cases');
    await page.click('[data-testid="feature-accordion-header"]');
    await expect(page.locator('[data-testid="test-case-row"]').first()).toBeVisible();
  });

  test('filtros de status dentro do acordeão funcionam', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'cases');
    await page.click('[data-testid="feature-accordion-header"]');
    await page.click('[data-testid="case-filter-Concluído"]');
    const cases = page.locator('[data-testid="test-case-row"]');
    for (const c of await cases.all()) {
      await expect(c.locator('[data-testid="case-status"]')).toHaveText('Concluído');
    }
  });

  test('gherkin exibe ao expandir caso', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'cases');
    await page.click('[data-testid="feature-accordion-header"]');
    await page.click('[data-testid="test-case-row"]');
    await expect(page.locator('[data-testid="gherkin-block"]').first()).toBeVisible();
  });

  test('snapshot visual — aba casos de teste', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'cases');
    await expect(page.locator('[data-testid="tab-content-cases"]')).toHaveScreenshot('cases-tab.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

});
```

### e2e/specs/dashboard-bugs.spec.ts

```typescript
import { test, expect } from '@playwright/test';
import { goToSprint, openTab } from '../helpers/setup';

const SPRINT_ID = process.env.TEST_SPRINT_ID || 'sprint_test';

test.describe('Dashboard — Bugs', () => {

  test('tabela de bugs renderiza', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'bugs');
    await expect(page.locator('[data-testid="bug-table"]')).toBeVisible();
  });

  test('IDs de bug em fonte mono', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'bugs');
    const id = page.locator('[data-testid="bug-id"]').first();
    if (await id.count() > 0) {
      const font = await id.evaluate(el => getComputedStyle(el).fontFamily);
      expect(font.toLowerCase()).toContain('mono');
    }
  });

  test('filtro por severidade funciona', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'bugs');
    await page.click('[data-testid="bug-filter-Crítica"]');
    const rows = page.locator('[data-testid="bug-row"]');
    for (const r of await rows.all()) {
      await expect(r.locator('[data-testid="bug-severity"]')).toHaveText('Crítica');
    }
  });

  test('snapshot visual — aba bugs', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await openTab(page, 'bugs');
    await expect(page.locator('[data-testid="tab-content-bugs"]')).toHaveScreenshot('bugs-tab.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

});
```

### e2e/specs/persistencia.spec.ts

```typescript
import { test, expect } from '@playwright/test';
import { goToHome, goToSprint } from '../helpers/setup';

const SPRINT_ID = process.env.TEST_SPRINT_ID || 'sprint_test';

test.describe('Persistência — regressão crítica', () => {

  test('LocalStorage contém a chave da sprint', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    const key = await page.evaluate((id) =>
      localStorage.getItem(`qaDashboardData_${id}`) !== null, SPRINT_ID);
    expect(key).toBe(true);
  });

  test('Master Index existe no LocalStorage', async ({ page }) => {
    await goToHome(page);
    const index = await page.evaluate(() =>
      localStorage.getItem('qaDashboardMasterIndex'));
    expect(index).not.toBeNull();
  });

  test('alterar status de caso salva no LocalStorage', async ({ page }) => {
    await goToSprint(page, SPRINT_ID);
    await page.click('[data-testid="tab-cases"]');
    await page.click('[data-testid="feature-accordion-header"]');
    await page.click('[data-testid="case-status-select"]');
    await page.click('[data-testid="status-option-Concluído"]');
    const saved = await page.evaluate((id) => {
      const raw = localStorage.getItem(`qaDashboardData_${id}`);
      return raw !== null;
    }, SPRINT_ID);
    expect(saved).toBe(true);
  });

});
```

---

## Fase 4 — Executar os testes

### Gerar baseline (primeira vez ou após mudança intencional de design)

```bash
# Rodar e salvar snapshots de referência
TEST_SPRINT_ID=sprint_test npx playwright test --update-snapshots 2>&1 | tail -20
echo "Baseline salvo em test-results/baseline/"
```

### Rodar regressão

```bash
# Executar todos os testes e salvar resultado em JSON
TEST_SPRINT_ID=sprint_test npx playwright test 2>&1 | tail -30
```

**Por que `tail -30`:** Claude lê apenas as últimas 30 linhas do output do terminal, não o log completo. O arquivo JSON tem todos os detalhes se precisar.

### Rodar escopo específico (economiza tokens e tempo)

```bash
# Só a home
npx playwright test e2e/specs/home.spec.ts 2>&1 | tail -20

# Só exec tab
npx playwright test e2e/specs/dashboard-exec.spec.ts 2>&1 | tail -20

# Só bugs
npx playwright test e2e/specs/dashboard-bugs.spec.ts 2>&1 | tail -20
```

---

## Fase 5 — Analisar resultado

### Leitura eficiente do resultado

Após rodar, ler apenas o resumo do JSON — não o HTML completo:

```bash
node -e "
const r = require('./test-results/regression-report.json');
const failed = r.suites.flatMap(s => s.specs).flatMap(s => s.tests)
  .filter(t => t.status === 'failed' || t.status === 'unexpected');
console.log('Total:', r.stats.expected + r.stats.unexpected);
console.log('Passou:', r.stats.expected);
console.log('Falhou:', r.stats.unexpected);
if (failed.length > 0) {
  console.log('\nFalhas:');
  failed.forEach(t => {
    console.log(' ✗', t.title);
    const msg = t.results?.[0]?.error?.message || '';
    console.log('   ', msg.split('\n')[0]);
  });
}
"
```

### Só abrir screenshot se houver falha visual

```bash
# Listar screenshots de diff gerados (só existem se houve falha visual)
ls test-results/*-diff.png 2>/dev/null || echo "Sem falhas visuais"
```

Se houver diffs, ler **apenas os arquivos de diff** — não todos os screenshots:

```bash
# Ver quais diffs existem antes de abrir
ls -la test-results/*-diff.png 2>/dev/null
```

---

## Fase 6 — Relatório compacto final

Ao terminar, gerar e salvar um relatório de texto simples:

```bash
node -e "
const r = require('./test-results/regression-report.json');
const all = r.suites.flatMap(s => s.specs).flatMap(s => s.tests);
const failed = all.filter(t => t.status !== 'expected');
const lines = [
  '# Relatório de regressão — ' + new Date().toLocaleString('pt-BR'),
  'Passou: ' + r.stats.expected + ' | Falhou: ' + r.stats.unexpected + ' | Total: ' + all.length,
  '',
  failed.length === 0 ? '✓ Sem regressões detectadas.' : '✗ Regressões encontradas:',
  ...failed.map(t => '  - ' + t.title + ': ' + (t.results?.[0]?.error?.message || '').split('\n')[0])
];
const fs = require('fs');
fs.writeFileSync('test-results/ultimo-relatorio.txt', lines.join('\n'));
console.log(lines.join('\n'));
" 2>/dev/null
```

---

## Regras de economia de tokens

1. **CLI em vez de MCP** para tudo que roda em CI ou repetidamente — o MCP é para exploração interativa inicial
2. **`tail -N` em todos os bash commands** — nunca logar output ilimitado no contexto
3. **Ler JSON, não HTML** — o relatório HTML é para humanos no browser, o JSON é para Claude
4. **Screenshots só em falha** (`screenshot: 'only-on-failure'`) — desabilitar vídeo e trace
5. **Escopo por arquivo** quando possível — rodar só o spec da área que mudou
6. **`data-testid` estáveis** — seletores frágeis causam falsos positivos que geram ciclos de debug caros
7. **Relatório em `.txt` plano** — Claude lê texto puro mais eficientemente que JSON grande

---

## data-testids que devem existir nos componentes React

Para que os testes funcionem, adicionar estes atributos durante a implementação:

```
sprint-grid               → div do grid na HomePage
sprint-card               → cada card de sprint
  sprint-card[data-status] → "ativa" | "bloqueada" | "concluida"
filter-chip               → cada chip de filtro
  filter-chip[data-filter] → "all" | "active" | "blocked" | "done"
summary-card              → cada KPI card da barra de resumo
btn-new-sprint            → botão de nova sprint
modal-new-sprint          → o modal
dashboard-header          → header do dashboard
tab-{nome}                → cada botão de tab
tab-content-{nome}        → cada painel de conteúdo
kpi-card                  → cada KPI do dashboard
health-score-ring         → o ring chart do HS
health-score-value        → o número do HS
penalty-row               → cada linha de penalidade
burndown-chart            → wrapper do gráfico
feature-accordion         → cada acordeão de feature
feature-accordion-header  → o header clicável
  feature-accordion[data-blocked] → "true" | "false"
block-reason              → texto do motivo de bloqueio
test-case-row             → cada linha de caso de teste
case-status               → badge de status do caso
case-filter-{status}      → botões de filtro dentro do acordeão
gherkin-block             → bloco do cenário Gherkin
daily-tracking-table      → a tabela de acompanhamento diário
day-column                → cada coluna de dia
feature-summary-row       → linha de feature no painel executivo
bug-table                 → tabela de bugs
bug-row                   → cada linha de bug
bug-id                    → o ID do bug (BUG-001)
bug-severity              → badge de severidade
bug-filter-{sev}          → filtros de severidade
case-status-select        → dropdown de status do caso
status-option-{status}    → cada opção do dropdown
```

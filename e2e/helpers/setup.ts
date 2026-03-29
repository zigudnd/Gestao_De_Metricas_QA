import { Page } from '@playwright/test'

const AUTH_EMAIL = 'admin@tostatos.com'
const AUTH_PASSWORD = 'Admin@123'

/**
 * Faz login via formulário da AuthPage.
 * Se já estiver logado (sessão persistente), pula silenciosamente.
 */
export async function login(page: Page) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')

  // Se já redirecionou para /sprints, está logado
  if (page.url().includes('/sprints')) return

  // Preenche formulário de login
  const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first()
  const passInput = page.locator('input[type="password"]').first()

  await emailInput.fill(AUTH_EMAIL)
  await passInput.fill(AUTH_PASSWORD)

  // Clica no botão Entrar
  await page.locator('button').filter({ hasText: /entrar/i }).click()

  // Aguarda redirecionamento para a home
  await page.waitForURL(/#\/sprints/, { timeout: 15_000 }).catch(() => {
    // pode ter ido para /change-password se for primeiro login
  })
  await page.waitForLoadState('networkidle')
}

export async function waitForApp(page: Page) {
  await page.waitForLoadState('networkidle')
}

export async function goToHome(page: Page) {
  await login(page)
  await page.goto('/#/sprints')
  await page.waitForLoadState('networkidle')
  // Aguarda a sidebar ou conteúdo principal carregar
  await page.waitForTimeout(500)
}

export async function goToSprint(page: Page, sprintId: string) {
  await login(page)
  await page.goto(`/#/sprints/${sprintId}`)
  await page.waitForLoadState('networkidle')
}

export async function goToStatusReport(page: Page) {
  await login(page)
  await page.goto('/#/status-report')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

export async function openTab(page: Page, tab: string) {
  const btn = page.locator(`[data-testid="tab-${tab}"]`)
  if (await btn.count() > 0) {
    await btn.click()
    await page.waitForTimeout(300)
  }
}

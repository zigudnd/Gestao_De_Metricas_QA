import { Page } from '@playwright/test'

const AUTH_EMAIL = 'admin@tostatos.com'
const AUTH_PASSWORD = 'Admin@123'

/**
 * Faz login via formulário da AuthPage.
 * Se o Supabase não estiver rodando (modo local/offline), navega direto.
 */
export async function login(page: Page) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')

  // Se já redirecionou para a app, está logado
  const url = page.url()
  if (!url.includes('/login')) return

  // Tentar login via formulário
  const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first()

  // Se não há input de email (modo sem auth), pular
  if (await emailInput.count() === 0) return

  const passInput = page.locator('input[type="password"]').first()
  await emailInput.fill(AUTH_EMAIL)
  await passInput.fill(AUTH_PASSWORD)
  await page.locator('button').filter({ hasText: /entrar/i }).click()

  // Aguarda redirecionamento (com timeout curto)
  await page.waitForURL(/\/#\/(sprints|$)/, { timeout: 5_000 }).catch(() => {
    // Login pode falhar (sem Supabase) — continuar assim mesmo
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

export async function goToSquads(page: Page) {
  await login(page)
  await page.goto('/#/squads')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

export async function goToDashboardHome(page: Page) {
  await login(page)
  await page.goto('/#/')
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

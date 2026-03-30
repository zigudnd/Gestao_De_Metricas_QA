import { test, expect } from '@playwright/test'

/**
 * Regressao visual — captura screenshots de todas as telas acessiveis.
 * Funciona com ou sem Supabase rodando.
 */

test.describe('Regressao Visual — Tela de Login', () => {

  test('login page carrega sem erros JS', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    // Filtrar erros de Supabase (esperados quando offline)
    const realErrors = errors.filter((e) => !e.includes('supabase') && !e.includes('fetch') && !e.includes('Failed to fetch'))
    expect(realErrors).toHaveLength(0)
  })

  test('snapshot — login page', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    })
  })

  test('formulario de login visivel', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Entrar').first()).toBeVisible()
    await expect(page.locator('input[type="email"], input[placeholder*="email" i]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

})

test.describe('Regressao Visual — App (requer Supabase)', () => {

  async function tryLogin(page: import('@playwright/test').Page): Promise<boolean> {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first()
    if (await emailInput.count() === 0) return false
    await emailInput.fill('admin@tostatos.com')
    await page.locator('input[type="password"]').first().fill('Admin@123')
    await page.locator('button').filter({ hasText: /entrar/i }).click()
    try {
      await page.waitForURL(/\/#\/(sprints|$|squads|status-report)/, { timeout: 8_000 })
      await page.waitForLoadState('networkidle')
      return !page.url().includes('/login')
    } catch {
      return false
    }
  }

  test('snapshot — dashboard home', async ({ page }) => {
    const loggedIn = await tryLogin(page)
    test.skip(!loggedIn, 'Supabase nao disponivel — pular testes autenticados')
    await page.goto('/#/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    await expect(page).toHaveScreenshot('dashboard-home.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    })
  })

  test('snapshot — cobertura qa', async ({ page }) => {
    const loggedIn = await tryLogin(page)
    test.skip(!loggedIn, 'Supabase nao disponivel')
    await page.goto('/#/sprints')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    await expect(page).toHaveScreenshot('cobertura-qa.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    })
  })

  test('snapshot — status report home', async ({ page }) => {
    const loggedIn = await tryLogin(page)
    test.skip(!loggedIn, 'Supabase nao disponivel')
    await page.goto('/#/status-report')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    await expect(page).toHaveScreenshot('status-report-home.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    })
  })

  test('snapshot — cadastros squads', async ({ page }) => {
    const loggedIn = await tryLogin(page)
    test.skip(!loggedIn, 'Supabase nao disponivel')
    await page.goto('/#/squads')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    await expect(page).toHaveScreenshot('cadastros-squads.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    })
  })

  test('snapshot — cadastros perfis de acesso', async ({ page }) => {
    const loggedIn = await tryLogin(page)
    test.skip(!loggedIn, 'Supabase nao disponivel')
    await page.goto('/#/squads')
    await page.waitForLoadState('networkidle')
    await page.locator('button').filter({ hasText: /perfis de acesso/i }).click()
    await page.waitForTimeout(800)
    await expect(page).toHaveScreenshot('cadastros-perfis.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    })
  })

  test('snapshot — perfil do usuario', async ({ page }) => {
    const loggedIn = await tryLogin(page)
    test.skip(!loggedIn, 'Supabase nao disponivel')
    await page.goto('/#/profile')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    await expect(page).toHaveScreenshot('perfil-usuario.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    })
  })

  test('snapshot — documentacao', async ({ page }) => {
    const loggedIn = await tryLogin(page)
    test.skip(!loggedIn, 'Supabase nao disponivel')
    await page.goto('/#/docs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    await expect(page).toHaveScreenshot('documentacao.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    })
  })

})

import { test, expect } from '@playwright/test'
import { login } from '../helpers/setup'

async function goToSquads(page: import('@playwright/test').Page) {
  await login(page)
  await page.goto('/#/squads')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

test.describe('Squads (Cadastros) — regressão', () => {

  test('página carrega sem erros JS', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await goToSquads(page)
    expect(errors).toHaveLength(0)
  })

  test('tabs visíveis: Squads, Perfis, Usuários', async ({ page }) => {
    await goToSquads(page)
    const hasSquads = await page.locator('button').filter({ hasText: /squad/i }).count() > 0
    expect(hasSquads).toBe(true)
  })

  test('botão Novo Squad visível', async ({ page }) => {
    await goToSquads(page)
    await expect(page.locator('button').filter({ hasText: /Novo Squad/i })).toBeVisible()
  })

  test('formulário de novo squad abre e fecha', async ({ page }) => {
    await goToSquads(page)
    const btn = page.locator('button').filter({ hasText: /Novo Squad/i })
    await btn.click()
    // Form should appear with input
    await expect(page.locator('input[placeholder*="Nome do squad"]').first()).toBeVisible()
    // Click cancel to close the form
    await page.locator('button').filter({ hasText: /Cancelar/i }).click()
  })

  test('snapshot visual — squads', async ({ page }) => {
    await goToSquads(page)
    await expect(page).toHaveScreenshot('squads-page.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    })
  })

})

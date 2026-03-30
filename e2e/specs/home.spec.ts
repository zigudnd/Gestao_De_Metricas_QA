import { test, expect } from '@playwright/test'
import { goToHome } from '../helpers/setup'

test.describe('Cobertura QA — regressao', () => {

  test('pagina carrega sem erros JS', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await goToHome(page)
    expect(errors).toHaveLength(0)
  })

  test('sidebar e topbar renderizam', async ({ page }) => {
    await goToHome(page)
    const sidebar = page.locator('body > div').first()
    await expect(sidebar).toBeVisible()
    // Topbar: titulo "Cobertura QA" visivel
    await expect(page.locator('text=Cobertura QA').first()).toBeVisible()
  })

  test('botao de nova sprint existe', async ({ page }) => {
    await goToHome(page)
    const btn = page.locator('button').filter({ hasText: /nova sprint|new sprint|criar/i })
    await expect(btn.first()).toBeVisible()
  })

  test('snapshot visual — cobertura qa home', async ({ page }) => {
    await goToHome(page)
    await expect(page).toHaveScreenshot('home-full.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    })
  })

})

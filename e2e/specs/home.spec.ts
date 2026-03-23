import { test, expect } from '@playwright/test'
import { goToHome } from '../helpers/setup'

test.describe('Home — regressão', () => {

  test('página carrega sem erros JS', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await goToHome(page)
    expect(errors).toHaveLength(0)
  })

  test('sidebar e topbar renderizam', async ({ page }) => {
    await goToHome(page)
    // Sidebar: coluna esquerda estreita com ícones de navegação
    const sidebar = page.locator('body > div').first()
    await expect(sidebar).toBeVisible()
    // Topbar: título "Sprints" visível
    await expect(page.locator('text=Sprints').first()).toBeVisible()
  })

  test('botão de nova sprint existe', async ({ page }) => {
    await goToHome(page)
    const btn = page.locator('button').filter({ hasText: /nova sprint|new sprint|criar/i })
    await expect(btn.first()).toBeVisible()
  })

  test('snapshot visual — home', async ({ page }) => {
    await goToHome(page)
    await expect(page).toHaveScreenshot('home-full.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    })
  })

})

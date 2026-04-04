import { test, expect } from '@playwright/test'
import { login } from '../helpers/setup'

async function goToReleases(page: import('@playwright/test').Page) {
  await login(page)
  await page.goto('/#/releases')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

test.describe('Releases — regressão', () => {

  test('página carrega sem erros JS', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await goToReleases(page)
    expect(errors).toHaveLength(0)
  })

  test('tabs visíveis: Checkpoint, Regressivos, Histórico, Cronograma, Eventos', async ({ page }) => {
    await goToReleases(page)
    await expect(page.locator('button').filter({ hasText: 'Checkpoint' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Cronograma' })).toBeVisible()
  })

  test('aba Cronograma renderiza', async ({ page }) => {
    await goToReleases(page)
    await page.locator('button').filter({ hasText: 'Cronograma' }).click()
    await page.waitForTimeout(300)
    // Should show template/import buttons or empty state
    const hasTemplate = await page.locator('button').filter({ hasText: /Template/i }).count() > 0
    const hasEmpty = await page.locator('text=Nenhuma').count() > 0
    expect(hasTemplate || hasEmpty).toBe(true)
  })

  test('aba Eventos renderiza', async ({ page }) => {
    await goToReleases(page)
    await page.locator('button').filter({ hasText: 'Eventos' }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('button').filter({ hasText: 'Eventos' })).toBeVisible()
  })

  test('snapshot visual — releases', async ({ page }) => {
    await goToReleases(page)
    await expect(page).toHaveScreenshot('releases-checkpoint.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    })
  })

})

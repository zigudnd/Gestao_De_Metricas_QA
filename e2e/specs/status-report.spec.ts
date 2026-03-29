import { test, expect } from '@playwright/test'
import { login } from '../helpers/setup'

async function goToStatusReportHome(page: import('@playwright/test').Page) {
  await login(page)
  await page.goto('/#/status-report')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

async function createAndOpenReport(page: import('@playwright/test').Page, title = 'Test Report') {
  await goToStatusReportHome(page)
  await page.locator('button').filter({ hasText: '+ Novo Report' }).click()
  await page.locator('input[placeholder*="APP"]').fill(title)
  await page.locator('button').filter({ hasText: 'Criar' }).click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

test.describe('Status Report — regressao', () => {

  test('pagina de listagem carrega sem erros JS', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await goToStatusReportHome(page)
    expect(errors).toHaveLength(0)
  })

  test('titulo e botao Novo Report visiveis', async ({ page }) => {
    await goToStatusReportHome(page)
    await expect(page.locator('text=Status Reports').first()).toBeVisible()
    await expect(page.locator('button').filter({ hasText: '+ Novo Report' })).toBeVisible()
  })

  test('criar novo report abre o editor', async ({ page }) => {
    await createAndOpenReport(page, 'Meu Time A')
    // Deve estar na pagina do report com botao voltar e 3 abas
    await expect(page.locator('button').filter({ hasText: 'Editor' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Preview Report' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Gantt' })).toBeVisible()
  })

  test('StatsBar exibe total de itens', async ({ page }) => {
    await createAndOpenReport(page, 'Stats Test')
    await expect(page.locator('text=Total:').first()).toBeVisible()
  })

  test('secoes de cards renderizam no editor', async ({ page }) => {
    await createAndOpenReport(page, 'Sections Test')
    await expect(page.locator('text=Sprint Atual').first()).toBeVisible()
  })

  test('botao voltar retorna para listagem', async ({ page }) => {
    await createAndOpenReport(page, 'Back Test')
    // Clica no botao voltar (seta)
    await page.locator('button[title*="Voltar"]').click()
    await page.waitForLoadState('networkidle')
    // Deve ver a listagem com o report criado
    await expect(page.locator('text=Status Reports').first()).toBeVisible()
    await expect(page.locator('text=Back Test').first()).toBeVisible()
  })

  test('aba Preview renderiza layout', async ({ page }) => {
    await createAndOpenReport(page, 'Preview Test')
    await page.locator('button').filter({ hasText: 'Preview Report' }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('#statusReportExportArea')).toBeVisible()
    await expect(page.locator('button').filter({ hasText: /copiar/i })).toBeVisible()
  })

  test('aba Gantt renderiza ou mostra empty state', async ({ page }) => {
    await createAndOpenReport(page, 'Gantt Test')
    await page.locator('button').filter({ hasText: 'Gantt' }).click()
    await page.waitForTimeout(300)
    const hasSvg = await page.locator('svg').count() > 0
    const hasEmpty = await page.locator('text=Nenhum item').count() > 0
    expect(hasSvg || hasEmpty).toBe(true)
  })

  test('snapshot visual — listagem', async ({ page }) => {
    await goToStatusReportHome(page)
    await expect(page).toHaveScreenshot('status-report-home.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    })
  })

  test('snapshot visual — editor', async ({ page }) => {
    await createAndOpenReport(page, 'Snap Editor')
    await expect(page).toHaveScreenshot('status-report-editor.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    })
  })

})

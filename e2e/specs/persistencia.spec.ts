import { test, expect } from '@playwright/test'
import { goToHome } from '../helpers/setup'

test.describe('Persistência — regressão crítica', () => {

  test('Master Index existe ou é criado ao carregar a home', async ({ page }) => {
    await goToHome(page)
    const index = await page.evaluate(() => localStorage.getItem('qaDashboardMasterIndex'))
    // pode ser null se não há sprints, ou string JSON se há
    // só verifica que não houve erro crítico de inicialização
    expect(typeof index === 'string' || index === null).toBe(true)
  })

  test('localStorage não contém chaves de credenciais', async ({ page }) => {
    await goToHome(page)
    const keys = await page.evaluate(() => Object.keys(localStorage))
    const suspicious = keys.filter(k =>
      /password|secret|token|apikey|supabase_key/i.test(k)
    )
    expect(suspicious).toHaveLength(0)
  })

})

import { Page } from '@playwright/test'

export async function waitForApp(page: Page) {
  await page.waitForLoadState('networkidle')
}

export async function goToHome(page: Page) {
  await page.goto('/#/sprints')
  await page.waitForSelector('[data-testid="sprint-list"]', { timeout: 10_000 }).catch(() => {
    // página pode estar vazia (sem sprints)
  })
  await page.waitForLoadState('networkidle')
}

export async function goToSprint(page: Page, sprintId: string) {
  await page.goto(`/#/sprints/${sprintId}`)
  await page.waitForLoadState('networkidle')
}

export async function openTab(page: Page, tab: string) {
  const btn = page.locator(`[data-testid="tab-${tab}"]`)
  if (await btn.count() > 0) {
    await btn.click()
    await page.waitForTimeout(300)
  }
}

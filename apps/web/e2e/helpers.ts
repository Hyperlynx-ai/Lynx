import { expect, type Page } from "@playwright/test"

/** Synthetic people only (policy PRIV-01). Unique per run so tests never collide. */
export function testEmail(label: string, domain = "example.test") {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`
  return `e2e-${label}-${stamp}@${domain}`
}

export const PASSWORD = "E2eLynx2026pass"

export async function signUp(
  page: Page,
  path: "/signup" | "/recruiters/signup",
  person: { name: string; email: string; password?: string }
) {
  await page.goto(path)
  await page.getByLabel("Full name").fill(person.name)
  await page.getByLabel(/^(Work email|Email)$/).fill(person.email)
  await page.getByLabel("Password").fill(person.password ?? PASSWORD)
  await page.getByRole("button", { name: "Create account" }).click()
}

export async function logIn(
  page: Page,
  path: "/login" | "/recruiters/login",
  email: string,
  password = PASSWORD
) {
  await page.goto(path)
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Log in", exact: true }).click()
}

export async function logOut(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click()
  await expect(page).toHaveURL(/\/$/)
}

/**
 * Our error/notice box. Next.js also renders a hidden role="alert" route
 * announcer, so always match by text.
 */
export async function expectAlert(page: Page, text: string) {
  await expect(page.getByRole("alert").filter({ hasText: text })).toBeVisible()
}

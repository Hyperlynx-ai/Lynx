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

/** Signs up a candidate and finishes onboarding with minimal answers (no CV). */
export async function onboardedCandidate(page: Page, name: string, label: string) {
  const email = testEmail(label)
  await signUp(page, "/signup", { name, email })
  await expect(page).toHaveURL(/\/app\/onboarding$/)
  await page.getByRole("link", { name: /Skip for now/ }).click()
  await page.getByLabel("Roles you're looking for").fill("Data Analyst")
  await page.getByText("Netherlands").click()
  await page.getByLabel("Work experience").selectOption("junior")
  await page.getByLabel("Highest education").selectOption("masters")
  await page.getByText("A new job (I'm working now)").click()
  await page.getByLabel("Work authorization").selectOption("needs_sponsorship")
  await page.getByRole("button", { name: "Continue" }).click()
  await page.getByRole("button", { name: "Finish" }).click()
  await expect(page).toHaveURL(/\/app$/)
  return email
}

/**
 * Seeds a CV that Lynx has "already read" (the sample CV) for a test user,
 * straight into the local database: the e2e stack has no AI service. Uses
 * the local stack's secret key from apps/api/.env.local (written by db:env).
 */
export async function seedParsedCv(email: string) {
  const { readFileSync } = await import("node:fs")
  const { join } = await import("node:path")
  const { createClient } = await import("@supabase/supabase-js")
  const root = join(import.meta.dirname, "..", "..", "..")
  const env = Object.fromEntries(
    readFileSync(join(root, "apps", "api", ".env.local"), "utf8")
      .split(/\r?\n/)
      .filter((line) => line.includes("="))
      .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)])
  )
  const admin = createClient(env.SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  })
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const user = users.users.find((u) => u.email === email)
  if (!user) throw new Error(`no user ${email}`)
  const path = `${user.id}/e2eseeded01.pdf`
  const pdf = readFileSync(
    join(root, "apps", "web", "public", "samples", "hyperlynx-sample-cv.pdf")
  )
  await admin.storage
    .from("cvs")
    .upload(path, pdf, { contentType: "application/pdf", upsert: true })
  const { data: cv, error } = await admin
    .from("cvs")
    .insert({
      user_id: user.id,
      storage_path: path,
      file_name: "Sample CV.pdf",
      media_type: "application/pdf",
      size_bytes: pdf.length,
      status: "parsed",
    })
    .select("id")
    .single()
  if (error) throw error
  const data = JSON.parse(
    readFileSync(join(root, "packages", "shared", "fixtures", "cv-sample.json"), "utf8")
  )
  const { error: versionError } = await admin.from("cv_versions").insert({
    cv_id: cv.id,
    user_id: user.id,
    version: 1,
    source: "parsed",
    label: "Original",
    data,
  })
  if (versionError) throw versionError
  return cv.id as string
}

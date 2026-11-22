import { redirect } from "next/navigation"

import { ROLE_HOME, ROLE_LOGIN, type AppRole } from "./roles"
import { getSessionUser, type SessionUser } from "./session"

/**
 * For layouts of signed-in areas: returns the user if they have `role`,
 * otherwise redirects (to the login page, or to their own area).
 */
export async function requireRole(role: AppRole, here: string): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect(`${ROLE_LOGIN[role]}?next=${encodeURIComponent(here)}`)
  if (user.role !== role) redirect(ROLE_HOME[user.role])
  return user
}

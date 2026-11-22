export const APP_ROLES = ["candidate", "recruiter", "admin"] as const
export type AppRole = (typeof APP_ROLES)[number]

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value)
}

/** Where each role lands after logging in. */
export const ROLE_HOME: Record<AppRole, string> = {
  candidate: "/app",
  recruiter: "/recruiter",
  admin: "/admin",
}

/** The login page for each role. */
export const ROLE_LOGIN: Record<AppRole, string> = {
  candidate: "/login",
  recruiter: "/recruiters/login",
  admin: "/login",
}

export const ROLE_LABEL: Record<AppRole, string> = {
  candidate: "candidate",
  recruiter: "recruiter",
  admin: "admin",
}

/** Signed-in areas and the role that owns each. `/recruiters` (plural) is public. */
const PROTECTED_AREAS: { prefix: string; role: AppRole }[] = [
  { prefix: "/app", role: "candidate" },
  { prefix: "/recruiter", role: "recruiter" },
  { prefix: "/admin", role: "admin" },
]

/** The role whose area `pathname` belongs to, or null for public pages. */
export function areaRoleFor(pathname: string): AppRole | null {
  const area = PROTECTED_AREAS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  return area?.role ?? null
}

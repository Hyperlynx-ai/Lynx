import { AppShell } from "@/components/app-shell"
import { requireRole } from "@/lib/auth/require-role"

const nav = [
  { href: "/app", label: "Home" },
  { href: "/app/cv", label: "CV" },
  { href: "/app/settings", label: "Settings" },
]

/** Candidate area: only signed-in candidates get past this layout. */
export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("candidate", "/app")
  return (
    <AppShell
      area="candidate"
      homeHref="/app"
      nav={nav}
      user={{ name: user.fullName ?? "", email: user.email }}
    >
      {children}
    </AppShell>
  )
}

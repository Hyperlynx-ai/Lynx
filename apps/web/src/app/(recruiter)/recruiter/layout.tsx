import { AppShell } from "@/components/app-shell"
import { requireRole } from "@/lib/auth/require-role"

const nav = [
  { href: "/recruiter", label: "Home" },
  { href: "/recruiter/settings", label: "Settings" },
]

/** Recruiter area: only signed-in recruiters get past this layout. */
export default async function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("recruiter", "/recruiter")
  return (
    <AppShell
      area="recruiter"
      homeHref="/recruiter"
      nav={nav}
      user={{ name: user.fullName ?? "", email: user.email }}
    >
      {children}
    </AppShell>
  )
}

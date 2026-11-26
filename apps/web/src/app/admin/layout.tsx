import { AppShell } from "@/components/app-shell"
import { requireRole } from "@/lib/auth/require-role"

const nav = [
  { href: "/admin", label: "Users" },
  { href: "/admin/sources", label: "Job sources" },
]

/** Admin console: only signed-in admins get past this layout. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin", "/admin")
  return (
    <AppShell
      area="admin"
      homeHref="/admin"
      nav={nav}
      user={{ name: user.fullName ?? "", email: user.email }}
    >
      {children}
    </AppShell>
  )
}

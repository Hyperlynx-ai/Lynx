import { BrandLink } from "@/components/brand-link"
import { AppNavLink } from "@/components/app-nav-link"

export type AppNavItem = { href: string; label: string }

type AppShellProps = {
  /** Short area name shown next to the logo: "candidate", "recruiter", "admin". */
  area: string
  /** Where the logo links to (the area's home). */
  homeHref: string
  nav: AppNavItem[]
  user: { name: string; email: string }
  children: React.ReactNode
}

/**
 * Layout for signed-in areas: a sticky ruled top bar (logo + area tag, area
 * navigation, the signed-in user and "Log out") above the page content.
 */
export function AppShell({ area, homeHref, nav, user, children }: AppShellProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-background">
        <div className="mx-auto flex min-h-16 max-w-content flex-wrap items-center justify-between gap-x-gap-md gap-y-2 px-6 py-3 md:px-10">
          <BrandLink href={homeHref} tag={area} />
          <nav
            aria-label={`${area} navigation`}
            className="order-3 -mx-6 flex w-[calc(100%+3rem)] [scrollbar-width:none] gap-gap-md overflow-x-auto px-6 whitespace-nowrap md:order-none md:mx-0 md:w-auto md:overflow-visible md:px-0"
          >
            {nav.map((item) => (
              <AppNavLink key={item.href} href={item.href} exact={item.href === homeHref}>
                {item.label}
              </AppNavLink>
            ))}
          </nav>
          <div className="flex items-center gap-gap-md">
            <span
              className="hidden font-mono text-mono text-text-secondary sm:inline"
              title={user.email}
            >
              {user.name || user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="cursor-pointer text-label text-text-primary transition-colors duration-200 ease-standard hover:text-text-secondary"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-content flex-1 px-6 py-gap-lg md:px-10">
        {children}
      </main>
    </div>
  )
}

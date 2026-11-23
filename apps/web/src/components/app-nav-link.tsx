"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@lynx/ui/lib/utils"

/**
 * Area navigation link; the current page is white with a mint underline.
 * `exact` links (an area's home, e.g. /app) are active only on that page,
 * not on every page below it.
 */
export function AppNavLink({
  href,
  exact = false,
  children,
}: {
  href: string
  exact?: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const active = pathname === href || (!exact && href !== "/" && pathname.startsWith(`${href}/`))
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "border-b py-1 text-label transition-colors duration-200 ease-standard",
        active
          ? "border-accent text-text-primary"
          : "border-transparent text-text-secondary hover:text-text-primary"
      )}
    >
      {children}
    </Link>
  )
}

import Link from "next/link"

import { Button } from "@lynx/ui/components/button"

import { BrandLink } from "@/components/brand-link"

/** Edge-to-edge sticky navbar for public pages (skill: Navbar). */
export function SiteHeader() {
  return (
    <>
      <header className="sticky top-0 z-50 h-16 border-b border-border-subtle bg-background">
        <nav
          aria-label="Main"
          className="mx-auto flex h-full max-w-content items-center justify-between gap-gap-md px-6 md:px-10"
        >
          <BrandLink />
          <div className="flex items-center gap-gap-md">
            <Link
              href="/recruiters"
              className="hidden text-label text-text-secondary transition-colors duration-200 ease-standard hover:text-text-primary sm:inline"
            >
              For recruiters
            </Link>
            <Link
              href="/login"
              className="text-label text-text-primary transition-colors duration-200 ease-standard hover:text-text-secondary"
            >
              Log in
            </Link>
            <Button variant="navbarCta" asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </nav>
      </header>
    </>
  )
}

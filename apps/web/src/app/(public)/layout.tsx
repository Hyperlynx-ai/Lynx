import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

/** Public pages: marketing site, sign-up and login pages. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[60svh]">{children}</main>
      <SiteFooter />
    </>
  )
}

import Image from "next/image"
import Link from "next/link"

/** Utility banner + edge-to-edge sticky navbar (skill: "First screen stack"). */
export function SiteHeader() {
  return (
    <>
      <div className="border-b border-border-subtle bg-dot-matrix">
        <p className="mx-auto max-w-content px-6 py-2 font-mono text-mono text-text-secondary md:px-10">
          Hyperlynx Academy is becoming Hyperlynx. Lynx, our AI career agent, is on its way.
        </p>
      </div>
      <header className="sticky top-0 z-50 h-16 border-b border-border-subtle bg-background">
        <div className="mx-auto flex h-full max-w-content items-center justify-between px-6 md:px-10">
          <Link href="/" className="flex items-center gap-gap-sm" aria-label="Hyperlynx home">
            <Image src="/brand/mark-light.png" alt="" width={28} height={28} priority />
            <span className="text-label">hyperlynx</span>
          </Link>
          <span className="font-mono text-mono text-text-secondary">v0 · foundations</span>
        </div>
      </header>
    </>
  )
}

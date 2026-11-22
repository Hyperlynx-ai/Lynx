import Image from "next/image"

import { ApiStatus } from "@/components/api-status"

export function SiteFooter() {
  return (
    <footer className="border-t border-border-subtle bg-background">
      <div className="mx-auto flex max-w-content flex-col gap-gap-md px-6 py-gap-lg md:flex-row md:items-center md:justify-between md:px-10">
        <div className="flex items-center gap-gap-sm">
          <Image src="/brand/mark-light.png" alt="" width={24} height={24} />
          <span className="text-label text-text-secondary">
            © {new Date().getFullYear()} Hyperlynx
          </span>
        </div>
        <ApiStatus />
      </div>
    </footer>
  )
}

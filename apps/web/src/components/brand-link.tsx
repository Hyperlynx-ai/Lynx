import Image from "next/image"
import Link from "next/link"

/** The Hyperlynx mark + wordmark, linking home (or to another area's home). */
export function BrandLink({ href = "/", tag }: { href?: string; tag?: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-gap-sm" aria-label="Hyperlynx home">
      <Image src="/brand/mark-light.png" alt="" width={28} height={28} priority />
      <span className="text-label">hyperlynx</span>
      {tag ? (
        <span className="border border-border px-2 font-mono text-mono text-text-secondary">
          {tag}
        </span>
      ) : null}
    </Link>
  )
}

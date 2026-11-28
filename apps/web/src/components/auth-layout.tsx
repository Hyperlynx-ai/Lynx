import { ArrowRight } from "lucide-react"
import { Eyebrow } from "@lynx/ui/components/eyebrow"
import { Headline } from "@lynx/ui/components/headline"
import { Panel } from "@lynx/ui/components/panel"

type AuthLayoutProps = {
  eyebrow: string
  title: string
  lede: string
  /** Short supporting points under the headline. */
  points?: string[]
  /** The form (and links under it). */
  children: React.ReactNode
}

/**
 * Two-column layout for sign-up, login and password pages (skill: paired
 * panel): story on the left, the form in a ruled panel on the right. Stacks on
 * small screens.
 */
export function AuthLayout({ eyebrow, title, lede, points, children }: AuthLayoutProps) {
  return (
    <div className="mx-auto grid max-w-content grid-cols-1 gap-gap-lg px-6 py-gap-lg md:px-10 lg:grid-cols-2 lg:gap-panel">
      <div className="flex flex-col gap-gap-md">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Headline as="h1" size="title" title={title} lede={lede} />
        {points?.length ? (
          <ul className="flex flex-col gap-gap-sm border-t border-border pt-gap-md">
            {points.map((point) => (
              <li key={point} className="flex gap-gap-sm text-body text-text-secondary">
                <ArrowRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-accent" />
                {point}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <Panel className="self-start">{children}</Panel>
    </div>
  )
}

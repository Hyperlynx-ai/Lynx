import Image from "next/image"
import Link from "next/link"

const columns = [
  {
    title: "Candidates",
    links: [
      { href: "/signup", label: "Create an account" },
      { href: "/login", label: "Log in" },
    ],
  },
  {
    title: "Recruiters",
    links: [
      { href: "/recruiters", label: "Hire on Hyperlynx" },
      { href: "/recruiters/login", label: "Recruiter login" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border-subtle bg-background">
      <div className="mx-auto flex max-w-content flex-col gap-gap-lg px-6 py-gap-lg md:px-10">
        <div className="grid grid-cols-2 gap-gap-md md:grid-cols-4">
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-gap-sm">
              <p className="text-label text-text-primary">{column.title}</p>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-body text-text-secondary transition-colors duration-200 ease-standard hover:text-text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-gap-md border-t border-border-subtle pt-gap-md md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-gap-sm">
            <Image src="/brand/mark-light.png" alt="" width={24} height={24} />
            <span className="text-label text-text-secondary">
              © {new Date().getFullYear()} Hyperlynx
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

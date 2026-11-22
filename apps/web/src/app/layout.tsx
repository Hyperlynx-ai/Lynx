import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "@lynx/ui/globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: { default: "Hyperlynx", template: "%s · Hyperlynx" },
  description:
    "Hyperlynx connects ambitious people with jobs, internships and scholarships in the UAE, Europe and 25+ countries. Lynx, our AI agent, ranks roles, sharpens CVs and interviews candidates.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}

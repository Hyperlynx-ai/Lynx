import type { ReactNode } from "react"

type Capability = { label: string; clause: string; media: ReactNode }

const Mono = ({ children }: { children: ReactNode }) => (
  <pre className="min-w-0 font-mono text-mono break-words whitespace-pre-wrap text-text-secondary">
    {children}
  </pre>
)

/** Illustrative tiles only: they show what each feature does, not real data. */
const capabilities: Capability[] = [
  {
    label: "Ranked opportunities",
    clause: "Jobs, internships and scholarships, ordered by how well they fit you.",
    media: (
      <Mono>
        {"fit   type\n"}
        <span className="text-text-primary">0.92</span>
        {"  job · affiliated\n"}
        <span className="text-text-primary">0.87</span>
        {"  internship\n"}
        <span className="text-text-primary">0.81</span>
        {"  scholarship"}
      </Mono>
    ),
  },
  {
    label: "CV studio",
    clause: "Edit with Lynx, compare every change, export to PDF or DOCX.",
    media: (
      <Mono>
        {"- Responsible for reports\n"}
        <span className="text-accent">+</span>
        <span className="text-text-primary">{" Built 12 weekly KPI reports"}</span>
      </Mono>
    ),
  },
  {
    label: "Video interviews",
    clause: "Voice and camera, scored with evidence you can check.",
    media: (
      <div className="flex h-16 items-end gap-1" aria-hidden="true">
        {[30, 55, 40, 80, 65, 95, 50, 70, 35, 60, 85, 45].map((h, i) => (
          <span key={i} className="w-1 bg-accent" style={{ height: `${h}%` }} />
        ))}
      </div>
    ),
  },
  {
    label: "Recruiter search",
    clause: "Verified candidates, ranked for each role, with the reasons.",
    media: (
      <Mono>
        {"verified  "}
        <span className="text-accent">●</span>
        {"\ninterview score\nwhy it fits"}
      </Mono>
    ),
  },
  {
    label: "Lynx memory",
    clause: "See, correct and delete everything Lynx knows about you.",
    media: <Mono>{"source: cv\nsource: interview\nsource: you"}</Mono>,
  },
]

/** Five-up feature strip bleeding into the fold (skill: "Five-up feature strip"). */
export function CapabilityStrip() {
  return (
    <section
      aria-label="What Lynx does"
      className="mx-auto mt-gap-lg grid max-w-content grid-cols-1 gap-gap-md px-6 pb-gap-lg sm:grid-cols-2 md:px-10 lg:grid-cols-5"
    >
      {capabilities.map((c) => (
        <article key={c.label} className="flex min-w-0 flex-col gap-gap-sm">
          <div className="flex flex-col gap-1">
            <h2 className="text-label text-text-primary">{c.label}</h2>
            <p className="text-body text-text-secondary">{c.clause}</p>
          </div>
          <div className="flex min-h-32 items-end">{c.media}</div>
        </article>
      ))}
    </section>
  )
}

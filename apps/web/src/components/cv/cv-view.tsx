import type { CvData } from "@lynx/shared/cv"

/**
 * A structured CV as Lynx read it: a ruled, table-like list of sections
 * (label on the left, content on the right). Read-only; editing arrives in
 * chunk 2.5.
 */
export function CvView({ cv }: { cv: CvData }) {
  const b = cv.basics
  const contact = [b.email, b.phone, b.location].filter(Boolean)

  return (
    <dl className="border-t border-border">
      <Section label="Contact">
        {contact.length || b.links.length ? (
          <div className="flex flex-col gap-1 font-mono text-mono text-text-primary">
            {contact.map((item) => (
              <span key={item}>{item}</span>
            ))}
            {b.links.map((link) => (
              <span key={link.url}>
                {link.label ? <span className="text-text-secondary">{link.label}: </span> : null}
                {link.url}
              </span>
            ))}
          </div>
        ) : (
          <Missing />
        )}
      </Section>

      {b.summary ? (
        <Section label="Summary">
          <p className="max-w-prose text-body text-text-primary">{b.summary}</p>
        </Section>
      ) : null}

      <Section label="Experience">
        {cv.experience.length ? (
          <Entries>
            {cv.experience.map((job, i) => (
              <Entry
                key={i}
                title={[job.title, job.company].filter(Boolean).join(" · ")}
                dates={dates(job.start, job.end)}
                meta={job.location}
                bullets={job.highlights}
              />
            ))}
          </Entries>
        ) : (
          <Missing />
        )}
      </Section>

      <Section label="Education">
        {cv.education.length ? (
          <Entries>
            {cv.education.map((edu, i) => (
              <Entry
                key={i}
                title={[[edu.degree, edu.field].filter(Boolean).join(", "), edu.institution]
                  .filter(Boolean)
                  .join(" · ")}
                dates={dates(edu.start, edu.end)}
                meta={[edu.location, edu.grade].filter(Boolean).join(" · ")}
                bullets={edu.highlights}
              />
            ))}
          </Entries>
        ) : (
          <Missing />
        )}
      </Section>

      {cv.projects.length ? (
        <Section label="Projects">
          <Entries>
            {cv.projects.map((project, i) => (
              <Entry
                key={i}
                title={project.name ?? "Project"}
                dates={dates(project.start, project.end)}
                meta={[project.technologies.join(", "), project.url].filter(Boolean).join(" · ")}
                bullets={project.highlights}
              />
            ))}
          </Entries>
        </Section>
      ) : null}

      <Section label="Skills">
        {cv.skills.length ? (
          <div className="flex flex-col gap-gap-sm">
            {cv.skills.map((group, i) => (
              <div key={i} className="flex flex-col gap-2">
                {group.name ? <p className="text-label text-text-secondary">{group.name}</p> : null}
                <Tags items={group.skills} />
              </div>
            ))}
          </div>
        ) : (
          <Missing />
        )}
      </Section>

      {cv.certifications.length ? (
        <Section label="Certifications">
          <Entries>
            {cv.certifications.map((cert, i) => (
              <Entry key={i} title={cert.name} dates={cert.date} meta={cert.issuer} bullets={[]} />
            ))}
          </Entries>
        </Section>
      ) : null}

      {cv.languages.length ? (
        <Section label="Languages">
          <Tags items={cv.languages.map((l) => (l.level ? `${l.name} · ${l.level}` : l.name))} />
        </Section>
      ) : null}

      {cv.achievements.length ? (
        <Section label="Achievements">
          <Bullets items={cv.achievements} />
        </Section>
      ) : null}
    </dl>
  )
}

function dates(start: string | null, end: string | null) {
  return [start, end].filter(Boolean).join(" – ") || null
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-gap-sm border-b border-border py-6 md:grid-cols-[200px_1fr] md:gap-gap-md">
      <dt className="text-label text-text-secondary">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

function Entries({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-gap-md">{children}</div>
}

function Entry(props: {
  title: string
  dates: string | null
  meta: string | null
  bullets: string[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col justify-between gap-x-gap-md sm:flex-row">
        <p className="text-label text-text-primary">{props.title}</p>
        {props.dates ? (
          <p className="shrink-0 font-mono text-mono text-text-secondary">{props.dates}</p>
        ) : null}
      </div>
      {props.meta ? <p className="text-body text-text-secondary">{props.meta}</p> : null}
      {props.bullets.length ? <Bullets items={props.bullets} /> : null}
    </div>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-1 flex max-w-prose flex-col gap-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-gap-sm text-body text-text-primary">
          <span aria-hidden="true" className="font-mono text-mono leading-6 text-text-secondary">
            -
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Tags({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="border border-border px-2 py-1 font-mono text-mono text-text-primary"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

function Missing() {
  return <p className="text-body text-text-secondary">Not found in your CV.</p>
}

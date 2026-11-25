import { Document, Font, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer"

import type { CvData } from "@lynx/shared/cv"

import { buildLayout, type CvLayout, type CvTemplate, type LayoutSection } from "./layout"

/**
 * PDF export with @react-pdf/renderer. Uses the built-in PDF fonts
 * (Times, Helvetica), which cover Latin text only (KL-23).
 */

// Never hyphenate: names, emails and links must stay whole.
Font.registerHyphenationCallback((word) => [word])

type Theme = {
  font: string
  bold: string
  italic: string
  size: number
  nameSize: number
  center: boolean
  margin: number
  gap: number
  accent: string
  upperHeadings: boolean
}

const THEMES: Record<CvTemplate, Theme> = {
  classic: {
    font: "Times-Roman",
    bold: "Times-Bold",
    italic: "Times-Italic",
    size: 10.5,
    nameSize: 22,
    center: true,
    margin: 36,
    gap: 8,
    accent: "#000000",
    upperHeadings: true,
  },
  modern: {
    font: "Helvetica",
    bold: "Helvetica-Bold",
    italic: "Helvetica-Oblique",
    size: 9.8,
    nameSize: 26,
    center: false,
    margin: 44,
    gap: 10,
    accent: "#0E7C66",
    upperHeadings: false,
  },
  compact: {
    font: "Helvetica",
    bold: "Helvetica-Bold",
    italic: "Helvetica-Oblique",
    size: 8.6,
    nameSize: 17,
    center: false,
    margin: 28,
    gap: 5,
    accent: "#222222",
    upperHeadings: true,
  },
}

function styles(t: Theme) {
  return StyleSheet.create({
    page: {
      paddingVertical: t.margin,
      paddingHorizontal: t.margin,
      fontFamily: t.font,
      fontSize: t.size,
      lineHeight: 1.35,
      color: "#111111",
    },
    name: {
      fontFamily: t.bold,
      fontSize: t.nameSize,
      lineHeight: 1.15,
      textAlign: t.center ? "center" : "left",
      color: "#000000",
    },
    headline: {
      fontSize: t.size + 1.5,
      lineHeight: 1.3,
      textAlign: t.center ? "center" : "left",
      marginTop: 2,
    },
    contact: {
      fontSize: t.size - 0.5,
      textAlign: t.center ? "center" : "left",
      marginTop: 4,
      color: "#333333",
    },
    section: { marginTop: t.gap + 2 },
    heading: {
      fontFamily: t.bold,
      fontSize: t.size + 1.5,
      color: t.accent,
      paddingBottom: 2,
      marginBottom: 4,
      borderBottomWidth: t.upperHeadings ? 0.8 : 1.5,
      borderBottomColor: t.accent,
    },
    entry: { marginBottom: t.gap - 2 },
    row: { flexDirection: "row", justifyContent: "space-between" },
    bold: { fontFamily: t.bold },
    italic: { fontFamily: t.italic, color: "#333333" },
    bullet: { flexDirection: "row", marginTop: 1, paddingLeft: 6 },
    dot: { width: 9 },
    grow: { flex: 1 },
  })
}

function Section({
  section,
  s,
  t,
}: {
  section: LayoutSection
  s: ReturnType<typeof styles>
  t: Theme
}) {
  const title = t.upperHeadings ? section.title.toUpperCase() : section.title
  return (
    <View style={s.section} wrap>
      <Text style={s.heading} minPresenceAhead={30}>
        {title}
      </Text>
      {section.kind === "text" ? <Text>{section.text}</Text> : null}
      {section.kind === "entries"
        ? section.entries.map((entry, i) => (
            <View key={i} style={s.entry} wrap={false}>
              <View style={s.row}>
                <Text style={s.bold}>{entry.title}</Text>
                <Text>{entry.right}</Text>
              </View>
              {entry.subtitle || entry.subtitleRight ? (
                <View style={s.row}>
                  <Text style={s.italic}>{entry.subtitle}</Text>
                  <Text style={s.italic}>{entry.subtitleRight}</Text>
                </View>
              ) : null}
              {entry.bullets.map((bullet, j) => (
                <View key={j} style={s.bullet}>
                  <Text style={s.dot}>•</Text>
                  <Text style={s.grow}>{bullet}</Text>
                </View>
              ))}
            </View>
          ))
        : null}
      {section.kind === "lines"
        ? section.lines.map((line, i) => (
            <Text key={i}>
              {line.label ? <Text style={s.bold}>{line.label}: </Text> : null}
              {line.text}
            </Text>
          ))
        : null}
      {section.kind === "bullets"
        ? section.bullets.map((bullet, i) => (
            <View key={i} style={s.bullet}>
              <Text style={s.dot}>•</Text>
              <Text style={s.grow}>{bullet}</Text>
            </View>
          ))
        : null}
    </View>
  )
}

export function CvPdf({ layout, template }: { layout: CvLayout; template: CvTemplate }) {
  const t = THEMES[template]
  const s = styles(t)
  return (
    <Document
      title={`${layout.name} CV`}
      author={layout.name}
      creator="Hyperlynx"
      producer="Hyperlynx"
    >
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{layout.name}</Text>
        {layout.headline ? <Text style={s.headline}>{layout.headline}</Text> : null}
        {layout.contact.length ? (
          <Text style={s.contact}>{layout.contact.join("  |  ")}</Text>
        ) : null}
        {layout.sections.map((section) => (
          <Section key={section.title} section={section} s={s} t={t} />
        ))}
      </Page>
    </Document>
  )
}

/** The CV as a PDF file. */
export async function renderCvPdf(cv: CvData, template: CvTemplate): Promise<Blob> {
  return pdf(<CvPdf layout={buildLayout(cv)} template={template} />).toBlob()
}

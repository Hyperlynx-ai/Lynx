import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from "docx"

import type { CvData } from "@lynx/shared/cv"

import { buildLayout, type CvTemplate, type LayoutSection } from "./layout"

/**
 * Word (.docx) export with the `docx` library: real Word text, headings and
 * bullet lists (no images or text boxes), so applicant tracking systems and
 * recruiters can read and edit it.
 */

type Theme = {
  font: string
  /** Half-points (Word's unit): 21 = 10.5 pt. */
  size: number
  nameSize: number
  center: boolean
  /** Page margin in twentieths of a point (1440 = 1 inch). */
  margin: number
  accent: string
  upperHeadings: boolean
  after: number
}

const THEMES: Record<CvTemplate, Theme> = {
  classic: {
    font: "Times New Roman",
    size: 21,
    nameSize: 44,
    center: true,
    margin: 720,
    accent: "000000",
    upperHeadings: true,
    after: 60,
  },
  modern: {
    font: "Calibri",
    size: 20,
    nameSize: 52,
    center: false,
    margin: 880,
    accent: "0E7C66",
    upperHeadings: false,
    after: 80,
  },
  compact: {
    font: "Arial",
    size: 17,
    nameSize: 34,
    center: false,
    margin: 560,
    accent: "222222",
    upperHeadings: true,
    after: 30,
  },
}

/** A4 width (11906) minus both margins: where right-aligned text goes. */
const rightTab = (t: Theme) => 11906 - 2 * t.margin

function heading(title: string, t: Theme) {
  return new Paragraph({
    spacing: { before: t.after * 3, after: t.after },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: t.upperHeadings ? 6 : 12,
        color: t.accent,
        space: 1,
      },
    },
    children: [
      new TextRun({
        text: t.upperHeadings ? title.toUpperCase() : title,
        bold: true,
        color: t.accent,
        size: t.size + 3,
      }),
    ],
  })
}

function leftRight(
  left: string,
  right: string,
  t: Theme,
  style: { bold?: boolean; italics?: boolean }
) {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: rightTab(t) }],
    spacing: { after: 0 },
    children: [
      new TextRun({ text: left, ...style }),
      ...(right ? [new TextRun({ text: `\t${right}`, italics: style.italics })] : []),
    ],
  })
}

function bullet(text: string, t: Theme) {
  return new Paragraph({
    numbering: { reference: "cv-bullets", level: 0 },
    spacing: { after: t.after / 2 },
    children: [new TextRun(text)],
  })
}

function section(s: LayoutSection, t: Theme): Paragraph[] {
  const out = [heading(s.title, t)]
  switch (s.kind) {
    case "text":
      out.push(new Paragraph({ spacing: { after: t.after }, children: [new TextRun(s.text)] }))
      break
    case "entries":
      for (const entry of s.entries) {
        out.push(leftRight(entry.title, entry.right, t, { bold: true }))
        if (entry.subtitle || entry.subtitleRight) {
          out.push(leftRight(entry.subtitle, entry.subtitleRight, t, { italics: true }))
        }
        out.push(...entry.bullets.map((b) => bullet(b, t)))
        out.push(new Paragraph({ spacing: { after: t.after }, children: [] }))
      }
      break
    case "lines":
      for (const line of s.lines) {
        out.push(
          new Paragraph({
            spacing: { after: t.after / 2 },
            children: [
              ...(line.label ? [new TextRun({ text: `${line.label}: `, bold: true })] : []),
              new TextRun(line.text),
            ],
          })
        )
      }
      break
    case "bullets":
      out.push(...s.bullets.map((b) => bullet(b, t)))
      break
  }
  return out
}

export function buildCvDocx(cv: CvData, template: CvTemplate): Document {
  const t = THEMES[template]
  const layout = buildLayout(cv)
  const align = t.center ? AlignmentType.CENTER : AlignmentType.LEFT
  return new Document({
    creator: "Hyperlynx",
    title: `${layout.name} CV`,
    styles: { default: { document: { run: { font: t.font, size: t.size } } } },
    numbering: {
      config: [
        {
          reference: "cv-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: t.margin, bottom: t.margin, left: t.margin, right: t.margin },
          },
        },
        children: [
          new Paragraph({
            alignment: align,
            children: [new TextRun({ text: layout.name, bold: true, size: t.nameSize })],
          }),
          ...(layout.headline
            ? [
                new Paragraph({
                  alignment: align,
                  children: [new TextRun({ text: layout.headline, size: t.size + 4 })],
                }),
              ]
            : []),
          ...(layout.contact.length
            ? [
                new Paragraph({
                  alignment: align,
                  spacing: { after: t.after },
                  children: [new TextRun({ text: layout.contact.join("  |  "), color: "333333" })],
                }),
              ]
            : []),
          ...layout.sections.flatMap((s) => section(s, t)),
        ],
      },
    ],
  })
}

/** The CV as a Word file. */
export async function renderCvDocx(cv: CvData, template: CvTemplate): Promise<Blob> {
  return Packer.toBlob(buildCvDocx(cv, template))
}

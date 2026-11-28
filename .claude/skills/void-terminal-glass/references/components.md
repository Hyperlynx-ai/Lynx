# Component specs - Void terminal glass (v2)

Read this when building or changing a component. Tokens live in
`packages/ui/src/styles/theme.css`; shared components in
`packages/ui/src/components`. Build from those before writing new markup.

## Contents

- Buttons
- App shell and navbar
- Page header
- Cards (job card, candidate card, application card, tiles)
- Badges and chips
- The Lynx reason box
- Forms, notices and errors
- Empty, loading and error states
- Tabs, filters and pagination
- Tables
- Popovers, toasts, dialogs and drawers
- Lynx chat (Phase 7)
- Interview room (Phase 5)
- Marketing blocks (five-up strip, logo strip, paired panel, feature grid, CTA band, footer)
- Email (Phase 8)
- Radius reference

---

## Buttons

`Button` in `packages/ui`. Pick the variant by role, not looks.

| Variant | Background | Text | Radius | Height | Padding | Border | Use |
|---|---|---|---|---|---|---|---|
| `heroPrimary` | `#FFFFFF` | `#000000` | pill | 44px | 0 24px | - | the one primary action of a view |
| `heroSecondary` | transparent | white | pill | 44px | 0 24px | 1px `border` | the secondary action; per-item actions (Apply on a card) |
| `navbarCta` | `#FFFFFF` | black | pill | 36px | 0 16px | - | Sign up in the public navbar |
| `navUtility` | transparent | white | 4px | 23px | 0 14px | - | navbar dropdown triggers only |
| `terminal` | `#34D59A` | black mono | pill | 44px | 0 28px | - | marketing CTA band only; hover `#47D18C` |
| `mintFill` | `#E4F1EB` | `#131415` | 0 | 44px | 0 16px | - | inside the pale-mint band |
| `outlineSquare` | white | `#18191B` | 0 | 44px | 12px 16px | 1px `#18191B` | ruled layouts on the mint band |
| `link` | transparent | white | - | auto | 0 | - | text actions (Log in, Remove, Keep) |
| `ghostIcon` | transparent; `neutral-tint` on hover | `text-secondary`, white on hover | 0 | 36px square | - | - | icon-only actions (save, hide, close, more); always an `aria-label` and a `title` |

- Colours ease over 300ms (`ease-standard`); the press is `scale(0.97)` in
  150ms `ease-out` (built in). Disabled: 50% opacity, no pointer events.
- A toggled icon button (Save) uses `aria-pressed` and shows its state in
  mint (filled icon + `text-accent`).
- Icons: `lucide-react`, 16-18px, stroke as drawn, never emoji or unicode
  glyphs. A trailing `ArrowUpRight` marks a link that leaves the site.
- Destructive actions never get a red fill: a `link` or `heroSecondary`
  button, a second confirming click that names the thing ("Remove Acme"),
  and the consequence in text.

## App shell and navbar

- Public navbar: edge-to-edge, 64px, sticky, black, 0 radius, bottom hairline
  `border-subtle`; brand left; "For recruiters", "Log in" and the `navbarCta`
  pill right. No utility banner above it (removed in v2).
- App shell (candidate, recruiter, admin): the same bar with the brand, the
  area tag (`candidate`, `admin` in a hairline box, mono), the section nav
  (label style, active item white with a 1px white underline) and the
  account. On phones the nav moves to its own row and scrolls sideways (no
  visible scrollbar); it never wraps or clips.

## Page header

`Headline` with `as="h1"` and `size="title"` on app screens (`display` or
`headline` on marketing), a `title` and a one- or two-sentence `lede`. No
eyebrow on app screens. A breadcrumb, when a page is nested ("Your CV /
Edit"), sits above the title in `text-small` grey with the parent as a link.

## Cards

`Card` in `packages/ui`: `<article>` on `bg-surface`, 1px `border`, 0
radius, `p-5 md:p-6`, children stacked with `gap-4`. `interactive` adds the
hover lift (2px, `border-strong`, 200ms `ease-out`) and is only for cards
whose whole surface is one link. Cards in a grid stretch to equal height;
their footer sits at the bottom (`mt-auto`).

### Job card (opportunities feed, built)

Top to bottom:

1. **Status row:** match `Badge` (Strong = `accent` with dot; Good and
   Partial = `neutral` with dot) and `Affiliated` (`accent`), left; Save
   (bookmark, toggles) and Hide (eye-off) `ghostIcon` buttons, right.
2. **Title:** `h3`, `text-heading`, white, clamped to two lines.
3. **Company and place:** `text-body`; company in white, " · ", place in
   grey ("Remote · Germany" for remote).
4. **Chips:** neutral badges for job type, "Posted 4 days ago", "Apply by
   5 Jan 2027". Missing facts are left out, never shown as a dash.
5. **Lynx reason box** (below), when there is a match reason.
6. **Footer:** "via <source>" in `text-small` grey (company boards read "via
   the company's careers page"; the source's terms decide the credit),
   right: `heroSecondary` "Apply on source" with `ArrowUpRight`, opening the
   source in a new tab.

Grid: one column on phones, two from `md`. The page's results count sits
above the grid in `text-small` grey with `tabular` digits.

### Candidate card (recruiter search, Phase 6)

Name (`text-heading`), headline and location (`text-body` grey), verified
and interview badges, three to five skill chips, the Lynx "why they fit"
reason box, footer with "View profile" (`heroSecondary`) and shortlist
(`ghostIcon`, toggles). Avatar: 40px square image or initials on
`neutral-tint`, never stretched (`shrink-0`, `object-cover`).

### Application card (Phase 4)

Job title and company, the stage badge (New / Shortlisted / Interview /
Hired / Rejected, tones from SKILL.md Status), "Applied 3 days ago", and one
next action. In the recruiter pipeline the same card is compact (title,
badge, date) and sits in stage columns or a table (list view).

### Tiles (home dashboards)

Home tiles are cards in a uniform grid: `text-heading` title, one status
line in grey, one link action at the bottom (label style with a hairline
underline that turns mint on hover).

## Badges and chips

`Badge` in `packages/ui`: inline, 24px tall, `px-2`, 0 radius, `text-small`
500, never wraps (`whitespace-nowrap`, `shrink-0`). Tones `accent`,
`neutral`, `warning`, `error` use the matching tint background and text
colour; `dot` adds a 6px status dot in the text colour. Chips (facts like job
type and dates) are neutral badges without a dot. A badge is not a button;
filter chips that toggle are buttons with `aria-pressed`.

## The Lynx reason box

Lynx's explanation for a match, a score or a suggestion: a `neutral-tint`
box, 12px padding, `text-body` grey, starting with "Lynx: " in white 500.
No border, never a coloured bar down one side (impeccable bans side
stripes). One per card at most.

## Forms, notices and errors

| Element | Spec |
|---|---|
| Text input, select, textarea | transparent (`bg-background` for selects), 1px `border`, 0 radius, 44px tall, white text, grey placeholder |
| Focus | border `accent` plus the global 2px mint ring |
| Invalid | border `error` (`aria-invalid="true"`), message under the field in `error` with a mono `!` prefix |
| Label | above the control, label style; a hint under it in grey (`text-small` or body) |
| Checkbox, radio | native controls, 16px, mint accent colour (global) |
| Switch | 44 x 24 pill track, 1px border; on = mint border and mint knob |
| Error notice | `Notice tone="error"`: square, 1px `error` border, mono `!`, white title, grey body |
| Info notice | `Notice`: square, hairline border, white title, grey body |
| Success notice | `Notice tone="success"`: hairline border, mint mono marker |

Labels say what goes in ("Board name"), never a question; errors name the
field and the fix ("Use the board name from the careers-page URL").

## Empty, loading and error states

- **Empty:** `EmptyState`: a white first sentence saying what is missing and
  a grey second one with the next step; an action button when one exists.
- **Loading:** a skeleton in the content's shape (blocks of `neutral-tint`,
  no shimmer), or `LoadingState` for small areas. Show it only after about
  300ms, so fast loads don't flash.
- **Error:** an error `Notice` in place of the content, saying what failed
  and what to try.

## Tabs, filters and pagination

- **Tabs:** links or buttons in a row over a hairline; active tab white with
  a 1px white underline, others grey turning white on hover. Tabs that
  change the URL are links with `aria-current="page"`.
- **Filters:** a plain GET form (works without JavaScript): search input,
  selects, checkboxes, one `heroSecondary` "Show" button; one row from `lg`,
  two columns from `md`, stacked on phones. "Clear filters" is a text link,
  shown only when a filter is set.
- **Pagination:** "← Previous" and "Next →" text links with the "page 2 of 81"
  count in `text-small` grey.

## Tables

Hairline rows (`border-border-subtle` between rows, `border` around), header
cells `text-small` grey, body cells `text-body`; numbers right-aligned and
`tabular`; row hover `neutral-tint`; a selected row `accent-tint`. On phones a
wide table scrolls sideways inside its own box (`overflow-x-auto`) with its
first column readable; never the whole page.

## Popovers, toasts, dialogs and drawers

All on `bg-surface`, 1px `border`, 0 radius, `shadow-popover`.

- **Popover / menu:** opens from its trigger (origin-aware), 150-200ms
  `ease-out` from `scale(0.96)` + opacity.
- **Toast:** bottom right (bottom centre on phones), `text-body`, an
  optional tone dot, auto-dismiss after 5s (paused on hover and when the tab
  is hidden), and "Undo" when the action can be undone. Use a toast for
  confirmations, never for errors that need fixing.
- **Dialog:** only for a decision that needs protected focus (confirming a
  destructive action, a short form). Title `text-heading`, body, actions
  right with the primary last. 200ms in, 150ms out.
- **Drawer:** detail views over a list (an applicant in the pipeline), from
  the right on desktop, from the bottom on phones, 300-400ms
  `cubic-bezier(0.32, 0.72, 0, 1)`.

## Lynx chat (Phase 7)

- A single column, max 720px. Candidate messages right-aligned on
  `neutral-tint`; Lynx's messages left-aligned with no box, in `text-body`
  white, so long answers read like text. 0 radius.
- Streaming text appears as it arrives with no typewriter effect; a small
  three-dot status (grey, mono) while Lynx thinks.
- Anything Lynx creates or changes (a fact, a CV edit, a job shortlist) is
  shown as a card in the stream with accept / undo.
- The composer is an input bar fixed to the bottom of the column: textarea
  (auto-grows to 6 lines), send `ghostIcon`; Enter sends, Shift+Enter new
  line.

## Interview room (Phase 5)

- Full-screen black; the candidate's camera in a 16:9 frame with a hairline
  border; Lynx as a calm visual (a mint waveform or bar band reacting to
  speech, the marketing bar-band motif), not a fake face.
- Status row: recording dot (`error` red, pulsing slowly only while
  recording), elapsed time in mono, question "2 of 6".
- Controls in one row at the bottom: mute, camera, end (`heroSecondary`, not
  red fill), all with labels for screen readers.
- Proctoring notices are info `Notice`s, never alarms.

## Marketing blocks

- **Hero:** eyebrow (dot-grid glyph + label), `Headline` display + lede, pill
  pair, one fact line in `text-small` grey. No mono prompt line.
- **Five-up strip:** five equal columns (two on tablets, one on phones); each
  a label-style title on its own line, a grey sentence, then an illustrative
  data tile (scores, a diff, a bar band, sources) in mono or mint strokes.
- **Logo strip:** ~8 flat-grey marks, no dividers or boxes; may scroll with
  `infinityScroll` (paused under reduced motion).
- **Paired panel:** two columns, 128px gap; left a dot-grid glyph, `Headline`
  (headline size) + lede and short body; right one large visual. 240px
  section padding.
- **Feature grid (3x2):** uniform grid with hairline dividers; each cell a
  small mint glyph, a label-style title, grey body. Informational, no CTA.
  Use it once per page at most.
- **CTA band:** dark, a fine branching-line graphic behind, `Headline` +
  lede, white pill primary, outline secondary, optionally the `terminal`
  CTA.
- **Footer:** black; brand and link columns; copyright. No status claims
  unless they come from a real status page.

## Email (Phase 8)

- Table-based layout, 600px max width, system font stack
  (`-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`); Inter
  is not guaranteed in mail clients.
- Dark-safe light design: white ground, `#131415` text, `#5F636B` secondary,
  hairlines `#E3E5E8`, one mint (`#34D59A`) accent line or button border;
  buttons are bulletproof (table cell links), black fill with white text,
  0 radius.
- Each job in an alert is a block: title, company and place, the Lynx reason,
  one "See the job" link; at most 10 jobs per email.
- Footer: why they got it, one-click unsubscribe, the postal address the law
  requires.

## Radius reference

| Element | Radius |
|---|---|
| Navbar, cards, panels, badges, chips, inputs, selects, tables, dialogs, toasts, media | 0px |
| Nav-utility dropdown triggers | 4px |
| Hero, navbar, terminal and outline pill buttons; status dots; switches | 9999px |

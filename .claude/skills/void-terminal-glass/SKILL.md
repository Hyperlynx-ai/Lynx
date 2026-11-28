---
name: void-terminal-glass
description: The single source of truth for Hyperlynx's visual design language ("Void terminal glass", v2) - a black, sharp, ruled look with Inter type in clear size steps, monospace for data only, and a rationed mint signal colour. Covers four surfaces (marketing pages, the signed-in app, reading pages, emails), headline + lede, cards and status badges, motion, copy, browser details and worst-case data. Use it whenever designing, building, restyling or reviewing ANY part of the website or app UI - pages, components, forms, cards, tables, dashboards, colours, type, spacing, Tailwind classes, animation, UI copy - even if the task never mentions design. Read it BEFORE writing UI code so every contributor produces the same look.
---

# Void terminal glass (v2)

One design language for Hyperlynx: the marketing site, the candidate,
recruiter and admin apps, reading pages and emails. A page built by one person
or agent must look like it came from the same hand as any other. When this
skill is silent, choose the option that is more restrained, darker, sharper
and more ruled, and never invent a colour, radius, shadow or typeface.

v2 (2026-11-29) folds in lessons from three outside skills (taste-skill,
impeccable, Emil Kowalski's design-engineering skills): hierarchy from size
and space instead of colour alone, monospace only for data, cards and status
badges for the app, a motion framework, copy rules, browser details and
worst-case data checks.

## How to use this skill

1. Read this file before writing UI code. Name the **surface** you are
   building (table below): its rules differ.
2. Then read the reference for what you are building:
   - `references/components.md` - exact specs for every component (buttons,
     cards, badges, forms, tables, tabs, toasts, dialogs, chat, interview
     room, marketing blocks, email).
   - `references/copy.md` - headlines, buttons, labels, errors, banned words.
   - `references/motion.md` - whether and how anything moves.
3. Use the tokens. The live source is `packages/ui/src/styles/theme.css`
   (Tailwind classes such as `bg-surface`, `text-lede`, `text-small`,
   `border-border-strong`, `bg-accent-tint`); `assets/tokens.css` mirrors
   it for reference. Use the shared components in `packages/ui`
   (`Headline`, `Card`, `Badge`, `Button`, `Panel`, `Notice`, `Field`,
   `Input`, `Select`, `EmptyState`) before writing new markup.
4. Run `pnpm design:lint` (also part of `pnpm lint`). It fails on raw hex
   colours, Tailwind's default palette, off-system radii and shadows,
   gradients, arbitrary font sizes, bold weights and all-caps.
5. Look at the result in a browser at 1440, 1024, 768 and 375 wide, then run
   the checklist at the bottom.

## The look in one paragraph

A near-black canvas carrying sharp, zero-radius, ruled components. Inter in a
short, deliberate scale (68 / 48 / 32 / 20 / 16 / 14) with tight negative
tracking on display sizes; GeistMono only where something is data: numbers,
scores, dates, IDs, code. One mint signal colour (`#34D59A`) marks what is
good, selected or primary-technical, never a large area. On marketing pages a
technical texture layer (dot-matrix grain, glowing bar bands, branching
lines) and one pale-mint band add character; in the app the character is in
the precision: alignment, spacing, states and copy.

## Surfaces

The surface decides how much expression is allowed (after impeccable's
"modes"). Pick it from the page, not the product.

| Surface | Pages | Visitor's job | Allowed | Not allowed |
|---|---|---|---|---|
| **Marketing** | `/`, `/recruiters`, future landing and campaign pages | decide and act | display (68) and headline (48) sizes; one eyebrow on the hero; texture layer; one pale-mint band; marquee; the terminal-accent CTA | app chrome; more than two hero actions |
| **App** | candidate, recruiter and admin areas; onboarding; settings; auth forms; error and 404 pages | finish a task | title (32), heading (20), lede (20), body, small; cards, tables, badges; state colours as tints | eyebrows (the title says where you are; auth pages may name the audience); texture; the mint band; display sizes; decorative motion |
| **Reading** | Academy lessons (Phase 9), help, legal, long guides | understand | a 65-75ch column; long prose in `text-lede` (20px); headings 32 / 20 | multi-column text; texture; cards as page structure |
| **Email** | job alerts, newsletter, notifications (Phase 8) | read and click once | see `references/components.md`, Email: light or dark-safe table layout, system fonts | web fonts that fail, background images, anything that needs CSS support email clients lack |

## Non-negotiable rules

Each rule has its reason, so edge cases can be judged.

1. **Black dominates.** Canvas `#000000`; raised surfaces `#111315`
   (`bg-surface`). No full-frame saturated gradient, no colour wash. *Why:
   the darkness is the brand.*
2. **Zero radius is structural.** Cards, panels, inputs, selects, badges,
   chips, tables, dialogs, the navbar: `0px`. Only buttons/pills and status
   dots are fully round (`rounded-pill`); nav-utility triggers use `4px`.
   *Why: sharp ruled geometry reads as precise.*
3. **Mint is a signal, rationed.** `#34D59A` and its tint appear only on:
   the terminal-accent CTA, icon glyphs, code tokens, chart strokes, status
   dots, "good / strong / done" badges, selected or saved states, the focus
   ring, caret and checkboxes. Never a section ground, a large fill or body
   text. *Why: scarcity makes it mean something.*
4. **Hierarchy comes from size, weight and space, never colour alone.** A
   headline is one colour (white) and the explanation sits under it as a
   **lede**: a separate 20px grey paragraph (`Headline` with `title` and
   `lede`). Two clauses at the same size in two colours (the v1 "fused
   headline") are retired. Headlines carry no trailing full stop. *Why: same
   size, same weight, different grey reads as disabled text, and it hides
   which part matters (owner, 2026-11-29).*
5. **One pale-mint band at a time, marketing only.** `#E4F1EB` holds
   data-visualisation proof content with dark ink (`#131415`). Never an
   alternating background, never in the app.
6. **One primary action per view.** On a marketing hero it is the white pill
   (`heroPrimary`), with at most one outline pill (`heroSecondary`) beside
   it. In the app, the white pill is reserved for the one action the screen
   exists for (submit, apply, publish); repeated per-item actions (Apply on
   each job card) use the outline pill.
7. **Red and amber are signals, not chrome.** Red `#FF5F57` (`error`):
   errors only (messages, invalid borders, error notices and badges, failed
   states). Amber `#F5A524` (`warning`): needs attention (partial runs,
   pending review, chart warnings). As text, a dot, a border or a 12-14%
   tint (`bg-error-tint`, `bg-warning-tint`); never a button fill or a large
   area. A rejected application is neutral, not red: red means something
   broke.
8. **Elevation is nearly flat.** Structure comes from surface fill, hairline
   borders and space. Two shadows exist: the hairline ring
   (`shadow-ring`) and the popover drop (`shadow-popover`, for menus,
   popovers, toasts and dialogs only).
9. **Monospace is for data, not decoration.** GeistMono for code, numbers
   that are compared (scores, counts in tables), timestamps, IDs, file
   sizes, keyboard keys. Never for sentences, labels, credits, emails in
   prose, or fake shell prompts ("$ free for candidates"). *Why: mono as a
   "technical" costume makes a careers product read like a terminal
   (impeccable).*
10. **No eyebrow over every heading.** The small label above a heading is
    allowed only on a marketing hero and on auth pages (to name the audience:
    "Candidates", "Recruiters"). App screens never have one; a section
    heading carries its own weight.

## Tokens

Full set in `packages/ui/src/styles/theme.css` (mirrored in
`assets/tokens.css`).

| Token (class) | Value | Use |
|---|---|---|
| `background` | `#000000` | page canvas |
| `surface` | `#111315` | cards, code panels, popovers, dialogs |
| `surface-alt` | `#E4F1EB` | the pale-mint band (marketing, one at a time) |
| `text-primary` | `#FFFFFF` | headlines, body, titles |
| `text-secondary` | `#94979E` | ledes, secondary text, metadata (7:1 on black) |
| `border` | `#303236` | hairlines, card and input borders, dividers |
| `border-strong` | `#4A4D53` | hover border on interactive cards and controls |
| `border-subtle` | `#18191B` | near-invisible structure; ink on the mint band |
| `accent` | `#34D59A` | the mint signal (rule 3) |
| `accent-hover` | `#47D18C` | accent hover |
| `accent-tint` | mint at 12% | "strong / done / selected" badge and selected-row ground |
| `neutral-tint` | white at 6% | neutral badges and chips, the Lynx reason box, icon-button hover |
| `warning` / `warning-tint` | `#F5A524` / 14% | needs attention (rule 7) |
| `error` / `error-tint` | `#FF5F57` / 14% | errors only (rule 7) |

Spacing: 4px base (Tailwind's scale), named gaps `gap-sm` 12px, `gap-md`
24px, `gap-lg` 80px; section padding 240px (desktop marketing); paired-panel
gap 128px; content max width 1600px. Use tight gaps inside a group and
generous ones between groups; more space above a heading than below it.

Radius: `rounded-none` (everything), `rounded-pill` (buttons, status dots),
`rounded-control` (nav-utility triggers). Nothing else; the lint enforces it.

## Typography

| Role (class) | Size / weight / line-height / tracking | Use |
|---|---|---|
| `text-display` | 68px / 400 / 1.13 / -0.04em (fluid) | marketing hero headline |
| `text-headline` | 48px / 400 / 1.13 / -0.04em (fluid) | marketing section headline |
| `text-title` | 32px / 400 / 1.2 / -0.028em (fluid) | app, form, error page title |
| `text-lede` | 20px / 400 / 1.5 / -0.01em | the paragraph under a headline; long-form reading body |
| `text-heading` | 20px / 500 / 1.35 / -0.015em | card titles, panel and form-section headings, dialog titles |
| `text-body` | 16px / 400 / 1.5 | body |
| `text-label` | 16px / 500 / 1.5 / -0.025em | nav items, button text, field labels, list titles |
| `text-small` | 14px / 400 / 1.45 | metadata, chips, badges, helper text, captions |
| `text-mono` | 13px GeistMono / 1.5 | data only (rule 9) |

- Display and title weight is 400; emphasis inside running text uses 500
  (`font-medium`). Never 600+ (lint).
- `h1`-`h4` get `text-wrap: balance` and paragraphs `text-wrap: pretty`
  globally; break a headline by hand only between phrases.
- Prose measure 45-75 characters (`max-w-[62ch]` for ledes, `max-w-3xl`
  for body blocks).
- Numbers that line up or update use the `tabular` utility.
- Sentence case everywhere; no all-caps labels (lint).
- Fallbacks: Inter -> `system-ui, sans-serif`; GeistMono ->
  `ui-monospace, SFMono-Regular, monospace`. The serif accent (Times New
  Roman 16px) is a rare, small, inline interruption, never a display face.

Headline + lede markup (the `Headline` component renders this):

```html
<div class="headline">
  <h1 class="text-title text-primary">Opportunities</h1>
  <p class="text-lede text-secondary">Jobs from company careers pages and job boards, ranked for you.</p>
</div>
```

## Layout

- **Marketing:** content capped at 1600px; 240px vertical section padding on
  desktop (reduce proportionally below 1024px). First screen: navbar (no
  utility banner), hero eyebrow, display headline + lede, the pill pair, one
  plain fact line in `text-small` ("Free for candidates. Every recruiter is
  verified."), then the five-up strip bleeding into the fold. Below: paired
  panels (text left, one large visual right), a uniform 3x2 feature grid,
  at most one pale-mint band, the CTA band, the footer.
- **App:** the app shell (sticky 64px bar, nav that scrolls sideways on
  phones), then a page header (title + lede), then the work. Group with
  space before adding boxes. Collections of things you act on are **card
  grids**; forms and settings are **panels**; many comparable rows are
  **tables** (`references/components.md`).
- **Grids:** strict and uniform (no bento, no masonry). Card grids are 1
  column on phones, 2 from `md` (768px), 3 only for compact items from
  `xl`. Equal left and right edges; nothing pokes out of the container.
- **Responsive:** collapse to one column under 768px; keep 0 radius and
  black at every size; tap targets at least 44px (icon buttons 36px with
  space around them); no sideways page scroll at 320px.

## Cards, panels, lists, tables

| Container | When | Spec |
|---|---|---|
| `Card` | one discrete object the visitor acts on: a job, a candidate, an application, a saved item, a dashboard tile | `bg-surface`, 1px `border`, 0 radius, 20-24px padding; lifts 2px with `border-strong` on hover **only** when the whole card is one link (`interactive`) |
| `Panel` | a form, a settings group, a block of data | transparent, 1px `border`, 0 radius, 24-32px padding |
| ruled list | many short, similar lines (facts, runs, logs) | hairline dividers, no box per item |
| table | rows to compare by column (admin, pipeline list view) | hairline rows, `text-small` headers, `tabular` numbers, sticky header when long |

Never nest a card in a card, and never use a grid of identical icon + title +
text cards as the structure of a page (impeccable): it says nothing. Job card
anatomy and the other card types are in `references/components.md`.

## Status and state

Status is a `Badge`: square, `text-small` 500, a tint background and the
tone's text colour, optional leading dot. Tones:

| Tone | Means | Examples |
|---|---|---|
| `accent` | good, strong, done, live, selected | Strong match, Affiliated, Published, Shortlisted, Hired, source ok |
| `neutral` | default, in progress, closed, no judgement | Good match, Partial match, New, Draft, Closed, Rejected, job type chips |
| `warning` | needs someone's attention | Pending review, partial run, interview to review |
| `error` | something failed | Failed run, upload failed |

Every state a screen can be in gets designed: loading (skeletons shaped like
the content, or `LoadingState`), empty (`EmptyState`: what this is and the
next step), error (`Notice tone="error"`: what happened and how to recover),
partial and success.

## Motion

Summary (full rules in `references/motion.md`, after Emil Kowalski):

- Decide **whether** before **how**: nothing animates on actions used dozens
  of times a day or on keyboard actions; motion must explain, give feedback
  or prevent a jarring change.
- Colour and border changes: 200-300ms `ease-standard`. Things entering,
  moving or pressing: `ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`), under
  300ms (dialogs and drawers up to 400ms).
- Buttons press to `scale(0.97)` in 150ms (built into `Button`). Linked
  cards lift 2px. Nothing enters from `scale(0)`; start at 0.95 + opacity.
- Hover effects only on devices that hover (Tailwind v4's `hover:` already
  does this). No scroll-triggered fade-ins on every section; no parallax on
  text.
- `prefers-reduced-motion`: everything rests (global rule in `globals.css`),
  and nothing stays hidden.

## Copy

Summary (full rules in `references/copy.md`, after taste-skill):

- A headline names the thing or makes a plain claim; a page title says where
  you are ("Opportunities", "Company boards"). No "where X meets Y", no
  slogans, riddles, questions or exclamation marks in headlines.
- Buttons are a verb plus what you get ("Find opportunities", "Apply on
  source", "Add board"); never "Learn more", "Click here", "Submit".
- Errors name the problem and the way out; empty states name the next step.
- Banned filler: seamless, effortless, unlock, elevate, supercharge,
  cutting-edge, next-generation, game-changing, powerful, robust.

## Browser details

The parts nobody draws still carry the design (impeccable). Already set
globally in `packages/ui/src/styles/globals.css`: mint text selection, mint
caret and checkbox/radio accent, dark scrollbars, 2px mint focus ring
offset 2px, underline offset, balanced headings and pretty paragraphs. Keep
them: never remove focus outlines, and theme any custom scrollbar or
selection from the tokens.

## Worst-case data

Design with the longest real content, not the demo row (Emil's break-ui):
long company names and job titles, unbreakable URLs and emails, missing
company or place, one result and zero results, 1,617 results, plurals ("1
opportunity"), non-Latin text, numbers that update. Rules:

- Text columns in flex and grid get `min-w-0`; fixed-size things
  (`Badge`, icons, buttons) get `shrink-0`; long strings get
  `[overflow-wrap:anywhere]`.
- Card titles clamp to two lines (`line-clamp-2`); full text stays reachable
  on the source page or a detail view.
- Never truncate numbers, dates or anything compared; give them room.
- Omit an empty field's line rather than printing a dash.
- Use `Intl` for numbers, dates and plurals.

## When the system is silent

- New component: build it from the shared components and tokens, check it
  against this file, and add its spec to `references/components.md` in the
  same change.
- New colour, radius, shadow, font or font size: don't. Ask the owner and,
  if approved, add the token to `theme.css` and this skill first.
- New motion: follow `references/motion.md`; if it is not covered, keep it
  under 300ms with `ease-out` and make it respect reduced motion.
- A rule here conflicts with a brief from the owner: the owner wins; record
  the decision here with its date.

## Pre-finish checklist

- [ ] Surface named; only that surface's allowances used.
- [ ] Black canvas; no gradient wash; cards on `bg-surface` with hairlines.
- [ ] 0 radius everywhere except pills and status dots; `pnpm design:lint`
      passes.
- [ ] Mint only as a signal (rule 3); red only for errors, amber only for
      attention (rule 7).
- [ ] Every headline is one colour with a lede under it; no trailing full
      stop; no eyebrow on app screens.
- [ ] Type only from the scale; mono only for data; no 600+ weights, no
      all-caps.
- [ ] One primary action per view; buttons are verb + object.
- [ ] Loading, empty, error and success states exist and read well.
- [ ] Worst-case content checked at 375 and 1440; no sideways scroll; tap
      targets usable.
- [ ] Motion has a purpose, uses the tokens, and rests under reduced motion.
- [ ] Keyboard: everything reachable, focus ring visible, labels on every
      control and icon button.

---
name: void-terminal-glass
description: The single source of truth for this website's visual design language ("Void terminal glass") - a black-dominant, developer-tool aesthetic with sharp zero-radius components, Inter display type with fused bold/gray headlines, GeistMono accents, a rationed mint accent (#34D59A), and one rare pale-mint inversion band. Use this skill whenever designing, building, restyling, or reviewing ANY part of the website UI - pages, sections, hero, navbar, footer, buttons, cards, grids, forms, dashboards, data-viz panels, colors, typography, spacing, CSS/Tailwind/theme tokens, animations - and whenever a task says "match the site", "make it look right", or adds a new screen, even if the user never mentions a design system or style guide. Consult it BEFORE writing any UI code so every contributor produces the same look.
---

# Void terminal glass - website design language

This skill is the one design language for the whole website. Everyone who touches the UI (people and AI agents alike) follows it, so that a page built by one person looks like it was built by the same hand as a page built by another. When a choice is not covered here, prefer the option that is more restrained, darker, sharper, and more ruled - and do not invent new colors, radii, or fonts.

Origin: derived from the design spec `neon-db-design.md` (system version `superdesign-alpha`, inspired by neon.com).

## How to use this skill

1. Read this whole file before writing any UI code.
2. For component-level work (navbar, buttons, cards, grids, footer, CTA band), also read `references/components.md` - it holds the exact specs.
3. Use the tokens in `assets/tokens.css` (copy into the web app's global styles, or map them into the Tailwind/theme config). Never hardcode a hex or pixel value that exists as a token - a hardcoded value is how the design drifts.
4. Before finishing, run the checklist at the bottom of this file.
5. If the design needs something this skill does not cover, see "When the system is silent". Do not quietly improvise; note the gap so the owner can extend the skill.

## The look in one paragraph

A near-total black canvas carrying sharp, zero-radius, ruled, table-like components; monospace data readouts; and a single mint-green accent used sparingly. It borrows Swiss/International rigor (tight Inter display type at negative tracking, hairline dividers, left-aligned eyebrow labels) and adds a technical texture layer (dot-matrix grain, glowing vertical bar-chart bands, branching diagram lines) so it feels closer to an infrastructure dashboard than to marketing gloss. Once per page, a pale-mint "paper" band interrupts the black to hold data-heavy proof content.

## Non-negotiable rules

Each rule comes with its reason, so you can judge edge cases instead of guessing.

1. **Black dominates.** Background is `#000000`; surfaces are `#111315` / `#181818`. Never fill a hero (or any large area) with a full-frame saturated gradient. Color lives only in thin vertical bars and glows in the upper hero region. *Why: the darkness is the brand; a color wash turns it into a generic marketing page.*
2. **Zero radius is structural.** Cards, panels, grid cells, media tiles and the navbar are `0px`. Only buttons/pills and tiny status dots may be fully rounded (`9999px`); nav-utility dropdown triggers use `4px`. *Why: sharp ruled geometry is what makes it read "technical".*
3. **Mint accent is rationed.** `#34D59A` (and sibling `#CAE6D9`) appears only on: the terminal-styled CTA fill, small icon glyphs, inline code-keyword tokens, thin data-chart strokes, and the "all systems operational" status dot. Never across a large fill or a whole section. *Why: scarcity is what makes it read as signal.*
4. **Keep the fused headline.** Every section headline is one text block: a lead clause in white, then a muted continuation clause in `#94979E`, inline on the same line flow. Never split the muted clause into a separate subhead line. *Why: it carries two levels of hierarchy while keeping vertical rhythm tight.*
5. **One pale-mint band at a time.** The `#E4F1EB` surface is a rare inversion for data-visualization proof content, never a default alternating background, and never on two bands at once. Ink flips to `#131415` / `#18191B` inside it.
6. **Hero primary is the white pill.** The highest-contrast control on the first screen is a solid white (`#FFFFFF`) pill with black text, 44px tall. The secondary is a transparent outline pill beside it. Outline is never the primary. Do not reuse the nav-utility button values (4px radius, 23px tall, transparent) for the hero CTA.
7. **Red and amber are signals, not chrome.** Red `#FF5F57` (token `error`) marks errors only: validation and error messages, the border of an invalid form field, the edge and marker of an error notice, and chart error/spike states. Amber `#F5A524` (token `warning`) is for chart warning states only. Never use either as a button fill, a large background, a section wash or decoration. *Why: like mint, scarcity keeps them meaningful; red must always mean "something is wrong".* (Owner decision, 2026-11-23: red added for form errors.)
8. **Elevation is nearly flat.** Structure comes from hairline borders and rules, not shadows. Only two shadows exist (see Graphics & effects).

## Tokens (full set in `assets/tokens.css`)

| Token | Value | Use |
|---|---|---|
| background | `#000000` | page canvas |
| surface | `#111315` | raised/code panels |
| surface-alt | `#E4F1EB` | pale-mint inversion band (rare) |
| text-primary | `#FFFFFF` | headlines, body, lead clause |
| text-secondary | `#94979E` | muted clause, secondary body |
| border | `#303236` | visible hairlines, outline buttons, grid dividers |
| border-subtle | `#18191B` | near-invisible structure; ink on mint band |
| accent | `#34D59A` | mint accent (rationed) |
| accent-hover | `#47D18C` | accent hover state |
| error | `#FF5F57` | errors only: messages, invalid field borders, error notices, chart errors (rule 7) |
| warning | `#F5A524` | chart warning states only (rule 7) |

Also in the source: ink-on-mint `#131415`, mint sibling `#CAE6D9`, mint-fill hover `#F6FDFA`, deep near-black `#181818`.

Spacing: base unit `8px`; gaps `12px` (sm), `24px` (md), `80px` (lg); section padding `240px` (vertical, desktop); paired-panel column gap `128px`; content max-width `1600px`.

Radius: control `4px` (nav-utility triggers only), pill `9999px` (buttons, status dots), everything else `0px`. The source token list also shows `card: 4px`, but the component specs and guardrails say cards are `0px` - **cards are 0px**.

## Typography

| Role | Font | Size / weight / line-height / tracking |
|---|---|---|
| Hero display | Inter | 68px / 400 / 1.13 / -2.7px |
| Section headline | Inter | 48px / 400 / 1.13 / -1.9px |
| App page title | Inter | 32px / 400 / 1.2 / -0.9px |
| Body | Inter | 16px / 400 / 1.5 |
| Label (card eyebrows, nav items) | Inter | 16px / 500 / 1.5 / -0.4px |
| Mono (code panels, terminal timestamps, shell-command CTA) | GeistMono | 13px / 400 / 1.5 |
| Serif accent | Times New Roman | 16px / 400 / 1.5 - rare, small, inline only |

- Inter carries the public, marketing pages at just two display sizes (68 and 48). **App and form screens** (everything signed in, plus log-in, sign-up, password, error and not-found pages) open with the **32px app page title** instead, still as a fused lead + muted headline; 48px titles overwhelmed working screens (owner decision, 2026-11-26). Do not add other sizes.
- The display weight is 400. In the fused headline, the lead clause stands out through **color** (white vs. `#94979E`), not through heavier weight. Do not raise display weight.
- Body is white; secondary descriptions drop to `#94979E`.
- GeistMono is the "developer tool" signal. Use it wherever something is code, a command, a timestamp, or a data readout - and nowhere decorative.
- The serif is a quiet interruption inside running text, never a display face.
- Fallbacks: Inter -> `system-ui, sans-serif`; GeistMono -> `ui-monospace, SFMono-Regular, monospace`.

Fused headline markup:

```html
<h2 class="headline">
  <span class="headline__lead">Lead statement.</span>
  <span class="headline__muted">Muted explanatory continuation.</span>
</h2>
```

## Layout and page composition

- Content is capped at `1600px`; sections get generous `240px` vertical padding, producing long black voids between bands. The rhythm is spacious even though individual rows are dense.
- **First screen stack:** full-width dark utility banner -> edge-to-edge black navbar (64px, sticky) -> left-aligned eyebrow + two-line 68px display headline -> pill-button pair (white primary + outline secondary) -> five-up feature strip bleeding into the fold. Content-first density, not a pure-hero pause.
- **Below the fold:** a monochrome logo strip on black, then full-bleed 240px-padded content bands. Each band opens with a small dotted-grid glyph + a fused headline. Bands stay black, except at most one pale-mint band.
- **Paired panel:** fixed 2-column layout, `128px` gap, one item per side - text/diagram left, large chart/detail right.
- **Feature grid:** strict uniform grid (2 rows x 3 equal columns), cells separated by hairline dividers. Not bento, not masonry, no variable spans.
- **Five-up strip:** five equal columns, each a label + gray clause over an edge-bleeding media tile.
- Everything is left-aligned and ruled; structure reads like a table.

## Components (summary - exact specs in `references/components.md`)

| Component | Key facts |
|---|---|
| Navbar | edge-to-edge, 64px, sticky, `#000`, 0 radius; logo + grouped nav + Log-in text link + white signup pill (36px) |
| Hero primary CTA | `#FFF` pill, black text, 44px |
| Hero secondary CTA | transparent pill, white text, `1px solid #303236`, 44px |
| Nav-utility button | transparent, white text, 4px radius, 23px tall, `0 14px` padding |
| Mint-fill button (square) | `#E4F1EB` bg, `#131415` text, 0 radius, 44px, `0 16px`, hover `#F6FDFA` |
| Outline-square button | `#FFF` bg, `#18191B` text, `1px solid #18191B`, 0 radius, 44px |
| Terminal-accent CTA | `#34D59A` pill, black mono text, 44px, `0 28px`, hover `#47D18C` |
| Cards | transparent, 0 radius, 0 padding beyond text inset, hairline borders only |
| Logo strip | ~8 flat-gray marks on black, no dividers, no card chrome |
| Footer | `#000`, four-column links, compliance badge row, mint status dot |

## Graphics and effects

- **Gradient:** only one, a small scrim `linear-gradient(rgba(0,0,0,0) 0%, rgb(0,0,0) 100%)` - a vertical fade under a hero graphic or panel edge. Never a page-wide wash.
- **Texture:** dot-matrix / halftone grain on the top banner strip and faintly behind code panels - small, angular, dithered (one warm amber/green instance against black).
- **Hero graphic stand-in** (when no live video): dark radial glows with thin vertical mint/teal bars. **Footer band stand-in:** a fine branching-line network graphic.
- **Shadows (only two):**
  - card hairline ring: `0 0 0 1px rgba(255,255,255,0.05)` (source: `lab(100 0 0 / 0.05) 0px 0px 0px 1px`)
  - popover/tooltip drop: `0 8px 20px 0 rgba(0,0,0,0.4)`
- Data-viz: bar-chart/waveform bands, branching timelines, dotted flow lines. Chart strokes may use mint; error/warning states use red/amber (rule 7).

## Motion

- Color/background transitions: `0.2s cubic-bezier(0.4, 0, 0.2, 1)`.
- Opacity fades: `0.15s-0.2s`, same curve.
- Compound state changes (hover fill + border): `0.3s`, same curve.
- Fast, snappy settle - no springy overshoot, no decorative bounce.
- Keyframes: `infinityScroll` (continuous logo/marquee rail), `move`, and `slideUpAndFade` / `slideRightAndFade` / `slideDownAndFade` / `slideLeftAndFade` (directional entrances for tooltips and callout chips in data-viz panels). Motion is functional and diagrammatic. Reference implementations are in `assets/tokens.css`.

## When the system is silent

The source does not specify everything. For these gaps use the defaults below and mention in your summary that you did so, so the owner can promote them into the skill:

- **Responsive:** the spec only describes desktop. Scale display type down fluidly (e.g. `clamp()`) while keeping the 1.13 line-height and negative tracking; collapse multi-column grids to one column on narrow screens; reduce the 240px section padding proportionally; keep the 0-radius and black-dominant rules at every size.
- **Form inputs:** treat as square controls - transparent fill, `1px solid #303236`, 0 radius, 44px tall, white text, `#94979E` placeholder; focus border switches to `#34D59A`; an invalid field gets an `#FF5F57` border and its message is in `#FF5F57`, prefixed by a mono `!`.
- **Focus rings / keyboard states:** visible 1px-2px mint outline offset by 2px (this is accent-as-signal, consistent with rule 3).
- **Reduced motion:** honor `prefers-reduced-motion` by disabling marquee and slide animations.
- **Content-specific motifs:** the source is written around a developer-infrastructure product (shell-command CTA, database branching diagrams, terminal logs). Keep the *pattern* (mono command styling, branching-line graphics, terminal-style panels) but replace the literal content with whatever fits this site's own product.

Never resolve a gap by adding a new color, a new radius, a drop shadow, a gradient background, or a new typeface.

## Pre-finish checklist

- [ ] Background is `#000000`; no full-frame saturated gradient anywhere.
- [ ] Every card/panel/grid cell/navbar has 0 radius; only buttons and status dots are pill-rounded.
- [ ] Mint `#34D59A` appears only on CTA pill, icon glyphs, code tokens, chart strokes, status dot.
- [ ] Red `#FF5F57` appears only on error states (messages, invalid borders, error notices, chart errors); amber only on chart warnings; neither fills a button or background.
- [ ] Section headlines use the fused lead + muted-clause pattern inline (no separate subhead).
- [ ] At most one `#E4F1EB` band, and it holds data-viz proof content with dark ink.
- [ ] Hero primary is the white pill; secondary is the outline pill; nav-utility values not reused.
- [ ] Type uses only the defined sizes (68 / 48 / 32 / 16 / 13) and families (Inter, GeistMono, rare serif); app and form screens use the 32px title; 68/48 only on marketing pages.
- [ ] Layout respects 1600px max-width, 8px base unit, 128px paired-panel gap, uniform grids.
- [ ] No shadows beyond the two defined; transitions use `0.2s cubic-bezier(0.4, 0, 0.2, 1)`.
- [ ] All values come from tokens, not hardcoded hex/px.

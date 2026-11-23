# Component specs - Void terminal glass

Read this when building or changing a specific component. All values come from the design spec; tokens are in `../assets/tokens.css`.

## Contents
- Buttons
- Navbar
- Five-up feature strip
- Logo strip
- Paired-panel content bands
- Feature grid (3x2)
- Terminal-accent CTA band
- Footer
- Card families
- Form controls and errors
- Quick radius reference

---

## Buttons

| Variant | Background | Text | Radius | Height | Padding | Border | Hover |
|---|---|---|---|---|---|---|---|
| Hero primary | `#FFFFFF` (near-white solid) | `#000000` | 9999px | 44px | - | - | - |
| Hero secondary | transparent | `#FFFFFF` | 9999px | 44px | - | `1px solid #303236` | - |
| Nav utility (dropdown trigger) | transparent | `#FFFFFF` | 4px | 23px | `0 14px` | - | - |
| Navbar CTA (signup) | `#FFFFFF` | `#000000` | 9999px | 36px | - | - | - |
| Mint fill (square) | `#E4F1EB` | `#131415` | 0px | 44px | `0 16px` | - | bg `#F6FDFA` |
| Outline square | `#FFFFFF` | `#18191B` | 0px | 44px | `12px 16px` | `1px solid #18191B` | - |
| Terminal accent | `#34D59A` | `#000000` (mono) | 9999px | 44px | `0 28px` | - | bg `#47D18C` |

Rules:
- On the first screen, the white pill is the single most emphasized control. The outline pill sits beside it and is always secondary.
- The hero primary is NOT the nav-utility button; do not reuse 4px radius / 23px height / transparent fill for it.
- The square mint-fill and outline-square buttons are the 0-radius variants, suited to the light (pale-mint) band and ruled layouts.
- The terminal-accent CTA text is monospace and reads like a shell command (the pattern; adapt the literal command to this site's product).
- State changes animate at `0.3s cubic-bezier(0.4, 0, 0.2, 1)`.

## Navbar

- Edge-to-edge square bar: 100% viewport width, 0px inset either side, 64px tall, sticky, fill `#000000`, 0px radius on all four corners.
- Holds: logo; grouped nav dropdowns; utility links; social counters (~36 interactive items in the source); a "Log in" text link; the signup CTA pill (white fill, black text, 9999px, 36px tall).
- Dropdown triggers use the nav-utility button (transparent, white text, 4px radius, 23px tall, `0 14px`).
- Nav item labels use the label style (Inter 16 / 500 / -0.4px).
- A full-width dark utility banner (with dot-matrix grain texture) sits above the navbar on the first screen.

## Five-up feature strip (first screen)

- Five equal columns, uniform width - not variable spans.
- Each column: small bold label + gray descriptive clause (label style), then a media tile below (examples: autoscaling chart, auth form screenshot, terminal log, node diagram, API call panel).
- Media covers roughly half the card height; 0 radius; transparent background; no border; no padding (media bleeds to the edges).

## Logo strip

- Single row of ~8 monochrome partner marks in flat gray on black.
- No dividers, no card chrome - a pure trust-signal band.
- May use the `infinityScroll` marquee animation.

## Paired-panel content bands (one per major feature story)

- Two-column grid, `128px` gap, one item per side, spans the full 1600px container.
- Left: dotted-grid eyebrow glyph + fused headline + short body.
- Right: one large data visualization or diagram (bar chart with tooltip callouts, branching timeline diagram, dotted flow lines).
- Panel background transparent, 0 radius.
- Tooltips/callout chips use the popover shadow and `slide*AndFade` entrances.
- Section vertical padding `240px`; background black (or, for at most one band on the page, the pale-mint surface with dark ink).

## Feature grid (3x2)

- Mid-page, 6 cards in 2 rows of 3 equal-width columns, strict uniform grid (not bento, not masonry).
- Each cell: small mint-tinted icon glyph at top, bold label + gray body text below.
- Transparent fill, 0 radius, hairline border dividers (`#303236`) between cells, no padding beyond the text inset.
- Informational only - no CTA inside cells.

## Terminal-accent CTA band (footer proof band)

- Dark background with a fine branching-line network graphic behind.
- Fused headline (lead + muted clause) plus a 3-button cluster: white pill CTA (primary here), outline pill secondary, and the mint-fill terminal CTA (`#34D59A`, black mono text, 9999px, 44px, `0 28px`, hover `#47D18C`).

## Footer

- Background `#000000`, 0 radius.
- Logo above a four-column link list (~34 links in the source).
- Compliance badge row: certification labels with small checkmark chips.
- Status dot ("all systems operational") in accent mint.

## Card families

- **Media-right panel:** transparent, 0 radius, 0 padding. Anatomy: full-width panel + right-aligned media + list + body text. Used in the "how it works" band, with two nested tiles inside the media area.
- **Media-top-bleed:** transparent, 0 radius, 0 padding. Media bleeds to the card's top edge with body text below. Used in the five-up strip.
- **Feature-grid card:** transparent, 0 radius, `1px solid #303236` dividers (see Feature grid).
- Optional card-level elevation is only the hairline ring `0 0 0 1px rgba(255,255,255,0.05)`.

## Form controls and errors

| Element | Spec |
|---|---|
| Text input | transparent, `1px solid #303236`, 0 radius, 44px tall, white text, `#94979E` placeholder |
| Focus | border `#34D59A` (plus the global 2px mint focus ring) |
| Invalid input | border `#FF5F57` (`aria-invalid="true"`) |
| Field message | help text `#94979E`; error text `#FF5F57`, mono `!` prefix |
| Error notice | square box, `1px solid #FF5F57`, mono `!` marker in `#FF5F57`, title white, body `#94979E` |
| Success notice | square box, hairline `#303236`, mono `✓` marker in mint |

Red never fills a button or background: destructive buttons stay the
outline-square or white-pill variants, with the consequence spelled out in text.

## Quick radius reference

| Element | Radius |
|---|---|
| Navbar, cards, panels, grid cells, media tiles, square buttons | 0px |
| Nav-utility dropdown triggers | 4px |
| Hero / navbar / terminal pill buttons, status dots | 9999px |

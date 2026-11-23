# packages/ui: agent guide

Shared design system for every screen. The root `AGENTS.md` still applies.

**Before changing anything here, read
`.agents/skills/void-terminal-glass/SKILL.md` and its
`references/components.md`.**

## What lives here

- `src/styles/theme.css`: the skill's tokens mapped into Tailwind v4. Values
  must match `.agents/skills/void-terminal-glass/assets/tokens.css`.
  Tailwind's default colours, font sizes, radii and shadows are removed, so
  only system values exist (`bg-surface`, `text-text-secondary`,
  `rounded-pill`, `text-display`, `shadow-popover`, `py-section`,
  `max-w-content`, ...).
- `src/styles/globals.css`: Tailwind entry, base styles, the `bg-dot-matrix`
  and `bg-scrim` utilities. Apps import it as `@lynx/ui/globals.css`.
- `src/components/`: shared components (`Button`, `Headline`, `Eyebrow`,
  `StatusDot`, ...). Import as `@lynx/ui/components/<name>`.
- `src/lib/utils.ts`: `cn()` for merging class names.

## Rules

- Use tokens, never raw hex or pixel values that exist as tokens.
- `accent` means **mint** here (the skill's name), and mint is rationed: CTA
  pill, icon glyphs, code tokens, chart strokes, status dot. shadcn
  components often use `bg-accent` for hover: change those to `bg-surface`.
- `error` (red `#FF5F57`) is for error states only: messages, invalid field
  borders (`aria-invalid`), error notices, chart errors. `warning` (amber) is
  for chart warnings only. Never as a button fill or background. Use `<Notice
  tone="error">` and `<Field error=...>` instead of styling errors by hand.
- Cards, panels, grid cells, inputs and the navbar are square (radius 0);
  only buttons and status dots are pills. shadcn's `rounded-md` etc. resolve
  to nothing on purpose.
- Dark only: no light theme, no theme switcher.

## Adding a shadcn/ui component

```
pnpm dlx shadcn@latest add <component> -c apps/web
```

The CLI puts it in `packages/ui/src/components/`. Then restyle it to the
skill (radius, colours, sizes, the `accent` rule above) before using it, and
run the skill's checklist.

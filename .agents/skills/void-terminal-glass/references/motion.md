# Motion - Void terminal glass (v2)

Adapted from Emil Kowalski's design-engineering and animation skills. Motion
here is functional and diagrammatic: fast, snappy, no bounce.

## 1. Should it animate at all?

| How often the visitor sees it | Decision |
|---|---|
| Dozens of times a session (tab switches, filters, list navigation, keyboard actions) | No animation, or a colour change only |
| Several times a session (hover, save, a menu) | Short and subtle (100-200ms) |
| Occasionally (a dialog, a drawer, a toast) | Standard enter and exit |
| Rarely (first-run onboarding, a finished interview) | May carry a moment of delight |

Every animation answers "why does this move?": feedback (a press), state (a
save toggles), spatial consistency (a toast leaves the way it came),
explanation (a marketing diagram), or avoiding a jarring jump. "It looks
nice" is not a reason on a screen used every day.

## 2. Easing and duration

| Token | Curve | Use |
|---|---|---|
| `ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | colour, border and opacity changes on hover and state |
| `ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | anything entering, moving or pressing |
| drawer | `cubic-bezier(0.32, 0.72, 0, 1)` | drawers and sheets |
| linear | - | constant motion only (marquee, progress) |

Never `ease-in` for UI (it feels late).

| Element | Duration |
|---|---|
| Button press | 150ms |
| Colour / border change | 200-300ms |
| Tooltip, small popover | 150-200ms |
| Menu, select | 150-250ms |
| Dialog | 200ms in, 150ms out |
| Drawer, sheet | 300-400ms |
| Toast | 300ms in |
| Marketing diagrams | as long as the story needs |

Exits are faster than entrances. Keep UI motion under 300ms unless the table
says otherwise.

## 3. The built-in behaviours

- **Press:** every `Button` scales to 0.97 on `:active` (150ms `ease-out`).
  Other pressable custom elements do the same.
- **Hover:** linked cards (`Card interactive`) lift 2px and brighten their
  border; links underline or brighten; icon buttons get a `neutral-tint`
  ground. Tailwind v4's `hover:` only applies on devices that hover, so
  touch screens don't get stuck hover states.
- **Enter:** from `scale(0.95)` (never `scale(0)`) plus opacity, origin at
  the trigger for popovers and menus. Use CSS transitions (they can be
  interrupted) for UI that toggles; keyframes only for one-off sequences.
- **Lists:** items added or removed change height and opacity together;
  stagger at most 30-50ms per item and only on first load.
- **Loading:** spinners spin fast; skeletons don't shimmer; nothing pulses
  except a live recording dot.

## 4. Never

- Scroll-triggered fade-ins on every section or card; parallax on text;
  scroll-jacking.
- Animating layout properties (`width`, `height`, `top`) where `transform`
  or `opacity` would do; animate `transform`, `opacity`, `clip-path` and
  `filter` only.
- Motion on keyboard shortcuts or command palettes.
- Bounce or overshoot springs on working screens.

## 5. Reduced motion

`prefers-reduced-motion: reduce` turns animations and transitions off
globally (`globals.css`), and Tailwind's `motion-reduce:` variant removes
movement such as the card lift and the button press. Nothing may depend on
an animation to become visible: content shown after an animation must also
be shown without it.

## 6. Review

Check every new animation in slow motion (DevTools animations panel at 10%)
and once more the next day with fresh eyes; if you notice it after the
tenth time, it is too much.

# Foundation & Tokens

> ToStatos Design System -- Foundation layer.
> All values extracted from `src/index.css` (@theme) and `src/styles/common.ts`.

---

## 1. Color Palette

### Neutral

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#f7f6f2` | Page background, input backgrounds |
| `--color-surface` | `#ffffff` | Cards, panels, modals |
| `--color-surface-2` | `#f2f1ed` | Secondary surface (grouped sections, table headers) |
| `--color-border` | `rgba(0, 0, 0, 0.08)` | Subtle borders, dividers |
| `--color-border-md` | `rgba(0, 0, 0, 0.14)` | Input borders, scrollbar thumb, stronger dividers |
| `--color-text` | `#1a1a18` | Primary body text |
| `--color-text-2` | `#6b6a65` | Secondary text, labels, descriptions |
| `--color-text-3` | `#a09f99` | Tertiary text, placeholders, disabled states |

### Blue (Primary)

| Token | Value | Usage |
|---|---|---|
| `--color-blue` | `#185fa5` | Primary buttons, active links, focus ring |
| `--color-blue-light` | `#e6f1fb` | Blue badges background, info banners |
| `--color-blue-text` | `#0c447c` | Blue text on light backgrounds |

### Green (Success)

| Token | Value | Usage |
|---|---|---|
| `--color-green` | `#3b6d11` | Success text, status indicators |
| `--color-green-light` | `#eaf3de` | Success badge background, positive highlights |
| `--color-green-mid` | `#639922` | Progress bars, mid-intensity green accents |
| `--color-green-text` | `#3b6d11` | Green text (same value as `--color-green`) |

### Amber (Warning)

| Token | Value | Usage |
|---|---|---|
| `--color-amber` | `#854f0b` | Warning text, caution indicators |
| `--color-amber-light` | `#faeeda` | Warning badge background, attention banners |
| `--color-amber-mid` | `#ba7517` | Mid-intensity amber accents |

### Yellow

| Token | Value | Usage |
|---|---|---|
| `--color-yellow` | `#b45309` | Yellow/orange accent text |
| `--color-yellow-light` | `#fef3c7` | Yellow badge background, highlights |

### Red (Danger)

| Token | Value | Usage |
|---|---|---|
| `--color-red` | `#a32d2d` | Danger buttons, error text, destructive actions |
| `--color-red-light` | `#fcebeb` | Error badge background, danger banners |
| `--color-red-mid` | `#e24b4a` | Mid-intensity red, progress bars (critical) |

---

## 2. Typography

### Font Families

| Token | Value |
|---|---|
| `--font-family-sans` | `"IBM Plex Sans", system-ui, sans-serif` |
| `--font-family-mono` | `"IBM Plex Mono", monospace` |

The body element uses `var(--font-family-sans)` as its default. All buttons and inputs also explicitly set `fontFamily: 'var(--font-family-sans)'` in `common.ts`.

### Base Settings

```css
body {
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
```

### Font Weight Scale

| Weight | Name | Usage |
|---|---|---|
| `400` | Regular | Body text, paragraphs |
| `500` | Medium | Ghost buttons, small labels (`labelSmStyle`) |
| `600` | Semibold | Primary buttons, form labels, headings |
| `700` | Bold | Emphasis, section titles |
| `800` | Extrabold | Hero numbers, KPI values |

### Font Size Scale

| Size | Usage |
|---|---|
| `10px` | Micro text, badges |
| `11px` | Small uppercase labels (`labelSmStyle`) |
| `12px` | Form labels (`labelStyle`), ghost buttons, secondary text |
| `13px` | Primary buttons, inputs (`inputStyle`, `btnPrimary`) |
| `14px` | Base body size (`body`), standard UI text |
| `15px` | Slightly emphasized body text |
| `16px` | Subheadings, card titles |
| `18px` | Section headings |
| `20px` | Page subtitles |
| `22px` | Page titles |
| `28px` | Hero/dashboard headline numbers |

---

## 3. Spacing & Sizing

### Common Paddings

| Value | Usage examples |
|---|---|
| `6px` | Compact padding (small buttons, `ItemDetailPanel` inputs) |
| `6px 8px` | Dense input variant (`ItemDetailPanel`, `BlockersTab`) |
| `6px 14px` | Ghost button padding (`btnGhost`) |
| `7px 16px` | Primary button padding (`btnPrimary`) |
| `8px` | General inner padding |
| `8px 10px` | Standard input padding (`inputStyle`) |
| `8px 28px 8px 10px` | Select input padding (`selectStyle`, with room for arrow) |
| `10px` | Medium inner padding |
| `12px` | Card inner padding, compact containers |
| `14px` | Section padding |
| `16px` | Standard card padding, content blocks |
| `18px` | Generous card padding |
| `20px` | Panel padding, modal body |
| `24px` | Large section padding, page margins |

### Common Gaps (flex/grid)

| Value | Usage |
|---|---|
| `4px` | Tight inline groups (icon + text, label + value) |
| `6px` | Compact form rows |
| `8px` | Default inline gap, button groups |
| `10px` | Standard row spacing |
| `12px` | Card content spacing |
| `14px` | Form field groups |
| `16px` | Section internal gaps |
| `20px` | Section-to-section spacing |

---

## 4. Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `6px` | Ghost buttons, compact inputs, small badges |
| `--radius-md` | `8px` | Primary buttons, standard inputs, cards |
| `--radius-lg` | `12px` | Modals, large cards, panels |
| (pill) | `20px` | Pills, tags, status badges |
| (circle) | `50%` | Avatars, round icon buttons |

```css
/* Examples from common.ts */
btnPrimary  { borderRadius: 8 }   /* --radius-md */
btnGhost    { borderRadius: 6 }   /* --radius-sm */
inputStyle  { borderRadius: 8 }   /* --radius-md */
```

---

## 5. Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.05)` | Subtle elevation (buttons at rest, badges) |
| `--shadow-md` | `0 2px 8px rgba(0, 0, 0, 0.08)` | Cards, dropdowns |
| `--shadow-lg` | `0 4px 16px rgba(0, 0, 0, 0.12)` | Floating panels, popovers |
| `--shadow-xl` | `0 12px 40px rgba(0, 0, 0, 0.2)` | Modals, dialog overlays |
| `--focus-ring` | `0 0 0 3px rgba(24, 95, 165, 0.3)` | Focus visible state on interactive elements |

```css
/* Focus ring is applied globally */
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
a:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
```

The focus ring color (`rgba(24, 95, 165, 0.3)`) is derived from `--color-blue` (`#185fa5`) at 30% opacity.

---

## 6. Animations

### fadeUp Keyframe

Used for card entrance animations via the `.anim-fade-up` utility class.

```css
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.anim-fade-up {
  animation: fadeUp 0.25s ease both;
}
```

### Transition Defaults

| Duration | Easing | Usage |
|---|---|---|
| `0.15s` | `ease` | Buttons, interactive hover/active states (`btnGhost`) |
| `0.2s` | `ease` | Panels, dropdowns, expand/collapse |
| `0.25s` | `ease` | Card fade-up entrance animation |
| `0.3s` | `ease` | Progress bars, width/height transitions |

---

## Quick Reference: common.ts Shared Styles

These pre-built `CSSProperties` objects from `src/styles/common.ts` encode the foundation tokens for reuse across React components:

| Export | Purpose | Key Values |
|---|---|---|
| `inputStyle` | Base text input | `padding: 8px 10px`, `borderRadius: 8`, `fontSize: 13`, `bg: --color-bg` |
| `selectStyle` | Dropdown select | Extends `inputStyle` + SVG arrow, `padding: 8px 28px 8px 10px` |
| `labelStyle` | Form label | `fontSize: 12`, `fontWeight: 600`, `color: --color-text-2`, `marginBottom: 4` |
| `labelSmStyle` | Small uppercase label | Extends `labelStyle`, `fontSize: 11`, `textTransform: uppercase`, `letterSpacing: 0.5px` |
| `btnPrimary` | Primary action button | `padding: 7px 16px`, `bg: --color-blue`, `borderRadius: 8`, `fontWeight: 600`, `fontSize: 13` |
| `btnDanger` | Destructive button | Extends `btnPrimary`, `bg: --color-red` |
| `btnGhost` | Ghost/outline button | `padding: 6px 14px`, `borderRadius: 6`, `border: 1px solid --color-border-md`, `fontSize: 12` |

---

*Source files: `src/index.css` (lines 1-85), `src/styles/common.ts` (lines 1-140)*

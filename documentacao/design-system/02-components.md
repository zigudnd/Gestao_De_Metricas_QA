# 02 -- Components

> ToStatos Design System -- Component Library
> Author: Jordan Vega, UX Senior Designer
> Last updated: 2026-03-27

This document catalogs every reusable component pattern extracted from the ToStatos codebase. Each entry includes its visual description, CSS properties, interaction states, variants, a JSX usage example, and Do/Don't guidelines.

Shared constants live in `src/styles/common.ts`. Components may define local overrides but must stay visually consistent with the tokens documented here.

---

## Table of Contents

1. [Button](#1-button)
2. [Input](#2-input)
3. [Select](#3-select)
4. [Badge](#4-badge)
5. [Card](#5-card)
6. [Modal](#6-modal)
7. [Toast](#7-toast)
8. [Tabs](#8-tabs)
9. [Filter Pill](#9-filter-pill)
10. [Avatar](#10-avatar)
11. [Progress Bar](#11-progress-bar)
12. [Empty State](#12-empty-state)
13. [Search Input](#13-search-input)

---

## 1. Button

Buttons trigger actions. Five variants exist, each mapped to a semantic intent.

### 1.1 Primary (`btnPrimary`)

Solid blue button for the main action in any context.

**Source:** `src/styles/common.ts:110-120`

| Property | Value |
|---|---|
| `padding` | `7px 16px` |
| `background` | `var(--color-blue)` |
| `color` | `#fff` |
| `border` | `none` |
| `borderRadius` | `8px` |
| `fontWeight` | `600` |
| `fontSize` | `13px` |
| `cursor` | `pointer` |
| `fontFamily` | `var(--font-family-sans)` |

**States:**

| State | Behavior |
|---|---|
| Default | Solid blue background, white text |
| Hover | Slight brightness increase (CSS class `hp-btn-blue` applies hover styles) |
| Active | Pressed visual feedback via browser default |
| Disabled | `opacity: 0.5`, `cursor: not-allowed` (applied inline when `disabled` prop is true) |
| Focus | Browser default outline; no custom focus ring defined |

**Usage:**

```tsx
import { btnPrimary } from '@/styles/common'

<button style={btnPrimary}>
  Criar Sprint
</button>

{/* Disabled state */}
<button
  disabled={!isValid}
  style={{
    ...btnPrimary,
    opacity: isValid ? 1 : 0.5,
    cursor: isValid ? 'pointer' : 'not-allowed',
  }}
>
  Adicionar
</button>
```

### 1.2 Danger (`btnDanger`)

Red variant for destructive actions like delete or remove.

**Source:** `src/styles/common.ts:123-126`

| Property | Value |
|---|---|
| Inherits | All of `btnPrimary` |
| `background` | `var(--color-red)` |

**Usage:**

```tsx
import { btnDanger } from '@/styles/common'

<button style={btnDanger}>Excluir</button>
```

### 1.3 Ghost (`btnGhost`)

Transparent button with a subtle border. Used for secondary or tertiary actions.

**Source:** `src/styles/common.ts:129-139`

| Property | Value |
|---|---|
| `padding` | `6px 14px` |
| `borderRadius` | `6px` |
| `border` | `1px solid var(--color-border-md)` |
| `background` | `transparent` |
| `color` | `var(--color-text-2)` |
| `fontSize` | `12px` |
| `cursor` | `pointer` |
| `transition` | `all 0.15s` |

**Usage:**

```tsx
import { btnGhost } from '@/styles/common'

<button style={btnGhost}>Cancelar</button>
```

### 1.4 Outline

Transparent background with a visible border. Used for cancel actions inside modals.

**Source:** `src/modules/sprints/pages/HomePage.tsx:1134-1144`

| Property | Value |
|---|---|
| `padding` | `7px 16px` |
| `background` | `transparent` |
| `color` | `var(--color-text)` |
| `border` | `1px solid var(--color-border-md)` |
| `borderRadius` | `8px` |
| `fontWeight` | `500` |
| `fontSize` | `13px` |

**Usage:**

```tsx
<button onClick={onCancel} style={btnOutline}>
  Cancelar
</button>
```

### 1.5 Icon-only

Square button with only an icon. Used for favorite, duplicate, delete actions on sprint cards.

**Source:** `src/modules/sprints/pages/HomePage.tsx:927-988`

| Property | Value |
|---|---|
| `height` | `36px` |
| `minWidth` | `36px` |
| `borderRadius` | `8px` |
| `border` | `1px solid transparent` |
| `background` | `transparent` |
| `color` | `var(--color-text-3)` |
| `display` | `flex` |
| `alignItems / justifyContent` | `center` |
| `transition` | `all 0.15s` |

When active (e.g., favorite pressed): `background: var(--color-amber-light)`, `color: var(--color-amber-mid)`.

**Usage:**

```tsx
<button
  aria-label="Adicionar aos favoritos"
  aria-pressed={isFavorite}
  style={{
    height: 36, minWidth: 36, borderRadius: 8,
    border: '1px solid transparent',
    background: isFavorite ? 'var(--color-amber-light)' : 'transparent',
    color: isFavorite ? 'var(--color-amber-mid)' : 'var(--color-text-3)',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}
>
  {isFavorite ? '\u2605' : '\u2606'}
</button>
```

### Do / Don't

- **Do** use `btnPrimary` for the single most important action per screen or modal.
- **Do** use `btnDanger` only for irreversible or destructive actions (delete, remove).
- **Do** pair a destructive button with a cancel/outline button for confirmation.
- **Don't** place two primary buttons side by side. Pair primary + outline or primary + ghost.
- **Don't** use `btnGhost` for primary CTA actions; it lacks sufficient visual weight.
- **Don't** omit `aria-label` on icon-only buttons.

---

## 2. Input

Text input fields for forms. All share a consistent base style.

### 2.1 Text Input (`inputStyle`)

**Source:** `src/styles/common.ts:63-73`

| Property | Value |
|---|---|
| `width` | `100%` |
| `padding` | `8px 10px` |
| `border` | `1px solid var(--color-border-md)` |
| `borderRadius` | `8px` |
| `fontSize` | `13px` |
| `color` | `var(--color-text)` |
| `background` | `var(--color-bg)` |
| `fontFamily` | `var(--font-family-sans)` |
| `boxSizing` | `border-box` |

**States:**

| State | Behavior |
|---|---|
| Default | Light background, medium border |
| Focus | Browser default outline (no custom `:focus` defined in inline styles) |
| Disabled | `opacity: 0.5` applied inline |
| Error | `borderColor: var(--color-red-mid)` applied inline |

**Usage:**

```tsx
import { inputStyle } from '@/styles/common'

<input
  type="text"
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  placeholder="Nome do item"
  style={inputStyle}
/>
```

### 2.2 Date Input

Uses `inputStyle` with `type="date"`. No additional styling needed -- the browser renders the date picker.

```tsx
<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
```

### 2.3 Number Input

Same base `inputStyle` with `type="number"` and `min`/`max` constraints.

```tsx
<input type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)} style={inputStyle} />
```

### 2.4 Textarea

Extends `inputStyle` with vertical resize and monospace font for notes/sub-items.

```tsx
<textarea
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  rows={3}
  style={{
    ...inputStyle,
    resize: 'vertical',
    fontFamily: 'var(--font-family-mono)',
    fontSize: 12,
  }}
/>
```

### 2.5 Label (`labelStyle`)

Every input should be preceded by a label.

**Source:** `src/styles/common.ts:92-97`

| Property | Value |
|---|---|
| `display` | `block` |
| `fontSize` | `12px` |
| `fontWeight` | `600` |
| `color` | `var(--color-text-2)` |
| `marginBottom` | `4px` |

**Small variant (`labelSmStyle`):** `fontSize: 11`, `textTransform: uppercase`, `letterSpacing: 0.5px`.

```tsx
import { labelStyle } from '@/styles/common'

<label style={labelStyle}>Titulo *</label>
<input style={inputStyle} />
```

### Do / Don't

- **Do** always wrap inputs in a `<div>` with a `<label>` using `labelStyle`.
- **Do** set `width: 100%` and `boxSizing: border-box` to avoid overflow.
- **Don't** override `fontFamily` unless you have a specific reason (mono for code/notes).
- **Don't** use placeholder text as a substitute for labels.

---

## 3. Select

Custom styled `<select>` with an SVG chevron arrow replacing the native dropdown indicator.

**Source:** `src/styles/common.ts:78-86`

| Property | Value |
|---|---|
| Inherits | All of `inputStyle` |
| `padding` | `8px 28px 8px 10px` |
| `cursor` | `pointer` |
| `appearance` | `none` |
| `backgroundImage` | SVG triangle arrow (`fill: #999`) |
| `backgroundRepeat` | `no-repeat` |
| `backgroundPosition` | `right 10px center` |

The SVG arrow is a 10x6 downward-pointing triangle encoded inline as a data URI.

**Usage:**

```tsx
import { selectStyle, labelStyle } from '@/styles/common'

<label style={labelStyle}>Secao</label>
<select value={section} onChange={(e) => setSection(e.target.value)} style={selectStyle}>
  <option value="planning">Planejamento</option>
  <option value="execution">Execucao</option>
</select>
```

### Compact Filter Variant

Used inside filter bars with smaller padding.

**Source:** `src/modules/sprints/pages/HomePage.tsx:1024-1038` (FilterGroup)

| Property | Value |
|---|---|
| `fontSize` | `12px` |
| `fontWeight` | `500` |
| `padding` | `3px 24px 3px 8px` |
| `borderRadius` | `6px` |
| Arrow size | `8x5` (smaller variant) |

### Do / Don't

- **Do** use `appearance: none` to ensure cross-browser consistency.
- **Do** keep `28px` right padding to avoid text overlapping the arrow.
- **Don't** nest `<option>` groups deeper than one level.
- **Don't** use a custom dropdown component unless you need multi-select or search.

---

## 4. Badge

Small inline labels that communicate status, role, or count.

### 4.1 Neutral Badge (`badgeNeutral`)

**Source:** `src/modules/squads/pages/SquadsPage.tsx:1413`

| Property | Value |
|---|---|
| `fontSize` | `10px` |
| `fontWeight` | `500` |
| `padding` | `2px 8px` |
| `borderRadius` | `8px` |
| `background` | `var(--color-surface-2)` |
| `color` | `var(--color-text-2)` |
| `border` | `0.5px solid var(--color-border)` |

Used for: role labels, squad tags, generic labels like "PADRAO".

### 4.2 Active / Success Badge (`badgeActive`)

**Source:** `src/modules/squads/pages/SquadsPage.tsx:1414`

| Property | Value |
|---|---|
| `background` | `var(--color-green-light)` |
| `color` | `var(--color-green)` |
| `border` | `0.5px solid var(--color-green-mid)` |

Used for: "Ativo" status, positive states.

### 4.3 Inactive / Error Badge (`badgeInactive`)

**Source:** `src/modules/squads/pages/SquadsPage.tsx:1415`

| Property | Value |
|---|---|
| `background` | `var(--color-red-light)` |
| `color` | `var(--color-red)` |
| `border` | `0.5px solid var(--color-red-mid)` |

Used for: "Inativo" status, error states.

### 4.4 Role Badge (`roleBadge`)

**Source:** `src/modules/squads/pages/SquadsPage.tsx:33-36`

Identical structure to `badgeNeutral`. Applied to role labels like "QA Lead", "QA", "Stakeholder".

### 4.5 Count Badge

Inline rounded pill showing item count inside section headers.

**Source:** `src/modules/status-report/components/SectionCard.tsx:49-53`

| Property | Value |
|---|---|
| `fontSize` | `11px` |
| `fontWeight` | `700` |
| `color` | `{section.color}` |
| `background` | `{section.color}18` (6% opacity) |
| `padding` | `2px 8px` |
| `borderRadius` | `10px` |

### 4.6 Sprint Type Badge

Small uppercase tag on sprint cards.

**Source:** `src/modules/sprints/pages/HomePage.tsx:873-882`

| Property | Value |
|---|---|
| `fontSize` | `9px` |
| `fontWeight` | `700` |
| `padding` | `1px 6px` |
| `borderRadius` | `8px` |
| `textTransform` | `uppercase` |

Colors: Regressivo = `#f97316` tinted, Integrado = `var(--color-blue-light)`.

**Usage:**

```tsx
{/* Status badge */}
<span style={badgeActive}>Ativo</span>
<span style={badgeInactive}>Inativo</span>

{/* Neutral label badge */}
<span style={badgeNeutral}>Admin</span>

{/* Count badge */}
<span style={{
  fontSize: 11, fontWeight: 700,
  color: section.color,
  background: section.color + '18',
  padding: '2px 8px', borderRadius: 10,
}}>
  {items.length}
</span>
```

### Do / Don't

- **Do** use the semantic color for the badge (green = active, red = inactive, neutral = informational).
- **Do** keep badge text very short (1-2 words, or a number).
- **Don't** use badges for long text. If the content exceeds 3 words, use a different element.
- **Don't** stack more than 3 badges in a row without visual grouping.

---

## 5. Card

Cards are surface containers that group related content.

### 5.1 Surface Card (Sprint Card)

Compact list-style card used in the sprint list.

**Source:** `src/modules/sprints/pages/HomePage.tsx:804-991`

| Property | Value |
|---|---|
| `background` | `var(--color-surface)` |
| `border` | `0.5px solid var(--color-border)` |
| `borderRadius` | `10px` |
| `padding` | `10px 16px` |
| `display` | `flex` |
| `alignItems` | `flex-start` |
| `gap` | `10px` |
| `cursor` | `pointer` |
| `transition` | `box-shadow 0.15s, border-color 0.15s` |

**States:**

| State | Behavior |
|---|---|
| Default | Subtle border, no shadow |
| Hover | CSS class `hp-card-hover` applies subtle box-shadow |
| Selected | `border: 1.5px solid var(--color-blue)`, `boxShadow: 0 0 0 3px rgba(59,130,246,0.12)` |
| Dragging | `cursor: grab` on drag handle |

**Layout:** Status dot (left) + Content block (center, flex: 1) + Action buttons (right).

```tsx
<div style={{
  background: 'var(--color-surface)',
  border: '0.5px solid var(--color-border)',
  borderRadius: 10,
  padding: '10px 16px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  cursor: 'pointer',
  transition: 'box-shadow 0.15s, border-color 0.15s',
}}>
  {/* Status dot */}
  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-green)' }} />
  {/* Content */}
  <div style={{ flex: 1, minWidth: 0 }}>
    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Sprint Title</span>
    <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>Subtitle info</div>
  </div>
</div>
```

### 5.2 Expandable Card (SectionCard)

Collapsible card with a colored accent bar, used in Status Report sections.

**Source:** `src/modules/status-report/components/SectionCard.tsx`

| Property | Value |
|---|---|
| `border` | `1px solid var(--color-border)` |
| `borderRadius` | `10px` |
| `overflow` | `hidden` |
| `marginBottom` | `12px` |

**Header (button):**

| Property | Value |
|---|---|
| `width` | `100%` |
| `display` | `flex` |
| `alignItems` | `center` |
| `gap` | `10px` |
| `padding` | `10px 14px` |
| `background` | `var(--color-surface)` |
| `border` | `none` |
| `cursor` | `pointer` |

Features a 4px-wide colored accent bar on the left (`width: 4, height: 22, borderRadius: 2, background: section.color`).

The chevron rotates: `rotate(-90deg)` when collapsed, `rotate(0)` when expanded, with `transition: transform 0.15s`.

Uses `aria-expanded` for accessibility.

**Content area:** `padding: 8px 10px`, vertical flex layout with `gap: 6`.

**Add item button (dashed):**

| Property | Value |
|---|---|
| `border` | `1px dashed var(--color-border-md)` |
| `borderRadius` | `6px` |
| `background` | `none` |
| `fontSize` | `12px` |
| `color` | `var(--color-text-3)` |
| Hover | `borderColor` and `color` change to `section.color` |

```tsx
<SectionCard
  section={section}
  allSections={sections}
  items={sectionItems}
  computedDates={computedDates}
  isCollapsed={collapsed}
  onToggle={() => toggleSection(section.id)}
  onItemClick={handleItemClick}
  onAddItem={() => handleAddItem(section.id)}
  onMoveItem={handleMoveItem}
/>
```

### 5.3 New Sprint Card (Dashed CTA)

Dashed-border card that acts as a creation trigger.

**Source:** `src/modules/sprints/pages/HomePage.tsx:506-525`

| Property | Value |
|---|---|
| `background` | `var(--color-surface)` |
| `border` | `1.5px dashed var(--color-border-md)` |
| `borderRadius` | `10px` |
| `padding` | `10px 16px` |
| `cursor` | `pointer` |
| `transition` | `border-color 0.15s, background 0.15s` |

Content: `+` icon + "Nova Sprint" text.

### Do / Don't

- **Do** use `overflow: hidden` on expandable cards to clip content during collapse.
- **Do** include `aria-expanded` on the toggle button of expandable cards.
- **Don't** nest cards inside cards.
- **Don't** use `boxShadow` on cards at rest; reserve it for hover/selected states.

---

## 6. Modal

Modals are overlay dialogs for confirmations and forms.

### 6.1 Overlay (Backdrop)

Shared by all modals.

| Property | Value |
|---|---|
| `position` | `fixed` |
| `inset` | `0` |
| `background` | `rgba(0,0,0,0.45)` |
| `zIndex` | `1000` |
| `display` | `flex` |
| `alignItems` | `center` |
| `justifyContent` | `center` |
| `padding` | `16px` |

Clicking the backdrop (when `e.target === e.currentTarget`) dismisses the modal.

### 6.2 ConfirmModal

Destructive confirmation dialog with a red top accent.

**Source:** `src/app/components/ConfirmModal.tsx`

| Property | Value |
|---|---|
| `background` | `var(--color-surface)` |
| `border` | `1px solid var(--color-border)` |
| `borderTop` | `3px solid var(--color-red)` |
| `borderRadius` | `12px` |
| `padding` | `24px` |
| `maxWidth` | `400px` |
| `boxShadow` | `0 12px 40px rgba(0,0,0,0.2)` |
| `gap` | `12px` (flex column) |

**Header:** `fontWeight: 700`, `fontSize: 15`, trash emoji prefix.
**Description:** `fontSize: 13`, `color: var(--color-text-2)`, `lineHeight: 1.6`.
**Footer:** flex row, `gap: 8`, `justifyContent: flex-end`.

```tsx
import { ConfirmModal } from '@/app/components/ConfirmModal'

<ConfirmModal
  title="Excluir Sprint"
  description="Tem certeza que deseja excluir esta sprint? Esta acao nao pode ser desfeita."
  confirmLabel="Excluir"
  onConfirm={handleDelete}
  onCancel={() => setShowModal(false)}
/>
```

### 6.3 Form Modal

Data entry dialog with a blue top accent.

**Source:** `src/modules/status-report/components/ItemFormModal.tsx`

| Property | Value |
|---|---|
| `background` | `var(--color-surface)` |
| `border` | `1px solid var(--color-border)` |
| `borderTop` | `3px solid var(--color-blue)` |
| `borderRadius` | `12px` |
| `padding` | `24px` |
| `maxWidth` | `520px` |
| `maxHeight` | `90vh` |
| `overflowY` | `auto` |
| `boxShadow` | `0 12px 40px rgba(0,0,0,0.2)` |

Supports `Escape` to close and `Cmd/Ctrl+Enter` to submit.

### 6.4 Generic Modal

General-purpose modal without colored top accent.

**Source:** `src/modules/sprints/pages/HomePage.tsx:1046-1117`

| Property | Value |
|---|---|
| `background` | `var(--color-surface)` |
| `borderRadius` | `14px` |
| `padding` | `24px` |
| `maxWidth` | `440px` |
| `boxShadow` | `0 20px 60px rgba(0,0,0,0.2)` |

Header includes title + close button (`x`). When `danger` prop is true, title color becomes `var(--color-red)`.

### Do / Don't

- **Do** use `borderTop: 3px solid var(--color-red)` for destructive modals.
- **Do** use `borderTop: 3px solid var(--color-blue)` for form/creation modals.
- **Do** support `Escape` key to close all modals.
- **Do** close on backdrop click (`e.target === e.currentTarget`).
- **Don't** stack modals on top of each other.
- **Don't** open a modal from within a modal. Use inline expansion instead.

---

## 7. Toast

Non-blocking notification that appears at the bottom center of the screen.

**Source:** `src/app/components/Toast.tsx`

### Base Container

| Property | Value |
|---|---|
| `position` | `fixed` |
| `bottom` | `20px` |
| `left` | `50%` |
| `transform` | `translateX(-50%)` |
| `zIndex` | `5000` |
| `pointerEvents` | `none` (container), `auto` (individual toasts) |

### Toast Item

| Property | Value |
|---|---|
| `padding` | `10px 16px` |
| `borderRadius` | `10px` |
| `fontSize` | `13px` |
| `fontWeight` | `600` |
| `boxShadow` | `0 4px 16px rgba(0,0,0,0.12)` |
| `minWidth` | `240px` |
| Layout | `flex`, `alignItems: center`, `gap: 10` |

### Variants

| Type | Background | Text Color | Border |
|---|---|---|---|
| `success` | `var(--color-green-light)` | `var(--color-green)` | `var(--color-green-mid)` |
| `error` | `var(--color-red-light)` | `var(--color-red)` | `var(--color-red-mid)` |
| `info` | `var(--color-blue-light)` | `var(--color-blue)` | `var(--color-blue)` |

### Optional Action Button (inline)

| Property | Value |
|---|---|
| `padding` | `4px 10px` |
| `borderRadius` | `6px` |
| `background` | Same as toast text color |
| `color` | `#fff` |
| `fontSize` | `12px` |
| `fontWeight` | `600` |

**Auto-dismiss:** Default duration is `3000ms`. Set `duration: 0` for persistent toasts.

**Usage:**

```tsx
import { showToast } from '@/app/components/Toast'

// Simple
showToast('Sprint criada com sucesso', 'success')
showToast('Erro ao salvar', 'error')
showToast('Dados carregados', 'info')

// With action button
showToast('Item excluido', 'success', {
  action: { label: 'Desfazer', onClick: handleUndo },
  duration: 5000,
})
```

The `<ToastContainer />` must be rendered once at the app root. The `showToast()` function works from anywhere -- no React context required.

### Do / Don't

- **Do** place `<ToastContainer />` at the root layout level.
- **Do** keep toast messages under 60 characters.
- **Do** use the action button for undo operations.
- **Don't** use toasts for errors that require user intervention. Use a modal or inline error instead.
- **Don't** show more than 3 toasts simultaneously.

---

## 8. Tabs

Horizontal tab bar used for navigating between views within a page.

**Source:** `src/modules/squads/pages/SquadsPage.tsx:628-644`

### Tab Container

| Property | Value |
|---|---|
| `padding` | `0 24px` |
| `display` | `flex` |
| `gap` | `0` |
| `borderBottom` | `1px solid var(--color-border)` |

### Tab Button

| Property | Value |
|---|---|
| `padding` | `8px 16px` |
| `background` | `none` |
| `border` | `none` |
| `fontSize` | `13px` |
| `cursor` | `pointer` |
| `marginBottom` | `-1px` |

**States:**

| State | `borderBottom` | `color` | `fontWeight` |
|---|---|---|---|
| Inactive | `2px solid transparent` | `var(--color-text-2)` | `400` |
| Active | `2px solid var(--color-blue)` | `var(--color-blue)` | `600` |

The active tab overlaps the container border by 1px (`marginBottom: -1px`), creating the connected-tab visual.

**Usage:**

```tsx
<div style={{
  display: 'flex', gap: 0,
  borderBottom: '1px solid var(--color-border)',
}}>
  {tabs.map(([id, label]) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      role="tab"
      aria-selected={tab === id}
      style={{
        padding: '8px 16px',
        background: 'none',
        border: 'none',
        borderBottom: tab === id
          ? '2px solid var(--color-blue)'
          : '2px solid transparent',
        marginBottom: -1,
        color: tab === id ? 'var(--color-blue)' : 'var(--color-text-2)',
        fontWeight: tab === id ? 600 : 400,
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  ))}
</div>
```

### Do / Don't

- **Do** use `role="tab"` and `aria-selected` for accessibility.
- **Do** wrap tab buttons in a container with `role="tablist"`.
- **Don't** use tabs for more than 5 items. Consider a different navigation pattern.
- **Don't** apply padding directly to tab buttons' left/right beyond `16px` -- keep them compact.

---

## 9. Filter Pill

Toggle buttons used for multi-select filtering (e.g., priority, stacks).

**Source:** `src/modules/status-report/components/ItemFormModal.tsx:146-189`

### Base Pill

| Property | Value |
|---|---|
| `padding` | `5px 12px` (stacks) / `6px 0` with `flex: 1` (priority) |
| `borderRadius` | `6px` |
| `fontSize` | `12px` |
| `fontWeight` | `600` |
| `cursor` | `pointer` |
| `fontFamily` | `var(--font-family-sans)` |

**States:**

| State | Border | Background | Color |
|---|---|---|---|
| Off | `1px solid var(--color-border-md)` | `transparent` | `var(--color-text-2)` |
| On | `2px solid var(--color-blue)` | `var(--color-blue-light)` | `var(--color-blue-text)` |

Uses `aria-pressed` for accessibility.

**Usage:**

```tsx
<button
  onClick={() => toggleOption(option.value)}
  aria-pressed={isSelected}
  style={{
    padding: '5px 12px', borderRadius: 6,
    fontSize: 12, fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-family-sans)',
    border: isSelected
      ? '2px solid var(--color-blue)'
      : '1px solid var(--color-border-md)',
    background: isSelected
      ? 'var(--color-blue-light)'
      : 'transparent',
    color: isSelected
      ? 'var(--color-blue-text)'
      : 'var(--color-text-2)',
  }}
>
  {option.label}
</button>
```

### Clear Filters Pill

Rounded pill to reset all filters.

**Source:** `src/modules/sprints/pages/HomePage.tsx:435-451`

| Property | Value |
|---|---|
| `fontSize` | `12px` |
| `fontWeight` | `600` |
| `padding` | `4px 10px` |
| `borderRadius` | `20px` |
| `border` | `1px solid var(--color-border-md)` |
| `background` | `transparent` |
| `color` | `var(--color-text-2)` |

### Do / Don't

- **Do** use `aria-pressed` on every filter pill.
- **Do** provide a "clear all" pill when any filters are active.
- **Don't** change the border width from 1px to 2px without accounting for layout shift (use outline or box-shadow instead, or plan for the 1px shift).
- **Don't** use filter pills for navigation. They are for filtering content in place.

---

## 10. Avatar

Circular element displaying the first letter of a user's name.

**Source:** `src/modules/squads/pages/SquadsPage.tsx:1416-1425`

### Base Avatar (`avatarBase`)

| Property | Value |
|---|---|
| `width` | `32px` |
| `height` | `32px` |
| `borderRadius` | `50%` |
| `background` | `var(--color-blue-light)` |
| `color` | `var(--color-blue)` |
| `border` | `0.5px solid var(--color-blue)` |
| `display` | `flex` |
| `alignItems` | `center` |
| `justifyContent` | `center` |
| `fontSize` | `12px` |
| `fontWeight` | `500` |
| `flexShrink` | `0` |

### Role Variants

| Role | Background | Color | Border |
|---|---|---|---|
| Admin | `var(--color-yellow-light)` | `var(--color-yellow)` | `0.5px solid var(--color-amber-mid)` |
| QA Lead | `var(--color-blue-light)` | `var(--color-blue-text)` | `0.5px solid var(--color-blue)` |
| QA | `var(--color-green-light)` | `var(--color-green)` | `0.5px solid var(--color-green-mid)` |
| Stakeholder | `var(--color-surface-2)` | `var(--color-text-2)` | `0.5px solid var(--color-border)` |

### Small Variant

Used in dropdown lists: `width: 24, height: 24, fontSize: 10`.

**Usage:**

```tsx
{/* Default avatar */}
<div style={avatarBase}>
  {user.display_name[0]?.toUpperCase() ?? '?'}
</div>

{/* Role-colored avatar */}
<div style={avatarStyle(member.role, isAdmin)}>
  {member.display_name[0]?.toUpperCase() ?? '?'}
</div>
```

### Do / Don't

- **Do** always uppercase the initial letter.
- **Do** provide a fallback character (`?`) for users with no name.
- **Do** use `flexShrink: 0` to prevent avatars from being compressed in flex layouts.
- **Don't** use avatars larger than 32px in lists. Reserve larger sizes for profile pages.
- **Don't** use images in avatars -- the system is initial-letter only.

---

## 11. Progress Bar

Horizontal fill bar showing completion percentage.

**Source:** `src/modules/sprints/pages/HomePage.tsx:902-913`

### Track (Background)

| Property | Value |
|---|---|
| `height` | `3px` |
| `borderRadius` | `2px` |
| `background` | `var(--color-border)` |
| `maxWidth` | `180px` |
| `marginTop` | `6px` |

### Fill (Foreground)

| Property | Value |
|---|---|
| `height` | `100%` |
| `width` | `{pct}%` |
| `background` | Status-dependent: `var(--color-green)` (completed) or `var(--color-blue)` (active) |
| `borderRadius` | `2px` |
| `transition` | `width 0.3s` |

**Usage:**

```tsx
<div style={{
  height: 3, borderRadius: 2,
  background: 'var(--color-border)',
  marginTop: 6, maxWidth: 180,
}}>
  <div style={{
    height: '100%',
    width: `${percentage}%`,
    background: isCompleted ? 'var(--color-green)' : 'var(--color-blue)',
    borderRadius: 2,
    transition: 'width 0.3s',
  }} />
</div>
```

### Do / Don't

- **Do** use `transition: width 0.3s` for smooth animation when the value changes.
- **Do** cap the fill at `100%` to prevent overflow.
- **Do** match the fill color to the status context (blue = in progress, green = complete).
- **Don't** make the bar taller than `4px` in compact card layouts.
- **Don't** add text inside the bar; display percentage as a separate label.

---

## 12. Empty State

Centered placeholder shown when a list has no items.

**Source:** `src/modules/sprints/pages/HomePage.tsx:467-492`, `src/modules/squads/pages/SquadsPage.tsx:729-736`

### Structure

| Element | Style |
|---|---|
| Container | `textAlign: center`, `padding: 48px 20px` (sprints) / `40px 20px` (squads), `color: var(--color-text-2)` |
| Emoji (optional) | `fontSize: 36`, `marginBottom: 10` |
| Title | `fontSize: 14`, `fontWeight: 600`, `color: var(--color-text-2)` |
| Description | `fontSize: 13`, `marginTop: 4-6px`, `color: var(--color-text-3)` |
| CTA | Inline text referencing the action, e.g., "Clique em **+ Novo Squad** para comecar." |

### Variants

**No items ever created:**
```tsx
<div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-3)' }}>
  <div style={{ fontSize: 36, marginBottom: 10 }}>icon</div>
  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)', margin: '0 0 6px' }}>
    Nenhum squad criado
  </p>
  <p style={{ fontSize: 13, margin: 0 }}>
    Clique em <strong>+ Novo Squad</strong> para comecar.
  </p>
</div>
```

**No results after filtering:**
```tsx
<div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--color-text-2)' }}>
  <p style={{ fontWeight: 600, fontSize: 14 }}>Nenhuma sprint encontrada</p>
  <p style={{ fontSize: 13, marginTop: 4 }}>Nenhuma sprint corresponde aos filtros.</p>
</div>
```

### Do / Don't

- **Do** differentiate between "never created" (with CTA) and "no results" (filter feedback).
- **Do** use an emoji or icon to add visual weight to the empty state.
- **Don't** leave a blank screen. Always show an empty state when a list is empty.
- **Don't** use technical language. Speak to the user in plain terms.

---

## 13. Search Input

Text input with a leading magnifying glass icon for search/filter operations.

### Variant A: Emoji Icon (Sprints)

**Source:** `src/modules/sprints/pages/HomePage.tsx:359-376`

| Property | Value |
|---|---|
| Container | `position: relative`, `minWidth: 200` |
| Icon | Positioned absolutely: `left: 10`, `top: 50%`, `transform: translateY(-50%)`, emoji magnifier, `pointerEvents: none` |
| Input `padding` | `6px 10px 6px 32px` (left padding accounts for icon) |
| Input `fontSize` | `13px` |
| Input `borderRadius` | `8px` |
| Input `border` | `1px solid var(--color-border-md)` |
| Input `background` | `var(--color-bg)` |

### Variant B: SVG Icon (Squads)

**Source:** `src/modules/squads/pages/SquadsPage.tsx:656-666`

Uses an inline SVG magnifying glass (`16x16`, `strokeWidth: 1.8`) instead of an emoji. The input extends the standard `inputStyle` with `paddingLeft: 32`.

**Usage:**

```tsx
{/* Variant A: Emoji */}
<div style={{ position: 'relative', minWidth: 200 }}>
  <span style={{
    position: 'absolute', left: 10, top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 14, color: 'var(--color-text-3)',
    pointerEvents: 'none',
  }}>
    magnifier-icon
  </span>
  <input
    type="text"
    placeholder="Buscar sprint..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    style={{
      width: '100%',
      padding: '6px 10px 6px 32px',
      fontSize: 13, borderRadius: 8,
      border: '1px solid var(--color-border-md)',
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
    }}
  />
</div>

{/* Variant B: SVG */}
<div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
  <span style={{
    position: 'absolute', left: 10, top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--color-text-3)',
    pointerEvents: 'none',
  }}>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.5"/>
      <path d="M10.5 10.5L14 14"/>
    </svg>
  </span>
  <input
    type="text"
    placeholder="Buscar squad..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    style={{ ...inputStyle, paddingLeft: 32, width: '100%' }}
  />
</div>
```

### Do / Don't

- **Do** use `pointerEvents: none` on the icon so clicks pass through to the input.
- **Do** prefer the SVG variant (Variant B) for consistency and scalability.
- **Do** set `paddingLeft: 32px` to avoid text overlapping the icon.
- **Don't** use a submit button with search inputs -- filtering should happen on every keystroke.
- **Don't** wrap the search input in a `<form>` unless you need Enter-to-submit behavior.

---

## Quick Reference Table

| Component | Import / Source | Key Token |
|---|---|---|
| Button Primary | `import { btnPrimary } from '@/styles/common'` | `var(--color-blue)` |
| Button Danger | `import { btnDanger } from '@/styles/common'` | `var(--color-red)` |
| Button Ghost | `import { btnGhost } from '@/styles/common'` | `transparent` |
| Input | `import { inputStyle } from '@/styles/common'` | `var(--color-bg)` |
| Select | `import { selectStyle } from '@/styles/common'` | SVG arrow |
| Label | `import { labelStyle } from '@/styles/common'` | `var(--color-text-2)` |
| Badge | Local constants per page | Semantic color |
| Card | Inline styles | `var(--color-surface)` |
| ConfirmModal | `import { ConfirmModal } from '@/app/components/ConfirmModal'` | Red top border |
| Toast | `import { showToast } from '@/app/components/Toast'` | Type-based color |
| Tabs | Inline styles | Blue underline |
| Filter Pill | Inline styles | `aria-pressed` |
| Avatar | Local constants per page | Role-based color |
| Progress Bar | Inline styles | Status-based fill |
| Empty State | Inline styles | Centered text |
| Search Input | Inline styles | Leading icon |

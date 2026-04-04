# 04 - Accessibility & Conventions

> ToStatos Design System -- Accessibility patterns, keyboard navigation, focus management, color contrast, and naming conventions extracted from the living codebase.

---

## 1. ARIA Attributes Reference

### Tabs

Container gets `role="tablist"` with a descriptive `aria-label`. Each tab button gets `role="tab"` and `aria-selected` reflecting its active state.

```tsx
// src/modules/sprints/pages/SprintDashboard.tsx
<div
  role="tablist"
  aria-label="Abas da Sprint"
>
  {TABS.map((tab) => (
    <button
      key={tab.id}
      role="tab"
      aria-selected={activeTab === tab.id}
      data-testid={`sprint-tab-${tab.id}`}
      onClick={() => setActiveTab(tab.id)}
    >
      {tab.icon} {tab.label}
    </button>
  ))}
</div>
```

**Required attributes:**
| Element | Attribute | Value |
|---------|-----------|-------|
| Container | `role` | `"tablist"` |
| Container | `aria-label` | Descriptive string (e.g. `"Abas da Sprint"`) |
| Each tab | `role` | `"tab"` |
| Each tab | `aria-selected` | `{activeTab === tab.id}` |
| Each tab | `data-testid` | `{module}-tab-{id}` |

---

### Toggle Buttons (aria-pressed)

Used for filter pills and multi-select toggles. The `aria-pressed` attribute reflects whether the option is currently active.

```tsx
// src/modules/status-report/components/ItemFormModal.tsx — priority toggle
<button
  onClick={() => setPriority(p)}
  aria-pressed={priority === p}
>
  {label}
</button>

// src/modules/status-report/components/ItemFormModal.tsx — stack multi-select
<button
  onClick={() => toggleStack(opt.value)}
  aria-pressed={stacks.includes(opt.value)}
>
  {opt.label}
</button>

// src/modules/releases/components/dashboard/CheckpointTab.tsx — filter pills
<button
  onClick={() => setActiveFilter(f.value)}
  aria-pressed={activeFilter === f.value}
  onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)' }}
  onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
>
  {f.label}
</button>
```

**Required attributes:**
| Element | Attribute | Value |
|---------|-----------|-------|
| Toggle button | `aria-pressed` | `{isActive}` (boolean) |
| Filter pill | `aria-pressed` | `{activeFilter === value}` |

---

### Expandable Panels (aria-expanded)

Collapsible elements use `aria-expanded` combined with `role="button"` and `tabIndex={0}` for non-button elements. Keyboard support for Enter and Space is mandatory.

```tsx
// src/modules/releases/components/dashboard/ReleasePhasesPanel.tsx
<div
  role="button"
  tabIndex={0}
  aria-expanded={isEditing}
  aria-label={`Fase ${phase.label} — ${stateLabel}`}
  onClick={() => setEditingPhase(isEditing ? null : phase.key)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setEditingPhase(isEditing ? null : phase.key)
    }
  }}
>
  {/* content */}
</div>

// src/modules/status-report/components/SectionCard.tsx — collapsible section
<button
  onClick={onToggle}
  aria-expanded={!isCollapsed}
  aria-label={`${isCollapsed ? 'Expandir' : 'Recolher'} secao ${section.label}`}
>
  {section.label}
</button>

// src/app/layout/Topbar.tsx — user menu dropdown
<button
  onClick={() => setOpen(!open)}
  aria-label="Menu da conta"
  aria-expanded={open}
>
  {initial}
</button>
```

**Required attributes:**
| Element | Attribute | Value |
|---------|-----------|-------|
| Expandable trigger | `aria-expanded` | `{isOpen}` (boolean) |
| Non-button trigger | `role` | `"button"` |
| Non-button trigger | `tabIndex` | `{0}` |
| All triggers | `aria-label` | Descriptive string including current state |

---

### Modals / Dialogs

Modal containers use `tabIndex={-1}` with auto-focus via `useRef` + `useEffect`. Backdrop click and Escape key both dismiss the modal.

```tsx
// src/modules/status-report/components/ItemFormModal.tsx
<div
  onClick={(e) => e.target === e.currentTarget && onCancel()}
  onKeyDown={(e) => {
    if (e.key === 'Escape') { onCancel() }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { handleSubmit() }
  }}
  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }}
>
  <div ref={modalContentRef} tabIndex={-1} style={{ outline: 'none' }}>
    {/* modal content */}
  </div>
</div>

// Focus on mount
const modalContentRef = useRef<HTMLDivElement>(null)
useEffect(() => {
  modalContentRef.current?.focus()
}, [])
```

**Required attributes:**
| Element | Attribute | Value |
|---------|-----------|-------|
| Dialog container | `tabIndex` | `{-1}` |
| Dialog container | `ref` + `focus()` | Auto-focus on mount |
| Backdrop | `onClick` | Dismiss on `e.target === e.currentTarget` |
| Backdrop | `onKeyDown` | Escape to dismiss |

> **Planned improvement:** Add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the modal title. These are not yet consistently applied across all modals.

---

### Sort Headers (aria-sort)

Table headers that support sorting use `aria-sort` with values `ascending`, `descending`, or `none`.

```tsx
// src/modules/releases/components/dashboard/CronogramaTab.tsx
<th
  style={sortableTh}
  onClick={() => handleSort('release')}
  aria-sort={sortCol === 'release' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
>
  Release {sortCol === 'release' ? (sortAsc ? '↑' : '↓') : '↕'}
</th>
```

**Required attributes:**
| Element | Attribute | Value |
|---------|-----------|-------|
| Sortable `<th>` | `aria-sort` | `"ascending"` / `"descending"` / `"none"` |
| Sortable `<th>` | `onClick` | Sort handler |
| Sortable `<th>` | Visual indicator | `↑` / `↓` / `↕` matching `aria-sort` |

---

### Select Elements

All `<select>` elements must have an `aria-label` describing their purpose.

```tsx
// src/modules/releases/components/dashboard/ReleasePhasesPanel.tsx
<select
  value={release.rolloutPct}
  onChange={(e) => onUpdateField('rolloutPct', Number(e.target.value))}
  aria-label="Porcentagem de distribuicao"
>

// src/app/layout/Topbar.tsx
<select
  value={activeSquadId ?? ''}
  onChange={(e) => { if (e.target.value) setActiveSquad(e.target.value) }}
  aria-label="Selecionar squad"
>
```

---

### Icon-Only Buttons

Every button that displays only an icon (no visible text) must have an `aria-label`.

```tsx
// src/modules/releases/components/dashboard/ReleasePhasesPanel.tsx
<button
  onClick={() => onTransition(phase.statusWhenActive)}
  aria-label={`Iniciar ${phase.label}`}
>
  ▶ Iniciar
</button>

<button
  onClick={() => onTransition('concluida')}
  aria-label="Concluir release"
>
  ✓ Concluir Release (100% distribuido)
</button>
```

---

### Decorative Icons

Icons that carry no semantic meaning must be hidden from assistive technology with `aria-hidden="true"`.

```tsx
// src/modules/releases/components/dashboard/ReleasePhasesPanel.tsx
<span aria-hidden="true" style={{
  fontSize: 12,
  color: 'var(--color-text-3)',
  transition: 'transform 0.15s',
  transform: isEditing ? 'rotate(180deg)' : 'rotate(0deg)',
}}>
  ▾
</span>
```

---

## 2. Keyboard Navigation

| Key | Action | Context |
|-----|--------|---------|
| `Escape` | Close modal, dropdown, or panel | All modals and dropdowns |
| `Enter` / `Space` | Activate button or expandable panel | Expandable panels with `role="button"` |
| `Tab` | Move focus to next interactive element | Global focus order |
| `Cmd/Ctrl + Enter` | Submit form | Modals with form content |

### Implementation pattern for expandable panels:

```tsx
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()  // prevent scroll on Space
    togglePanel()
  }
}}
```

### Implementation pattern for modals:

```tsx
onKeyDown={(e) => {
  if (e.key === 'Escape') { onCancel() }
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { handleSubmit() }
}}
```

### Implementation pattern for dropdowns (Topbar UserMenu):

```tsx
// Close on Escape via window listener
useEffect(() => {
  if (!open) return
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false)
  }
  window.addEventListener('keydown', handleKey)
  return () => window.removeEventListener('keydown', handleKey)
}, [open])
```

---

## 3. Focus Management

### Focus Ring

The project uses a single CSS custom property for all focus indicators:

```css
/* src/index.css */
--focus-ring: 0 0 0 3px rgba(24, 95, 165, 0.3);
```

Applied via inline styles on interactive custom elements:

```tsx
onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)' }}
onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
```

Native `<button>` and `<input>` elements inherit the global focus rule:

```css
/* src/index.css */
:focus-visible {
  box-shadow: var(--focus-ring);
}
```

### Focus Trap in Modals

Modal containers receive `tabIndex={-1}` and auto-focus on mount:

```tsx
const modalContentRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  modalContentRef.current?.focus()
}, [])

<div ref={modalContentRef} tabIndex={-1} style={{ outline: 'none' }}>
  {/* First input uses autoFocus for immediate user interaction */}
  <input autoFocus ... />
</div>
```

### Click-Outside Dismissal

Dropdowns close when clicking outside via `mousedown` listener:

```tsx
useEffect(() => {
  if (!open) return
  function handleClick(e: MouseEvent) {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
  }
  document.addEventListener('mousedown', handleClick)
  return () => document.removeEventListener('mousedown', handleClick)
}, [open])
```

---

## 4. Color Contrast

### Primary text on background

| Foreground | Background | Pair | Ratio |
|-----------|-----------|------|-------|
| `#1a1a18` (--color-text) | `#f7f6f2` (--color-bg) | Body text | ~16.5:1 (AAA) |
| `#6b6a65` (--color-text-2) | `#ffffff` (--color-surface) | Secondary text | ~4.8:1 (AA) |
| `#ffffff` | `#185fa5` (--color-blue) | Button text on primary | ~6.2:1 (AAA) |
| `#ffffff` | `var(--color-green-mid)` | Success button text | Check per instance |
| `var(--color-green)` | `var(--color-green-light)` | Badge on badge bg | Check per instance |
| `var(--color-red)` | `var(--color-red-light)` | Error badge | Check per instance |

### Rules

- All text must meet WCAG 2.1 AA minimum (4.5:1 for normal text, 3:1 for large text).
- Use CSS variables for all color values -- never hardcode hex in components.
- Badge text colors (`--color-green`, `--color-red`, `--color-amber`) are paired with their `-light` background variants, which are pre-validated for contrast.

---

## 5. Naming Conventions

### CSS Classes (hover states)

Pattern: `{module}-{element}-{state}`

```
hp-card-hover        -- HomePage card hover
sq-btn-archive       -- Squads archive button
sr-item-selected     -- Status Report item selected
rl-phase-active      -- Release phase active
```

### data-testid

Pattern: `{module}-{component}-{action}`

```
auth-btn-login       -- Auth module, login button
sprint-tab-overview  -- Sprint module, overview tab
sprint-tab-bugs      -- Sprint module, bugs tab
sr-btn-add-item      -- Status Report, add item button
rl-btn-new-release   -- Releases, new release button
```

### CSS Variables

Pattern: `--color-{family}-{variant}`

```css
--color-blue           /* primary */
--color-blue-light     /* tinted background */
--color-blue-text      /* darker text variant */
--color-green          /* semantic: success text */
--color-green-mid      /* semantic: success fill */
--color-green-light    /* semantic: success background */
--color-red            /* semantic: error text */
--color-red-light      /* semantic: error background */
--color-amber          /* semantic: warning text */
--color-amber-mid      /* semantic: warning fill */
--color-amber-light    /* semantic: warning background */
--color-text           /* primary text */
--color-text-2         /* secondary text */
--color-text-3         /* tertiary/muted text */
--color-surface        /* card/panel background */
--color-surface-2      /* hover/elevated surface */
--color-bg             /* page background */
--color-border         /* subtle border */
--color-border-md      /* medium-weight border */
--focus-ring           /* focus indicator shadow */
```

### Component Files

**PascalCase** for all React components:

```
SprintDashboard.tsx
CheckpointTab.tsx
ItemFormModal.tsx
SectionCard.tsx
ReleasePhasesPanel.tsx
```

### Service Files

**camelCase** for all service/utility modules:

```
releasePersistence.ts
statusReportExport.ts
exportService.ts
dateEngine.ts
```

### Type Files

**camelCase** with `.types.ts` suffix:

```
release.types.ts
statusReport.types.ts
```

---

## 6. Do / Don't Rules

### DO

- **Use CSS variables for all colors.**
  ```tsx
  // Correct
  color: 'var(--color-text)'
  background: 'var(--color-blue)'
  ```

- **Add `aria-label` to icon-only buttons.**
  ```tsx
  <button aria-label="Concluir release" onClick={handleConclude}>
    ✓
  </button>
  ```

- **Use CSS `:hover` classes instead of `onMouseEnter`/`onMouseLeave`.**
  ```css
  /* Correct -- in CSS/module file */
  .hp-card-hover:hover {
    border-color: var(--color-blue);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  ```

- **Add `data-testid` to interactive elements.**
  ```tsx
  <button data-testid="sprint-tab-overview" role="tab" ...>
    Resumo
  </button>
  ```

- **Use `role="tablist"` + `aria-selected` for tab navigation.**
  ```tsx
  <div role="tablist" aria-label="Abas da Sprint">
    <button role="tab" aria-selected={active}>Tab</button>
  </div>
  ```

- **Use `aria-expanded` on collapsible triggers.**
  ```tsx
  <button aria-expanded={!isCollapsed}>Section Title</button>
  ```

- **Use `aria-pressed` for toggle buttons and filter pills.**
  ```tsx
  <button aria-pressed={isActive}>Filter</button>
  ```

- **Use `aria-hidden="true"` on decorative icons.**
  ```tsx
  <span aria-hidden="true">▾</span>
  ```

- **Use `structuredClone()` for deep copies.**
  ```tsx
  const copy = structuredClone(original)
  ```

- **Add `e.preventDefault()` when handling Space on `role="button"` elements** (prevents page scroll).

### DON'T

- **Don't use hardcoded hex colors in components.**
  ```tsx
  // Wrong
  color: '#185fa5'
  // Correct
  color: 'var(--color-blue)'
  ```

- **Don't use inline hover handlers when CSS classes are available.**
  ```tsx
  // Wrong -- creates state + re-renders
  const [hovered, setHovered] = useState(false)
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}

  // Correct -- pure CSS
  className="hp-card-hover"
  ```

- **Don't use `any` type** (except in normalization functions with an `eslint-disable` comment).
  ```tsx
  // Wrong
  function parse(data: any) { ... }

  // Acceptable only when necessary
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function normalize(raw: any): TypedResult { ... }
  ```

- **Don't leave empty catch blocks.**
  ```tsx
  // Wrong
  try { ... } catch (e) {}

  // Correct
  try { ... } catch (e) {
    console.error('Context:', e)
  }
  ```

- **Don't use `JSON.parse(JSON.stringify())` for deep cloning.**
  ```tsx
  // Wrong
  const copy = JSON.parse(JSON.stringify(obj))

  // Correct
  const copy = structuredClone(obj)
  ```

- **Don't forget keyboard support on non-button expandable elements.**
  ```tsx
  // Wrong -- div with click but no keyboard
  <div onClick={toggle}>Expand</div>

  // Correct
  <div role="button" tabIndex={0} onClick={toggle}
       onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle() }}>
    Expand
  </div>
  ```

---

*Last updated: 2026-03-27 | Maintainer: Jordan Vega, UX Senior Designer*

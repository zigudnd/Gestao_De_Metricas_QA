// src/styles/common.ts — Shared style constants to eliminate duplication
//
// Created as part of Phase 2 #6: consolidate duplicated style objects.
// Each constant below represents the MOST COMMON pattern found across the codebase.
//
// FILES THAT CAN ADOPT THESE (with notes on differences):
//
// inputStyle (12 files):
//   EXACT MATCH (padding 8px 10px, borderRadius 8, bg --color-bg):
//     - src/modules/sprints/pages/HomePage.tsx:1200
//     - src/modules/sprints/components/dashboard/BugsTab.tsx:558
//     - src/modules/sprints/components/dashboard/ConfigTab.tsx:565
//     - src/app/components/NewBugModal.tsx:200
//   MINOR DIFFS:
//     - src/modules/releases/pages/ReleaseDashboard.tsx:36      (borderRadius 7, bg --color-surface)
//     - src/modules/releases/pages/ReleasesPage.tsx:59          (borderRadius 7, bg --color-surface, no boxSizing)
//     - src/modules/status-report/components/ItemFormModal.tsx:26 (padding 7px 10px, borderRadius 7, bg --color-surface)
//     - src/modules/status-report/components/ItemDetailPanel.tsx:31 (padding 6px 8px, borderRadius 6, bg --color-surface)
//     - src/modules/sprints/components/dashboard/BlockersTab.tsx:129 (padding 6px 8px, borderRadius 6, bg --color-surface)
//     - src/modules/squads/pages/SquadsPage.tsx:1404            (padding 8px 12px, border 0.5px, no fontFamily)
//     - src/modules/auth/pages/AuthPage.tsx:320                 (padding 9px 11px, fontSize 14, no width/boxSizing)
//     - src/modules/auth/pages/ChangePasswordPage.tsx:164       (padding 9px 11px, fontSize 14, border 0.5px)
//     - src/modules/auth/pages/ProfilePage.tsx:238              (padding 9px 11px, fontSize 14, borderRadius 7)
//
// selectStyle (6 files):
//   ALL use ...inputStyle + SVG arrow. Padding varies slightly:
//     - HomePage, ConfigTab, SquadsPage: padding '8px 28px 8px 10px' (or 12px)
//     - ItemFormModal: padding '7px 28px 7px 10px'
//     - ItemDetailPanel: padding '6px 28px 6px 8px'
//
// labelStyle (5 files):
//   MOST COMMON (fontSize 12, fontWeight 600, color --color-text-2, marginBottom 4):
//     - src/modules/releases/pages/ReleasesPage.tsx:65
//     - src/modules/status-report/components/ItemFormModal.tsx:21
//   MINOR DIFFS:
//     - src/modules/sprints/pages/HomePage.tsx:1192             (marginBottom 6)
//     - src/modules/releases/pages/ReleaseDashboard.tsx:43      (fontSize 11, + textTransform/letterSpacing)
//     - src/modules/status-report/components/ItemDetailPanel.tsx:25 (fontSize 11, color --color-text-3, marginBottom 3, + textTransform/letterSpacing)
//     - src/modules/squads/pages/SquadsPage.tsx:1410 (as labelSm) (fontSize 11, fontWeight 500, + textTransform/letterSpacing)
//
// btnPrimary (9 files):
//   MOST COMMON (padding 7px 16px, borderRadius 8, fontWeight 600, fontSize 13):
//     - src/modules/sprints/pages/HomePage.tsx:1155
//     - src/modules/sprints/pages/ComparePage.tsx:528
//     - src/modules/sprints/components/dashboard/AlignmentsTab.tsx:61
//     - src/modules/sprints/components/dashboard/BlockersTab.tsx:141
//   MINOR DIFFS:
//     - src/modules/sprints/components/dashboard/BugsTab.tsx:533 (fontWeight 500, + flexShrink)
//     - src/app/components/NewBugModal.tsx:212                   (padding 7px 18px, + flexShrink)
//     - src/modules/auth/pages/ProfilePage.tsx:251              (padding 9px 20px, borderRadius 7)
//     - src/modules/squads/pages/SquadsPage.tsx:1401            (bg #185FA5, fontWeight 500)
//     - src/modules/releases/components/dashboard/EventsTab.tsx:321 (padding 6px 14px, borderRadius 6, fontSize 12)

import type { CSSProperties } from 'react'

// ─── SVG Arrow (shared by all selectStyle variants) ─────────────────────────

const SELECT_ARROW_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`

// ─── Input ──────────────────────────────────────────────────────────────────

/** Base input style — most common pattern (8px 10px padding, borderRadius 8, bg --color-bg). */
export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--color-border-md)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--color-text)',
  background: 'var(--color-bg)',
  fontFamily: 'var(--font-family-sans)',
  boxSizing: 'border-box',
}

// ─── Select ─────────────────────────────────────────────────────────────────

/** Base select style — extends inputStyle with dropdown arrow. */
export const selectStyle: CSSProperties = {
  ...inputStyle,
  padding: '8px 28px 8px 10px',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: SELECT_ARROW_SVG,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
}

// ─── Label ──────────────────────────────────────────────────────────────────

/** Standard form label — fontSize 12, fontWeight 600, marginBottom 4. */
export const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-text-2)',
  marginBottom: 4,
}

/** Small uppercase label variant (used in ReleaseDashboard, ItemDetailPanel). */
export const labelSmStyle: CSSProperties = {
  ...labelStyle,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

// ─── Buttons ────────────────────────────────────────────────────────────────

/** Primary action button — blue background, white text. */
export const btnPrimary: CSSProperties = {
  padding: '7px 16px',
  background: 'var(--color-blue)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
}

/** Danger/destructive action button — red background, white text. */
export const btnDanger: CSSProperties = {
  ...btnPrimary,
  background: 'var(--color-red)',
}

/** Ghost button — transparent background, subtle text. */
export const btnGhost: CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid var(--color-border-md)',
  background: 'transparent',
  color: 'var(--color-text-2)',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  transition: 'all 0.15s',
}

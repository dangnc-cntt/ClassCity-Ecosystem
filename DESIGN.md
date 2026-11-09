---
version: alpha
name: ClassCity 3D
description: High-contrast classroom projector HUD layered over an interactive 3D city canvas.
colors:
  brand-primary: "#0f766e"
  brand-accent: "#f59e0b"
  surface: "#0f172a"
  surface-elevated: "#1e293b"
  ink-primary: "#f8fafc"
  ink-muted: "#cbd5e1"
typography:
  sans:
    fontFamily: Be Vietnam Pro
  body:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    lineHeight: 24px
    fontWeight: 500
  hud:
    fontFamily: Be Vietnam Pro
    fontSize: 20px
    lineHeight: 28px
    fontWeight: 700
  callout:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    lineHeight: 40px
    fontWeight: 800
rounded:
  base: 0.75rem
---

## Overview

ClassCity 3D is a classroom-gamification application operated by teachers at a desk or interactive board and read by primary-school students across the room. The 2D interface functions strictly as a quiet, opaque heads-up display over a full-viewport 3D town canvas, reserving visual drama for the student callout banner.

## Colors

Route primary and accent brand roles through runtime CSS custom properties so school and classroom themes update without modifying component markup. Pair `{colors.brand-accent}` and pastel student shop badges exclusively with dark ink, and reserve `{colors.ink-primary}` and `{colors.ink-muted}` for dark HUD surfaces (`{colors.surface}` and `{colors.surface-elevated}`) to preserve WCAG AA legibility under bright classroom lighting.

## Typography

Self-host `{typography.sans.fontFamily}` locally in WOFF2 format with full Vietnamese diacritic coverage so stacked tone marks remain legible offline. Use `{typography.body}` as the floor for interactive lists and form controls, `{typography.hud}` for classroom headers and selected-student summaries, and `{typography.callout}` for ceremonial student callout headlines read from the back row. Apply tabular numerals to all point totals, levels, ranks, and progress percentages, and keep full-name tooltips whenever long names truncate.

## Layout

Anchor the HUD to the viewport perimeter—a top toolbar and a collapsible right student sidebar—leaving the center unobstructed for the 3D scene. Order DOM landmarks so keyboard focus traverses the top toolbar first, the student sidebar second, and the canvas region third. Anchor the callout dialog near the bottom edge so the zoomed 3D storefront remains visible above it. Left-align list and form content for rapid scanning, centering copy only inside ceremonial callout and upgrade prompts.

## Elevation & Depth

Separate HUD layers from the bright 3D canvas using solid `{colors.surface}` fills, crisp slate borders, and standard drop shadows rather than translucent glass effects. Render modal dialogs in the browser top layer with an opaque dark backdrop scrim, lightening the scrim on the callout dialog so the spotlighted 3D shop stays bright.

## Shapes

Use `{rounded.base}` as the baseline card radius, stepping up to larger rounded containers for floating HUD panels and modal shells while keeping compact rounded pills for rank, lot, and perk badges.

## Components

Build all modal and confirmation surfaces on the native HTML dialog element invoked with modal focus trapping, Escape dismissal, and focus restoration to the triggering control; use alert-dialog semantics for destructive roster overwrites and sample-data resets. Collapse and expand the student sidebar, fill progress bars, and animate modal entrances exclusively through compositor transforms and opacity, skipping non-essential motion whenever reduced motion is requested. Expose every 3D canvas interaction—selecting a student, calling a student, awarding or deducting points, and switching vehicles or weather—as a keyboard-accessible 2D button or form control.

## Do's and Don'ts

- Do self-host Vietnamese-capable fonts locally and bind dynamic brand colors through CSS variables.
- Do pair every icon-only button with an accessible label and announce point awards, level-ups, and callouts through a polite live region.
- Don't apply backdrop-filter or blur effects over the WebGL canvas.
- Don't animate layout properties such as width or height on HUD panels or progress bars.
- Don't place light text directly on amber or pastel fills without dark ink, or use all-caps styling on small labels.
- Don't load fonts from external CDNs or check raw subscription tiers directly inside UI components.

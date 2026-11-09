---
name: baseline-ui
description: Quickly deslop UI code by fixing spacing, hierarchy, typography, and small layout issues. Use when the interface needs a fast cleanup or polish pass. Also use for "dọn giao diện", "chỉnh lại UI", "căn chỉnh khoảng cách" (see project overrides at the end of this file).
---

# Baseline UI

Enforces an opinionated UI baseline to prevent AI-generated interface slop.

## How to use

- `/baseline-ui`
  Apply these constraints to any UI work in this conversation.

- `/baseline-ui <file>`
  Review the file against all constraints below and output:
  - violations (quote the exact line/snippet)
  - why it matters (1 short sentence)
  - a concrete fix (code-level suggestion)

## Stack

- MUST use Tailwind CSS defaults unless custom values already exist or are explicitly requested
- MUST use `motion/react` (formerly `framer-motion`) when JavaScript animation is required
- SHOULD use `tw-animate-css` for entrance and micro-animations in Tailwind CSS
- MUST use `cn` utility (`clsx` + `tailwind-merge`) for class logic

## Components

- MUST use accessible component primitives for anything with keyboard or focus behavior (`Base UI`, `React Aria`, `Radix`)
- MUST use the project’s existing component primitives first
- NEVER mix primitive systems within the same interaction surface
- SHOULD prefer [`Base UI`](https://base-ui.com/react/components) for new primitives if compatible with the stack
- MUST add an `aria-label` to icon-only buttons
- NEVER rebuild keyboard or focus behavior by hand unless explicitly requested

## Interaction

- MUST use an `AlertDialog` for destructive or irreversible actions
- SHOULD use structural skeletons for loading states
- NEVER use `h-screen`, use `h-dvh`
- MUST respect `safe-area-inset` for fixed elements
- MUST show errors next to where the action happens
- NEVER block paste in `input` or `textarea` elements

## Animation

- NEVER add animation unless it is explicitly requested
- MUST animate only compositor props (`transform`, `opacity`)
- NEVER animate layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`)
- SHOULD avoid animating paint properties (`background`, `color`) except for small, local UI (text, icons)
- SHOULD use `ease-out` on entrance
- NEVER exceed `200ms` for interaction feedback
- MUST pause looping animations when off-screen
- SHOULD respect `prefers-reduced-motion`
- NEVER introduce custom easing curves unless explicitly requested
- SHOULD avoid animating large images or full-screen surfaces

## Typography

- MUST use `text-balance` for headings and `text-pretty` for body/paragraphs
- MUST use `tabular-nums` for data
- SHOULD use `truncate` or `line-clamp` for dense UI
- NEVER modify `letter-spacing` (`tracking-*`) unless explicitly requested

## Layout

- MUST use a fixed `z-index` scale (no arbitrary `z-*`)
- SHOULD use `size-*` for square elements instead of `w-*` + `h-*`

## Performance

- NEVER animate large `blur()` or `backdrop-filter` surfaces
- NEVER apply `will-change` outside an active animation
- NEVER use `useEffect` for anything that can be expressed as render logic

## Design

- NEVER use gradients unless explicitly requested
- NEVER use purple or multicolor gradients
- NEVER use glow effects as primary affordances
- SHOULD use Tailwind CSS default shadow scale unless explicitly requested
- MUST give empty states one clear next action
- SHOULD limit accent color usage to one per view
- SHOULD use existing theme or Tailwind CSS color tokens before introducing new ones



<!-- CLASSCITY-OVERRIDE:start v1 -->
## Project overrides (ClassCity) - these win over any conflicting rule above

Precedence: user instruction > `AGENTS.md` and `docs/03-agent-build-brief.md` > `docs/design-plan.md` > this skill. Scope of this skill: the 2D HUD (toolbar, sidebar, modals), never the 3D scene.

- **JS animation**: use GSAP (project standard). Do NOT add `motion/react` or `tw-animate-css`. Plain CSS transitions are fine for hover/press.
- **`cn` helper**: write a tiny local `src/lib/cn.ts` (join truthy class strings). Do NOT add `clsx` or `tailwind-merge`; avoid class conflicts by composition.
- **Primitives**: native HTML is the primitive: `<dialog>` + `showModal()` (gives focus trap and Esc), `<button>`, `<details>`, `<input>`. Destructive confirmation = `<dialog role="alertdialog">`. Do NOT add Radix, Base UI or React Aria without the user's approval. If a widget needs custom keyboard/focus behavior that native HTML cannot give (e.g. combobox), stop and ask.
- **"NEVER add animation unless requested"**: the requested set is the animations in `docs/01-classcity-feature-spec.md` and the brief (level-up bounce, camera zoom, callout popup, confetti, progress-bar fill) plus hover/press feedback.
- **200 ms limit**: applies to hover/press/toggle feedback. Spec'd entrance and celebration sequences may be longer (callout popup <= 400 ms) but must animate only `transform`/`opacity` and respect `prefers-reduced-motion`.
- **`useEffect`**: allowed for syncing with external systems (listeners, subscriptions, timers, GSAP, AudioContext, WebGL dispose) and then cleanup is mandatory (brief R5). Still forbidden for logic that can be computed during render.
- **Design/Typography prohibitions** (gradients, one accent per view, tracking, shadow scale) are defaults. `docs/design-plan.md` may override a specific rule if it names the rule and the reason.
- Never truncate a student's name without a full-name fallback (`title` attribute or the sidebar).
<!-- CLASSCITY-OVERRIDE:end -->

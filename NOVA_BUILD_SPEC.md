# Nova — build spec (pre-build reference)

Last updated: 2026-06-04. Do not build from this until palette is locked and final mockup is approved.

---

## Status

Brainstorming / mockup phase. Palette not yet chosen. Everything else below is confirmed.

---

## Palette (in progress)

Four options mockup-tested. Final pick TBD.

| Name | Character | Contrast | Notes |
|------|-----------|----------|-------|
| Amber | Warm, cozy | Medium | Current implementation. Most on-brand. |
| Teal | Cool, academic | Highest | Best text readability of the four. |
| Coral | Warm alternative | Medium | Similar feel to Amber, more saturated. |
| Slate/Purple | Calm, intellectual | Good | Distinctive, less tutoring-app conventional. |

Possible hybrid: Amber brand colors (background, avatar, accents) + Teal-level text contrast ratios.

---

## Layout — session mode (single problem)

```
[ Map 112px ] [ Ancestor col(s) 136px each ] [ Active window — flex:1 ]
```

- **Map panel** — existing `BranchTree.tsx`, labeled "Map", ~112px wide. Do not replace or restyle. Shows hierarchical node list with status dots, active/resolved states, child indentation.
- **Ancestor columns** — dimmed (opacity ~0.72), read-only, clickable to jump back. Show up to 2 most-recently-nested ancestors.
- **Active window** — full chat with header, message bubbles, work input.
- No left sidebar in single-question mode.

---

## Layout — assignment mode

```
[ Left sidebar 158px ] [ Active window — flex:1 ]
```

Left sidebar contains two stacked sections:

### Problem tracker (top of sidebar)

- Section label: "Problems" (9px uppercase, muted)
- Thin progress bar (4px, accent fill, % = problems completed / total)
- Problem dots stacked vertically:
  - Completed → filled accent circle + checkmark icon + muted label
  - Current → accent-bordered row, number in filled circle, bold label, highlighted background
  - Upcoming → empty circle border, muted number + label
- Problems are clickable — student can jump to any problem freely

### Map (bottom of sidebar)

- Existing `BranchTree.tsx` component, scoped to current problem's drill tree
- Same styling as session mode

### Chat header in assignment mode

- Includes "Problem X of Y" inline counter next to Nova's name
- "Next →" button in top-right area

---

## Active window — confirmed details

### Header
- Nova avatar (28px circle, initials "N" until illustrated avatar is ready)
- Title: "Nova" for root nodes, drill concept name for branch nodes
- Subtitle: problem text (root) or source highlight text (branch)
- Drill badge on branch nodes: dot + "Wrong step N" or "Highlight drill"
- Hamburger menu (3-line icon, 24px) opens SkillMenu overlay — hidden by default
- Exit button (text link)

### Message bubbles
- Tutor (Nova): white surface, accent border, rounded, top-left corner flat
- Student: accent-bg, white text, top-right corner flat
- Student multi-step submissions: step numbers shown inline (monospace, small, muted)
- Math rendered via MathRenderer (KaTeX)

### Highlight-to-drill
- On text selection within a Nova bubble: show dark popover ("Drill this →") above selection
- Popover: near-black bg (#1c1917), 0.5px dark border, small accent-colored square icon + white text
- Clicking opens new branch node in the Map focused on the highlighted concept

### Work input
- Symbol picker row above step field: x², √, ·, π, ±, d/dx, ∫, ≠, ∞ (and others)
- Step input: monospace, accent-tinted background, matches palette
- Submit button: filled accent color
- Hidden when summary card is showing

---

## Session summary (end of session)

- Shown after completing a drill node (correct answer) or end of assignment
- Lists skills struggled on
- Each skill has a "Start practice session" button — Nova starts immediately with a pre-prompted drill, no new problem entry needed
- "Done" button returns to landing

---

## What is NOT changing

- `BranchTree.tsx` ("Map") — keep exactly as-is
- `promptEngine.ts` scaffold logic
- API routes (`/api/chat`, `/api/identify-skill`, `/api/parse-assignment`)
- Supabase db layer

---

## Open questions before final build

1. **Palette** — lock one (or confirm hybrid approach)
2. **Assignment sidebar order** — problem tracker on top + Map below (current plan), or flip?
3. **Completed problems** — clickable to jump back, or read-only?
4. **Nova avatar** — illustrated character, or keep initial circle for now?

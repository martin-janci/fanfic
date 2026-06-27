# Fanfic — screen map (M2 frontend, BIT-251)

Implements the DoD path from the UX spec ([BIT-249](/BIT/issues/BIT-249#document-design-spec)):
**Create a Story → draft chapters with Claude co-writing → export Markdown.** Single-user, no auth.

| Screen | Route | Component(s) | Job |
|---|---|---|---|
| S1 First-run empty state | `/` | `app/page.tsx` + `EmptyState` | One CTA: create your first story |
| S2 Story list | `/` | `app/page.tsx` + `StoryCard` grid | Pick/resume a story; start new |
| S3 Create-story form | `/` (modal) | `CreateStoryModal` | Capture the Story Bible (title, universe, characters, tone) |
| S4 Chapter editor | `/story/[id]` | `Editor` = `RailBible` + manuscript + toolbar | Write + co-write |
| S5 Co-writing states | `/story/[id]` | `CowritePanel` | idle → generating → review/diff/beats → commit, + error |
| S6 Export | `/story/[id]` (modal) | `ExportModal` + `lib/markdown` | Live Markdown preview → Copy / Download .md → success toast |

## Co-writing actions (S5) → API ([contract](./cowrite-api-contract.md))
- **▸ Continue** → `POST /api/cowrite/continue` (stream) → review → Keep inserts at caret.
- **↻ Rewrite selection** → instruction modal → `POST /api/cowrite/rewrite` (stream) → word-diff → Accept replaces span.
- **✦ Suggest next beat** → `POST /api/cowrite/suggest` (JSON) → beat list → Insert one at caret.

Nothing reaches the manuscript without explicit acceptance (forgiveness by default).

## Data model (shared with M3 persistence, [BIT-253](/BIT/issues/BIT-253))
`src/lib/types.ts` — `Story` (+ inline bible: universe/characters/tone) and `Chapter`.
`src/lib/store.ts` — store seam; MVP is `localStorage`, M3 swaps the implementation behind
the same API. All reads/writes go through `storyStore`.

## Design system
`src/styles/tokens.css` — the UX spec token table as CSS variables (warm paper neutrals +
violet AI accent, serif prose). UI kit in `src/components/ui.tsx`. No one-off values.

## Verification
- `pnpm build` (Next 14, App Router) — compiles, typechecks, lints clean.
- Smoke: home `200`, all three `/api/cowrite/*` routes respond per contract, `400` on bad input.
- Browser/visual E2E → QA ([BIT-254](/BIT/issues/BIT-254)).

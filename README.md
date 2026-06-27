# Fanfic

An AI-assisted fan-fiction writing studio. Create a *Story* (universe + characters + tone),
draft chapters with Claude co-writing (**Continue · Rewrite selection · Suggest next beat**),
and export to Markdown. Thin single-user MVP — no auth.

Part of **Project Fanfic** ([BIT-246](/BIT/issues/BIT-246) charter). Built to the M1 UX spec
([BIT-249](/BIT/issues/BIT-249)) and prompt contract ([BIT-250](/BIT/issues/BIT-250)).

## Stack
Next.js 14 (App Router) · React 18 · TypeScript. Design tokens are plain CSS variables
(`src/styles/tokens.css`); UI kit in `src/components/ui.tsx`.

## Run
```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # production build + typecheck + lint
```

## Layout
- `app/` — routes. `/` (story list / create), `/story/[id]` (editor), `app/api/cowrite/*`
  (co-writing endpoints — **placeholders** owned by [BIT-252](/BIT/issues/BIT-252)).
- `src/lib/` — `types.ts` (data model, shared with M3 persistence), `store.ts`
  (localStorage seam), `cowrite.ts` (API client), `markdown.ts`, `diff.ts`.
- `src/components/` — screens + UI kit.
- `docs/screens/` — [screen map](docs/screens/fanfic-screens.md) ·
  [co-writing API contract](docs/screens/cowrite-api-contract.md).

## Status
- **M2 frontend** ([BIT-251](/BIT/issues/BIT-251)) — this app. Complete; wired to the
  co-writing API placeholders so the full flow runs today.
- **M2 backend** ([BIT-252](/BIT/issues/BIT-252)) — replaces `app/api/cowrite/*` handler
  bodies with real `claude-opus-4-8` calls (same I/O contract).
- **M3** ([BIT-253](/BIT/issues/BIT-253)) — swaps the `store.ts` seam for real persistence.

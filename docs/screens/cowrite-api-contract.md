# Co-writing API contract (M2)

Frozen interface between the **editor UI** ([BIT-251](/BIT/issues/BIT-251), FrontendEngineer)
and the **co-writing API** ([BIT-252](/BIT/issues/BIT-252), Coder). Derived from the M1
prompt contract ([BIT-250](/BIT/issues/BIT-250#document-prompt-contract)) and UX spec
([BIT-249](/BIT/issues/BIT-249#document-design-spec) §4).

The FE ships against this with **placeholder route handlers** in `app/api/cowrite/*` so the
flow runs end-to-end today. BIT-252 replaces each handler body with a real `claude-opus-4-8`
call **without changing the I/O shapes** — the client (`src/lib/cowrite.ts`) needs no rework.

## Common request fields

```ts
storyBible: {
  title: string;
  universe: string;                 // setting, canon notes, rules
  characters: { id, name, notes? }[];
  tone: string;                     // tone descriptors, POV, tense, content boundaries
}
chapterText: string                 // full chapter-so-far
```

`storyBible` is the stable, cacheable context (prompt contract §2.3 — render the STORY
CONTEXT block from it, with `cache_control`). `chapterText` is volatile (not cached).

## Endpoints

### `POST /api/cowrite/continue` — stream
Request: `{ storyBible, chapterText, caretIndex: number }`
Response: **`200 text/plain`** (streamed or whole) — the continuation prose to insert at the caret.
Maps to prompt-contract §3.1 / §4.1. `max_tokens` 4000, `stream: true`.

### `POST /api/cowrite/rewrite` — stream
Request: `{ storyBible, chapterText, selection: { text, start, end }, instruction: string }`
Response: **`200 text/plain`** (streamed or whole) — the replacement for **only** the selected span.
Maps to §3.2 / §4.2. `max_tokens = min(4000, ~2× selection tokens)`, `stream: true`.

### `POST /api/cowrite/suggest` — non-stream, structured
Request: `{ storyBible, chapterText }`
Response: **`200 application/json`** → `{ beats: { summary: string; rationale: string }[] }` (target 3–5).
Maps to §3.3 / §4.3. Non-streaming, structured output, no prefill.

## Errors (all three)

Non-2xx + `application/json`:

```json
{ "error": { "code": "refusal" | "upstream" | "bad_request", "message": "…" } }
```

- `400 bad_request` — malformed/missing fields.
- `422 refusal` — model `stop_reason: "refusal"` (prompt contract §5). The UI shows the
  inline "Couldn’t reach Claude — Retry" state; never a crash, never data loss.
- `5xx upstream` — Anthropic/transport failure.

The two text endpoints are read **incrementally** by the client, so streaming vs. whole-body
is transparent — if MVP ships batch-only, the GenCard simply stays an indeterminate loader
(UX spec §9). No contract change needed to switch streaming on later.

## Notes for BIT-252
- Model id is the only model-specific value: `claude-opus-4-8` (single constant).
- Keep the response **bodies** exactly as above; the FE asserts on content-type and `error.code`.
- Streaming should emit `text/plain` chunks (UTF-8). The client uses a `ReadableStream` reader.

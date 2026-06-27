/*
 * Co-writing API client (BIT-251 → BIT-252 contract).
 *
 * HTTP contract this client builds to (see docs/screens/cowrite-api-contract.md):
 *
 *   POST /api/cowrite/continue   req { storyBible, chapterText, caretIndex }
 *        200 text/plain (streamed or whole) — continuation prose to insert at caret
 *   POST /api/cowrite/rewrite    req { storyBible, chapterText, selection, instruction }
 *        200 text/plain (streamed or whole) — replacement for the selected span
 *   POST /api/cowrite/suggest    req { storyBible, chapterText }
 *        200 application/json     — { beats: [{ summary, rationale }] }
 *
 *   Errors (all three): non-2xx + application/json
 *        { error: { code: "refusal" | "upstream" | "bad_request", message } }
 *
 * The two text endpoints are read incrementally, so the client behaves identically
 * whether the backend streams tokens or returns the whole body at once (UX spec §9).
 */

import type { StoryBible } from "./types";

export interface Selection {
  text: string;
  start: number;
  end: number;
}

export interface Beat {
  summary: string;
  rationale: string;
}

export class CowriteError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "CowriteError";
  }
}

type OnChunk = (textSoFar: string, delta: string) => void;

async function readError(res: Response): Promise<never> {
  let code = "upstream";
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
    }
  } catch {
    /* non-JSON error body — keep defaults */
  }
  throw new CowriteError(code, message);
}

/** Read a text/plain response incrementally, invoking onChunk per delta. */
async function readText(
  res: Response,
  onChunk?: OnChunk,
  signal?: AbortSignal,
): Promise<string> {
  if (!res.ok) await readError(res);
  if (!res.body) {
    const text = await res.text();
    onChunk?.(text, text);
    return text;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let acc = "";
  try {
    for (;;) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      const delta = decoder.decode(value, { stream: true });
      if (delta) {
        acc += delta;
        onChunk?.(acc, delta);
      }
    }
  } finally {
    reader.releaseLock();
  }
  return acc;
}

const jsonHeaders = { "Content-Type": "application/json" } as const;

export async function continueChapter(
  args: { storyBible: StoryBible; chapterText: string; caretIndex: number },
  opts: { onChunk?: OnChunk; signal?: AbortSignal } = {},
): Promise<string> {
  const res = await fetch("/api/cowrite/continue", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(args),
    signal: opts.signal,
  });
  return readText(res, opts.onChunk, opts.signal);
}

export async function rewriteSelection(
  args: {
    storyBible: StoryBible;
    chapterText: string;
    selection: Selection;
    instruction: string;
  },
  opts: { onChunk?: OnChunk; signal?: AbortSignal } = {},
): Promise<string> {
  const res = await fetch("/api/cowrite/rewrite", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(args),
    signal: opts.signal,
  });
  return readText(res, opts.onChunk, opts.signal);
}

export async function suggestBeats(
  args: { storyBible: StoryBible; chapterText: string },
  opts: { signal?: AbortSignal } = {},
): Promise<Beat[]> {
  const res = await fetch("/api/cowrite/suggest", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(args),
    signal: opts.signal,
  });
  if (!res.ok) await readError(res);
  const body = await res.json();
  return Array.isArray(body?.beats) ? body.beats : [];
}

/*
 * PLACEHOLDER co-writing implementations (owned by BIT-252 / Coder).
 *
 * These let the FE flow (BIT-251) run end-to-end and QA/preview work before the
 * real Anthropic-SDK handlers land. They honour the exact request/response
 * contract in docs/screens/cowrite-api-contract.md so the swap is drop-in:
 * replace the bodies of the three route handlers with real `claude-opus-4-8`
 * calls per the M1 prompt contract (BIT-250). Do NOT change the I/O shapes.
 */
import type { StoryBible } from "@/lib/types";

export interface ContinueReq {
  storyBible: StoryBible;
  chapterText: string;
  caretIndex: number;
}
export interface RewriteReq {
  storyBible: StoryBible;
  chapterText: string;
  selection: { text: string; start: number; end: number };
  instruction: string;
}
export interface SuggestReq {
  storyBible: StoryBible;
  chapterText: string;
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Stream a string as text/plain in small chunks (demonstrates the streaming contract). */
export function streamText(text: string): Response {
  const encoder = new TextEncoder();
  const words = text.split(/(\s+)/);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const w of words) {
        controller.enqueue(encoder.encode(w));
        await new Promise((r) => setTimeout(r, 18));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function firstCharacter(bible: StoryBible): string {
  return bible.characters[0]?.name ?? "the protagonist";
}

export function placeholderContinue(req: ContinueReq): string {
  const who = firstCharacter(req.storyBible);
  return `${who} drew a slow breath, the weight of ${
    req.storyBible.title || "the story"
  } settling over the moment. The air held still — and then, almost against will, the next step came. [Placeholder continuation — BIT-252 will replace this with Claude (claude-opus-4-8) grounded in your universe and characters.]`;
}

export function placeholderRewrite(req: RewriteReq): string {
  return `${req.selection.text.trim()} — recast (${
    req.instruction || "improved"
  }). [Placeholder rewrite — BIT-252 replaces with a real Claude rewrite of only this passage.]`;
}

export function placeholderBeats(req: SuggestReq): {
  beats: { summary: string; rationale: string }[];
} {
  const who = firstCharacter(req.storyBible);
  return {
    beats: [
      {
        summary: `${who} uncovers a secret that reframes the chapter.`,
        rationale: "Raises stakes while staying grounded in the established cast.",
      },
      {
        summary: "A quiet beat of doubt before the next decision.",
        rationale: "Earns the turn; matches a character-driven tone.",
      },
      {
        summary: "An outside force forces a choice.",
        rationale: "Keeps momentum and pulls the universe's rules into play.",
      },
    ],
  };
}

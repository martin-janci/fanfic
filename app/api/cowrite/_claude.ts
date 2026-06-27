/**
 * Shared helpers for the co-writing Claude (claude-opus-4-8) calls.
 * Request/response shapes are frozen by docs/screens/cowrite-api-contract.md.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { StoryBible } from "@/lib/types";

export const MODEL = "claude-opus-4-8" as const;

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
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

/** Render the deterministic STORY CONTEXT block (prompt-contract §2.3). */
function storyContextBlock(bible: StoryBible): string {
  const chars = bible.characters
    .map((c) => `- ${c.name}${c.notes ? `: ${c.notes}` : ""}`)
    .join("\n");
  return (
    `STORY CONTEXT\n` +
    `Title: ${bible.title}\n\n` +
    `Universe / Setting:\n${bible.universe}\n\n` +
    `Characters:\n${chars || "(none listed)"}\n\n` +
    `Tone / Style:\n${bible.tone}`
  );
}

const BASE_SYSTEM =
  "You are a co-writing assistant for fan-fiction. " +
  "Stay strictly in-universe, match the established voice and tone, " +
  "and produce prose the author can use with minimal editing.";

// ---------------------------------------------------------------------------
// Continue (§3.1 / §4.1) — streaming text/plain
// ---------------------------------------------------------------------------

export async function streamContinue(
  bible: StoryBible,
  chapterText: string,
  caretIndex: number,
): Promise<Response> {
  const textBefore = chapterText.slice(0, caretIndex);

  const stream = client().messages.stream({
    model: MODEL,
    max_tokens: 4000,
    system: [
      {
        type: "text",
        text: BASE_SYSTEM + "\n\n" + storyContextBlock(bible),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content:
          "Continue the story from exactly where the text ends below. " +
          "Write only the continuation — no preamble, no quotation marks around the passage.\n\n" +
          "CHAPTER SO FAR:\n" +
          textBefore,
      },
    ],
  });

  return sdkStreamToResponse(stream);
}

// ---------------------------------------------------------------------------
// Rewrite (§3.2 / §4.2) — streaming text/plain
// ---------------------------------------------------------------------------

export async function streamRewrite(
  bible: StoryBible,
  chapterText: string,
  selection: { text: string; start: number; end: number },
  instruction: string,
): Promise<Response> {
  // rough token estimate: ~4 chars/token, cap at 4000
  const selTokenEst = Math.ceil(selection.text.length / 4);
  const maxTokens = Math.min(4000, Math.max(256, selTokenEst * 2));

  const stream = client().messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    system: [
      {
        type: "text",
        text: BASE_SYSTEM + "\n\n" + storyContextBlock(bible),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content:
          "Rewrite only the selected passage below according to the instruction. " +
          "Output only the replacement text — no preamble, no quotation marks.\n\n" +
          `INSTRUCTION: ${instruction || "improve the prose"}\n\n` +
          "FULL CHAPTER (for context only):\n" +
          chapterText +
          "\n\n" +
          "SELECTED PASSAGE TO REWRITE:\n" +
          selection.text,
      },
    ],
  });

  return sdkStreamToResponse(stream);
}

// ---------------------------------------------------------------------------
// Suggest beats (§3.3 / §4.3) — non-streaming structured JSON
// ---------------------------------------------------------------------------

export async function suggestBeats(
  bible: StoryBible,
  chapterText: string,
): Promise<Response> {
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: BASE_SYSTEM + "\n\n" + storyContextBlock(bible),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content:
          "Suggest 3–5 possible next story beats for this chapter. " +
          "Respond with a JSON object exactly matching: " +
          '{ "beats": [ { "summary": "...", "rationale": "..." } ] } ' +
          "No markdown fences, no extra keys.\n\n" +
          "CHAPTER SO FAR:\n" +
          chapterText,
      },
    ],
  });

  if (msg.stop_reason === "end_turn") {
    const raw = msg.content.find((b) => b.type === "text")?.text ?? "{}";
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.beats)) {
        return new Response(JSON.stringify(parsed), {
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch {
      // fall through to upstream error
    }
    return errorResponse(502, "upstream", "Model returned unparseable JSON.");
  }

  return errorResponse(422, "refusal", "Model declined to generate beats.");
}

// ---------------------------------------------------------------------------
// Internal: pipe Anthropic SDK stream → web ReadableStream text/plain
// ---------------------------------------------------------------------------

function sdkStreamToResponse(
  stream: ReturnType<Anthropic["messages"]["stream"]>,
): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          // Can't send a 422 mid-stream; close cleanly — client sees truncated text.
          // The refusal case should be extremely rare given our system prompt.
        }
      } catch {
        // Absorb stream errors; the incomplete response is better than a crash.
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

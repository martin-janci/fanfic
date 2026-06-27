import {
  errorResponse,
  placeholderBeats,
  type SuggestReq,
} from "../_placeholder";

// PLACEHOLDER — BIT-252 (Coder) replaces the body with a real claude-opus-4-8
// non-streaming structured-output call per the M1 prompt contract (§3.3).
export async function POST(request: Request): Promise<Response> {
  let body: SuggestReq;
  try {
    body = (await request.json()) as SuggestReq;
  } catch {
    return errorResponse(400, "bad_request", "Invalid JSON body.");
  }
  if (!body?.storyBible) {
    return errorResponse(400, "bad_request", "Missing storyBible.");
  }
  return new Response(JSON.stringify(placeholderBeats(body)), {
    headers: { "Content-Type": "application/json" },
  });
}

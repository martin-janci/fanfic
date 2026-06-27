import {
  errorResponse,
  placeholderRewrite,
  streamText,
  type RewriteReq,
} from "../_placeholder";

// PLACEHOLDER — BIT-252 (Coder) replaces the body with a real claude-opus-4-8
// streaming rewrite per the M1 prompt contract. Keep the request/response shape.
export async function POST(request: Request): Promise<Response> {
  let body: RewriteReq;
  try {
    body = (await request.json()) as RewriteReq;
  } catch {
    return errorResponse(400, "bad_request", "Invalid JSON body.");
  }
  if (!body?.storyBible || !body?.selection?.text) {
    return errorResponse(400, "bad_request", "Missing storyBible or selection.");
  }
  return streamText(placeholderRewrite(body));
}

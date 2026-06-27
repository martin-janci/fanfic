import {
  errorResponse,
  placeholderContinue,
  streamText,
  type ContinueReq,
} from "../_placeholder";

// PLACEHOLDER — BIT-252 (Coder) replaces the body with a real claude-opus-4-8
// streaming call per the M1 prompt contract. Keep the request/response shape.
export async function POST(request: Request): Promise<Response> {
  let body: ContinueReq;
  try {
    body = (await request.json()) as ContinueReq;
  } catch {
    return errorResponse(400, "bad_request", "Invalid JSON body.");
  }
  if (!body?.storyBible || typeof body.chapterText !== "string") {
    return errorResponse(400, "bad_request", "Missing storyBible or chapterText.");
  }
  return streamText(placeholderContinue(body));
}

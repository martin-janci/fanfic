import { errorResponse, streamContinue } from "../_claude";
import type { ContinueReq } from "../_placeholder";

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
  try {
    return await streamContinue(body.storyBible, body.chapterText, body.caretIndex ?? body.chapterText.length);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(502, "upstream", msg);
  }
}

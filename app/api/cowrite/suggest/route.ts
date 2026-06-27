import { errorResponse, suggestBeats } from "../_claude";
import type { SuggestReq } from "../_placeholder";

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
  try {
    return await suggestBeats(body.storyBible, body.chapterText ?? "");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(502, "upstream", msg);
  }
}

import { errorResponse, streamRewrite } from "../_claude";
import type { RewriteReq } from "../_placeholder";

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
  try {
    return await streamRewrite(
      body.storyBible,
      body.chapterText ?? "",
      body.selection,
      body.instruction ?? "",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(502, "upstream", msg);
  }
}

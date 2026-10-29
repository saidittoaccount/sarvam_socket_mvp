import { isAuthed, sarvamEnv, SARVAM_RUNTIME, unauthorized } from "../../../../lib/server";

// The SDK's only server-side need: fetch the single-use signed WebSocket URL with
// the API key. The browser then opens the WebSocket directly against that URL.
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!(await isAuthed())) return unauthorized();
  const { apiKey, orgId, workspaceId, appId } = sarvamEnv();
  if (!apiKey || !orgId || !workspaceId) {
    return Response.json({ error: "Server env not configured" }, { status: 500 });
  }
  const { path } = await params;
  const expected = `orgs/${orgId}/workspaces/${workspaceId}/apps/${appId}/url`;
  if (path.join("/") !== expected) return Response.json({ error: "Not allowed" }, { status: 403 });

  const upstream = await fetch(SARVAM_RUNTIME + expected + new URL(req.url).search, {
    headers: { "X-API-Key": apiKey },
    cache: "no-store",
  });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

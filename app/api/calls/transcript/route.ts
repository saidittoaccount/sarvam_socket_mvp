import { analyticsBase, isAuthed, sarvamEnv, unauthorized } from "../../../../lib/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAuthed())) return unauthorized();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^\d{8}\/[\w:-]+$/.test(id)) return Response.json({ error: "Bad id" }, { status: 400 });
  const r = await fetch(`${analyticsBase()}transcripts/${id}`, {
    headers: { "X-API-Key": sarvamEnv().apiKey },
    cache: "no-store",
  });
  return new Response(await r.text(), {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}

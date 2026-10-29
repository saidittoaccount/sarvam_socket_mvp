import { analyticsBase, isAuthed, sarvamEnv, unauthorized } from "../../../lib/server";

// Call history. No SDK equivalent, so this is the Analytics API: List interactions.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return unauthorized();
  const { apiKey } = sarvamEnv();
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 3600 * 1000);
  const qs = new URLSearchParams({
    start_datetime: start.toISOString(),
    end_datetime: end.toISOString(),
    sort_by: "start_datetime",
    sort_order: "desc",
    limit: "50",
  });
  const r = await fetch(`${analyticsBase()}interactions?${qs}`, {
    headers: { "X-API-Key": apiKey },
    cache: "no-store",
  });
  if (!r.ok) return Response.json({ error: await r.text() }, { status: r.status });
  const data = await r.json();
  // Strip unmasked contact data before it reaches the browser.
  const items = (data.items ?? []).map((i: Record<string, unknown>) => ({
    interaction_id: i.interaction_id,
    start_datetime: i.start_datetime,
    duration_in_seconds: i.duration_in_seconds,
    num_messages: i.num_messages,
    ended_by: i.ended_by,
    app_version: i.app_version,
    user_identifier: i.user_identifier,
    has_audio: Boolean(i.audio_url),
  }));
  return Response.json({ items, total: data.total ?? items.length });
}

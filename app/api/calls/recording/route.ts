import { analyticsBase, isAuthed, sarvamEnv, unauthorized } from "../../../../lib/server";

// Streams the stereo WAV (trainee left, agent right) so the key never reaches the
// browser. Sarvam sends no Content-Length and ignores Range, so the exact size is
// read from the WAV header and Range is served here by skipping upstream bytes.
// That keeps the player's duration and seeking correct without buffering the file.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HEADER = 44;

export async function GET(req: Request) {
  if (!(await isAuthed())) return unauthorized();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^\d{8}\/[\w:-]+$/.test(id)) return Response.json({ error: "Bad id" }, { status: 400 });

  const upstream = await fetch(`${analyticsBase()}recordings/${id}`, {
    headers: { "X-API-Key": sarvamEnv().apiKey },
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body)
    return new Response(await upstream.text(), { status: upstream.status });

  const reader = upstream.body.getReader();
  let head = new Uint8Array(0);
  let rest: Uint8Array | null = null;
  while (head.length < HEADER) {
    const { value, done } = await reader.read();
    if (done) break;
    const merged = new Uint8Array(head.length + value.length);
    merged.set(head);
    merged.set(value, head.length);
    head = merged;
  }

  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
  const dataSize = head.length >= HEADER ? view.getUint32(40, true) : 0;
  const upstreamLength = Number(upstream.headers.get("content-length")) || 0;
  const total = dataSize > 0 && dataSize < 0xffffffff ? HEADER + dataSize : upstreamLength;
  rest = head;

  const headers = new Headers({
    "content-type": "audio/wav",
    "cache-control": "private, no-store",
    "accept-ranges": "bytes",
  });

  // Size unknown: plain pass-through, no seeking.
  if (!total) {
    const body = new ReadableStream<Uint8Array>({
      start: (c) => c.enqueue(rest!),
      pull: async (c) => {
        const { value, done } = await reader.read();
        if (done) c.close();
        else c.enqueue(value);
      },
      cancel: () => reader.cancel(),
    });
    return new Response(body, { headers });
  }

  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  let start = 0;
  let end = total - 1;
  if (m && (m[1] || m[2])) {
    if (m[1]) {
      start = Number(m[1]);
      if (m[2]) end = Math.min(Number(m[2]), total - 1);
    } else {
      start = Math.max(0, total - Number(m[2])); // suffix range: last N bytes
    }
    if (start > end)
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${total}` } });
  }

  let pos = 0; // absolute offset of the next byte to arrive
  let pending: Uint8Array | null = rest;
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        let chunk: Uint8Array;
        if (pending) {
          chunk = pending;
          pending = null;
        } else {
          const { value, done } = await reader.read();
          if (done) return controller.close();
          chunk = value;
        }
        const chunkStart = pos;
        pos += chunk.length;
        if (pos <= start) continue; // entirely before the requested range
        const slice = chunk.subarray(
          Math.max(0, start - chunkStart),
          Math.min(chunk.length, end + 1 - chunkStart),
        );
        if (slice.length) controller.enqueue(slice);
        if (pos > end) {
          reader.cancel().catch(() => {});
          return controller.close();
        }
        if (slice.length) return;
      }
    },
    cancel: () => reader.cancel().catch(() => {}),
  });

  headers.set("content-length", String(end - start + 1));
  if (m && (m[1] || m[2])) {
    headers.set("content-range", `bytes ${start}-${end}/${total}`);
    return new Response(body, { status: 206, headers });
  }
  return new Response(body, { status: 200, headers });
}

import { passcodeToken, sarvamEnv } from "../../../lib/server";

export async function POST(req: Request) {
  const { passcode } = sarvamEnv();
  const body = (await req.json().catch(() => ({}))) as { passcode?: string };
  if (!passcode || body.passcode !== passcode) {
    return Response.json({ error: "Wrong passcode" }, { status: 401 });
  }
  const res = Response.json({ ok: true });
  res.headers.append(
    "set-cookie",
    `auth=${passcodeToken(passcode)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${60 * 60 * 12}`,
  );
  return res;
}

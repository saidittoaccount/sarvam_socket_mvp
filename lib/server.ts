import { createHash } from "node:crypto";
import { cookies } from "next/headers";

export const SARVAM_RUNTIME = "https://apps.sarvam.ai/api/app-runtime/";
export const SARVAM_ANALYTICS = "https://apps.sarvam.ai/api/analytics/v1/";
export const AGENT_NAME = "Meena Complicated PED";

export function sarvamEnv() {
  return {
    apiKey: process.env.SARVAM_API_KEY ?? "",
    orgId: process.env.SARVAM_ORG_ID ?? "",
    workspaceId: process.env.SARVAM_WORKSPACE_ID ?? "",
    appId: process.env.SARVAM_APP_ID ?? "Meena-Compl-3fde0922-8991",
    version: process.env.SARVAM_APP_VERSION ? Number(process.env.SARVAM_APP_VERSION) : undefined,
    passcode: process.env.APP_PASSCODE ?? "",
  };
}

export function analyticsBase() {
  const { orgId, workspaceId, appId } = sarvamEnv();
  return `${SARVAM_ANALYTICS}${orgId}/${workspaceId}/${appId}/`;
}

export const passcodeToken = (passcode: string) =>
  createHash("sha256").update(`sarvam-socket-mvp:${passcode}`).digest("hex");

// Open when APP_PASSCODE is unset (local dev); otherwise the login cookie must match.
export async function isAuthed() {
  const { passcode } = sarvamEnv();
  if (!passcode) return true;
  return (await cookies()).get("auth")?.value === passcodeToken(passcode);
}

export const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });

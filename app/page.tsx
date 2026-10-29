import { AGENT_NAME, isAuthed, sarvamEnv } from "../lib/server";
import App from "./app";
import Login from "./login";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await isAuthed())) return <Login />;
  const { orgId, workspaceId, appId, version } = sarvamEnv();
  return (
    <App
      agentName={AGENT_NAME}
      orgId={orgId}
      workspaceId={workspaceId}
      appId={appId}
      version={version}
    />
  );
}

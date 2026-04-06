import { createHmac } from "node:crypto";

export function signRouterRequest(payload: { ownerWallet: string; requestId: string; taskId: string }) {
  const secret = process.env.ROUTER_AGENT_SHARED_SECRET ?? "dev-router-secret";
  return createHmac("sha256", secret)
    .update(`${payload.ownerWallet}::${payload.requestId}::${payload.taskId}`)
    .digest("hex");
}

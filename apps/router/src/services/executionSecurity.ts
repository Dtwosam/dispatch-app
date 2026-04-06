import { createHmac, timingSafeEqual } from "node:crypto";

export class ExecutionSecurity {
  constructor(private readonly secret = process.env.ROUTER_CALLBACK_SECRET ?? process.env.ROUTER_AGENT_SHARED_SECRET ?? "dev-router-secret") {}

  signExecutionRequest(input: { requestId: string; taskId: string; agentId: string; ownerWallet: string }) {
    return createHmac("sha256", this.secret)
      .update(`${input.ownerWallet}::${input.agentId}::${input.taskId}::${input.requestId}`)
      .digest("hex");
  }

  signCallback(input: { requestId: string; runId: string; nonce: string }) {
    return createHmac("sha256", this.secret)
      .update(`${input.requestId}::${input.runId}::${input.nonce}`)
      .digest("hex");
  }

  verifyCallback(input: { requestId: string; runId: string; nonce: string; signature: string }) {
    const expected = this.signCallback(input);
    return safeCompare(expected, input.signature);
  }
}

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

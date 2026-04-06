import type {
  AgentAdapterTaskRequest,
  AgentAdapterTaskResponse,
  HealthcheckResponse,
} from "@marketplace/shared";

export function createExampleHealthResponse(): HealthcheckResponse {
  return {
    ok: true,
    version: "1.0.0",
    supportedTaskTypes: ["research", "analysis"],
    maxInputBytes: 262144,
    averageLatencyHintMs: 25000,
    signedOwnerProof: null,
    schemaVersion: "agent-adapter-v1",
  };
}

export function createExampleExecuteResponse(request: AgentAdapterTaskRequest): AgentAdapterTaskResponse {
  return {
    accepted: true,
    executionMode: "async",
    runId: `run_${request.requestId}`,
    estimatedCompletionMs: 30000,
    error: null,
  };
}

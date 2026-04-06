import type { InMemoryRegistryStore } from "../db/store";
import { ExecutionLogStore } from "./executionLogStore";
import { ExecutionSecurity } from "./executionSecurity";
import { ResultStore } from "./resultStore";

export interface CallbackPayload {
  requestId: string;
  runId: string;
  nonce: string;
  signature: string;
  result: unknown;
  completedAt: string;
  structuredMetadata?: Record<string, unknown>;
}

export class CallbackHandler {
  constructor(
    private readonly store: InMemoryRegistryStore,
    private readonly security: ExecutionSecurity,
    private readonly resultStore: ResultStore,
    private readonly logs: ExecutionLogStore,
  ) {}

  async handle(payload: CallbackPayload) {
    const run = this.store.executionRuns.get(payload.runId);
    if (!run || run.requestId !== payload.requestId) {
      throw new Error("Callback mismatch");
    }
    if (this.store.executionCallbackNonces.has(payload.nonce)) {
      if (run.state === "completed" && run.resultHash) {
        return run;
      }
      throw new Error("Callback nonce already used");
    }
    if (!this.security.verifyCallback(payload)) {
      run.errorCode = "UNAUTHORIZED";
      run.failureCategory = "unauthorized_agent_response";
      run.lastErrorMessage = "Callback signature verification failed";
      this.store.executionRuns.set(run.runId, run);
      throw new Error("Unauthorized callback");
    }
    if (
      payload.result == null
      || payload.result === ""
      || (typeof payload.result === "object" && payload.result && Object.keys(payload.result as Record<string, unknown>).length === 0)
    ) {
      run.errorCode = "VALIDATION_ERROR";
      run.failureCategory = "empty_result";
      run.lastErrorMessage = "Callback delivered an empty result payload";
      this.store.executionRuns.set(run.runId, run);
      throw new Error("Empty callback result");
    }
    if (typeof payload.result === "object" && payload.result && (payload.result as Record<string, unknown>).partial === true) {
      run.errorCode = "VALIDATION_ERROR";
      run.failureCategory = "partial_result";
      run.lastErrorMessage = "Callback delivered a partial result payload";
      this.store.executionRuns.set(run.runId, run);
      throw new Error("Partial callback result");
    }
    this.store.executionCallbackNonces.add(payload.nonce);
    if (run.state === "completed" && run.resultHash) {
      return run;
    }

    const persisted = this.resultStore.persist(run.runId, payload.result);
    run.resultPointer = persisted.pointer;
    run.resultHash = persisted.hash;
    run.rawPayload = payload.result;
    run.state = "completed";
    run.completedAt = payload.completedAt;
    run.updatedAt = new Date().toISOString();
    this.store.executionRuns.set(run.runId, run);
    this.logs.info(run.runId, run.taskId, run.agentId, "execution.callback_received", "Verified callback and persisted result", {
      resultPointer: persisted.pointer,
      resultHash: persisted.hash,
    });
    this.logs.metric("callback", run.runId, run.taskId, 1, "count");
    return run;
  }
}

import {
  agentResultResponseSchema,
  agentStatusResponseSchema,
} from "@marketplace/shared";
import { ZodError } from "zod";
import type { InMemoryRegistryStore } from "../db/store";
import type { ExecutionRunRow, ExecutionFailureCategory } from "../db/models";
import { fetchJson } from "../lib/http";
import { ExecutionLogStore } from "./executionLogStore";
import { ResultStore } from "./resultStore";

export class ExecutionWorker {
  constructor(
    private readonly store: InMemoryRegistryStore,
    private readonly logs: ExecutionLogStore,
    private readonly resultStore: ResultStore,
  ) {}

  async pollStatus(run: ExecutionRunRow) {
    if (!run.remoteRunId) return null;
    const startedAt = Date.now();
    const response = await fetchJson<unknown>(
      `${run.endpointUrl.replace(/\/$/, "")}/status/${run.remoteRunId}`,
      {},
      8000,
    );
    let parsed;
    try {
      parsed = agentStatusResponseSchema.parse(response.data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw this.resultError("invalid_response_schema", error.message);
      }
      throw error;
    }
    run.state = parsed.state === "completed" ? "running" : "polling";
    run.updatedAt = new Date().toISOString();
    this.store.executionRuns.set(run.runId, run);
    this.logs.metric("status_poll", run.runId, run.taskId, Date.now() - startedAt, "ms");
    this.logs.info(run.runId, run.taskId, run.agentId, "execution.status_polled", "Polled remote status", {
      state: parsed.state,
      progress: parsed.progress,
    });
    return parsed;
  }

  async fetchResult(run: ExecutionRunRow) {
    if (!run.remoteRunId) {
      throw new Error("Remote run ID missing");
    }
    const startedAt = Date.now();
    const response = await fetchJson<unknown>(
      `${run.endpointUrl.replace(/\/$/, "")}/result/${run.remoteRunId}`,
      {},
      8000,
    );
    let parsed;
    try {
      parsed = agentResultResponseSchema.parse(response.data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw this.resultError("invalid_response_schema", error.message);
      }
      throw error;
    }
    if (parsed.result == null || parsed.result === "" || (typeof parsed.result === "object" && parsed.result && Object.keys(parsed.result as Record<string, unknown>).length === 0)) {
      throw this.resultError("empty_result", "Received empty result payload");
    }
    if (typeof parsed.result === "object" && parsed.result && (parsed.result as Record<string, unknown>).partial === true) {
      throw this.resultError("partial_result", "Received partial result payload");
    }
    const persisted = this.resultStore.persist(run.runId, parsed.result);
    run.resultPointer = persisted.pointer;
    run.resultHash = persisted.hash;
    run.rawPayload = parsed.result;
    run.state = "completed";
    run.completedAt = parsed.completedAt;
    run.updatedAt = new Date().toISOString();
    this.store.executionRuns.set(run.runId, run);
    this.logs.metric("result_fetch", run.runId, run.taskId, Date.now() - startedAt, "ms");
    this.logs.info(run.runId, run.taskId, run.agentId, "execution.result_fetched", "Fetched and persisted execution result", {
      resultPointer: persisted.pointer,
      resultHash: persisted.hash,
    });
    return persisted;
  }

  resultError(category: ExecutionFailureCategory, message: string) {
    const error = new Error(message) as Error & { category: ExecutionFailureCategory };
    error.category = category;
    return error;
  }
}

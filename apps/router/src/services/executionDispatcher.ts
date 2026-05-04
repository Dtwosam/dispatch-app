import {
  agentAdapterTaskRequestSchema,
  agentAdapterTaskResponseSchema,
  type AgentAdapterTaskRequest,
} from "@marketplace/shared";
import { ZodError } from "zod";
import type { TaskDetailView } from "@marketplace/shared";
import type { InMemoryRegistryStore } from "../db/store";
import type { ExecutionRunRow } from "../db/models";
import { fetchJson } from "../lib/http";
import { makeId } from "../lib/ids";
import { ExecutionLogStore } from "./executionLogStore";
import { ExecutionSecurity } from "./executionSecurity";
import { Erc8183AdapterService } from "./erc8183AdapterService";
import { SafetyService } from "./safetyService";
import { resolveRouterPublicBaseUrl } from "../lib/publicBaseUrl";

export interface DispatchConfig {
  maxRetries: number;
  baseBackoffMs: number;
  timeoutMs: number;
  endpointAllowlist: string[];
}

export class ExecutionDispatcher {
  private readonly callbackBaseUrl = resolveRouterPublicBaseUrl();
  private readonly erc8183: Erc8183AdapterService;

  constructor(
    private readonly store: InMemoryRegistryStore,
    private readonly logs: ExecutionLogStore,
    private readonly security: ExecutionSecurity,
    private readonly config: DispatchConfig,
    private readonly safetyService: SafetyService,
  ) {
    this.erc8183 = new Erc8183AdapterService(store);
  }

  createRun(task: TaskDetailView, agent: { agentId: string; ownerWallet: string; endpointUrl: string }) {
    if (this.config.endpointAllowlist.length > 0 && !this.config.endpointAllowlist.includes(agent.endpointUrl)) {
      throw new Error("Endpoint is not in the allowlist");
    }
    this.safetyService.validateEndpoint(agent.endpointUrl);

    const requestId = makeId("req");
    if (this.store.executionRequestIds.has(requestId)) {
      throw new Error("Request ID collision");
    }
    this.store.executionRequestIds.add(requestId);

    const runId = makeId("run");
    const now = new Date();
    const run: ExecutionRunRow = {
      runId,
      requestId,
      taskId: task.taskId,
      agentId: agent.agentId,
      ownerWallet: agent.ownerWallet,
      endpointUrl: agent.endpointUrl,
      callbackUrl: `${this.callbackBaseUrl}/api/execution/callback`,
      state: "queued",
      attempt: 0,
      maxRetries: this.config.maxRetries,
      nextRetryAt: null,
      timeoutAt: new Date(now.getTime() + this.config.timeoutMs).toISOString(),
      executionMode: null,
      remoteRunId: null,
      resultPointer: null,
      resultHash: null,
      rawPayload: null,
      normalizedPayload: null,
      errorCode: null,
      failureCategory: null,
      lastErrorMessage: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      startedAt: null,
      completedAt: null,
    };

    this.store.executionRuns.set(runId, run);
    this.logs.info(runId, task.taskId, agent.agentId, "execution.queued", "Execution queued for dispatch", {
      endpointUrl: agent.endpointUrl,
      requestId,
    });
    this.logs.internal("execution.queued", task.taskId, runId, { agentId: agent.agentId });
    return run;
  }

  normalizeTaskPayload(task: TaskDetailView, run: ExecutionRunRow): AgentAdapterTaskRequest {
    const erc8183Job = this.erc8183.ensureForTask(task, {
      providerAgentId: run.agentId,
      evaluator: task.creatorWallet,
      hook: run.callbackUrl,
    });
    const normalized = agentAdapterTaskRequestSchema.parse({
      requestId: run.requestId,
      taskId: task.taskId,
      taskType: task.category,
      title: task.title,
      description: task.description,
      structuredInput: {
        evaluationPreference: task.evaluationPreference,
        structuredNotes: task.structuredNotes,
        rewardAmount: task.rewardAmount,
      },
      attachments: task.attachments.map((item) => ({
        name: item.title,
        contentType: item.mimeType ?? "application/octet-stream",
        pointer: item.pointer,
        sizeBytes: item.sizeBytes ?? 0,
      })),
      expectedOutputSchema: {
        resultStatus: "submitted",
        taskId: task.taskId,
      },
      deadlineTimestamp: Math.floor(new Date(task.deadline).getTime() / 1000),
      callbackUrl: run.callbackUrl,
      auth: {
        ownerWallet: run.ownerWallet,
        signature: this.security.signExecutionRequest({
          requestId: run.requestId,
          taskId: task.taskId,
          agentId: run.agentId,
          ownerWallet: run.ownerWallet,
        }),
        timestamp: Math.floor(Date.now() / 1000),
      },
      interop: {
        erc8183Job,
      },
    });
    run.normalizedPayload = normalized;
    run.updatedAt = new Date().toISOString();
    this.store.executionRuns.set(run.runId, run);
    return normalized;
  }

  async dispatch(task: TaskDetailView, run: ExecutionRunRow) {
    const startedAt = Date.now();
    run.state = "dispatching";
    run.attempt += 1;
    run.startedAt = run.startedAt ?? new Date().toISOString();
    run.updatedAt = new Date().toISOString();
    this.store.executionRuns.set(run.runId, run);

    const payload = this.normalizeTaskPayload(task, run);
    try {
      const response = await fetchJson<unknown>(
        `${run.endpointUrl.replace(/\/$/, "")}/execute`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        12_000,
      );
      const parsed = agentAdapterTaskResponseSchema.parse(response.data);
      run.executionMode = parsed.executionMode;
      run.remoteRunId = parsed.runId;
      run.updatedAt = new Date().toISOString();
      run.state = parsed.executionMode === "sync" ? "running" : "awaiting_callback";
      this.store.executionRuns.set(run.runId, run);
      this.erc8183.markDispatched(task, {
        providerAgentId: run.agentId,
        hook: run.callbackUrl,
      });

      this.logs.metric("dispatch", run.runId, run.taskId, Date.now() - startedAt, "ms");
      this.logs.info(run.runId, run.taskId, run.agentId, "execution.dispatched", "Execution request accepted by endpoint", {
        executionMode: parsed.executionMode,
        remoteRunId: parsed.runId,
      });
      this.logs.internal("execution.dispatched", run.taskId, run.runId, { remoteRunId: parsed.runId });

      return parsed;
    } catch (error) {
      const category = error instanceof ZodError ? "invalid_response_schema" : "endpoint_unavailable";
      const code = error instanceof ZodError ? "VALIDATION_ERROR" : "CHAIN_WRITE_FAILED";
      this.failDispatch(run, category, code, error instanceof Error ? error.message : "Dispatch failed");
      throw error;
    }
  }

  failDispatch(run: ExecutionRunRow, category: ExecutionRunRow["failureCategory"], code: ExecutionRunRow["errorCode"], message: string) {
    run.failureCategory = category;
    run.errorCode = code;
    run.lastErrorMessage = message;
    run.state = "failed";
    run.updatedAt = new Date().toISOString();
    this.store.executionRuns.set(run.runId, run);
    this.logs.error(run.runId, run.taskId, run.agentId, "execution.dispatch_failed", message, { category, code });
  }
}

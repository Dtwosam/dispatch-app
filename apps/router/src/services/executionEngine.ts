import type { AgentRegistryService } from "./agentRegistryService";
import type { TaskMarketService } from "./taskMarketService";
import type { InMemoryRegistryStore } from "../db/store";
import type { ExecutionFailureCategory, ExecutionRunRow } from "../db/models";
import { ExecutionDispatcher, type DispatchConfig } from "./executionDispatcher";
import { ExecutionLogStore } from "./executionLogStore";
import { ExecutionRetryPolicy } from "./executionRetryPolicy";
import { ExecutionSecurity } from "./executionSecurity";
import { ExecutionWorker } from "./executionWorker";
import { ResultStore } from "./resultStore";
import { CallbackHandler, type CallbackPayload } from "./callbackHandler";
import { SafetyService } from "./safetyService";
import { makeId } from "../lib/ids";
import { PlatformAgentRuntime } from "./platformAgentRuntime";
import type { PlatformRefinementContext } from "./platformQualityTypes";
import { resolveRouterPublicBaseUrl } from "../lib/publicBaseUrl";

export class ExecutionEngine {
  private readonly callbackBaseUrl = resolveRouterPublicBaseUrl();
  private readonly logs: ExecutionLogStore;
  private readonly security: ExecutionSecurity;
  private readonly resultStore: ResultStore;
  private readonly dispatcher: ExecutionDispatcher;
  private readonly worker: ExecutionWorker;
  private readonly retryPolicy: ExecutionRetryPolicy;
  private readonly callbackHandler: CallbackHandler;
  private readonly platformRuntime: PlatformAgentRuntime;
  private pollingTimer: NodeJS.Timeout | null = null;
  private timeoutTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly store: InMemoryRegistryStore,
    private readonly taskMarket: TaskMarketService,
    private readonly registryService: AgentRegistryService,
    private readonly safetyService: SafetyService,
    config: DispatchConfig,
  ) {
    this.logs = new ExecutionLogStore(store);
    this.security = new ExecutionSecurity();
    this.resultStore = new ResultStore();
    this.dispatcher = new ExecutionDispatcher(store, this.logs, this.security, config, this.safetyService);
    this.worker = new ExecutionWorker(store, this.logs, this.resultStore);
    this.retryPolicy = new ExecutionRetryPolicy(config.baseBackoffMs);
    this.callbackHandler = new CallbackHandler(store, this.security, this.resultStore, this.logs);
    this.platformRuntime = new PlatformAgentRuntime();
  }

  start() {
    if (!this.pollingTimer) {
      this.pollingTimer = setInterval(() => void this.pollAsyncRuns(), 2000);
    }
    if (!this.timeoutTimer) {
      this.timeoutTimer = setInterval(() => this.checkTimeouts(), 2000);
    }
  }

  stop() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    if (this.timeoutTimer) clearInterval(this.timeoutTimer);
    this.pollingTimer = null;
    this.timeoutTimer = null;
  }

  async dispatchTask(taskId: string, agentId: string) {
    const task = this.taskMarket.getTask(taskId);
    const agent = this.registryService.getAgent(agentId);

    const existing = [...this.store.executionRuns.values()].find(
      (run) => run.taskId === taskId && run.agentId === agentId && !["completed", "failed", "timed_out", "cancelled"].includes(run.state),
    );
    if (existing) {
      return this.dispatchExistingRun(task, existing);
    }

    if (this.platformRuntime.supports(agent.profile.agentId) && agent.profile.originType === "platform" && !agent.profile.endpointUrl) {
      return this.dispatchBuiltInTask(task, agent.profile.agentId, agent.profile.ownerWallet);
    }

    if (!agent.profile.endpointUrl) {
      throw new Error("Agent endpoint is missing");
    }

    const run = this.dispatcher.createRun(task, {
      agentId: agent.profile.agentId,
      ownerWallet: agent.profile.ownerWallet,
      endpointUrl: agent.profile.endpointUrl,
    });
    return this.dispatchExistingRun(task, run);
  }

  async requestImproveAgain(taskId: string, agentId: string, refinementContext: PlatformRefinementContext) {
    const task = this.taskMarket.getTask(taskId);
    const agent = this.registryService.getAgent(agentId);
    if (!(this.platformRuntime.supports(agent.profile.agentId) && agent.profile.originType === "platform" && !agent.profile.endpointUrl)) {
      throw new Error("Improve Again is only available for built-in platform agents");
    }
    return this.dispatchBuiltInTask(task, agent.profile.agentId, agent.profile.ownerWallet, refinementContext);
  }

  private async dispatchBuiltInTask(
    task: ReturnType<TaskMarketService["getTask"]>,
    agentId: string,
    ownerWallet: string,
    refinementContext: PlatformRefinementContext | null = null,
  ) {
    const existing = [...this.store.executionRuns.values()].find(
      (run) => run.taskId === task.taskId && run.agentId === agentId && !["completed", "failed", "timed_out", "cancelled"].includes(run.state),
    );
    if (existing) {
      return existing;
    }
    const now = new Date();
    const requestId = makeId("req");
    const runId = makeId("run");
    const run: ExecutionRunRow = {
      runId,
      requestId,
      taskId: task.taskId,
      agentId,
      ownerWallet,
      endpointUrl: `platform://${agentId}`,
      callbackUrl: `${this.callbackBaseUrl}/api/execution/callback`,
      state: "running",
      attempt: 1,
      maxRetries: 0,
      nextRetryAt: null,
      timeoutAt: new Date(now.getTime() + 30_000).toISOString(),
      executionMode: "sync",
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
      startedAt: now.toISOString(),
      completedAt: null,
    };
    this.store.executionRuns.set(runId, run);
    this.logs.info(runId, task.taskId, agentId, "execution.platform_started", "Built-in platform agent execution started", {});
    this.logs.internal("execution.platform_started", task.taskId, runId, { agentId });
    await this.taskMarket.markExecutionStarted(task.taskId, agentId);

    const execution = await this.platformRuntime.execute(agentId, task, { refinementContext });
    const persisted = this.resultStore.persist(run.runId, execution.payload);
    run.state = "completed";
    run.resultPointer = persisted.pointer;
    run.resultHash = persisted.hash;
    run.normalizedPayload = execution.trace.structuredTask;
    run.rawPayload = {
      ...execution.trace,
      finalResultPointer: persisted.pointer,
      finalResultHash: persisted.hash,
    };
    run.completedAt = new Date(now.getTime() + execution.latencyMs).toISOString();
    run.updatedAt = run.completedAt;
    this.store.executionRuns.set(run.runId, run);
    this.logs.metric("dispatch", run.runId, run.taskId, execution.latencyMs, "ms");
    this.logs.info(run.runId, run.taskId, run.agentId, "execution.platform_completed", "Built-in platform agent finished execution", {
      latencyMs: execution.latencyMs,
    });
    this.logs.internal("execution.platform_completed", task.taskId, run.runId, { resultHash: persisted.hash });
    this.safetyService.recordDuplicateResult(run.agentId, persisted.hash, run.runId);
    await this.taskMarket.markSubmissionReceived(task.taskId, run.agentId, persisted.pointer, persisted.hash, execution.preview, run.runId);
    return run;
  }

  private async dispatchExistingRun(task: ReturnType<TaskMarketService["getTask"]>, run: ExecutionRunRow) {
    try {
      const response = await this.dispatcher.dispatch(task, run);
      if (response.executionMode === "sync" && response.immediateResult !== undefined) {
        const persisted = this.resultStore.persist(run.runId, response.immediateResult);
        run.state = "completed";
        run.resultPointer = persisted.pointer;
        run.resultHash = persisted.hash;
        run.completedAt = new Date().toISOString();
        this.store.executionRuns.set(run.runId, run);
        this.safetyService.recordDuplicateResult(run.agentId, persisted.hash, run.runId);
        await this.taskMarket.markSubmissionReceived(task.taskId, run.agentId, persisted.pointer, persisted.hash, undefined, run.runId);
      } else {
        await this.taskMarket.markExecutionStarted(task.taskId, run.agentId);
      }
      return run;
    } catch (error) {
      if (this.retryPolicy.canRetry(run)) {
        const delay = this.retryPolicy.scheduleRetry(run);
        this.store.executionRuns.set(run.runId, run);
        this.logs.warn(run.runId, run.taskId, run.agentId, "execution.retry_scheduled", "Dispatch failed; scheduled retry", { delay });
        this.logs.metric("retry", run.runId, run.taskId, 1, "count");
        return run;
      }
      throw error;
    }
  }

  async handleCallback(payload: CallbackPayload) {
    const run = await this.callbackHandler.handle(payload);
    if (run.resultHash) {
      this.safetyService.recordDuplicateResult(run.agentId, run.resultHash, run.runId);
    }
    await this.taskMarket.markSubmissionReceived(run.taskId, run.agentId, run.resultPointer, run.resultHash, undefined, run.runId);
    return run;
  }

  getLogs(runId: string) {
    return this.store.executionLogs.get(runId) ?? [];
  }

  getRunsForTask(taskId: string) {
    return [...this.store.executionRuns.values()].filter((run) => run.taskId === taskId);
  }

  getMetrics() {
    return this.store.executionMetrics;
  }

  getInternalEvents() {
    return this.store.internalEvents;
  }

  private async pollAsyncRuns() {
    const now = Date.now();
    const runs = [...this.store.executionRuns.values()].filter((run) => {
      if (run.state === "awaiting_callback" || run.state === "polling") return true;
      if (run.state === "queued" && run.nextRetryAt && new Date(run.nextRetryAt).getTime() <= now) return true;
      return false;
    });

    for (const run of runs) {
      if (run.state === "queued" && run.nextRetryAt) {
        try {
          const task = this.taskMarket.getTask(run.taskId);
          await this.dispatchExistingRun(task, run);
        } catch {
          // already logged
        }
        continue;
      }

      try {
        const status = await this.worker.pollStatus(run);
        if (!status) continue;
        if (status.state === "failed") {
          const failureMessage =
            typeof status.error === "string"
              ? status.error
              : status.error?.message ?? "Remote execution failed";
          run.state = "failed";
          run.failureCategory = "endpoint_unavailable";
          run.lastErrorMessage = failureMessage;
          run.updatedAt = new Date().toISOString();
          this.store.executionRuns.set(run.runId, run);
          this.taskMarket.markExecutionFailed(run.taskId, run.agentId, failureMessage);
          this.logs.error(run.runId, run.taskId, run.agentId, "execution.failed", failureMessage);
          this.logs.internal("execution.failed", run.taskId, run.runId, { error: failureMessage });
          continue;
        }
        if (status.state === "completed") {
          const persisted = await this.worker.fetchResult(run);
          await this.taskMarket.markSubmissionReceived(run.taskId, run.agentId, persisted.pointer, persisted.hash, undefined, run.runId);
          this.logs.internal("execution.completed", run.taskId, run.runId, { resultHash: persisted.hash });
        }
      } catch (error) {
        run.errorCode = "CHAIN_READ_FAILED";
        run.failureCategory = getFailureCategory(error);
        run.lastErrorMessage = error instanceof Error ? error.message : "Polling failed";
        if (this.retryPolicy.canRetry(run)) {
          const delay = this.retryPolicy.scheduleRetry(run);
          this.store.executionRuns.set(run.runId, run);
          this.logs.warn(run.runId, run.taskId, run.agentId, "execution.retry_scheduled", "Polling failed; scheduled retry", { delay });
        } else {
          run.state = "failed";
          run.updatedAt = new Date().toISOString();
          this.store.executionRuns.set(run.runId, run);
          this.taskMarket.markExecutionFailed(run.taskId, run.agentId, run.lastErrorMessage ?? "Execution failed");
          this.logs.error(run.runId, run.taskId, run.agentId, "execution.failed", run.lastErrorMessage ?? "Execution failed");
          this.logs.internal("execution.failed", run.taskId, run.runId, { error: run.lastErrorMessage });
        }
      }
    }
  }

  private checkTimeouts() {
    const now = Date.now();
    for (const run of this.store.executionRuns.values()) {
      if (["completed", "failed", "timed_out", "cancelled"].includes(run.state)) continue;
      if (new Date(run.timeoutAt).getTime() <= now) {
        run.state = "timed_out";
        run.errorCode = "SETTLEMENT_BLOCKED";
        run.failureCategory = "task_timeout";
        run.lastErrorMessage = "Execution timed out";
        run.updatedAt = new Date().toISOString();
        this.store.executionRuns.set(run.runId, run);
        this.taskMarket.markExecutionFailed(run.taskId, run.agentId, "Execution timed out");
        this.logs.metric("timeout", run.runId, run.taskId, 1, "count");
        this.logs.error(run.runId, run.taskId, run.agentId, "execution.timed_out", "Execution timed out");
        this.logs.internal("execution.timed_out", run.taskId, run.runId, {});
      }
    }
  }
}

function getFailureCategory(error: unknown): ExecutionFailureCategory {
  if (error && typeof error === "object" && "category" in error) {
    const category = error.category;
    if (
      category === "endpoint_unavailable"
      || category === "invalid_response_schema"
      || category === "task_timeout"
      || category === "callback_mismatch"
      || category === "malformed_result"
      || category === "unauthorized_agent_response"
      || category === "empty_result"
      || category === "partial_result"
    ) {
      return category;
    }
  }
  return "invalid_response_schema";
}

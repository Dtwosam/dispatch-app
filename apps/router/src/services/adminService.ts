import { adminOverviewResponseSchema, type AdminResolutionRequest } from "@marketplace/shared";
import { makeId } from "../lib/ids";
import type { InMemoryRegistryStore } from "../db/store";
import type { AgentRegistryService } from "./agentRegistryService";
import type { ExecutionEngine } from "./executionEngine";
import type { SafetyService } from "./safetyService";
import type { SettlementService } from "./settlementService";
import type { TaskMarketService } from "./taskMarketService";

export class AdminService {
  constructor(
    private readonly store: InMemoryRegistryStore,
    private readonly taskMarket: TaskMarketService,
    private readonly settlement: SettlementService,
    private readonly registry: AgentRegistryService,
    private readonly execution: ExecutionEngine,
    private readonly safety: SafetyService,
  ) {}

  overview() {
    return adminOverviewResponseSchema.parse({
      tasks: [...this.store.tasks.values()].map((task) => ({
        taskId: task.taskId,
        title: task.title,
        category: task.category,
        rewardAmount: task.rewardAmount,
        deadline: task.deadline,
        status: task.status,
        resultStatus: task.resultStatus,
        creatorWallet: task.creatorWallet,
        selectedAgentId: task.selectedAgentId,
        participatingAgentIds: task.participatingAgentIds,
        maxParticipants: task.maxParticipants,
        transactionState: task.transactionState,
        onchainTaskRef: task.onchainTaskRef,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      })),
      pausedTaskIds: [...this.store.pausedTasks.values()].filter((row) => row.active).map((row) => row.taskId),
      blacklistedEndpoints: [...this.store.blacklistedEndpoints.values()].filter((row) => row.active),
      suspiciousPatterns: this.safety.computeSuspiciousPatterns(),
      auditLogs: this.store.adminAuditLogs.slice().reverse(),
    });
  }

  pauseTask(taskId: string, adminWallet: string, reason: string, adminWallets: Set<string>) {
    this.assertAdmin(adminWallet, adminWallets);
    const task = this.taskMarket.getTask(taskId);
    this.store.pausedTasks.set(taskId, {
      taskId,
      reason,
      actorWallet: adminWallet,
      createdAt: new Date().toISOString(),
      active: true,
    });
    task.reviewActions = [];
    task.timeline.push({
      id: makeId("evt"),
      kind: "disputed",
      title: "Task paused by admin",
      description: reason,
      createdAt: new Date().toISOString(),
    });
    this.store.tasks.set(taskId, task);
    this.audit(adminWallet, "pause_task", "task", taskId, reason, {});
    return task;
  }

  async refundTask(taskId: string, adminWallet: string, reason: string, adminWallets: Set<string>) {
    this.assertAdmin(adminWallet, adminWallets);
    const receipt = await this.settlement.refundTask(taskId, this.taskMarket.getTask(taskId).creatorWallet);
    this.audit(adminWallet, "refund_task", "task", taskId, reason, { receipt });
    return receipt;
  }

  async resolveDispute(taskId: string, input: AdminResolutionRequest, adminWallets: Set<string>) {
    const receipt = await this.settlement.resolveDispute(taskId, input, adminWallets);
    this.audit(input.adminWallet, "resolve_dispute", "task", taskId, input.resolution, { outcome: input.outcome });
    return receipt;
  }

  disableAgent(agentId: string, adminWallet: string, reason: string, adminWallets: Set<string>) {
    const result = this.registry.suspend(agentId, { adminWallet, reason }, adminWallets);
    this.audit(adminWallet, "disable_agent", "agent", agentId, reason, {});
    return result;
  }

  blacklistEndpoint(endpointUrl: string, adminWallet: string, reason: string, adminWallets: Set<string>) {
    this.assertAdmin(adminWallet, adminWallets);
    const row = this.safety.blacklistEndpoint(endpointUrl, adminWallet, reason);
    this.audit(adminWallet, "blacklist_endpoint", "endpoint", endpointUrl, reason, {});
    return row;
  }

  executionFailures() {
    return [...this.store.executionRuns.values()].filter((run) => run.state === "failed" || run.state === "timed_out");
  }

  taskDebug(taskId: string) {
    const task = this.taskMarket.getTask(taskId);
    const runs = [...this.store.executionRuns.values()].filter((run) => run.taskId === taskId);
    const execution = runs.map((run) => ({
      run,
      logs: this.store.executionLogs.get(run.runId) ?? [],
    }));
    return {
      task,
      settlements: this.store.settlements.get(taskId) ?? [],
      execution,
      internalEvents: this.store.internalEvents.filter((event) => event.taskId === taskId),
      pausedTask: this.store.pausedTasks.get(taskId) ?? null,
    };
  }

  suspiciousPatterns() {
    return this.safety.computeSuspiciousPatterns();
  }

  private assertAdmin(wallet: string, adminWallets: Set<string>) {
    if (!adminWallets.has(wallet)) {
      throw new Error("Admin wallet is not authorized");
    }
  }

  private audit(
    actorWallet: string,
    action: "pause_task" | "refund_task" | "resolve_dispute" | "disable_agent" | "blacklist_endpoint",
    subjectType: "task" | "agent" | "endpoint",
    subjectId: string,
    reason: string,
    metadata: Record<string, unknown>,
  ) {
    this.store.adminAuditLogs.push({
      id: makeId("audit"),
      actorWallet,
      action,
      subjectType,
      subjectId,
      reason,
      metadata,
      createdAt: new Date().toISOString(),
    });
  }
}

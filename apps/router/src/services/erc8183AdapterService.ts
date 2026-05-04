import type { Erc8183Job, TaskDetailView } from "@marketplace/shared";
import type { InMemoryRegistryStore } from "../db/store";
import { mapDispatchTaskToErc8183Job } from "../lib/arcStandards";

const STATE_FROM_TASK_STATUS: Partial<Record<TaskDetailView["status"], Erc8183Job["state"]>> = {
  CREATED: "mapped",
  ESCROW_FUNDED: "mapped",
  OPEN: "mapped",
  ASSIGNED: "dispatched",
  EXECUTING: "dispatched",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "submitted",
  APPROVED: "completed",
  REJECTED: "rejected",
  DISPUTED: "disputed",
  APPEALED: "disputed",
  UNRESOLVED: "disputed",
  SETTLED: "settled",
  REFUNDED: "refunded",
  CANCELLED: "failed",
};

export class Erc8183AdapterService {
  private readonly contractAddress = process.env.ARC_ERC8183_ADDRESS ?? null;
  private readonly paymentTokenAddress = process.env.ARC_PAYMENT_TOKEN_ADDRESS ?? null;
  private readonly paymentTokenSymbol = process.env.ARC_PAYMENT_TOKEN_SYMBOL ?? "USDC";
  private readonly paymentTokenDecimals = Number(process.env.ARC_PAYMENT_TOKEN_DECIMALS ?? "6");

  constructor(private readonly store: InMemoryRegistryStore) {}

  ensureForTask(task: TaskDetailView, options: {
    providerAgentId?: string | null;
    evaluator?: string | null;
    hook?: string | null;
    state?: Erc8183Job["state"];
    onchainJobId?: string | null;
  } = {}) {
    const existing = this.store.erc8183Jobs.get(task.taskId) ?? null;
    const next = mapDispatchTaskToErc8183Job(task, {
      providerAgentId: options.providerAgentId ?? existing?.providerAgentId ?? null,
      evaluator: options.evaluator ?? existing?.evaluator ?? task.creatorWallet,
      hook: options.hook ?? existing?.hook ?? null,
      state: options.state ?? existing?.state ?? this.resolveState(task),
      contractAddress: existing?.contractAddress ?? this.contractAddress,
      onchainJobId: options.onchainJobId ?? existing?.onchainJobId ?? null,
      paymentTokenAddress: this.paymentTokenAddress,
      paymentTokenSymbol: this.paymentTokenSymbol,
      paymentTokenDecimals: this.paymentTokenDecimals,
      now: existing?.createdAt ?? task.createdAt ?? new Date().toISOString(),
    });

    const merged: Erc8183Job = {
      ...existing,
      ...next,
      createdAt: existing?.createdAt ?? next.createdAt,
      updatedAt: new Date().toISOString(),
      lastDispatchedAt: existing?.lastDispatchedAt ?? null,
      lastSubmissionAt: existing?.lastSubmissionAt ?? null,
      lastSettledAt: existing?.lastSettledAt ?? null,
    };
    this.store.erc8183Jobs.set(task.taskId, merged);
    return merged;
  }

  getForTask(taskId: string) {
    return this.store.erc8183Jobs.get(taskId) ?? null;
  }

  syncWithTask(task: TaskDetailView, options: {
    providerAgentId?: string | null;
    evaluator?: string | null;
    hook?: string | null;
  } = {}) {
    return this.ensureForTask(task, {
      ...options,
      state: this.resolveState(task),
    });
  }

  markDispatched(task: TaskDetailView, options: { providerAgentId?: string | null; hook?: string | null } = {}) {
    const job = this.ensureForTask(task, {
      providerAgentId: options.providerAgentId,
      hook: options.hook,
      state: "dispatched",
    });
    const updated: Erc8183Job = {
      ...job,
      state: "dispatched",
      updatedAt: new Date().toISOString(),
      lastDispatchedAt: new Date().toISOString(),
    };
    this.store.erc8183Jobs.set(task.taskId, updated);
    return updated;
  }

  markSubmitted(task: TaskDetailView, options: { providerAgentId?: string | null } = {}) {
    const job = this.ensureForTask(task, {
      providerAgentId: options.providerAgentId,
      state: "submitted",
    });
    const updated: Erc8183Job = {
      ...job,
      state: "submitted",
      updatedAt: new Date().toISOString(),
      lastSubmissionAt: new Date().toISOString(),
    };
    this.store.erc8183Jobs.set(task.taskId, updated);
    return updated;
  }

  markSettled(task: TaskDetailView, state: Extract<Erc8183Job["state"], "settled" | "refunded">) {
    const job = this.ensureForTask(task, { state });
    const updated: Erc8183Job = {
      ...job,
      state,
      updatedAt: new Date().toISOString(),
      lastSettledAt: new Date().toISOString(),
    };
    this.store.erc8183Jobs.set(task.taskId, updated);
    return updated;
  }

  private resolveState(task: TaskDetailView): Erc8183Job["state"] {
    return STATE_FROM_TASK_STATUS[task.status] ?? "mapped";
  }
}

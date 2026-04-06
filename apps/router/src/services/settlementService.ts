import type {
  AdminResolutionRequest,
  SettlementHistoryResponse,
  SettlementReceipt,
} from "@marketplace/shared";
import { settlementHistoryResponseSchema, settlementReceiptSchema } from "@marketplace/shared";
import { InMemoryRegistryStore } from "../db/store";
import { makeId } from "../lib/ids";
import { TaskMarketService } from "./taskMarketService";

type SettlementChainBridge = {
  disputeTask(taskId: string): Promise<{ txHash: string } | null>;
  settleTask(taskId: string): Promise<{ txHash: string } | null>;
  refundTask(taskId: string): Promise<{ txHash: string } | null>;
};

export class SettlementService {
  private chainBridge: SettlementChainBridge | null = null;

  constructor(
    private readonly store: InMemoryRegistryStore,
    private readonly taskMarket: TaskMarketService,
    private readonly platformFeeBps = Number(process.env.PLATFORM_FEE_BPS ?? "250"),
  ) {}

  attachChainBridge(bridge: SettlementChainBridge) {
    this.chainBridge = bridge;
  }

  async settleApprovedTask(taskId: string, actorWallet: string): Promise<SettlementReceipt> {
    await this.taskMarket.refreshTaskFromChain(taskId);
    const task = this.taskMarket.getTask(taskId);
    if (task.creatorWallet !== actorWallet) {
      throw new Error("Only the task creator can settle this task");
    }
    this.assertNotTerminal(taskId, task.status);
    if (task.disputeRecord?.status === "open") {
      throw new Error("Open disputes must be resolved before payout");
    }
    if (["DISPUTED", "APPEALED", "UNRESOLVED"].includes(task.status) || ["disputed", "unresolved"].includes(task.settlementState)) {
      throw new Error("Consensus review has not reached a payout-safe final state yet");
    }
    if (task.status !== "APPROVED") {
      throw new Error("Task must be approved before settlement");
    }

    const grossReward = task.rewardAmount;
    const platformFee = roundTokenAmount((grossReward * this.platformFeeBps) / 10_000);
    const agentPayout = roundTokenAmount(grossReward - platformFee);
    const payoutWallet = this.resolvePayoutWallet(taskId);
    const platformFeeWallet = this.resolvePlatformFeeWallet();
    const chainReceipt = this.chainBridge ? await this.chainBridge.settleTask(taskId) : null;
    const receipt = {
      ...settlementReceiptSchema.parse({
        settlementId: makeId("settlement"),
        taskId,
        grossReward,
        platformFee,
        agentPayout,
        refundAmount: 0,
        settlementTimestamp: new Date().toISOString(),
        txReference: chainReceipt?.txHash ?? `arc:${makeId("tx")}`,
        settlementState: "settled",
        outcome: "paid",
      }),
      payoutWallet,
      platformFeeWallet,
    } as SettlementReceipt & {
      payoutWallet: string | null;
      platformFeeWallet: string | null;
    };

    this.store.appendSettlement(taskId, receipt);
    this.taskMarket.markSettlement(taskId, receipt);
    this.annotateLatestRun(taskId, { settlementOutcome: "settled" });
    this.recordPaidOutcome(taskId, agentPayout);
    this.log("settlement.paid", { taskId, actorWallet, grossReward, platformFee, agentPayout, payoutWallet, platformFeeWallet });
    return receipt;
  }

  async refundTask(taskId: string, actorWallet: string): Promise<SettlementReceipt> {
    await this.taskMarket.refreshTaskFromChain(taskId);
    const task = this.taskMarket.getTask(taskId);
    if (task.creatorWallet !== actorWallet) {
      throw new Error("Only the task creator can refund this task");
    }
    this.assertNotTerminal(taskId, task.status);
    if (task.disputeRecord?.status === "open") {
      throw new Error("Open disputes must be resolved before refund");
    }
    if (["APPEALED", "UNRESOLVED"].includes(task.status) || task.settlementState === "unresolved") {
      throw new Error("Unresolved or appealed tasks must finish review before refund");
    }
    if (!["REJECTED", "CANCELLED"].includes(task.status)) {
      throw new Error("Task must be rejected or cancelled before refund");
    }

    const chainReceipt = this.chainBridge ? await this.chainBridge.refundTask(taskId) : null;
    const receipt = {
      ...settlementReceiptSchema.parse({
        settlementId: makeId("settlement"),
        taskId,
        grossReward: task.rewardAmount,
        platformFee: 0,
        agentPayout: 0,
        refundAmount: task.rewardAmount,
        settlementTimestamp: new Date().toISOString(),
        txReference: chainReceipt?.txHash ?? `arc:${makeId("tx")}`,
        settlementState: "refunded",
        outcome: "refunded",
      }),
      payoutWallet: task.creatorWallet,
      platformFeeWallet: this.resolvePlatformFeeWallet(),
    } as SettlementReceipt & {
      payoutWallet: string | null;
      platformFeeWallet: string | null;
    };

    this.store.appendSettlement(taskId, receipt);
    this.taskMarket.markRefund(taskId, receipt);
    this.annotateLatestRun(taskId, { settlementOutcome: "refunded" });
    this.recordRefundOutcome(taskId);
    this.log("settlement.refunded", { taskId, actorWallet, refundAmount: task.rewardAmount });
    return receipt;
  }

  async pauseOnDispute(taskId: string, actorWallet: string, reason: string) {
    await this.taskMarket.refreshTaskFromChain(taskId);
    const task = this.taskMarket.getTask(taskId);
    if (task.creatorWallet !== actorWallet) {
      throw new Error("Only the task creator can open a dispute");
    }
    if (task.disputeRecord?.status === "open") {
      throw new Error("Task already has an open dispute");
    }
    if (["SETTLED", "REFUNDED", "CANCELLED"].includes(task.status)) {
      throw new Error("This task can no longer be disputed");
    }
    if (!["SUBMITTED", "UNDER_REVIEW", "REJECTED", "APPROVED"].includes(task.status)) {
      throw new Error("Disputes can only be opened after a result exists or a review decision has been made");
    }
    const chainReceipt = this.chainBridge ? await this.chainBridge.disputeTask(taskId) : null;
    const receipt = {
      ...settlementReceiptSchema.parse({
        settlementId: makeId("settlement"),
        taskId,
        grossReward: task.rewardAmount,
        platformFee: 0,
        agentPayout: 0,
        refundAmount: 0,
        settlementTimestamp: new Date().toISOString(),
        txReference: chainReceipt?.txHash ?? null,
        settlementState: "disputed",
        outcome: "paused",
      }),
      payoutWallet: this.resolvePayoutWallet(taskId),
      platformFeeWallet: this.resolvePlatformFeeWallet(),
    } as SettlementReceipt & {
      payoutWallet: string | null;
      platformFeeWallet: string | null;
    };
    this.store.appendSettlement(taskId, receipt);
    this.taskMarket.markDisputeOpened(taskId, actorWallet, reason, receipt);
    this.annotateLatestRun(taskId, { settlementOutcome: "disputed" });
    this.recordDispute(taskId);
    this.log("settlement.disputed", { taskId, actorWallet, reason });
    return receipt;
  }

  async resolveDispute(taskId: string, input: AdminResolutionRequest, adminWallets: Set<string>) {
    if (!adminWallets.has(input.adminWallet)) {
      throw new Error("Admin wallet is not authorized to resolve disputes");
    }
    await this.taskMarket.refreshTaskFromChain(taskId);
    const task = this.taskMarket.getTask(taskId);
    if (!task.disputeRecord || task.disputeRecord.status !== "open") {
      throw new Error("Task does not have an open dispute");
    }

    const paid = input.outcome === "approve_payout";
    const grossReward = task.rewardAmount;
    const platformFee = paid ? roundTokenAmount((grossReward * this.platformFeeBps) / 10_000) : 0;
    const agentPayout = paid ? roundTokenAmount(grossReward - platformFee) : 0;
    const refundAmount = paid ? 0 : grossReward;
    const payoutWallet = paid ? this.resolvePayoutWallet(taskId) : task.creatorWallet;
    const platformFeeWallet = this.resolvePlatformFeeWallet();

    const chainReceipt = this.chainBridge
      ? await (paid ? this.chainBridge.settleTask(taskId) : this.chainBridge.refundTask(taskId))
      : null;
    const receipt = {
      ...settlementReceiptSchema.parse({
        settlementId: makeId("settlement"),
        taskId,
        grossReward,
        platformFee,
        agentPayout,
        refundAmount,
        settlementTimestamp: new Date().toISOString(),
        txReference: chainReceipt?.txHash ?? `arc:${makeId("tx")}`,
        settlementState: paid ? "settled" : "refunded",
        outcome: "admin_resolved",
      }),
      payoutWallet,
      platformFeeWallet,
    } as SettlementReceipt & {
      payoutWallet: string | null;
      platformFeeWallet: string | null;
    };

    this.store.appendSettlement(taskId, receipt);
    this.taskMarket.markAdminResolution(taskId, input, receipt);
    this.annotateLatestRun(taskId, { settlementOutcome: paid ? "settled" : "refunded" });
    if (paid) {
      this.recordPaidOutcome(taskId, agentPayout);
    } else {
      this.recordRefundOutcome(taskId);
    }
    this.log("settlement.admin_resolved", { taskId, adminWallet: input.adminWallet, outcome: input.outcome, resolution: input.resolution, payoutWallet, platformFeeWallet });
    return receipt;
  }

  history(taskId: string): SettlementHistoryResponse {
    return settlementHistoryResponseSchema.parse({
      items: this.store.settlements.get(taskId) ?? [],
    });
  }

  private recordPaidOutcome(taskId: string, agentPayout: number) {
    const task = this.taskMarket.getTask(taskId);
    const agentId = task.participatingAgentIds[0] ?? task.selectedAgentId;
    if (!agentId) return;
    const performance = this.store.ensurePerformance(agentId);
    performance.tasksCompleted += 1;
    performance.approvals += 1;
    performance.totalEarnings = roundTokenAmount(performance.totalEarnings + agentPayout);
    performance.approvalRate =
      performance.tasksCompleted === 0 ? 0 : performance.approvals / performance.tasksCompleted;
    this.store.performance.set(agentId, performance);
  }

  private recordRefundOutcome(taskId: string) {
    const task = this.taskMarket.getTask(taskId);
    const agentId = task.participatingAgentIds[0] ?? task.selectedAgentId;
    if (!agentId) return;
    const performance = this.store.ensurePerformance(agentId);
    performance.tasksCompleted += 1;
    performance.rejectionCount += 1;
    performance.approvalRate =
      performance.tasksCompleted === 0 ? 0 : performance.approvals / performance.tasksCompleted;
    this.store.performance.set(agentId, performance);
  }

  private recordDispute(taskId: string) {
    const task = this.taskMarket.getTask(taskId);
    const agentId = task.participatingAgentIds[0] ?? task.selectedAgentId;
    if (!agentId) return;
    const performance = this.store.ensurePerformance(agentId);
    performance.disputeCount += 1;
    this.store.performance.set(agentId, performance);
  }

  private resolvePayoutWallet(taskId: string): string | null {
    const task = this.taskMarket.getTask(taskId);
    const agentId = task.participatingAgentIds[0] ?? task.selectedAgentId;
    if (!agentId) return null;
    return this.store.agents.get(agentId)?.profile.ownerWallet ?? null;
  }

  private resolvePlatformFeeWallet(): string | null {
    return process.env.PLATFORM_TREASURY_WALLET
      ?? process.env.PLATFORM_AGENT_OWNER_WALLET
      ?? process.env.ARC_SERVER_WALLET_ADDRESS
      ?? null;
  }

  private annotateLatestRun(taskId: string, patch: Record<string, unknown>) {
    const run = [...this.store.executionRuns.values()]
      .filter((item) => item.taskId === taskId)
      .sort((left, right) => new Date(right.completedAt ?? right.updatedAt).getTime() - new Date(left.completedAt ?? left.updatedAt).getTime())[0];
    if (!run) return;
    const payload = run.rawPayload && typeof run.rawPayload === "object" && !Array.isArray(run.rawPayload)
      ? run.rawPayload as Record<string, unknown>
      : {};
    run.rawPayload = {
      ...payload,
      ...patch,
    };
    run.updatedAt = new Date().toISOString();
    this.store.executionRuns.set(run.runId, run);
  }

  private assertNotTerminal(taskId: string, status: string) {
    if (["SETTLED", "REFUNDED"].includes(status)) {
      throw new Error(`Task ${taskId} already reached a terminal settlement state`);
    }
    const history = this.store.settlements.get(taskId) ?? [];
    if (history.some((receipt) => receipt.settlementState === "settled" || receipt.settlementState === "refunded")) {
      throw new Error(`Task ${taskId} already has a terminal settlement receipt`);
    }
  }

  private log(event: string, payload: Record<string, unknown>) {
    console.info(JSON.stringify({ scope: "settlement", event, ...payload }));
  }
}

function roundTokenAmount(value: number, decimals = 6) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

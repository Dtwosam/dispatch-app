import type {
  AdminResolutionRequest,
  EvaluationRunResponse,
  EvaluationRunRequest,
  ChainReceiptView,
  SettlementReceipt,
  TaskChainSyncRequest,
  UserReviewDecision,
  RegistryAgentView,
  TaskActionResponse,
  TaskCreateRequest,
  TaskCreateResponse,
  TaskDetailView,
  TaskDraftCreateResponse,
  TaskListResponse,
  TaskSummaryView,
  TaskTimelineEvent,
  Erc8183Job,
  TaskSettlementSummary,
} from "@marketplace/shared";
import {
  assertTaskStatusRecovery,
  assertTaskStatusTransition,
  taskDraftCreateResponseSchema,
  taskActionResponseSchema,
  taskCreateResponseSchema,
  taskListResponseSchema,
  taskSummaryViewSchema,
} from "@marketplace/shared";
import { InMemoryRegistryStore } from "../db/store";
import { makeId } from "../lib/ids";
import { AgentRegistryService } from "./agentRegistryService";
import { Erc8183AdapterService } from "./erc8183AdapterService";
import { buildLocalUserReviewEvaluation, EvaluatorClient } from "./evaluatorClient";
import { SafetyService } from "./safetyService";
import type { PlatformRefinementContext, PlatformQualityMode } from "./platformQualityTypes";

type TaskMarketChainBridge = {
  readTaskState?(taskId: string): Promise<{ onchainTask: unknown; onchainTaskRef: string | null } | null>;
  assignTask(task: TaskDetailView, agent: RegistryAgentView): Promise<{ txHash: string } | null>;
  startExecution(task: TaskDetailView, agent: RegistryAgentView): Promise<{ txHash: string } | null>;
  submitTaskResult(input: {
    task: TaskDetailView;
    agent: RegistryAgentView;
    submissionNonce: string;
    resultHash: string;
    resultPointer: string | null;
  }): Promise<{ txHash: string; submissionId: string } | null>;
  approveSubmission(task: TaskDetailView, submissionId: string): Promise<{ txHash: string } | null>;
  rejectSubmission(task: TaskDetailView, submissionId: string): Promise<{ txHash: string } | null>;
  finalizeReview?(input: {
    task: TaskDetailView;
    submissionId: string;
    requestedOutcome: "accepted" | "rejected" | "disputed" | "unresolved";
    consensusScore: number;
    validatorAgreement: number;
    consensusConfidence: number;
    evaluationHash: string;
  }): Promise<{ txHash: string } | null>;
  appealTask?(task: TaskDetailView, reasonHash: string): Promise<{ txHash: string } | null>;
  cancelTask(task: TaskDetailView): Promise<{ txHash: string } | null>;
};

type OnchainAwareTaskDetail = TaskDetailView & {
  latestCreateTxHash?: string | null;
  latestFundTxHash?: string | null;
  latestAssignTxHash?: string | null;
  latestSubmissionId?: string | null;
  latestSubmissionTxHash?: string | null;
  erc8183Job?: Erc8183Job | null;
};

export class TaskMarketService {
  private readonly erc8183: Erc8183AdapterService;
  private readonly demoFundingFallbackEnabled = process.env.DISPATCH_ENABLE_DEMO_FUNDING_FALLBACK === "true";
  private executionEngine: {
    dispatchTask(taskId: string, agentId: string): Promise<unknown>;
    requestImproveAgain?(taskId: string, agentId: string, refinementContext: PlatformRefinementContext): Promise<unknown>;
  } | null = null;
  private chainBridge: TaskMarketChainBridge | null = null;

  constructor(
    private readonly store: InMemoryRegistryStore,
    private readonly registryService: AgentRegistryService,
    private readonly evaluatorClient: EvaluatorClient,
    private readonly safetyService: SafetyService,
  ) {
    this.erc8183 = new Erc8183AdapterService(store);
  }

  attachExecutionEngine(engine: { dispatchTask(taskId: string, agentId: string): Promise<unknown> }) {
    this.executionEngine = engine;
  }

  attachChainBridge(bridge: TaskMarketChainBridge) {
    this.chainBridge = bridge;
  }

  createTaskDraft(input: TaskCreateRequest): TaskDraftCreateResponse {
    this.safetyService.evaluateTaskCreation(input.creatorWallet, input.title, input.description);
    const task = this.buildTaskDetail(input, "pending_wallet");
    this.store.tasks.set(task.taskId, task);
    return taskDraftCreateResponseSchema.parse({ task });
  }

  createTask(input: TaskCreateRequest): TaskCreateResponse {
    this.safetyService.evaluateTaskCreation(input.creatorWallet, input.title, input.description);
    const detail = this.buildTaskDetail(input, "pending_chain");
    const taskId = detail.taskId;
    this.store.tasks.set(taskId, detail);

    const rollbackToken = makeId("rollback");
    if (this.demoFundingFallbackEnabled) {
      // Demo fallback keeps local/manual environments usable without pretending browser-signed funding
      // was actually confirmed onchain. Production/testnet flows should confirm via receipts instead.
      setTimeout(() => {
        const current = this.store.tasks.get(taskId);
        if (!current || current.transactionState !== "pending_chain") return;
        current.transactionState = "accepted";
        this.transitionTask(current, "ESCROW_FUNDED");
        current.status = "ESCROW_FUNDED";
        this.transitionTask(current, "OPEN");
        current.status = "OPEN";
        if (input.hiringMode === "direct_hire") {
          this.transitionTask(current, "ASSIGNED");
          current.status = "ASSIGNED";
        }
        current.onchainTaskRef = `demo:${taskId}`;
        current.updatedAt = new Date().toISOString();
        current.timeline.push(
          this.timeline("escrow_funded", "Demo funding fallback enabled", "Demo/testnet fallback advanced this task without a confirmed Arc funding receipt."),
        );
        if (input.hiringMode === "direct_hire" && input.selectedAgentId) {
          current.timeline.push(
            this.timeline("agent_invited", "Demo assignment fallback enabled", "Demo/testnet fallback assigned the selected agent before a confirmed onchain receipt."),
          );
        }
        current.reviewActions = ["cancel"];
        current.erc8183Job = this.erc8183.syncWithTask(current, {
          providerAgentId: current.selectedAgentId,
          evaluator: current.creatorWallet,
        });
        this.store.tasks.set(taskId, current);
        void this.maybeAutoDispatchPlatformAgent(taskId);
      }, 1200);
    }

    return taskCreateResponseSchema.parse({
      task: detail,
      rollbackToken,
    });
  }

  syncTaskWithChain(taskId: string, payload: TaskChainSyncRequest) {
    const task = this.getTask(taskId);
    const createTxHash = payload.createTxHash ?? null;
    const fundTxHash = payload.fundTxHash ?? null;
    const assignTxHash = payload.assignTxHash ?? null;
    const txHashesChanged =
      task.latestCreateTxHash !== createTxHash
      || task.latestFundTxHash !== fundTxHash
      || task.latestAssignTxHash !== assignTxHash;
    task.latestCreateTxHash = createTxHash;
    task.latestFundTxHash = fundTxHash;
    task.latestAssignTxHash = assignTxHash;
    if (txHashesChanged) {
      const parts = [
        createTxHash ? `create: ${createTxHash.slice(0, 12)}...` : null,
        fundTxHash ? `fund: ${fundTxHash.slice(0, 12)}...` : null,
        assignTxHash ? `assign: ${assignTxHash.slice(0, 12)}...` : null,
      ].filter(Boolean);
      if (parts.length > 0) {
        task.timeline.push(
          this.timeline(
            "escrow_pending",
            "Browser transaction trace captured",
            `Captured wallet transaction hashes for this task: ${parts.join(" | ")}.`,
          ),
        );
      }
    }
    const receiptAccepted = this.isAcceptedReceipt(payload.latestReceipt);
    const fundingAnchored =
      receiptAccepted
      && (
        payload.latestReceipt.hash === payload.fundTxHash
        || (payload.assignTxHash ? payload.latestReceipt.hash === payload.assignTxHash : false)
      );
    const assignAnchored =
      receiptAccepted
      && Boolean(payload.assignTxHash)
      && payload.latestReceipt.hash === payload.assignTxHash;
    this.applyChainReceipt(task, payload.latestReceipt, payload.onchainTaskRef ?? null, { fundingAnchored, assignAnchored });
    if (payload.latestReceipt.status === "FAILED" || payload.latestReceipt.status === "UNDETERMINED") {
      if (!this.hasTimelineKind(task, "execution_failed")) {
        task.timeline.push(
          this.timeline(
            "execution_failed",
            payload.latestReceipt.status === "FAILED" ? "Onchain funding failed" : "Onchain funding undetermined",
            `Latest onchain receipt is ${payload.latestReceipt.status}. The task remains offchain only until the write is retried.`,
          ),
        );
      }
    } else if (!fundingAnchored) {
      task.transactionState = "pending_chain";
      if (!this.hasTimelineKind(task, "escrow_pending")) {
        task.timeline.push(
          this.timeline(
            "escrow_pending",
            "Funding still pending",
            "Task creation was accepted, but funding has not been confirmed yet. The task will stay pending until fund_task succeeds.",
          ),
        );
      }
    } else {
      if (!this.hasTimelineKind(task, "escrow_funded")) {
        task.timeline.push(
          this.timeline(
            "escrow_funded",
            payload.latestReceipt.finalized ? "Onchain task finalized" : "Onchain task accepted",
            `Latest onchain receipt is ${payload.latestReceipt.status}. Offchain and onchain records are now synchronized.`,
          ),
        );
      }
    }
    if (payload.assignTxHash && task.hiringMode === "direct_hire" && task.selectedAgentId && !this.hasTimelineKind(task, "agent_invited")) {
      task.timeline.push(this.timeline("agent_invited", "Agent invited", "The selected agent was assigned through the onchain flow."));
    }
    this.store.tasks.set(taskId, task);
    void this.maybeAutoDispatchPlatformAgent(taskId);
    return {
      task,
      syncedReceipt: payload.latestReceipt,
    };
  }

  recordBrowserTxTrace(taskId: string, payload: {
    createTxHash?: string | null;
    fundTxHash?: string | null;
    assignTxHash?: string | null;
  }) {
    const task = this.getTask(taskId) as OnchainAwareTaskDetail;
    const createTxHash = payload.createTxHash ?? task.latestCreateTxHash ?? null;
    const fundTxHash = payload.fundTxHash ?? task.latestFundTxHash ?? null;
    const assignTxHash = payload.assignTxHash ?? task.latestAssignTxHash ?? null;
    const changed =
      task.latestCreateTxHash !== createTxHash
      || task.latestFundTxHash !== fundTxHash
      || task.latestAssignTxHash !== assignTxHash;

    task.latestCreateTxHash = createTxHash;
    task.latestFundTxHash = fundTxHash;
    task.latestAssignTxHash = assignTxHash;
    if ((createTxHash || fundTxHash || assignTxHash) && task.transactionState === "pending_wallet") {
      task.transactionState = "pending_chain";
    }
    if (changed) {
      const parts = [
        createTxHash ? `create: ${createTxHash.slice(0, 12)}...` : null,
        fundTxHash ? `fund: ${fundTxHash.slice(0, 12)}...` : null,
        assignTxHash ? `assign: ${assignTxHash.slice(0, 12)}...` : null,
      ].filter(Boolean);
      if (parts.length > 0) {
        task.timeline.push(
          this.timeline(
            "escrow_pending",
            "Browser transaction trace captured",
            `Captured wallet transaction hashes for this task: ${parts.join(" | ")}.`,
          ),
        );
      }
      task.updatedAt = new Date().toISOString();
      this.store.tasks.set(taskId, task);
    }
    return task;
  }

  listTasks(viewerWallet: string): TaskListResponse {
    const all = [...this.store.tasks.values()];
    const myAgentIds = [...this.store.agents.values()]
      .filter((agent) => agent.profile.ownerWallet === viewerWallet)
      .map((agent) => agent.profile.agentId);

    const toSummary = (task: TaskDetailView): TaskSummaryView => {
      const current = this.hydrateDerivedTaskState(task);
      return taskSummaryViewSchema.parse({
        taskId: current.taskId,
        title: current.title,
        category: current.category,
        rewardAmount: current.rewardAmount,
        deadline: current.deadline,
        status: current.status,
        resultStatus: current.resultStatus,
        creatorWallet: current.creatorWallet,
        selectedAgentId: current.selectedAgentId,
        participatingAgentIds: current.participatingAgentIds,
        maxParticipants: current.maxParticipants,
        transactionState: current.transactionState,
        onchainTaskRef: current.onchainTaskRef,
        settlementSummary: current.settlementSummary,
        createdAt: current.createdAt,
        updatedAt: current.updatedAt,
      });
    };

    return taskListResponseSchema.parse({
      allOpenTasks: all.filter((task) => task.status === "OPEN").map(toSummary),
      myPostedTasks: all.filter((task) => task.creatorWallet === viewerWallet).map(toSummary),
      tasksAssignedToMyAgents: all
        .filter((task) => task.participatingAgentIds.some((agentId) => myAgentIds.includes(agentId)))
        .map(toSummary),
      activeTasks: all
        .filter((task) => ["OPEN", "ASSIGNED", "EXECUTING", "SUBMITTED", "UNDER_REVIEW", "DISPUTED", "APPEALED", "UNRESOLVED"].includes(task.status))
        .map(toSummary),
      completedTasks: all.filter((task) => ["SETTLED", "APPROVED"].includes(task.status)).map(toSummary),
      rejectedTasks: all.filter((task) => task.status === "REJECTED").map(toSummary),
      disputedTasks: all.filter((task) => ["DISPUTED", "APPEALED", "UNRESOLVED"].includes(task.status)).map(toSummary),
    });
  }

  getTask(taskId: string): TaskDetailView {
    const task = this.store.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    task.erc8183Job = this.erc8183.syncWithTask(task);
    return this.hydrateDerivedTaskState(task);
  }

  recoverTaskFromOnchain(taskId: string, onchainTask: unknown, onchainTaskRef: string | null) {
    const existing = this.store.tasks.get(taskId);
    if (existing) {
      return this.reconcileTaskFromOnchain(taskId, onchainTask, onchainTaskRef);
    }

    const normalized = this.normalizeOnchainSnapshot(onchainTask);
    if (!normalized) {
      throw new Error(`Task ${taskId} could not be recovered from Arc state`);
    }

    const matchedAgent = normalized.assignedAgentOnchainId
      ? this.registryService
          .listAgents()
          .find((agent) => agent.profile.onchainAgentId === normalized.assignedAgentOnchainId)
      : null;
    const selectedAgentId = matchedAgent?.profile.agentId ?? null;
    const selectedAgents = matchedAgent
      ? [{
          agentId: matchedAgent.profile.agentId,
          displayName: matchedAgent.profile.publicName,
          originType: matchedAgent.profile.originType,
        }]
      : [];

    const recovered: OnchainAwareTaskDetail = {
      taskId,
      title: `Recovered task ${taskId.slice(-6)}`,
      description: "This task was reconstructed from live Arc contract state after a router restart. Review and settlement actions remain available.",
      category: matchedAgent?.profile.category ?? "research",
      rewardAmount: Number(this.formatRewardAmount(normalized.rewardAmount)),
      deadline: new Date(Number(normalized.deadlineTimestamp) * 1000).toISOString(),
      status: "CREATED",
      resultStatus: "not_started",
      creatorWallet: normalized.creatorWallet.toLowerCase(),
      creatorDisplay: this.maskWallet(normalized.creatorWallet),
      selectedAgentId,
      participatingAgentIds: selectedAgentId ? [selectedAgentId] : [],
      maxParticipants: 1,
      transactionState: "accepted",
      onchainTaskRef,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [],
      evaluationPreference: "hybrid_review",
      structuredNotes: normalized.latestResultUri
        ? `Recovered from Arc. Latest result pointer: ${normalized.latestResultUri}`
        : "Recovered from Arc contract state.",
      hiringMode: selectedAgentId ? "direct_hire" : "open_market",
      timeline: [
        this.timeline(
          "task_created",
          "Recovered from Arc",
          "Dispatch rebuilt this task from live Arc contract state after the router lost its local snapshot.",
        ),
      ],
      selectedAgents,
      reviewActions: [],
      latestCreateTxHash: null,
      latestFundTxHash: null,
      latestAssignTxHash: null,
      latestEvaluation: null,
      userReview: null,
      latestSubmissionId: normalized.latestSubmissionId || null,
      latestSubmissionTxHash: null,
      settlementState: "reward_funded",
      latestSettlement: null,
      disputeRecord: null,
      appealRecord: null,
    };

    this.store.tasks.set(taskId, recovered);
    recovered.erc8183Job = this.erc8183.ensureForTask(recovered, {
      providerAgentId: recovered.selectedAgentId,
      evaluator: recovered.creatorWallet,
    });
    return this.reconcileTaskFromOnchain(taskId, onchainTask, onchainTaskRef);
  }

  async refreshTaskFromChain(taskId: string) {
    if (!this.chainBridge?.readTaskState) {
      return this.getTask(taskId);
    }
    try {
      const payload = await this.chainBridge.readTaskState(taskId);
      if (payload?.onchainTask) {
        if (this.store.tasks.has(taskId)) {
          return this.reconcileTaskFromOnchain(taskId, payload.onchainTask, payload.onchainTaskRef);
        }
        return this.recoverTaskFromOnchain(taskId, payload.onchainTask, payload.onchainTaskRef);
      }
    } catch {
      // Best-effort refresh only. Action handlers still validate local state below.
    }
    return this.getTask(taskId);
  }

  reconcileTaskFromOnchain(taskId: string, onchainTask: unknown, onchainTaskRef: string | null) {
    const task = this.getTask(taskId) as OnchainAwareTaskDetail;
    const normalized = this.normalizeOnchainSnapshot(onchainTask);
    if (!normalized) return task;

    const escrowLocked = normalized.escrowLocked;
    const stateName = normalized.stateName;
    const assignedAgent = normalized.assignedAgentOnchainId;
    const submissionId = normalized.latestSubmissionId;

    task.onchainTaskRef = onchainTaskRef ?? task.onchainTaskRef ?? null;
    task.transactionState = ["FAILED", "UNDETERMINED"].includes(task.transactionState) ? task.transactionState : "accepted";

    if (submissionId && task.latestSubmissionId !== submissionId) {
      task.latestSubmissionId = submissionId;
    }

    if (assignedAgent && task.hiringMode === "direct_hire" && !task.selectedAgentId) {
      task.selectedAgentId = task.selectedAgentId ?? null;
    }

    const previousStatus = task.status;
    const previousSettlementState = task.settlementState;
    const previousResultStatus = task.resultStatus;

    switch (stateName) {
      case "CREATED":
        task.status = "CREATED";
        task.resultStatus = "not_started";
        task.reviewActions = [];
        break;
      case "ESCROW_FUNDED":
      case "OPEN":
        task.status = "OPEN";
        task.resultStatus = "not_started";
        task.settlementState = escrowLocked > 0n ? "reward_funded" : task.settlementState;
        task.reviewActions = ["cancel"];
        break;
      case "ASSIGNED":
        task.status = "ASSIGNED";
        task.resultStatus = "not_started";
        task.settlementState = escrowLocked > 0n ? "reward_funded" : task.settlementState;
        task.reviewActions = ["cancel"];
        break;
      case "EXECUTING":
        task.status = "EXECUTING";
        task.resultStatus = "in_progress";
        task.settlementState = escrowLocked > 0n ? "reward_funded" : task.settlementState;
        task.reviewActions = [];
        break;
      case "SUBMITTED":
        task.status = "SUBMITTED";
        task.resultStatus = "submitted";
        task.settlementState = escrowLocked > 0n ? "reward_funded" : task.settlementState;
        task.reviewActions = ["approve", "reject", "dispute"];
        break;
      case "UNDER_REVIEW":
        task.status = "UNDER_REVIEW";
        task.resultStatus = "submitted";
        task.settlementState = escrowLocked > 0n ? "reward_funded" : task.settlementState;
        task.reviewActions = ["approve", "reject", "dispute"];
        break;
      case "APPROVED":
        task.status = "APPROVED";
        task.resultStatus = "approved";
        task.settlementState = "pending_settlement";
        task.reviewActions = ["settle"];
        break;
      case "REJECTED":
        task.status = "REJECTED";
        task.resultStatus = "rejected";
        task.settlementState = "pending_settlement";
        task.reviewActions = ["refund", "dispute", "appeal"];
        break;
      case "DISPUTED":
        task.status = "DISPUTED";
        task.resultStatus = "disputed";
        task.settlementState = "disputed";
        task.reviewActions = ["appeal"];
        break;
      case "APPEALED":
        task.status = "APPEALED";
        task.resultStatus = "appealed";
        task.settlementState = "unresolved";
        task.reviewActions = [];
        break;
      case "UNRESOLVED":
        task.status = "UNRESOLVED";
        task.resultStatus = "unresolved";
        task.settlementState = "unresolved";
        task.reviewActions = ["appeal"];
        break;
      case "SETTLED":
        task.status = "SETTLED";
        task.resultStatus = "settled";
        task.settlementState = "settled";
        task.reviewActions = [];
        break;
      case "CANCELLED":
        task.status = "CANCELLED";
        task.settlementState = "pending_settlement";
        task.reviewActions = ["refund"];
        break;
      case "REFUNDED":
        task.status = "REFUNDED";
        task.settlementState = "refunded";
        task.reviewActions = [];
        break;
      default:
        if (escrowLocked <= 0n) {
          return task;
        }
        break;
    }

    if (!this.hasTimelineKind(task, "escrow_funded")) {
      task.timeline.push(
        this.timeline(
          "escrow_funded",
          "Funding recovered from onchain state",
          "The marketplace reconciled this task from live Arc contract state after wallet signing.",
        ),
      );
    }
    if (previousStatus !== task.status || previousSettlementState !== task.settlementState || previousResultStatus !== task.resultStatus) {
      task.timeline.push(
        this.timeline(
          "review_started",
          "Task state synchronized from Arc",
          `Dispatch refreshed this task from the live Arc contract state (${stateName || "unknown"}).`,
        ),
      );
    }
    task.updatedAt = new Date().toISOString();
    task.erc8183Job = this.erc8183.syncWithTask(task, {
      providerAgentId: task.selectedAgentId,
      evaluator: task.creatorWallet,
    });
    this.store.tasks.set(taskId, task);
    return task;
  }

  reconcileTaskFromExternalReceipts(taskId: string, options: {
    fundingConfirmed?: boolean;
    assignmentConfirmed?: boolean;
  }) {
    const task = this.getTask(taskId) as OnchainAwareTaskDetail;
    let changed = false;

    if (options.fundingConfirmed) {
      task.transactionState = "accepted";
      task.onchainTaskRef = task.onchainTaskRef ?? `pending-onchain:${taskId}`;
      if (task.status === "CREATED") {
        this.transitionTask(task, "ESCROW_FUNDED");
        task.status = "ESCROW_FUNDED";
        this.transitionTask(task, "OPEN");
        task.status = "OPEN";
      }
      if (!this.hasTimelineKind(task, "escrow_funded")) {
        task.timeline.push(
          this.timeline(
            "escrow_funded",
            "Funding confirmed from wallet transaction",
            "The marketplace confirmed task funding from the signed browser transaction receipt.",
          ),
        );
      }
      changed = true;
    }

    if (options.assignmentConfirmed && task.hiringMode === "direct_hire" && ["OPEN", "CREATED", "ESCROW_FUNDED"].includes(task.status)) {
      this.transitionTask(task, "ASSIGNED");
      task.status = "ASSIGNED";
      if (!this.hasTimelineKind(task, "agent_invited")) {
        task.timeline.push(
          this.timeline(
            "agent_invited",
            "Assignment confirmed from wallet transaction",
            "The direct-hire assignment was confirmed from the signed browser transaction receipt.",
          ),
        );
      }
      changed = true;
    }

    if (changed) {
      task.updatedAt = new Date().toISOString();
      this.store.tasks.set(taskId, task);
      void this.maybeAutoDispatchPlatformAgent(taskId);
    }
    return task;
  }

  reconcileTaskFromCapturedTrace(taskId: string) {
    const task = this.getTask(taskId) as OnchainAwareTaskDetail;
    if (!["pending_wallet", "pending_chain"].includes(task.transactionState)) {
      return task;
    }
    if (!this.demoFundingFallbackEnabled) {
      return task;
    }

    const createdAgeMs = Date.now() - new Date(task.createdAt).getTime();
    const hasFundingTrace = Boolean(task.latestFundTxHash);
    const hasAssignmentTrace = Boolean(task.latestAssignTxHash);
    const matureEnough = Number.isFinite(createdAgeMs) && createdAgeMs >= 15000;
    if (!hasFundingTrace || !matureEnough) {
      return task;
    }

    return this.reconcileTaskFromExternalReceipts(taskId, {
      fundingConfirmed: true,
      assignmentConfirmed: task.hiringMode === "direct_hire" ? hasAssignmentTrace : false,
    });
  }

  async acceptTask(taskId: string, actorWallet: string): Promise<TaskActionResponse> {
    await this.refreshTaskFromChain(taskId);
    const task = this.getTask(taskId);
    this.assertNotPaused(taskId);
    this.assertTaskFunded(task, "Task must be funded before assignment.");
    if (task.status !== "OPEN" && task.status !== "ASSIGNED") {
      throw new Error("Task cannot be accepted in its current state");
    }
    if (task.hiringMode === "open_market" && task.participatingAgentIds.length >= task.maxParticipants) {
      throw new Error("This open market task has already reached its participant cap");
    }
    const ownedAgents = [...this.store.agents.values()].filter((agent) => agent.profile.ownerWallet === actorWallet);
    if (ownedAgents.length === 0) {
      throw new Error("No agents are owned by this wallet");
    }
    const agent =
      task.hiringMode === "direct_hire" && task.selectedAgentId
        ? ownedAgents.find((item) => item.profile.agentId === task.selectedAgentId)?.profile
        : ownedAgents[0].profile;
    if (!agent) {
      throw new Error("This wallet does not control the agent selected for direct hire");
    }
    if (!task.participatingAgentIds.includes(agent.agentId)) {
      task.participatingAgentIds.push(agent.agentId);
    }
    const agentView = this.registryService.getAgent(agent.agentId);
    if (task.status === "OPEN") {
      if (this.chainBridge && task.hiringMode === "open_market") {
        await this.chainBridge.assignTask(task, agentView);
      }
      this.transitionTask(task, "ASSIGNED");
      task.status = "ASSIGNED";
    }
    task.selectedAgents = dedupeAgents([...task.selectedAgents, this.getAgentLite(agent.agentId)]);
    task.resultStatus = "not_started";
    task.updatedAt = new Date().toISOString();
    task.timeline.push(this.timeline("agent_accepted", "Agent accepted task", `${agent.publicName} accepted the assignment and is queued to execute.`));
    task.reviewActions = ["cancel"];
    this.store.tasks.set(taskId, task);
    if (this.executionEngine) {
      try {
        await this.executionEngine.dispatchTask(taskId, agent.agentId);
      } catch (error) {
        this.markExecutionFailed(taskId, agent.agentId, error instanceof Error ? error.message : "Execution dispatch failed");
        throw error;
      }
    }
    return taskActionResponseSchema.parse({ task });
  }

  async approveTask(taskId: string, actorWallet: string, submissionId?: string | null): Promise<TaskActionResponse> {
    this.assertNotPaused(taskId);
    await this.refreshTaskFromChain(taskId);
    const task = this.requireCreatorTask(taskId, actorWallet) as OnchainAwareTaskDetail;
    this.assertTaskFunded(task, "Task must be funded before review approval.");
    if (!["SUBMITTED", "UNDER_REVIEW"].includes(task.status)) {
      throw new Error("Only submitted work can be approved");
    }
    const resolvedSubmissionId = submissionId ?? task.latestSubmissionId;
    if (!resolvedSubmissionId) {
      throw new Error("Task is missing a recorded submission ID");
    }
    if (this.chainBridge) {
      const chainReceipt = await this.chainBridge.approveSubmission(task, resolvedSubmissionId);
      if (chainReceipt?.txHash) {
        task.timeline.push(this.timeline("review_started", "Onchain approval recorded", `approve_submission accepted with tx ${chainReceipt.txHash.slice(0, 12)}...`));
      }
    }
    this.transitionTask(task, "APPROVED");
    task.status = "APPROVED";
    task.resultStatus = "approved";
    task.settlementState = "pending_settlement";
    task.updatedAt = new Date().toISOString();
    task.timeline.push(this.timeline("approved", "Submission approved", "The submission passed review and is ready for settlement."));
    task.reviewActions = ["settle"];
    task.erc8183Job = this.erc8183.syncWithTask(task, {
      providerAgentId: task.selectedAgentId,
      evaluator: task.creatorWallet,
    });
    this.store.tasks.set(taskId, task);
    this.annotateLatestRun(taskId, { reviewOutcome: "approve" });
    return taskActionResponseSchema.parse({ task });
  }

  async reviewWithUser(taskId: string, submissionId: string, review: UserReviewDecision): Promise<TaskActionResponse> {
    this.assertNotPaused(taskId);
    await this.refreshTaskFromChain(taskId);
    const task = this.requireCreatorTask(taskId, review.reviewerWallet);
    this.assertTaskFunded(task, "Task must be funded before evaluator review.");
    if (!["SUBMITTED", "UNDER_REVIEW"].includes(task.status)) {
      throw new Error("User review requires a submitted result");
    }
    const request = this.buildEvaluationRequest(task, submissionId, "user_review");
    // Manual buyer decisions are authoritative after the existing ownership,
    // funded-state, and submission checks. Evaluator availability must not block them.
    const result = buildLocalUserReviewEvaluation(request, review);
    const normalizedResult = this.normalizeEvaluationResult(task, submissionId, result);
    task.userReview = review;
    task.latestEvaluation = normalizedResult;
    task.timeline.push(this.timeline("review_started", "User review recorded", review.decision === "approve" ? "The buyer approved the submission." : "The buyer rejected the submission."));
    this.store.tasks.set(taskId, task);
    return review.decision === "approve"
      ? this.approveTask(taskId, review.reviewerWallet, submissionId)
      : this.rejectTask(taskId, review.reviewerWallet, submissionId);
  }

  async reviewAssisted(taskId: string, actorWallet: string, submissionId: string): Promise<TaskActionResponse> {
    this.assertNotPaused(taskId);
    await this.refreshTaskFromChain(taskId);
    const task = this.requireCreatorTask(taskId, actorWallet);
    this.assertTaskFunded(task, "Task must be funded before evaluator review.");
    if (!["SUBMITTED", "UNDER_REVIEW"].includes(task.status)) {
      throw new Error("Assisted evaluation requires a submitted result");
    }
    const result = await this.runAdvisoryReview(task, submissionId, "assisted_evaluation");
    return this.applyAdvisoryReview(taskId, actorWallet, submissionId, result, "Assisted evaluation");
  }

  async reviewHybrid(taskId: string, actorWallet: string, submissionId: string): Promise<TaskActionResponse> {
    this.assertNotPaused(taskId);
    await this.refreshTaskFromChain(taskId);
    const task = this.requireCreatorTask(taskId, actorWallet);
    this.assertTaskFunded(task, "Task must be funded before evaluator review.");
    if (!["SUBMITTED", "UNDER_REVIEW"].includes(task.status)) {
      throw new Error("Hybrid review requires a submitted result");
    }
    const result = await this.runAdvisoryReview(task, submissionId, "hybrid_review");
    return this.applyAdvisoryReview(taskId, actorWallet, submissionId, result, "Hybrid evaluation");
  }

  async confirmHybrid(taskId: string, actorWallet: string, evaluationId: string, confirmDecision: "approve" | "reject", feedback: string | null): Promise<TaskActionResponse> {
    this.assertNotPaused(taskId);
    await this.refreshTaskFromChain(taskId);
    const task = this.requireCreatorTask(taskId, actorWallet) as OnchainAwareTaskDetail;
    if (task.latestEvaluation?.evaluationId !== evaluationId) {
      throw new Error("Hybrid confirmation must target the task's latest evaluation");
    }
    const resolvedSubmissionId = task.latestEvaluation?.winningSubmissionId ?? task.latestSubmissionId;
    if (!resolvedSubmissionId) {
      throw new Error("Hybrid confirmation requires a recorded submission ID");
    }
    await this.evaluatorClient.confirmHybrid({
      evaluationId,
      reviewerWallet: actorWallet,
      confirmDecision,
      feedback,
    });
    return confirmDecision === "approve"
      ? this.approveTask(taskId, actorWallet, resolvedSubmissionId)
      : this.rejectTask(taskId, actorWallet, resolvedSubmissionId);
  }

  async rejectTask(taskId: string, actorWallet: string, submissionId?: string | null): Promise<TaskActionResponse> {
    this.assertNotPaused(taskId);
    await this.refreshTaskFromChain(taskId);
    const task = this.requireCreatorTask(taskId, actorWallet) as OnchainAwareTaskDetail;
    this.assertTaskFunded(task, "Task must be funded before review rejection.");
    if (!["SUBMITTED", "UNDER_REVIEW"].includes(task.status)) {
      throw new Error("Only submitted work can be rejected");
    }
    const resolvedSubmissionId = submissionId ?? task.latestSubmissionId;
    if (!resolvedSubmissionId) {
      throw new Error("Task is missing a recorded submission ID");
    }
    if (this.chainBridge) {
      const chainReceipt = await this.chainBridge.rejectSubmission(task, resolvedSubmissionId);
      if (chainReceipt?.txHash) {
        task.timeline.push(this.timeline("review_started", "Onchain rejection recorded", `reject_submission accepted with tx ${chainReceipt.txHash.slice(0, 12)}...`));
      }
    }
    this.transitionTask(task, "REJECTED");
    task.status = "REJECTED";
    task.resultStatus = "rejected";
    task.settlementState = "pending_settlement";
    task.updatedAt = new Date().toISOString();
    task.timeline.push(this.timeline("rejected", "Submission rejected", "The buyer rejected the current output and can now refund or dispute."));
    task.reviewActions = ["refund", "dispute", "appeal"];
    task.erc8183Job = this.erc8183.syncWithTask(task, {
      providerAgentId: task.selectedAgentId,
      evaluator: task.creatorWallet,
    });
    this.store.tasks.set(taskId, task);
    this.annotateLatestRun(taskId, { reviewOutcome: "reject" });
    return taskActionResponseSchema.parse({ task });
  }

  async appealTask(taskId: string, actorWallet: string, reason: string): Promise<TaskActionResponse> {
    this.assertNotPaused(taskId);
    await this.refreshTaskFromChain(taskId);
    const task = this.requireCreatorTask(taskId, actorWallet);
    this.assertTaskFunded(task, "Task must be funded before appeal.");
    if (!["DISPUTED", "REJECTED", "UNRESOLVED"].includes(task.status)) {
      throw new Error("Appeal is only available for disputed, rejected, or unresolved tasks");
    }
    const submissionId = task.latestSubmissionId;
    if (!submissionId) {
      throw new Error("Appeal requires a recorded submission");
    }
    const appealRound = (task.appealRecord?.appealRound ?? 0) + 1;
    if (task.status !== "APPEALED") {
      this.transitionTask(task, "APPEALED", { allowDisputeBypass: task.status === "DISPUTED" });
      task.status = "APPEALED";
    }
    task.resultStatus = "appealed";
    task.settlementState = "unresolved";
    task.appealRecord = {
      appealId: task.appealRecord?.appealId ?? makeId("appeal"),
      appealRound,
      reason,
      openedByWallet: actorWallet,
      openedAt: new Date().toISOString(),
      resolvedAt: null,
      resolutionOutcome: null,
    };
    task.reviewActions = [];
    task.updatedAt = new Date().toISOString();
    task.timeline.push(this.timeline("appeal_opened", `Appeal round ${appealRound} opened`, reason));
    task.erc8183Job = this.erc8183.syncWithTask(task, {
      providerAgentId: task.selectedAgentId,
      evaluator: task.creatorWallet,
    });
    this.store.tasks.set(taskId, task);
    if (this.chainBridge?.appealTask) {
      const appealReceipt = await this.chainBridge.appealTask(task, `appeal:${appealRound}:${reason.slice(0, 48)}`);
      if (appealReceipt?.txHash) {
        task.timeline.push(this.timeline("review_started", "Onchain appeal recorded", `appeal_task accepted with tx ${appealReceipt.txHash.slice(0, 12)}...`));
      }
    }

    const result = await this.runConsensusReview(task, submissionId, "subjective_consensus", appealRound);
    return this.applyConsensusOutcome(taskId, actorWallet, submissionId, result, `Appeal round ${appealRound}`);
  }

  async requestImproveAgain(taskId: string, actorWallet: string): Promise<TaskActionResponse> {
    this.assertNotPaused(taskId);
    await this.refreshTaskFromChain(taskId);
    const task = this.requireCreatorTask(taskId, actorWallet);
    this.assertTaskFunded(task, "Task must be funded before execution.");
    if (!["SUBMITTED", "UNDER_REVIEW", "REJECTED"].includes(task.status)) {
      throw new Error("Improve Again is only available after a platform agent has submitted work and before final settlement");
    }
    if (/^0x[a-f0-9]{40}:/i.test(String((task as OnchainAwareTaskDetail).onchainTaskRef || ""))) {
      throw new Error("Improve Again is disabled for live Arc-submitted tasks because the current contract cannot safely reopen execution after submission.");
    }
    if (!this.executionEngine?.requestImproveAgain) {
      throw new Error("Execution engine does not support Improve Again");
    }

    const platformRun = this.getLatestPlatformRun(taskId);
    if (!platformRun) {
      throw new Error("No completed platform-agent run was found for this task");
    }

    const agentView = this.registryService.getAgent(platformRun.agentId);
    if (agentView.profile.originType !== "platform" || agentView.profile.endpointUrl) {
      throw new Error("Improve Again is only available for built-in platform agents");
    }

    const previousStatus = task.status;
    const previousResultStatus = task.resultStatus;
    const refinementContext = this.buildRefinementContext(platformRun, actorWallet);
    this.transitionTask(task, "EXECUTING", { allowPlatformRefinement: true });
    task.status = "EXECUTING";
    task.resultStatus = "in_progress";
    task.latestEvaluation = null;
    task.userReview = null;
    task.updatedAt = new Date().toISOString();
    task.reviewActions = ["cancel"];
    task.timeline.push(
      this.timeline(
        "execution_started",
        "Improve Again requested",
        `${agentView.profile.publicName} is running a controlled refinement pass using the prior marketplace evaluation trace.`,
      ),
    );
    this.store.tasks.set(taskId, task);
    this.annotateRun(platformRun.runId, {
      reviewOutcome: "needs_human_review",
      refinementRequestedAt: new Date().toISOString(),
      refinementRequestedBy: actorWallet,
    });

    try {
      await this.executionEngine.requestImproveAgain(taskId, platformRun.agentId, refinementContext);
    } catch (error) {
      task.status = previousStatus;
      task.resultStatus = previousResultStatus;
      task.updatedAt = new Date().toISOString();
      task.reviewActions = previousStatus === "REJECTED" ? ["refund", "dispute"] : ["approve", "reject", "dispute"];
      task.timeline.push(
        this.timeline(
          "execution_failed",
          "Improve Again failed",
          error instanceof Error ? error.message : "Improve Again dispatch failed",
        ),
      );
      this.store.tasks.set(taskId, task);
      throw error;
    }

    return taskActionResponseSchema.parse({ task });
  }

  async cancelTask(taskId: string, actorWallet: string): Promise<TaskActionResponse> {
    this.assertNotPaused(taskId);
    await this.refreshTaskFromChain(taskId);
    const task = this.requireCreatorTask(taskId, actorWallet);
    this.assertTaskFunded(task, "Only funded tasks awaiting execution can be cancelled");
    if (!["OPEN", "ASSIGNED"].includes(task.status)) {
      throw new Error("Only funded tasks awaiting execution can be cancelled");
    }
    if (task.resultStatus !== "not_started") {
      throw new Error("Task can only be cancelled before execution begins");
    }

    if (this.chainBridge) {
      const chainReceipt = await this.chainBridge.cancelTask(task);
      if (chainReceipt?.txHash) {
        task.timeline.push(
          this.timeline(
            "cancelled",
            "Onchain cancellation recorded",
            `cancel_task accepted with tx ${chainReceipt.txHash.slice(0, 12)}...`,
          ),
        );
      }
    }
    this.transitionTask(task, "CANCELLED");
    task.status = "CANCELLED";
    task.settlementState = "pending_settlement";
    task.updatedAt = new Date().toISOString();
    task.timeline.push(
      this.timeline(
        "cancelled",
        "Task cancelled",
        "The buyer cancelled the task before execution began. Refund can now be processed.",
      ),
    );
    task.reviewActions = ["refund"];
    this.store.tasks.set(taskId, task);
    return taskActionResponseSchema.parse({ task });
  }

  disputeTask(taskId: string, actorWallet: string): TaskActionResponse {
    void taskId;
    void actorWallet;
    throw new Error("Use the settlement service dispute endpoint so payout pause and receipts stay consistent");
  }

  settleTask(taskId: string, actorWallet: string): TaskActionResponse {
    void taskId;
    void actorWallet;
    throw new Error("Use the settlement service payout endpoint so fees, receipts, and double-settlement guards stay consistent");
  }

  refundTask(taskId: string, actorWallet: string): TaskActionResponse {
    void taskId;
    void actorWallet;
    throw new Error("Use the settlement service refund endpoint so receipts and payout safety stay consistent");
  }

  async markExecutionStarted(taskId: string, agentId: string) {
    const task = this.getTask(taskId);
    this.assertTaskFunded(task, "Task must be funded before execution.");
    if (task.status === "EXECUTING") return;
    if (!["OPEN", "ASSIGNED"].includes(task.status)) {
      throw new Error("Execution can only start from OPEN or ASSIGNED");
    }
    if (this.chainBridge) {
      const agentView = this.registryService.getAgent(agentId);
      const chainReceipt = await this.chainBridge.startExecution(task, agentView);
      if (chainReceipt?.txHash) {
        task.timeline.push(this.timeline("execution_started", "Onchain execution started", `start_execution accepted with tx ${chainReceipt.txHash.slice(0, 12)}...`));
      }
    }
    this.transitionTask(task, "EXECUTING");
    task.status = "EXECUTING";
    task.resultStatus = "in_progress";
    task.updatedAt = new Date().toISOString();
    task.timeline.push(this.timeline("execution_started", "Execution running", `Execution is now running for agent ${agentId}.`));
    task.erc8183Job = this.erc8183.markDispatched(task, {
      providerAgentId: agentId,
    });
    this.store.tasks.set(taskId, task);
  }

  async markSubmissionReceived(
    taskId: string,
    agentId: string,
    resultPointer: string | null,
    resultHash: string | null,
    resultPreview?: string | null,
    submissionNonce?: string | null,
  ) {
    const task = this.getTask(taskId) as OnchainAwareTaskDetail;
    this.assertTaskFunded(task, "Task must be funded before execution.");
    if (["APPROVED", "DISPUTED", "SETTLED", "REFUNDED"].includes(task.status)) {
      return;
    }
    const hadPriorSubmission = Boolean(task.latestSubmissionId);
    const agentView = this.registryService.getAgent(agentId);
    const chainSubmission = this.chainBridge && resultHash
      ? await this.chainBridge.submitTaskResult({
          task,
          agent: agentView,
          submissionNonce: submissionNonce ?? `${taskId}-${agentId}-submission`,
          resultHash,
          resultPointer,
        })
      : null;
    if (task.status !== "SUBMITTED") {
      this.transitionTask(task, "SUBMITTED");
      task.status = "SUBMITTED";
    }
    task.resultStatus = "submitted";
    task.latestSubmissionId = chainSubmission?.submissionId ?? task.latestSubmissionId ?? `${taskId}-submission`;
    task.latestSubmissionTxHash = chainSubmission?.txHash ?? task.latestSubmissionTxHash ?? null;
    task.latestEvaluation = null;
    task.userReview = null;
    task.updatedAt = new Date().toISOString();
    task.timeline.push(
      this.timeline(
        "submission_received",
        hadPriorSubmission ? "Improved submission received" : "Submission received",
        `Received a result from ${agentId}${resultHash ? ` with hash ${resultHash.slice(0, 12)}...` : ""}${chainSubmission?.txHash ? ` and anchored it onchain with tx ${chainSubmission.txHash.slice(0, 12)}...` : ""}.`,
      ),
    );
    task.reviewActions = ["approve", "reject", "dispute"];
    const noteParts = [
      resultPreview?.trim() ? resultPreview.trim() : null,
      resultPointer ? `Result pointer: ${resultPointer}` : null,
    ].filter(Boolean);
    if (noteParts.length > 0) {
      task.structuredNotes = noteParts.join("\n\n");
    }
    task.erc8183Job = this.erc8183.markSubmitted(task, {
      providerAgentId: agentId,
    });
    this.store.tasks.set(taskId, task);
  }

  markExecutionFailed(taskId: string, agentId: string, message: string) {
    const task = this.getTask(taskId);
    const rollbackStatus = task.hiringMode === "open_market" ? "OPEN" : "ASSIGNED";
    this.transitionTask(task, rollbackStatus, { allowRecovery: true });
    task.status = rollbackStatus;
    task.resultStatus = "not_started";
    task.updatedAt = new Date().toISOString();
    task.timeline.push(this.timeline("execution_failed", "Execution failed", `${agentId} failed to complete execution: ${message}`));
    task.reviewActions = task.transactionState === "accepted" ? ["cancel"] : [];
    task.erc8183Job = this.erc8183.syncWithTask(task, {
      providerAgentId: agentId,
      evaluator: task.creatorWallet,
    });
    this.store.tasks.set(taskId, task);
  }

  markSettlement(taskId: string, receipt: SettlementReceipt) {
    const task = this.getTask(taskId);
    if (task.status === "SETTLED") {
      throw new Error("Task is already settled");
    }
    this.transitionTask(task, "SETTLED");
    task.status = "SETTLED";
    task.resultStatus = "settled";
    task.settlementState = "settled";
    task.latestSettlement = receipt;
    task.updatedAt = new Date().toISOString();
    task.timeline.push(
      this.timeline(
        "settled",
        "Payout settled",
        `Agent payout settled with tx reference ${receipt.txReference ?? "pending"}.`,
      ),
    );
    task.reviewActions = [];
    task.erc8183Job = this.erc8183.markSettled(task, "settled");
    this.store.tasks.set(taskId, task);
  }

  markRefund(taskId: string, receipt: SettlementReceipt) {
    const task = this.getTask(taskId);
    if (task.status === "REFUNDED") {
      throw new Error("Task is already refunded");
    }
    this.transitionTask(task, "REFUNDED");
    task.status = "REFUNDED";
    task.settlementState = "refunded";
    task.latestSettlement = receipt;
    task.updatedAt = new Date().toISOString();
    task.timeline.push(
      this.timeline(
        "refund_completed",
        "Refund processed",
        `Refund recorded with tx reference ${receipt.txReference ?? "pending"}.`,
      ),
    );
    task.reviewActions = [];
    task.erc8183Job = this.erc8183.markSettled(task, "refunded");
    this.store.tasks.set(taskId, task);
  }

  markDisputeOpened(taskId: string, actorWallet: string, reason: string, receipt: SettlementReceipt) {
    const task = this.getTask(taskId);
    this.transitionTask(task, "DISPUTED");
    task.status = "DISPUTED";
    task.resultStatus = "disputed";
    task.settlementState = "disputed";
    task.latestSettlement = receipt;
    task.disputeRecord = {
      disputeId: makeId("dispute"),
      reason,
      status: "open",
      openedByWallet: actorWallet,
      openedAt: new Date().toISOString(),
      resolvedAt: null,
      resolution: null,
    };
    task.updatedAt = new Date().toISOString();
    task.timeline.push(this.timeline("disputed", "Dispute paused payout", reason));
    task.reviewActions = [];
    task.erc8183Job = this.erc8183.syncWithTask(task, {
      providerAgentId: task.selectedAgentId,
      evaluator: task.creatorWallet,
    });
    this.store.tasks.set(taskId, task);
  }

  markAdminResolution(taskId: string, input: AdminResolutionRequest, receipt: SettlementReceipt) {
    const task = this.getTask(taskId);
    const paid = input.outcome === "approve_payout";
    this.transitionTask(task, paid ? "APPROVED" : "REJECTED", { allowDisputeBypass: true });
    task.latestSettlement = receipt;
    task.disputeRecord = task.disputeRecord
      ? {
          ...task.disputeRecord,
          status: "resolved",
          resolvedAt: new Date().toISOString(),
          resolution: input.resolution,
        }
      : null;
    this.transitionTask(task, paid ? "SETTLED" : "REFUNDED", { allowDisputeBypass: true });
    task.status = paid ? "SETTLED" : "REFUNDED";
    task.resultStatus = paid ? "settled" : "rejected";
    task.settlementState = paid ? "settled" : "refunded";
    task.updatedAt = new Date().toISOString();
    task.timeline.push(
      this.timeline(
        paid ? "settled" : "refund_completed",
        paid ? "Admin-assisted payout approved" : "Admin-assisted refund approved",
        input.resolution,
      ),
    );
    task.reviewActions = [];
    task.erc8183Job = paid
      ? this.erc8183.markSettled(task, "settled")
      : this.erc8183.markSettled(task, "refunded");
    this.store.tasks.set(taskId, task);
  }

  private requireCreatorTask(taskId: string, wallet: string): TaskDetailView {
    const task = this.getTask(taskId);
    if (task.creatorWallet !== wallet) throw new Error("Only the task creator can perform this action");
    return task;
  }

  private getAgentLite(agentId: string) {
    const agent = this.registryService.getAgent(agentId);
    return {
      agentId: agent.profile.agentId,
      displayName: agent.profile.publicName,
      originType: agent.profile.originType,
    };
  }

  private buildEvaluationRequest(task: TaskDetailView, submissionId: string, path: "user_review" | "assisted_evaluation" | "hybrid_review"): EvaluationRunRequest {
    const latestRun = [...this.store.executionRuns.values()]
      .filter((run) => run.taskId === task.taskId)
      .sort((left, right) => new Date(right.completedAt ?? right.updatedAt ?? 0).getTime() - new Date(left.completedAt ?? left.updatedAt ?? 0).getTime())[0] ?? null;
    const rawPayload = latestRun?.rawPayload && typeof latestRun.rawPayload === "object" && !Array.isArray(latestRun.rawPayload)
      ? latestRun.rawPayload as Record<string, unknown>
      : {};
    const finalOutput = rawPayload.finalOutput && typeof rawPayload.finalOutput === "object" && !Array.isArray(rawPayload.finalOutput)
      ? rawPayload.finalOutput as Record<string, unknown>
      : null;
    return {
      taskId: task.taskId,
      submissionIds: [submissionId],
      evaluationMode:
        path === "user_review" ? "human_only" : path === "hybrid_review" ? "assisted_scoring" : "assisted_scoring",
      evaluationPath: path,
      criteria: [
        { key: "completion", label: "Completion", weight: 0.22, description: "Did the result complete the requested job?" },
        { key: "relevance", label: "Relevance", weight: 0.2, description: "Does the result stay on the requested task?" },
        { key: "correctness_proxy", label: "Correctness Proxy", weight: 0.18, description: "Does it appear plausible and internally consistent?" },
        { key: "formatting", label: "Formatting", weight: 0.15, description: "Does the result match the expected structure?" },
        { key: "usefulness", label: "Usefulness", weight: 0.2, description: "Would the buyer be able to use this outcome?" },
        { key: "latency_awareness", label: "Latency Awareness", weight: 0.05, description: "Was the delivery timely for the reward and task?" },
      ],
      reviewerType: path === "user_review" ? "buyer" : "machine_assisted",
      taskSnapshot: {
        title: task.title,
        description: task.description,
        category: task.category,
        rewardAmount: task.rewardAmount,
        structuredNotes: task.structuredNotes,
        appealRound: task.appealRecord?.appealRound ?? 0,
      },
      resultSnapshot: {
        agentId: latestRun?.agentId ?? task.participatingAgentIds[0] ?? "unknown",
        runId: latestRun?.runId ?? null,
      },
      outputSchema: typeof finalOutput?.schema === "string"
        ? finalOutput.schema
        : ((finalOutput?.schema && typeof finalOutput.schema === "object" && !Array.isArray(finalOutput.schema))
          ? finalOutput.schema
          : { resultStatus: task.resultStatus }) as Record<string, unknown>,
      submissionPayload: {
        taskId: task.taskId,
        submissionId,
        pointer: task.structuredNotes ?? "No pointer captured yet",
        finalOutput: finalOutput ?? rawPayload.finalOutput ?? null,
        draftOutput: rawPayload.draftOutput ?? null,
        evaluation: rawPayload.evaluation ?? null,
        runSummary: rawPayload.runSummary ?? null,
        structuredTask: rawPayload.structuredTask ?? null,
      },
    };
  }

  private async runConsensusReview(
    task: TaskDetailView,
    submissionId: string,
    path: "assisted_evaluation" | "hybrid_review" | "subjective_consensus",
    appealRound = 0,
  ) {
    const request = this.buildEvaluationRequest(task, submissionId, path === "subjective_consensus" ? "hybrid_review" : path);
    request.evaluationMode = "subjective_consensus";
    request.evaluationPath = path === "subjective_consensus" ? "subjective_consensus" : request.evaluationPath;
    request.reviewerType = "validator_subjective";
    request.taskSnapshot = {
      ...(request.taskSnapshot ?? {}),
      appealRound,
    };
    return path === "hybrid_review"
      ? this.evaluatorClient.runHybrid(request)
      : this.evaluatorClient.runConsensus(request);
  }

  private async runAdvisoryReview(
    task: TaskDetailView,
    submissionId: string,
    path: "assisted_evaluation" | "hybrid_review",
  ) {
    const request = this.buildEvaluationRequest(task, submissionId, path);
    return path === "hybrid_review"
      ? this.evaluatorClient.runHybrid(request)
      : this.evaluatorClient.runAssisted(request);
  }

  private applyAdvisoryReview(
    taskId: string,
    actorWallet: string,
    submissionId: string,
    result: EvaluationRunResponse,
    stageLabel: string,
  ): TaskActionResponse {
    const task = this.requireCreatorTask(taskId, actorWallet) as OnchainAwareTaskDetail;
    const normalizedResult = this.normalizeEvaluationResult(task, submissionId, result);
    if (task.status === "SUBMITTED") {
      this.transitionTask(task, "UNDER_REVIEW");
      task.status = "UNDER_REVIEW";
    }
    task.resultStatus = "submitted";
    task.latestEvaluation = normalizedResult;
    task.reviewActions = ["approve", "reject", "dispute"];
    task.updatedAt = new Date().toISOString();
    task.timeline.push(
      this.timeline(
        "review_started",
        `${stageLabel} completed`,
        `${normalizedResult.summary} AI review is guidance only; the task owner decides final approval.`,
      ),
    );
    this.store.tasks.set(taskId, task);
    this.annotateLatestRun(taskId, {
      reviewOutcome: "needs_human_review",
      consensusScore: normalizedResult.consensusScore ?? normalizedResult.overallScore ?? null,
      validatorAgreement: normalizedResult.validatorAgreement ?? null,
      consensusConfidence: normalizedResult.consensusConfidence ?? null,
      finalOutcome: normalizedResult.finalOutcome ?? null,
      equivalenceSummary: normalizedResult.equivalenceSummary ?? null,
      appealRound: normalizedResult.appealRound ?? task.appealRecord?.appealRound ?? 0,
    });
    return taskActionResponseSchema.parse({ task });
  }

  private async applyConsensusOutcome(
    taskId: string,
    actorWallet: string,
    submissionId: string,
    result: EvaluationRunResponse,
    stageLabel: string,
  ): Promise<TaskActionResponse> {
    const task = this.requireCreatorTask(taskId, actorWallet) as OnchainAwareTaskDetail;
    const normalizedResult = this.normalizeEvaluationResult(task, submissionId, result);
    task.latestEvaluation = normalizedResult;
    task.updatedAt = new Date().toISOString();
    task.timeline.push(this.timeline("review_started", `${stageLabel} completed`, normalizedResult.summary));
    this.store.tasks.set(taskId, task);

    const outcome = normalizedResult.finalOutcome ?? "unresolved";
    this.annotateLatestRun(taskId, {
      reviewOutcome: this.toRunReviewOutcome(normalizedResult),
      consensusScore: normalizedResult.consensusScore ?? normalizedResult.overallScore ?? null,
      validatorAgreement: normalizedResult.validatorAgreement ?? null,
      consensusConfidence: normalizedResult.consensusConfidence ?? null,
      finalOutcome: outcome,
      equivalenceSummary: normalizedResult.equivalenceSummary ?? null,
      appealRound: normalizedResult.appealRound ?? task.appealRecord?.appealRound ?? 0,
    });

    if (task.appealRecord && !task.appealRecord.resolvedAt) {
      task.appealRecord = {
        ...task.appealRecord,
        resolvedAt: new Date().toISOString(),
        resolutionOutcome: outcome,
      };
      task.timeline.push(this.timeline("appeal_resolved", "Appeal resolved", `Appeal finished with outcome ${outcome}.`));
    }

    if (this.chainBridge?.finalizeReview) {
      const reviewReceipt = await this.chainBridge.finalizeReview({
        task,
        submissionId,
        requestedOutcome: outcome,
        consensusScore: normalizedResult.consensusScore ?? normalizedResult.overallScore ?? 0,
        validatorAgreement: normalizedResult.validatorAgreement ?? 0,
        consensusConfidence: normalizedResult.consensusConfidence ?? 0,
        evaluationHash: `eval:${normalizedResult.evaluationId}`,
      });
      if (reviewReceipt?.txHash) {
        task.timeline.push(this.timeline("review_started", "Onchain review finalized", `finalize_review accepted with tx ${reviewReceipt.txHash.slice(0, 12)}...`));
      }
    }

    if (outcome === "accepted") {
      if (this.chainBridge && ["SUBMITTED", "UNDER_REVIEW"].includes(task.status)) {
        const chainReceipt = await this.chainBridge.approveSubmission(task, submissionId);
        if (chainReceipt?.txHash) {
          task.timeline.push(this.timeline("review_started", "Onchain approval recorded", `approve_submission accepted with tx ${chainReceipt.txHash.slice(0, 12)}...`));
        }
      }
      this.transitionTask(task, "APPROVED", { allowDisputeBypass: task.status === "DISPUTED" });
      task.status = "APPROVED";
      task.resultStatus = "approved";
      task.settlementState = "pending_settlement";
      task.reviewActions = ["settle"];
      task.timeline.push(this.timeline("result_verified", "Appeal review accepted", "Escalated review accepted the result and settlement can proceed."));
    } else if (outcome === "rejected") {
      if (this.chainBridge && ["SUBMITTED", "UNDER_REVIEW"].includes(task.status)) {
        const chainReceipt = await this.chainBridge.rejectSubmission(task, submissionId);
        if (chainReceipt?.txHash) {
          task.timeline.push(this.timeline("review_started", "Onchain rejection recorded", `reject_submission accepted with tx ${chainReceipt.txHash.slice(0, 12)}...`));
        }
      }
      this.transitionTask(task, "REJECTED", { allowDisputeBypass: task.status === "DISPUTED" });
      task.status = "REJECTED";
      task.resultStatus = "rejected";
      task.settlementState = "pending_settlement";
      task.reviewActions = ["refund", "dispute", "appeal"];
      task.timeline.push(this.timeline("rejected", "Appeal review rejected result", "Escalated review found the result below the acceptance threshold."));
    } else if (outcome === "disputed") {
      this.transitionTask(task, "DISPUTED", { allowDisputeBypass: task.status === "DISPUTED" });
      task.status = "DISPUTED";
      task.resultStatus = "disputed";
      task.settlementState = "disputed";
      task.reviewActions = ["appeal"];
      task.disputeRecord = task.disputeRecord ?? {
        disputeId: makeId("dispute"),
        reason: result.summary,
        status: "open",
        openedByWallet: actorWallet,
        openedAt: new Date().toISOString(),
        resolvedAt: null,
        resolution: null,
      };
      task.timeline.push(this.timeline("disputed", "Escalated review opened dispute", "Review signals conflicted strongly enough to pause payout and require escalation."));
    } else {
      this.transitionTask(task, "UNRESOLVED", { allowDisputeBypass: task.status === "DISPUTED" });
      task.status = "UNRESOLVED";
      task.resultStatus = "unresolved";
      task.settlementState = "unresolved";
      task.reviewActions = ["appeal"];
      task.timeline.push(this.timeline("result_unresolved", "Escalated review unresolved", "Appeal review could not approve or reject the result safely."));
    }

    task.updatedAt = new Date().toISOString();
    this.store.tasks.set(taskId, task);
    return taskActionResponseSchema.parse({ task });
  }

  private normalizeEvaluationResult(task: TaskDetailView, submissionId: string, result: EvaluationRunResponse): EvaluationRunResponse {
    if (result.scores.length > 0) {
      return result;
    }
    const derivedScore = result.consensusScore ?? result.overallScore ?? Math.round(result.normalizedScore * 100);
    return {
      ...result,
      scores: [{
        submissionId,
        agentId: task.participatingAgentIds[0] ?? task.selectedAgentId ?? "unknown",
        score: derivedScore,
        normalizedScore: derivedScore / 100,
        notes: result.summary,
      }],
    };
  }

  private toRunReviewOutcome(result: EvaluationRunResponse) {
    if (result.finalOutcome === "accepted" || result.finalDecision === "approve") return "approve";
    if (result.finalOutcome === "rejected" || result.finalDecision === "reject") return "reject";
    return "needs_human_review";
  }

  private timeline(kind: TaskTimelineEvent["kind"], title: string, description: string): TaskTimelineEvent {
    return {
      id: makeId("evt"),
      kind,
      title,
      description,
      createdAt: new Date().toISOString(),
    };
  }

  private maskWallet(wallet: string): string {
    return wallet.length < 10 ? wallet : `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  }

  private assertNotPaused(taskId: string) {
    const pause = this.store.pausedTasks.get(taskId);
    if (pause?.active) {
      throw new Error("Task is paused by admin");
    }
  }

  private hasTimelineKind(task: TaskDetailView, kind: TaskTimelineEvent["kind"]) {
    return task.timeline.some((item) => item.kind === kind);
  }

  private buildTaskDetail(input: TaskCreateRequest, transactionState: TaskDetailView["transactionState"]): TaskDetailView {
    const taskId = makeId("task");
    const createdAt = new Date().toISOString();
    const selectedAgents = input.selectedAgentId ? [this.getAgentLite(input.selectedAgentId)] : [];
    const timeline: TaskTimelineEvent[] = [
      this.timeline("task_created", "Task draft created", "Your task draft has been recorded offchain and is ready for funding."),
    ];

    if (transactionState !== "pending_wallet") {
      timeline.push(this.timeline("escrow_pending", "Funding transaction pending", "We are waiting for the escrow anchor transaction to be accepted."));
    }

    const detail: OnchainAwareTaskDetail = {
      taskId,
      title: input.title,
      description: input.description,
      category: input.category,
      rewardAmount: input.rewardAmount,
      deadline: input.deadline,
      status: "CREATED",
      resultStatus: "not_started",
      creatorWallet: input.creatorWallet,
      creatorDisplay: this.maskWallet(input.creatorWallet),
      selectedAgentId: input.selectedAgentId,
      participatingAgentIds: input.selectedAgentId ? [input.selectedAgentId] : [],
      maxParticipants: input.maxParticipants,
      transactionState,
      onchainTaskRef: null,
      createdAt,
      updatedAt: createdAt,
      attachments: input.attachments,
      evaluationPreference: input.evaluationPreference,
      structuredNotes: input.structuredNotes,
      hiringMode: input.hiringMode,
      timeline,
      selectedAgents,
      reviewActions: [],
      latestCreateTxHash: null,
      latestFundTxHash: null,
      latestAssignTxHash: null,
      latestEvaluation: null,
      userReview: null,
      latestSubmissionId: null,
      latestSubmissionTxHash: null,
      settlementState: "reward_funded",
      settlementSummary: undefined,
      latestSettlement: null,
      disputeRecord: null,
      appealRecord: null,
    };
    detail.erc8183Job = this.erc8183.ensureForTask(detail, {
      providerAgentId: input.selectedAgentId ?? null,
      evaluator: input.creatorWallet,
    });
    return this.hydrateDerivedTaskState(detail);
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

  private applyChainReceipt(
    task: TaskDetailView,
    receipt: ChainReceiptView,
    onchainTaskRef: string | null,
    options: { fundingAnchored?: boolean; assignAnchored?: boolean } = {},
  ) {
    task.onchainTaskRef = onchainTaskRef;
    task.updatedAt = new Date().toISOString();
    if (receipt.status === "FAILED" || receipt.status === "UNDETERMINED") {
      task.transactionState = "failed";
      task.reviewActions = [];
      return;
    }

    const accepted = this.isAcceptedReceipt(receipt);
    if (!accepted && !receipt.finalized) {
      task.transactionState = "pending_chain";
      task.reviewActions = [];
      return;
    }

    task.transactionState = receipt.finalized ? "accepted" : "accepted";
    if (options.fundingAnchored && task.status === "CREATED") {
      this.transitionTask(task, "ESCROW_FUNDED");
      task.status = "ESCROW_FUNDED";
      this.transitionTask(task, "OPEN");
      task.status = "OPEN";
      if (task.hiringMode === "direct_hire" && options.assignAnchored) {
        this.transitionTask(task, "ASSIGNED");
        task.status = "ASSIGNED";
      }
    }
    if (task.hiringMode === "direct_hire" && task.selectedAgentId && !task.participatingAgentIds.includes(task.selectedAgentId)) {
      task.participatingAgentIds.push(task.selectedAgentId);
    }
    if (["OPEN", "ASSIGNED"].includes(task.status)) {
      task.reviewActions = ["cancel"];
    }
    task.erc8183Job = this.erc8183.syncWithTask(task, {
      providerAgentId: task.selectedAgentId,
      evaluator: task.creatorWallet,
    });
  }

  private readBigIntLike(value: unknown) {
    if (typeof value === "bigint") return value;
    if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
    if (typeof value === "string" && value.trim()) {
      try {
        return BigInt(value);
      } catch {
        return 0n;
      }
    }
    return 0n;
  }

  private formatRewardAmount(value: bigint) {
    if (value === 0n) return "0";
    const text = value.toString().padStart(7, "0");
    const whole = text.slice(0, -6) || "0";
    const fraction = text.slice(-6).replace(/0+$/, "");
    return `${whole}${fraction ? `.${fraction}` : ""}`;
  }

  private normalizeOnchainSnapshot(onchainTask: unknown) {
    if (Array.isArray(onchainTask)) {
      return {
        creatorWallet: String(onchainTask[0] ?? ""),
        rewardAmount: this.readBigIntLike(onchainTask[1] ?? 0n),
        deadlineTimestamp: this.readBigIntLike(onchainTask[2] ?? 0n),
        stateName: String(onchainTask[6] ?? "").toUpperCase(),
        escrowLocked: this.readBigIntLike(onchainTask[8] ?? 0n),
        assignedAgentOnchainId: String(onchainTask[9] ?? "").trim(),
        latestSubmissionId: String(onchainTask[10] ?? "").trim(),
        latestResultUri: String(onchainTask[12] ?? "").trim(),
      };
    }
    if (onchainTask && typeof onchainTask === "object") {
      const snapshot = onchainTask as Record<string, unknown>;
      return {
        creatorWallet: String(snapshot.creator ?? ""),
        rewardAmount: this.readBigIntLike(snapshot.rewardAmount ?? 0n),
        deadlineTimestamp: this.readBigIntLike(snapshot.deadlineTimestamp ?? 0n),
        stateName: String(snapshot.state_name ?? snapshot.stateName ?? snapshot.state ?? "").toUpperCase(),
        escrowLocked: this.readBigIntLike(snapshot.escrow_locked ?? snapshot.escrowLocked ?? 0n),
        assignedAgentOnchainId: String(snapshot.assigned_agent_id ?? snapshot.assignedAgentId ?? "").trim(),
        latestSubmissionId: String(snapshot.latest_submission_id ?? snapshot.latestSubmissionId ?? "").trim(),
        latestResultUri: String(snapshot.latestResultUri ?? snapshot.latest_result_uri ?? "").trim(),
      };
    }
    return null;
  }

  private isAcceptedReceipt(receipt: Pick<ChainReceiptView, "accepted" | "finalized" | "status">) {
    if (receipt.accepted || receipt.finalized) return true;
    return ["ACCEPTED", "FINALIZED"].includes(String(receipt.status || "").toUpperCase());
  }

  private async maybeAutoDispatchPlatformAgent(taskId: string) {
    if (!this.executionEngine) return;

    const task = this.getTask(taskId);
    if (!this.isTaskFunded(task)) return;
    if (task.hiringMode === "direct_hire") {
      if (task.status !== "ASSIGNED") return;
    } else if (!["OPEN", "ASSIGNED"].includes(task.status)) {
      return;
    }
    if (task.resultStatus !== "not_started") return;

    const targetAgentId = this.pickPlatformAgentForTask(task);
    if (!targetAgentId) return;

    const agent = this.registryService.getAgent(targetAgentId);
    if (!task.participatingAgentIds.includes(targetAgentId)) {
      task.participatingAgentIds.push(targetAgentId);
    }
    task.selectedAgents = dedupeAgents([...task.selectedAgents, this.getAgentLite(targetAgentId)]);
    if (this.chainBridge && task.hiringMode === "open_market") {
      await this.chainBridge.assignTask(task, agent);
    }
    if (task.status === "OPEN") {
      this.transitionTask(task, "ASSIGNED");
      task.status = "ASSIGNED";
    }
    if (!this.hasTimelineKind(task, "agent_accepted")) {
      task.timeline.push(
        this.timeline(
          "agent_accepted",
          "Platform agent picked up task",
          `${agent.profile.publicName} is available in-platform and has started preparing the deliverable.`,
        ),
      );
    }
    task.updatedAt = new Date().toISOString();
    task.reviewActions = ["cancel"];
    this.store.tasks.set(taskId, task);

    try {
      await this.executionEngine.dispatchTask(taskId, targetAgentId);
    } catch (error) {
      this.markExecutionFailed(taskId, targetAgentId, error instanceof Error ? error.message : "Platform execution dispatch failed");
      throw error;
    }
  }

  private pickPlatformAgentForTask(task: TaskDetailView): string | null {
    if (task.hiringMode === "direct_hire" && task.selectedAgentId) {
      const selected = this.registryService.getAgent(task.selectedAgentId);
      return selected.profile.originType === "platform" && selected.profile.isActive
        ? selected.profile.agentId
        : null;
    }

    if (task.hiringMode !== "open_market" || task.participatingAgentIds.length > 0) {
      return null;
    }

    const candidates = this.registryService
      .listAgents()
      .filter((agent) => agent.profile.originType === "platform" && agent.profile.isActive)
      .filter((agent) => agent.profile.category === task.category || agent.profile.capabilityTags.includes(task.category))
      .sort((left, right) => right.performanceSummary.reliabilityScore - left.performanceSummary.reliabilityScore);

    return candidates[0]?.profile.agentId ?? null;
  }

  private hydrateDerivedTaskState(task: TaskDetailView) {
    task.settlementSummary = this.deriveSettlementSummary(task);
    return task;
  }

  private deriveSettlementSummary(task: TaskDetailView): TaskSettlementSummary {
    const funded = this.isTaskFunded(task);
    const openDispute = task.disputeRecord?.status === "open";
    const terminal = task.status === "SETTLED" || task.status === "REFUNDED";
    const canReleasePayment =
      funded
      && !terminal
      && !openDispute
      && task.status === "APPROVED"
      && task.settlementState === "pending_settlement";
    const canRefund =
      funded
      && !terminal
      && !openDispute
      && ["REJECTED", "CANCELLED"].includes(task.status)
      && task.settlementState === "pending_settlement";
    const settlementNextAction: TaskSettlementSummary["settlementNextAction"] =
      canReleasePayment
        ? "release_payment"
        : canRefund
          ? "refund_reward"
          : openDispute || ["DISPUTED", "APPEALED", "UNRESOLVED"].includes(task.status) || ["disputed", "unresolved"].includes(task.settlementState)
            ? "dispute_review"
            : "none";
    const settlementReadinessLabel =
      openDispute || task.status === "DISPUTED" || task.settlementState === "disputed"
        ? "Disputed. Settlement paused."
        : !funded
          ? "Settlement unavailable until funding and approval."
          : task.status === "SETTLED" || task.settlementState === "settled"
          ? "Payment released."
          : task.status === "REFUNDED" || task.settlementState === "refunded"
            ? "Reward refunded."
            : canReleasePayment
              ? "Approved. USDC release is ready."
              : canRefund
                ? "Rejected. Refund available."
                : task.status === "APPROVED"
                  ? "Settlement unavailable until funding and approval."
                  : "Settlement unavailable until funding and approval.";

    return {
      settlementAvailable: canReleasePayment || canRefund,
      settlementNextAction,
      settlementReadinessLabel,
      canReleasePayment,
      canRefund,
      isFunded: funded,
    };
  }

  private isTaskFunded(task: TaskDetailView) {
    if (task.transactionState !== "accepted") return false;
    if (task.onchainTaskRef?.startsWith("demo:")) {
      return this.demoFundingFallbackEnabled;
    }
    return Boolean(task.onchainTaskRef);
  }

  private assertTaskFunded(task: TaskDetailView, message: string) {
    if (!this.isTaskFunded(task)) {
      throw new Error(message);
    }
  }

  private transitionTask(
    task: TaskDetailView,
    next: TaskDetailView["status"],
    options: { allowDisputeBypass?: boolean; allowRecovery?: boolean; allowPlatformRefinement?: boolean } = {},
  ) {
    if (task.status === next) return;
    if (options.allowDisputeBypass && task.status === "DISPUTED" && (next === "APPROVED" || next === "REJECTED" || next === "SETTLED" || next === "REFUNDED")) {
      return;
    }
    if (options.allowPlatformRefinement && next === "EXECUTING" && ["SUBMITTED", "UNDER_REVIEW", "REJECTED"].includes(task.status)) {
      return;
    }
    if (options.allowRecovery) {
      assertTaskStatusRecovery(task.status, next);
      return;
    }
    assertTaskStatusTransition(task.status, next);
  }

  private getLatestPlatformRun(taskId: string) {
    return [...this.store.executionRuns.values()]
      .filter((run) => run.taskId === taskId)
      .filter((run) => run.endpointUrl.startsWith("platform://"))
      .filter((run) => run.state === "completed")
      .sort((left, right) => new Date(right.completedAt || right.updatedAt || 0).getTime() - new Date(left.completedAt || left.updatedAt || 0).getTime())[0] ?? null;
  }

  private buildRefinementContext(
    run: { runId: string; rawPayload: unknown | null },
    requestedByWallet: string,
  ): PlatformRefinementContext {
    const trace = run.rawPayload && typeof run.rawPayload === "object" && !Array.isArray(run.rawPayload)
      ? run.rawPayload as Record<string, unknown>
      : {};
    const evaluation = trace.evaluation && typeof trace.evaluation === "object" && !Array.isArray(trace.evaluation)
      ? trace.evaluation as Record<string, unknown>
      : {};
    const feedbackSummary = [
      ...(((evaluation.gaps as unknown[]) || []).filter((item): item is string => typeof item === "string")),
      ...(((evaluation.notes as unknown[]) || []).filter((item): item is string => typeof item === "string")).slice(0, 2),
    ].slice(0, 4);
    return {
      sourceRunId: run.runId,
      requestedByWallet,
      previousMode: (trace.mode as PlatformQualityMode | undefined) ?? null,
      previousScore: typeof trace.score === "number" ? trace.score : null,
      previousConfidence:
        trace.confidence === "low" || trace.confidence === "medium" || trace.confidence === "high"
          ? trace.confidence
          : null,
      feedbackSummary: feedbackSummary.length > 0
        ? feedbackSummary
        : ["Tighten the result for higher buyer confidence without changing grounded meaning."],
    };
  }

  private annotateRun(runId: string, patch: Record<string, unknown>) {
    const run = this.store.executionRuns.get(runId);
    if (!run) return;
    const current = run.rawPayload && typeof run.rawPayload === "object" && !Array.isArray(run.rawPayload)
      ? run.rawPayload as Record<string, unknown>
      : {};
    run.rawPayload = {
      ...current,
      ...patch,
    };
    run.updatedAt = new Date().toISOString();
    this.store.executionRuns.set(runId, run);
  }
}

function dedupeAgents(
  items: Array<{ agentId: string; displayName: string; originType: "platform" | "external" }>,
) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.agentId)) return false;
    seen.add(item.agentId);
    return true;
  });
}

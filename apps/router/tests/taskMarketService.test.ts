import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryRegistryStore } from "../src/db/store";
import { TaskMarketService } from "../src/services/taskMarketService";
import { SafetyService } from "../src/services/safetyService";

const evaluatorClient = {
  async submitUserReview() {
    return {
      evaluationId: "eval_1",
      taskId: "task_1",
      winningSubmissionId: "submission_1",
      scores: [],
      summary: "Approved",
      reasoning: "Looks good.",
      normalizedScore: 0.9,
      overallScore: 90,
      finalDecision: "approve",
      path: "user_review",
      findings: [],
      reviewerType: "buyer",
      createdAt: new Date().toISOString(),
    };
  },
  async runAssisted() { return null; },
  async runHybrid() { return null; },
  async runConsensus() { return null; },
  async confirmHybrid() { return null; },
};

function createRegistryServiceStub(store: InMemoryRegistryStore) {
  return {
    getAgent(agentId: string) {
      const row = store.agents.get(agentId);
      assert.ok(row, `agent ${agentId} should exist`);
      const performanceSummary = store.ensurePerformance(agentId);
      return {
        profile: row.profile,
        performanceSummary,
      };
    },
    listAgents() {
      return [...store.agents.values()].map((row) => ({
        profile: row.profile,
        performanceSummary: store.ensurePerformance(row.profile.agentId),
      }));
    },
  };
}

function seedAgents(store: InMemoryRegistryStore) {
  store.upsertAgent({
    profile: {
      agentId: "agent_fast",
      ownerWallet: "0xagentA",
      publicName: "Fast Agent",
      slug: "fast-agent",
      description: "Execution specialist.",
      avatarUrl: null,
      originType: "platform",
      category: "research",
      capabilityTags: ["research"],
      endpointUrl: null,
      expectedLatencyMsRange: { minMs: 1200, maxMs: 6000 },
      pricingHint: "Fast.",
      activeVersionHash: "ver_fast",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    registrationState: "active",
    healthStatus: "healthy",
    compatibilityStatus: "compatible",
    latestVersionHash: "ver_fast",
    suspensionReason: null,
    compatibilityDeclaration: null,
  });

  store.upsertAgent({
    profile: {
      agentId: "agent_open",
      ownerWallet: "0xagentB",
      publicName: "Open Agent",
      slug: "open-agent",
      description: "Open market participant.",
      avatarUrl: null,
      originType: "platform",
      category: "research",
      capabilityTags: ["research"],
      endpointUrl: null,
      expectedLatencyMsRange: { minMs: 1600, maxMs: 7000 },
      pricingHint: "Balanced.",
      activeVersionHash: "ver_open",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    registrationState: "active",
    healthStatus: "healthy",
    compatibilityStatus: "compatible",
    latestVersionHash: "ver_open",
    suspensionReason: null,
    compatibilityDeclaration: null,
  });
}

test("direct hire task syncs to assigned state and remains assigned until execution starts", async () => {
  const store = new InMemoryRegistryStore();
  seedAgents(store);
  const service = new TaskMarketService(store, createRegistryServiceStub(store) as never, evaluatorClient as never, new SafetyService(store));

  const created = service.createTaskDraft({
    title: "Competitive memo",
    description: "Build a grounded competitive memo with positioning and risk recommendations.",
    category: "research",
    rewardAmount: 200,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    hiringMode: "direct_hire",
    selectedAgentId: "agent_fast",
    attachments: [],
    evaluationPreference: "hybrid_review",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  });

  const synced = service.syncTaskWithChain(created.task.taskId, {
    createTxHash: "tx_create",
    fundTxHash: "tx_fund",
    assignTxHash: "tx_assign",
    onchainTaskRef: "onchain:task_1",
    latestReceipt: {
      hash: "tx_assign",
      status: "ACCEPTED",
      finalized: false,
      blockNumber: 123,
      createdAt: new Date().toISOString(),
    },
  });

  assert.equal(synced.task.status, "ASSIGNED");

  const accepted = await service.acceptTask(created.task.taskId, "0xagentA");
  assert.equal(accepted.task.status, "ASSIGNED");
  assert.ok(accepted.task.participatingAgentIds.includes("agent_fast"));
});

test("open market task enforces participant caps", async () => {
  const store = new InMemoryRegistryStore();
  seedAgents(store);
  const service = new TaskMarketService(store, createRegistryServiceStub(store) as never, evaluatorClient as never, new SafetyService(store));

  const created = service.createTaskDraft({
    title: "Open market brief",
    description: "Write a useful market brief with a recommendation and one quantified risk.",
    category: "research",
    rewardAmount: 150,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    hiringMode: "open_market",
    selectedAgentId: null,
    attachments: [],
    evaluationPreference: "assisted_evaluation",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  });

  service.syncTaskWithChain(created.task.taskId, {
    createTxHash: "tx_create",
    fundTxHash: "tx_fund",
    assignTxHash: null,
    onchainTaskRef: "onchain:task_2",
    latestReceipt: {
      hash: "tx_fund",
      status: "ACCEPTED",
      finalized: false,
      blockNumber: 124,
      createdAt: new Date().toISOString(),
    },
  });

  const accepted = await service.acceptTask(created.task.taskId, "0xagentA");
  assert.equal(accepted.task.status, "ASSIGNED");
  await assert.rejects(() => service.acceptTask(created.task.taskId, "0xagentB"), /participant cap/i);
});

test("platform agents automatically cover direct hire and open market tasks when an execution engine is attached", async () => {
  const store = new InMemoryRegistryStore();
  seedAgents(store);
  const service = new TaskMarketService(store, createRegistryServiceStub(store) as never, evaluatorClient as never, new SafetyService(store));
  const dispatchCalls: Array<{ taskId: string; agentId: string }> = [];
  service.attachExecutionEngine({
    async dispatchTask(taskId: string, agentId: string) {
      dispatchCalls.push({ taskId, agentId });
      return { ok: true };
    },
  });

  const direct = service.createTaskDraft({
    title: "Direct platform task",
    description: "Prepare a competitive memo with one risk and one recommendation.",
    category: "research",
    rewardAmount: 180,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    hiringMode: "direct_hire",
    selectedAgentId: "agent_fast",
    attachments: [],
    evaluationPreference: "hybrid_review",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  });

  service.syncTaskWithChain(direct.task.taskId, {
    createTxHash: "tx_create_direct",
    fundTxHash: "tx_fund_direct",
    assignTxHash: "tx_assign_direct",
    onchainTaskRef: "onchain:direct",
    latestReceipt: {
      hash: "tx_assign_direct",
      status: "ACCEPTED",
      finalized: false,
      blockNumber: 1,
      createdAt: new Date().toISOString(),
    },
  });

  const open = service.createTaskDraft({
    title: "Open platform task",
    description: "Write a useful market brief with an actionable recommendation.",
    category: "research",
    rewardAmount: 120,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    hiringMode: "open_market",
    selectedAgentId: null,
    attachments: [],
    evaluationPreference: "assisted_evaluation",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  });

  service.syncTaskWithChain(open.task.taskId, {
    createTxHash: "tx_create_open",
    fundTxHash: "tx_fund_open",
    assignTxHash: null,
    onchainTaskRef: "onchain:open",
    latestReceipt: {
      hash: "tx_fund_open",
      status: "ACCEPTED",
      finalized: false,
      blockNumber: 2,
      createdAt: new Date().toISOString(),
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(
    dispatchCalls.map((item) => item.agentId),
    ["agent_fast", "agent_fast"],
  );
  assert.equal(service.getTask(open.task.taskId).status, "ASSIGNED");
  assert.ok(service.getTask(open.task.taskId).participatingAgentIds.includes("agent_fast"));
});

test("Improve Again reopens a built-in platform task and dispatches a controlled refinement pass", async () => {
  const store = new InMemoryRegistryStore();
  seedAgents(store);
  const service = new TaskMarketService(store, createRegistryServiceStub(store) as never, evaluatorClient as never, new SafetyService(store));
  const now = new Date().toISOString();
  const taskId = "task_improve_again";
  store.tasks.set(taskId, {
    taskId,
    title: "Improve the market brief",
    description: "Provide a tighter strategic brief.",
    category: "research",
    rewardAmount: 120,
    deadline: now,
    status: "SUBMITTED",
    resultStatus: "submitted",
    creatorWallet: "0xbuyer",
    creatorDisplay: "0xbuyer",
    selectedAgentId: "agent_fast",
    participatingAgentIds: ["agent_fast"],
    maxParticipants: 1,
    transactionState: "accepted",
    onchainTaskRef: null,
    createdAt: now,
    updatedAt: now,
    attachments: [],
    evaluationPreference: "assisted_evaluation",
    structuredNotes: null,
    hiringMode: "direct_hire",
    timeline: [],
    selectedAgents: [{ agentId: "agent_fast", displayName: "Fast Agent", originType: "platform" }],
    reviewActions: ["approve", "reject", "dispute"],
    latestSubmissionId: "submission_prev",
    latestSubmissionTxHash: null,
    latestEvaluation: {
      evaluationId: "eval_prev",
      taskId,
      winningSubmissionId: "submission_prev",
      scores: [],
      summary: "Needs more completeness.",
      reasoning: "The result is usable but too thin.",
      normalizedScore: 0.72,
      overallScore: 72,
      finalDecision: "needs_human_review",
      path: "assisted_evaluation",
      findings: [],
      reviewerType: "machine_assisted",
      createdAt: now,
    },
    userReview: null,
    settlementState: "reward_funded",
    latestSettlement: null,
    disputeRecord: null,
  });
  store.executionRuns.set("run_prev", {
    runId: "run_prev",
    requestId: "req_prev",
    taskId,
    agentId: "agent_fast",
    ownerWallet: "0xagentA",
    endpointUrl: "platform://agent_fast",
    callbackUrl: "http://localhost/callback",
    state: "completed",
    attempt: 1,
    maxRetries: 0,
    nextRetryAt: null,
    timeoutAt: now,
    executionMode: "sync",
    remoteRunId: null,
    resultPointer: "memory://prev",
    resultHash: "hash_prev",
    rawPayload: {
      mode: "balanced",
      score: 72,
      confidence: "medium",
      evaluation: {
        gaps: ["The draft could cover the requested shape or constraints more completely."],
        notes: ["Gap: needs stronger buyer-ready actionability."],
      },
    },
    normalizedPayload: null,
    errorCode: null,
    failureCategory: null,
    lastErrorMessage: null,
    createdAt: now,
    updatedAt: now,
    startedAt: now,
    completedAt: now,
  });

  const improveCalls: Array<{ taskId: string; agentId: string; refinementContext: { sourceRunId: string; feedbackSummary: string[] } }> = [];
  service.attachExecutionEngine({
    async dispatchTask() {
      return { ok: true };
    },
    async requestImproveAgain(nextTaskId, nextAgentId, refinementContext) {
      improveCalls.push({
        taskId: nextTaskId,
        agentId: nextAgentId,
        refinementContext: {
          sourceRunId: refinementContext.sourceRunId,
          feedbackSummary: refinementContext.feedbackSummary,
        },
      });
      return { ok: true };
    },
  });

  const response = await service.requestImproveAgain(taskId, "0xbuyer");
  assert.equal(response.task.status, "EXECUTING");
  assert.equal(response.task.resultStatus, "in_progress");
  assert.deepEqual(improveCalls[0].taskId, taskId);
  assert.deepEqual(improveCalls[0].agentId, "agent_fast");
  assert.equal(improveCalls[0].refinementContext.sourceRunId, "run_prev");
  assert.ok(improveCalls[0].refinementContext.feedbackSummary.length > 0);
});

test("assisted consensus review can move a task into unresolved instead of naive approval", async () => {
  const store = new InMemoryRegistryStore();
  seedAgents(store);
  const consensusEvaluator = {
    ...evaluatorClient,
    async runConsensus() {
      return {
        evaluationId: "eval_consensus_1",
        taskId: "task_consensus",
        winningSubmissionId: "submission_1",
        scores: [],
        summary: "Validator agreement was too weak to finalize safely.",
        reasoning: "Mixed validator signals.",
        normalizedScore: 0.63,
        overallScore: 63,
        finalDecision: "needs_human_review",
        finalOutcome: "unresolved",
        consensusScore: 63,
        validatorAgreement: 0.33,
        consensusConfidence: 0.57,
        equivalenceSummary: "Partial equivalence but not enough for automatic finalization.",
        path: "subjective_consensus",
        findings: [],
        reviewerType: "genlayer_subjective",
        createdAt: new Date().toISOString(),
      };
    },
  };
  const service = new TaskMarketService(store, createRegistryServiceStub(store) as never, consensusEvaluator as never, new SafetyService(store));

  const created = service.createTaskDraft({
    title: "Consensus task",
    description: "Return a structured competitive brief with explicit constraints.",
    category: "research",
    rewardAmount: 90,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    hiringMode: "direct_hire",
    selectedAgentId: "agent_fast",
    attachments: [],
    evaluationPreference: "assisted_evaluation",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  });

  service.syncTaskWithChain(created.task.taskId, {
    createTxHash: "tx_create",
    fundTxHash: "tx_fund",
    assignTxHash: "tx_assign",
    onchainTaskRef: "onchain:consensus",
    latestReceipt: {
      hash: "tx_assign",
      status: "ACCEPTED",
      finalized: false,
      blockNumber: 150,
      createdAt: new Date().toISOString(),
    },
  });
  await service.markSubmissionReceived(created.task.taskId, "agent_fast", "memory://result", "hash_consensus");
  const reviewed = await service.reviewAssisted(created.task.taskId, "0xbuyer", service.getTask(created.task.taskId).latestSubmissionId!);

  assert.equal(reviewed.task.status, "UNRESOLVED");
  assert.equal(reviewed.task.resultStatus, "unresolved");
  assert.equal(reviewed.task.reviewActions.includes("appeal"), true);
});

test("appeal reruns consensus and can resolve a previously disputed task into approval", async () => {
  const store = new InMemoryRegistryStore();
  seedAgents(store);
  let consensusCalls = 0;
  const appealEvaluator = {
    ...evaluatorClient,
    async runConsensus() {
      consensusCalls += 1;
      return consensusCalls === 1
        ? {
            evaluationId: "eval_first",
            taskId: "task_appeal",
            winningSubmissionId: "submission_1",
            scores: [],
            summary: "Validator signals conflicted.",
            reasoning: "Conflicting assessment.",
            normalizedScore: 0.58,
            overallScore: 58,
            finalDecision: "needs_human_review",
            finalOutcome: "disputed",
            consensusScore: 58,
            validatorAgreement: 0.33,
            consensusConfidence: 0.55,
            equivalenceSummary: "Conflicting equivalence judgment.",
            path: "subjective_consensus",
            findings: [],
            reviewerType: "genlayer_subjective",
            createdAt: new Date().toISOString(),
          }
        : {
            evaluationId: "eval_appeal",
            taskId: "task_appeal",
            winningSubmissionId: "submission_1",
            scores: [],
            summary: "Appeal consensus now supports acceptance.",
            reasoning: "Stricter review converged.",
            normalizedScore: 0.84,
            overallScore: 84,
            finalDecision: "approve",
            finalOutcome: "accepted",
            consensusScore: 84,
            validatorAgreement: 0.67,
            consensusConfidence: 0.8,
            equivalenceSummary: "Appeal validators found the result equivalent enough to accept.",
            path: "subjective_consensus",
            findings: [],
            reviewerType: "genlayer_subjective",
            createdAt: new Date().toISOString(),
          };
    },
  };
  const service = new TaskMarketService(store, createRegistryServiceStub(store) as never, appealEvaluator as never, new SafetyService(store));

  const created = service.createTaskDraft({
    title: "Appeal task",
    description: "Return a strategic memo with recommendation and risks.",
    category: "research",
    rewardAmount: 90,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    hiringMode: "direct_hire",
    selectedAgentId: "agent_fast",
    attachments: [],
    evaluationPreference: "assisted_evaluation",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  });
  service.syncTaskWithChain(created.task.taskId, {
    createTxHash: "tx_create",
    fundTxHash: "tx_fund",
    assignTxHash: "tx_assign",
    onchainTaskRef: "onchain:appeal",
    latestReceipt: {
      hash: "tx_assign",
      status: "ACCEPTED",
      finalized: false,
      blockNumber: 151,
      createdAt: new Date().toISOString(),
    },
  });
  await service.markSubmissionReceived(created.task.taskId, "agent_fast", "memory://result", "hash_appeal");
  await service.reviewAssisted(created.task.taskId, "0xbuyer", service.getTask(created.task.taskId).latestSubmissionId!);
  const appealed = await service.appealTask(created.task.taskId, "0xbuyer", "The result should be judged on usefulness, not wording.");

  assert.equal(appealed.task.status, "APPROVED");
  assert.equal(appealed.task.resultStatus, "approved");
  assert.equal(appealed.task.appealRecord?.resolutionOutcome, "accepted");
});

test("onchain reconciliation updates stale submitted tasks into payout-ready states", async () => {
  const store = new InMemoryRegistryStore();
  seedAgents(store);
  const service = new TaskMarketService(store, createRegistryServiceStub(store) as never, evaluatorClient as never, new SafetyService(store));

  const created = service.createTaskDraft({
    title: "Reconcile review state",
    description: "Keep the offchain task aligned with the Arc contract review outcome.",
    category: "research",
    rewardAmount: 75,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    hiringMode: "direct_hire",
    selectedAgentId: "agent_fast",
    attachments: [],
    evaluationPreference: "hybrid_review",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  });

  store.tasks.set(created.task.taskId, {
    ...service.getTask(created.task.taskId),
    status: "SUBMITTED",
    resultStatus: "submitted",
    reviewActions: ["approve", "reject", "dispute"],
    latestSubmissionId: "sub:task:agent",
    onchainTaskRef: "0xmarket:task",
    transactionState: "accepted",
  });

  const approved = service.reconcileTaskFromOnchain(created.task.taskId, {
    state: 8,
    state_name: "APPROVED",
    escrow_locked: "75000000",
    latest_submission_id: "sub:task:agent",
  }, "0xmarket:task");

  assert.equal(approved.status, "APPROVED");
  assert.equal(approved.resultStatus, "approved");
  assert.deepEqual(approved.reviewActions, ["settle"]);

  const refunded = service.reconcileTaskFromOnchain(created.task.taskId, {
    state: 15,
    state_name: "REFUNDED",
    escrow_locked: "0",
    latest_submission_id: "sub:task:agent",
  }, "0xmarket:task");

  assert.equal(refunded.status, "REFUNDED");
  assert.equal(refunded.settlementState, "refunded");
  assert.deepEqual(refunded.reviewActions, []);
});

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

  assert.equal(created.task.erc8183Job?.standard, "erc-8183");
  assert.equal(created.task.erc8183Job?.dispatchTaskId, created.task.taskId);
  assert.equal(created.task.erc8183Job?.routing.hiringMode, "direct_hire");
  assert.equal(created.task.erc8183Job?.providerAgentId, "agent_fast");

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
  assert.equal(service.getTask(created.task.taskId).erc8183Job?.state, "dispatched");

  const accepted = await service.acceptTask(created.task.taskId, "0xagentA");
  assert.equal(accepted.task.status, "ASSIGNED");
  assert.ok(accepted.task.participatingAgentIds.includes("agent_fast"));
});

test("unfunded tasks cannot be accepted or executed", async () => {
  const store = new InMemoryRegistryStore();
  seedAgents(store);
  const service = new TaskMarketService(store, createRegistryServiceStub(store) as never, evaluatorClient as never, new SafetyService(store));

  const created = service.createTaskDraft({
    title: "Funding gate task",
    description: "Keep this task blocked until funding is confirmed.",
    category: "research",
    rewardAmount: 50,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    hiringMode: "direct_hire",
    selectedAgentId: "agent_fast",
    attachments: [],
    evaluationPreference: "hybrid_review",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  });

  await assert.rejects(() => service.acceptTask(created.task.taskId, "0xagentA"), /funded before assignment/i);
  await assert.rejects(() => service.markExecutionStarted(created.task.taskId, "agent_fast"), /funded before execution/i);
});

test("unfunded tasks cannot record submissions before funding confirmation", async () => {
  const store = new InMemoryRegistryStore();
  seedAgents(store);
  const service = new TaskMarketService(store, createRegistryServiceStub(store) as never, evaluatorClient as never, new SafetyService(store));

  const created = service.createTaskDraft({
    title: "Submission gate task",
    description: "Do not allow execution output until the reward is funded.",
    category: "research",
    rewardAmount: 50,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    hiringMode: "direct_hire",
    selectedAgentId: "agent_fast",
    attachments: [],
    evaluationPreference: "hybrid_review",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  });

  await assert.rejects(
    () => service.markSubmissionReceived(created.task.taskId, "agent_fast", "memory://result", "hash_blocked"),
    /funded before execution/i,
  );
});

test("submission and settlement keep ERC-8183 job state aligned without changing built-in task flow", async () => {
  const store = new InMemoryRegistryStore();
  seedAgents(store);
  const service = new TaskMarketService(store, createRegistryServiceStub(store) as never, evaluatorClient as never, new SafetyService(store));

  const created = service.createTaskDraft({
    title: "Portable dispatch brief",
    description: "Produce a structured brief that external agents could execute too.",
    category: "research",
    rewardAmount: 75,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    hiringMode: "direct_hire",
    selectedAgentId: "agent_fast",
    attachments: [],
    evaluationPreference: "hybrid_review",
    structuredNotes: "Preserve buyer constraints",
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  });

  service.syncTaskWithChain(created.task.taskId, {
    createTxHash: "tx_create_erc8183",
    fundTxHash: "tx_fund_erc8183",
    assignTxHash: "tx_assign_erc8183",
    onchainTaskRef: "onchain:erc8183",
    latestReceipt: {
      hash: "tx_assign_erc8183",
      status: "ACCEPTED",
      finalized: false,
      blockNumber: 501,
      createdAt: new Date().toISOString(),
    },
  });

  await service.markSubmissionReceived(created.task.taskId, "agent_fast", "memory://result", "hash_interop", "Ready", "submission_erc8183");
  assert.equal(service.getTask(created.task.taskId).erc8183Job?.state, "submitted");
  assert.equal(service.getTask(created.task.taskId).erc8183Job?.lastSubmissionAt !== null, true);
  await service.approveTask(created.task.taskId, "0xbuyer");
  const approvedJob = service.getTask(created.task.taskId).erc8183Job;
  assert.equal(approvedJob?.reward.tokenSymbol, "USDC");
  assert.equal(approvedJob?.dispatchMetadata.network && typeof approvedJob.dispatchMetadata.network === "object", true);
  assert.equal((approvedJob?.dispatchMetadata.reward as { funded?: boolean } | undefined)?.funded, true);
  assert.equal(approvedJob?.dispatchMetadata.settlementStatus, "pending_settlement");
  assert.equal(approvedJob?.outputRequirements && typeof approvedJob.outputRequirements === "object", true);

  service.markSettlement(created.task.taskId, {
    settlementId: "settlement_1",
    taskId: created.task.taskId,
    payoutWallet: "0xagentA",
    amountReleased: 73,
    platformFee: 2,
    agentPayout: 73,
    status: "settled",
    txReference: "tx_settle_1",
    createdAt: new Date().toISOString(),
  });

  assert.equal(service.getTask(created.task.taskId).erc8183Job?.state, "settled");
});

test("funded approved and disputed tasks expose settlement readiness summaries", async () => {
  const store = new InMemoryRegistryStore();
  seedAgents(store);
  const service = new TaskMarketService(store, createRegistryServiceStub(store) as never, evaluatorClient as never, new SafetyService(store));

  const approved = service.createTaskDraft({
    title: "Funded approval rail",
    description: "Make settlement the obvious next action after a funded approval.",
    category: "research",
    rewardAmount: 80,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    hiringMode: "direct_hire",
    selectedAgentId: "agent_fast",
    attachments: [],
    evaluationPreference: "user_review_only",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  });

  service.syncTaskWithChain(approved.task.taskId, {
    createTxHash: "tx_create_ready",
    fundTxHash: "tx_fund_ready",
    assignTxHash: "tx_assign_ready",
    onchainTaskRef: "onchain:settlement_ready",
    latestReceipt: {
      hash: "tx_assign_ready",
      status: "ACCEPTED",
      finalized: false,
      blockNumber: 321,
      createdAt: new Date().toISOString(),
    },
  });
  await service.markSubmissionReceived(approved.task.taskId, "agent_fast", "memory://ready", "hash_ready");
  await service.approveTask(approved.task.taskId, "0xbuyer");

  const approvedView = service.getTask(approved.task.taskId);
  assert.equal(approvedView.settlementSummary?.settlementAvailable, true);
  assert.equal(approvedView.settlementSummary?.settlementNextAction, "release_payment");
  assert.equal(approvedView.settlementSummary?.settlementReadinessLabel, "Approved. USDC release is ready.");

  const disputed = service.createTaskDraft({
    title: "Disputed settlement rail",
    description: "Keep payout paused when review confidence moves into a dispute path.",
    category: "research",
    rewardAmount: 90,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    hiringMode: "direct_hire",
    selectedAgentId: "agent_fast",
    attachments: [],
    evaluationPreference: "hybrid_review",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  });

  service.syncTaskWithChain(disputed.task.taskId, {
    createTxHash: "tx_create_disputed",
    fundTxHash: "tx_fund_disputed",
    assignTxHash: "tx_assign_disputed",
    onchainTaskRef: "onchain:settlement_disputed",
    latestReceipt: {
      hash: "tx_assign_disputed",
      status: "ACCEPTED",
      finalized: false,
      blockNumber: 322,
      createdAt: new Date().toISOString(),
    },
  });
  await service.markSubmissionReceived(disputed.task.taskId, "agent_fast", "memory://disputed", "hash_disputed");
  disputed.task.status = "DISPUTED";
  disputed.task.resultStatus = "disputed";
  disputed.task.settlementState = "disputed";
  disputed.task.disputeRecord = {
    disputeId: "disp_1",
    openedByWallet: "0xbuyer",
    reason: "Need manual review",
    status: "open",
    openedAt: new Date().toISOString(),
    resolvedAt: null,
    resolution: null,
  };
  store.tasks.set(disputed.task.taskId, disputed.task);

  const disputedView = service.getTask(disputed.task.taskId);
  assert.equal(disputedView.settlementSummary?.settlementAvailable, false);
  assert.equal(disputedView.settlementSummary?.settlementNextAction, "dispute_review");
  assert.equal(disputedView.settlementSummary?.settlementReadinessLabel, "Disputed. Settlement paused.");
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
    onchainTaskRef: "onchain:task_improve_again",
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

test("assisted review stays advisory and leaves owner approval available", async () => {
  const store = new InMemoryRegistryStore();
  seedAgents(store);
  const advisoryEvaluator = {
    ...evaluatorClient,
    async runAssisted() {
      return {
        evaluationId: "eval_advisory_1",
        taskId: "task_advisory",
        winningSubmissionId: "submission_1",
        scores: [],
        summary: "AI review confidence is medium, so the owner should inspect the result.",
        reasoning: "Mixed quality signals.",
        normalizedScore: 0.63,
        overallScore: 63,
        finalDecision: "needs_human_review",
        finalOutcome: "unresolved",
        consensusScore: 63,
        validatorAgreement: 0.33,
        consensusConfidence: 0.57,
        equivalenceSummary: "Partial fit; owner decision required.",
        path: "assisted_evaluation",
        findings: [],
        reviewerType: "machine_assisted",
        createdAt: new Date().toISOString(),
      };
    },
  };
  const service = new TaskMarketService(store, createRegistryServiceStub(store) as never, advisoryEvaluator as never, new SafetyService(store));

  const created = service.createTaskDraft({
    title: "Advisory task",
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
    onchainTaskRef: "onchain:advisory",
    latestReceipt: {
      hash: "tx_assign",
      status: "ACCEPTED",
      finalized: false,
      blockNumber: 150,
      createdAt: new Date().toISOString(),
    },
  });
  await service.markSubmissionReceived(created.task.taskId, "agent_fast", "memory://result", "hash_advisory");
  const reviewed = await service.reviewAssisted(created.task.taskId, "0xbuyer", service.getTask(created.task.taskId).latestSubmissionId!);

  assert.equal(reviewed.task.status, "UNDER_REVIEW");
  assert.equal(reviewed.task.resultStatus, "submitted");
  assert.equal(reviewed.task.reviewActions.includes("approve"), true);
  assert.equal(reviewed.task.reviewActions.includes("reject"), true);

  const advisorySubmissionId = service.getTask(created.task.taskId).latestSubmissionId!;
  const approved = await service.reviewWithUser(created.task.taskId, advisorySubmissionId, {
    taskId: created.task.taskId,
    submissionId: advisorySubmissionId,
    reviewerWallet: "0xbuyer",
    decision: "approve",
    starRating: 5,
    feedback: "The result is useful enough to approve.",
  });
  assert.equal(approved.task.status, "APPROVED");
  assert.equal(service.getTask(created.task.taskId).settlementSummary?.canReleasePayment, true);
});

test("appeal reruns consensus and can resolve a previously disputed task into approval", async () => {
  const store = new InMemoryRegistryStore();
  seedAgents(store);
  const appealEvaluator = {
    ...evaluatorClient,
    async runConsensus() {
      return {
        evaluationId: "eval_appeal",
        taskId: "task_appeal",
        winningSubmissionId: "submission_1",
        scores: [],
        summary: "Appeal review now supports acceptance.",
        reasoning: "Escalated review converged.",
        normalizedScore: 0.84,
        overallScore: 84,
        finalDecision: "approve",
        finalOutcome: "accepted",
        consensusScore: 84,
        validatorAgreement: 0.67,
        consensusConfidence: 0.8,
        equivalenceSummary: "Appeal review found the result strong enough to accept.",
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
  service.markDisputeOpened(created.task.taskId, "0xbuyer", "Manual dispute opened for appeal test.", {
    settlementId: "settlement_dispute",
    taskId: created.task.taskId,
    grossReward: 90,
    platformFee: 0,
    agentPayout: 0,
    refundAmount: 0,
    settlementTimestamp: new Date().toISOString(),
    txReference: "arc:dispute",
    settlementState: "disputed",
    outcome: "paused",
  });
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

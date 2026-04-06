import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryRegistryStore } from "../src/db/store";
import { TaskMarketService } from "../src/services/taskMarketService";
import { SettlementService } from "../src/services/settlementService";
import { SafetyService } from "../src/services/safetyService";

const registryService = {
  getAgent(agentId: string) {
    return {
      profile: {
        agentId,
        publicName: "Signal Forge",
        originType: "platform" as const,
        ownerWallet: "0xagent",
      },
    };
  },
};

const evaluatorClient = {
  async submitUserReview() {
    return {
      evaluationId: "eval_1",
      taskId: "task_1",
      winningSubmissionId: "submission_task_1_agent_1",
      scores: [],
      summary: "approved",
      reasoning: "ok",
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

test("settlement service computes platform fee and payout", async () => {
  const store = new InMemoryRegistryStore();
  store.upsertAgent({
    profile: {
      agentId: "agent_1",
      ownerWallet: "0xagent",
      publicName: "Signal Forge",
      slug: "signal-forge",
      description: "Research agent.",
      avatarUrl: null,
      originType: "platform",
      category: "research",
      capabilityTags: ["research"],
      endpointUrl: null,
      expectedLatencyMsRange: { minMs: 1000, maxMs: 5000 },
      pricingHint: "Research specialist.",
      activeVersionHash: "ver_signal",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    registrationState: "active",
    healthStatus: "healthy",
    compatibilityStatus: "compatible",
    latestVersionHash: "ver_signal",
    suspensionReason: null,
    compatibilityDeclaration: null,
  });
  const taskMarket = new TaskMarketService(store, registryService as never, evaluatorClient as never, new SafetyService(store));
  const settlement = new SettlementService(store, taskMarket, 250);

  const task = taskMarket.createTask({
    title: "Task",
    description: "Long enough task description for validation.",
    category: "research",
    rewardAmount: 200,
    deadline: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    hiringMode: "direct_hire",
    selectedAgentId: "agent_1",
    attachments: [],
    evaluationPreference: "user_review_only",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  }).task;

  taskMarket.syncTaskWithChain(task.taskId, {
    createTxHash: "tx_create",
    fundTxHash: "tx_fund",
    assignTxHash: "tx_assign",
    onchainTaskRef: `onchain:${task.taskId}`,
    latestReceipt: {
      hash: "tx_assign",
      status: "ACCEPTED",
      finalized: false,
      blockNumber: 123,
      createdAt: new Date().toISOString(),
    },
  });
  await taskMarket.markSubmissionReceived(task.taskId, "agent_1", "memory://result", "hash_1");
  await taskMarket.approveTask(task.taskId, "0xbuyer");
  const receipt = await settlement.settleApprovedTask(task.taskId, "0xbuyer");

  assert.equal(receipt.platformFee, 5);
  assert.equal(receipt.agentPayout, 195);
  assert.equal(receipt.payoutWallet, "0xagent");
});

test("settlement service preserves 6-decimal USDC precision", async () => {
  const store = new InMemoryRegistryStore();
  store.upsertAgent({
    profile: {
      agentId: "agent_1",
      ownerWallet: "0xagent",
      publicName: "Signal Forge",
      slug: "signal-forge",
      description: "Research agent.",
      avatarUrl: null,
      originType: "platform",
      category: "research",
      capabilityTags: ["research"],
      endpointUrl: null,
      expectedLatencyMsRange: { minMs: 1000, maxMs: 5000 },
      pricingHint: "Research specialist.",
      activeVersionHash: "ver_signal",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    registrationState: "active",
    healthStatus: "healthy",
    compatibilityStatus: "compatible",
    latestVersionHash: "ver_signal",
    suspensionReason: null,
    compatibilityDeclaration: null,
  });
  const taskMarket = new TaskMarketService(store, registryService as never, evaluatorClient as never, new SafetyService(store));
  const settlement = new SettlementService(store, taskMarket, 250);

  const task = taskMarket.createTask({
    title: "Fractional reward",
    description: "Long enough task description for validation.",
    category: "research",
    rewardAmount: 1.234567,
    deadline: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    hiringMode: "direct_hire",
    selectedAgentId: "agent_1",
    attachments: [],
    evaluationPreference: "user_review_only",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  }).task;

  taskMarket.syncTaskWithChain(task.taskId, {
    createTxHash: "tx_create_fractional",
    fundTxHash: "tx_fund_fractional",
    assignTxHash: "tx_assign_fractional",
    onchainTaskRef: `onchain:${task.taskId}`,
    latestReceipt: {
      hash: "tx_assign_fractional",
      status: "ACCEPTED",
      finalized: false,
      blockNumber: 126,
      createdAt: new Date().toISOString(),
    },
  });
  await taskMarket.markSubmissionReceived(task.taskId, "agent_1", "memory://result", "hash_fractional");
  await taskMarket.approveTask(task.taskId, "0xbuyer");
  const receipt = await settlement.settleApprovedTask(task.taskId, "0xbuyer");

  assert.equal(receipt.platformFee, 0.030864);
  assert.equal(receipt.agentPayout, 1.203703);
});

test("dispute pause and admin refund are recorded", async () => {
  const store = new InMemoryRegistryStore();
  const taskMarket = new TaskMarketService(store, registryService as never, evaluatorClient as never, new SafetyService(store));
  const settlement = new SettlementService(store, taskMarket, 250);

  const task = taskMarket.createTask({
    title: "Task",
    description: "Long enough task description for validation.",
    category: "research",
    rewardAmount: 120,
    deadline: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    hiringMode: "direct_hire",
    selectedAgentId: "agent_1",
    attachments: [],
    evaluationPreference: "hybrid_review",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 1,
  }).task;

  taskMarket.syncTaskWithChain(task.taskId, {
    createTxHash: "tx_create",
    fundTxHash: "tx_fund",
    assignTxHash: "tx_assign",
    onchainTaskRef: `onchain:${task.taskId}`,
    latestReceipt: {
      hash: "tx_assign",
      status: "ACCEPTED",
      finalized: false,
      blockNumber: 124,
      createdAt: new Date().toISOString(),
    },
  });
  await taskMarket.markSubmissionReceived(task.taskId, "agent_1", "memory://result", "hash_2");
  await settlement.pauseOnDispute(task.taskId, "0xbuyer", "The output omitted required sections.");
  const receipt = await settlement.resolveDispute(
    task.taskId,
    {
      adminWallet: "0xadmin",
      outcome: "refund_buyer",
      resolution: "Buyer receives refund because deliverable constraints were missed.",
    },
    new Set(["0xadmin"]),
  );

  assert.equal(receipt.refundAmount, 120);
  assert.equal(taskMarket.getTask(task.taskId).settlementState, "refunded");
});

test("cancellation before execution can be refunded", async () => {
  const store = new InMemoryRegistryStore();
  const taskMarket = new TaskMarketService(store, registryService as never, evaluatorClient as never, new SafetyService(store));
  const settlement = new SettlementService(store, taskMarket, 250);

  const task = taskMarket.createTask({
    title: "Task",
    description: "Long enough task description for validation.",
    category: "research",
    rewardAmount: 75,
    deadline: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    hiringMode: "open_market",
    selectedAgentId: null,
    attachments: [],
    evaluationPreference: "user_review_only",
    structuredNotes: null,
    creatorWallet: "0xbuyer",
    maxParticipants: 2,
  }).task;

  taskMarket.syncTaskWithChain(task.taskId, {
    createTxHash: "tx_create",
    fundTxHash: "tx_fund",
    assignTxHash: null,
    onchainTaskRef: `onchain:${task.taskId}`,
    latestReceipt: {
      hash: "tx_fund",
      status: "ACCEPTED",
      finalized: false,
      blockNumber: 125,
      createdAt: new Date().toISOString(),
    },
  });

  await taskMarket.cancelTask(task.taskId, "0xbuyer");
  const receipt = await settlement.refundTask(task.taskId, "0xbuyer");

  assert.equal(receipt.refundAmount, 75);
  assert.equal(taskMarket.getTask(task.taskId).status, "REFUNDED");
});

test("settlement is paused when consensus leaves a task unresolved", async () => {
  const store = new InMemoryRegistryStore();
  const taskMarket = new TaskMarketService(store, registryService as never, evaluatorClient as never, new SafetyService(store));
  const settlement = new SettlementService(store, taskMarket, 250);

  const now = new Date().toISOString();
  store.tasks.set("task_unresolved", {
    taskId: "task_unresolved",
    title: "Task",
    description: "Long enough task description for validation.",
    category: "research",
    rewardAmount: 110,
    deadline: now,
    status: "UNRESOLVED",
    resultStatus: "unresolved",
    creatorWallet: "0xbuyer",
    creatorDisplay: "0xbuyer",
    selectedAgentId: "agent_1",
    participatingAgentIds: ["agent_1"],
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
    selectedAgents: [{ agentId: "agent_1", displayName: "Signal Forge", originType: "platform" }],
    reviewActions: ["appeal"],
    latestSubmissionId: "submission_1",
    latestSubmissionTxHash: null,
    latestEvaluation: null,
    userReview: null,
    settlementState: "unresolved",
    latestSettlement: null,
    disputeRecord: null,
    appealRecord: null,
  });

  await assert.rejects(
    () => settlement.settleApprovedTask("task_unresolved", "0xbuyer"),
    /payout-safe final state/i,
  );
});

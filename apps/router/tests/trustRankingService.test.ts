import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryRegistryStore } from "../src/db/store";
import { TrustRankingService } from "../src/services/trustRankingService";

function seedAgent(store: InMemoryRegistryStore, input: {
  agentId: string;
  ownerWallet: string;
  publicName: string;
  category: string;
  createdAt?: string;
}) {
  store.upsertAgent({
    profile: {
      agentId: input.agentId,
      ownerWallet: input.ownerWallet,
      publicName: input.publicName,
      slug: input.publicName.toLowerCase().replace(/\s+/g, "-"),
      description: "A production-minded marketplace agent with real execution history.",
      avatarUrl: null,
      originType: "external",
      category: input.category as never,
      capabilityTags: [input.category],
      endpointUrl: "https://agent.example.com",
      expectedLatencyMsRange: { minMs: 1000, maxMs: 12000 },
      pricingHint: "Clear pricing",
      activeVersionHash: `ver_${input.agentId}`,
      isActive: true,
      createdAt: input.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    registrationState: "active",
    healthStatus: "healthy",
    compatibilityStatus: "compatible",
    latestVersionHash: `ver_${input.agentId}`,
    suspensionReason: null,
    compatibilityDeclaration: {
      supportedCategories: [input.category],
      declaredLatencyEstimateMs: 3000,
      declaredMaxPayloadSize: 200000,
      versionHashOrFingerprint: `ver_${input.agentId}`,
    },
  });
}

test("trust ranking builds leaderboard buckets and badges", () => {
  const store = new InMemoryRegistryStore();
  seedAgent(store, {
    agentId: "agent_alpha",
    ownerWallet: "0xalpha",
    publicName: "Alpha Ops",
    category: "operations",
    createdAt: new Date().toISOString(),
  });
  seedAgent(store, {
    agentId: "agent_beta",
    ownerWallet: "0xbeta",
    publicName: "Beta Research",
    category: "research",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  });

  const approvedAt = new Date().toISOString();
  store.tasks.set("task_1", {
    taskId: "task_1",
    title: "Ops cleanup",
    description: "Handle back-office cleanup.",
    category: "operations",
    rewardAmount: 140,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    status: "SETTLED",
    resultStatus: "settled",
    creatorWallet: "0xbuyer1",
    creatorDisplay: "0xbuy...yer1",
    selectedAgentId: "agent_alpha",
    participatingAgentIds: ["agent_alpha"],
    maxParticipants: 1,
    transactionState: "accepted",
    onchainTaskRef: "onchain:task_1",
    createdAt: approvedAt,
    updatedAt: approvedAt,
    attachments: [],
    evaluationPreference: "hybrid_review",
    structuredNotes: null,
    hiringMode: "direct_hire",
    timeline: [],
    selectedAgents: [{ agentId: "agent_alpha", displayName: "Alpha Ops", originType: "external" }],
    reviewActions: [],
    latestEvaluation: {
      evaluationId: "eval_1",
      taskId: "task_1",
      winningSubmissionId: "submission_1",
      scores: [{ submissionId: "submission_1", agentId: "agent_alpha", score: 92, normalizedScore: 0.92, notes: "great" }],
      summary: "Strong delivery",
      reasoning: "Handled well",
      normalizedScore: 0.92,
      overallScore: 92,
      finalDecision: "approve",
      path: "hybrid_review",
      findings: [],
      reviewerType: "machine_assisted",
      createdAt: approvedAt,
    },
    userReview: null,
    settlementState: "settled",
    latestSettlement: {
      settlementId: "settlement_1",
      grossReward: 140,
      platformFee: 3.5,
      agentPayout: 136.5,
      refundAmount: 0,
      settlementTimestamp: approvedAt,
      txReference: "bradbury:tx_1",
      outcome: "paid",
    },
    disputeRecord: null,
  });

  store.tasks.set("task_2", {
    taskId: "task_2",
    title: "Market scan",
    description: "Research competitor pricing.",
    category: "research",
    rewardAmount: 100,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    status: "REFUNDED",
    resultStatus: "rejected",
    creatorWallet: "0xbuyer1",
    creatorDisplay: "0xbuy...yer1",
    selectedAgentId: "agent_beta",
    participatingAgentIds: ["agent_beta"],
    maxParticipants: 1,
    transactionState: "accepted",
    onchainTaskRef: "onchain:task_2",
    createdAt: approvedAt,
    updatedAt: approvedAt,
    attachments: [],
    evaluationPreference: "user_review_only",
    structuredNotes: null,
    hiringMode: "direct_hire",
    timeline: [],
    selectedAgents: [{ agentId: "agent_beta", displayName: "Beta Research", originType: "external" }],
    reviewActions: [],
    latestEvaluation: null,
    userReview: {
      taskId: "task_2",
      submissionId: "submission_2",
      reviewerWallet: "0xbuyer1",
      decision: "reject",
      starRating: 2,
      feedback: "Too shallow",
      rejectionReason: "Missed the requested detail",
    },
    settlementState: "refunded",
    latestSettlement: {
      settlementId: "settlement_2",
      grossReward: 100,
      platformFee: 0,
      agentPayout: 0,
      refundAmount: 100,
      settlementTimestamp: approvedAt,
      txReference: "bradbury:tx_2",
      outcome: "refunded",
    },
    disputeRecord: null,
  });

  store.settlements.set("task_1", [
    {
      settlementId: "settlement_1",
      taskId: "task_1",
      grossReward: 140,
      platformFee: 3.5,
      agentPayout: 136.5,
      refundAmount: 0,
      settlementTimestamp: approvedAt,
      txReference: "bradbury:tx_1",
      settlementState: "settled",
      outcome: "paid",
    },
  ]);
  store.settlements.set("task_2", [
    {
      settlementId: "settlement_2",
      taskId: "task_2",
      grossReward: 100,
      platformFee: 0,
      agentPayout: 0,
      refundAmount: 100,
      settlementTimestamp: approvedAt,
      txReference: "bradbury:tx_2",
      settlementState: "refunded",
      outcome: "refunded",
    },
  ]);
  store.executionRuns.set("run_1", {
    runId: "run_1",
    requestId: "request_1",
    taskId: "task_1",
    agentId: "agent_alpha",
    ownerWallet: "0xalpha",
    endpointUrl: "https://agent.example.com",
    callbackUrl: "https://router.example.com/callback",
    state: "completed",
    attempt: 1,
    maxRetries: 1,
    nextRetryAt: null,
    timeoutAt: new Date(Date.now() + 5000).toISOString(),
    executionMode: "sync",
    remoteRunId: "remote_1",
    resultPointer: "memory://result/1",
    resultHash: "hash_1",
    rawPayload: {},
    normalizedPayload: {},
    errorCode: null,
    failureCategory: null,
    lastErrorMessage: null,
    createdAt: approvedAt,
    updatedAt: approvedAt,
    startedAt: new Date(Date.now() - 5000).toISOString(),
    completedAt: new Date().toISOString(),
  });

  const service = new TrustRankingService(store);
  service.recomputeAll();

  const leaderboards = service.getLeaderboards();
  assert.equal(leaderboards.buckets.length, 5);
  assert.equal(leaderboards.buckets[0].items[0].agentId, "agent_alpha");

  const alpha = service.getAgentTrustProfile("agent_alpha");
  assert.equal(alpha.reputation.tasksAttempted, 1);
  assert.equal(alpha.reputation.tasksCompleted, 1);
  assert.equal(alpha.reputation.successRate, 1);
  assert.equal(alpha.reputation.totalReviews, 1);
  assert.equal(alpha.reputation.totalEarnings, 136.5);
  assert.equal(alpha.reputation.status, "new");
  assert.ok(typeof alpha.reputation.rankPosition === "number");
  assert.ok(alpha.reputation.trustBadges.some((badge) => badge.id === "verified_compatible"));

  const beta = service.getAgentTrustProfile("agent_beta");
  assert.equal(beta.reputation.successRate, 0);
  assert.equal(beta.reputation.totalReviews, 1);
  assert.equal(beta.reputation.status, "active");
  assert.ok((alpha.reputation.rankScore || 0) > (beta.reputation.rankScore || 0));

  const buyer = service.getUserTrust("0xbuyer1");
  assert.equal(buyer.userTrust.tasksPosted, 2);
  assert.equal(buyer.userTrust.cancellationCount, 0);
});

test("inactive agents are marked unavailable and new agents are damped in ranking", () => {
  const store = new InMemoryRegistryStore();
  seedAgent(store, {
    agentId: "agent_new",
    ownerWallet: "0xnew",
    publicName: "New Agent",
    category: "research",
    createdAt: new Date().toISOString(),
  });
  seedAgent(store, {
    agentId: "agent_unavailable",
    ownerWallet: "0xoff",
    publicName: "Unavailable Agent",
    category: "research",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
  });
  const unavailable = store.agents.get("agent_unavailable");
  unavailable.profile.isActive = false;
  unavailable.healthStatus = "suspended";

  const service = new TrustRankingService(store);
  service.recomputeAll();

  const fresh = service.getAgentTrustProfile("agent_new");
  const paused = service.getAgentTrustProfile("agent_unavailable");

  assert.equal(fresh.reputation.status, "new");
  assert.equal(fresh.reputation.rankScore, 0);
  assert.equal(paused.reputation.status, "unavailable");
});

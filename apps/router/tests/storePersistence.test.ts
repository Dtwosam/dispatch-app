import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryRegistryStore } from "../src/db/store";

test("store snapshot round-trip preserves tasks and runs", () => {
  const store = new InMemoryRegistryStore();
  store.tasks.set("task_1", {
    taskId: "task_1",
    title: "Persist me",
    description: "Persistence should keep this task across restarts.",
    category: "research",
    rewardAmount: 25,
    deadline: new Date("2026-03-31T10:00:00.000Z").toISOString(),
    status: "SUBMITTED",
    resultStatus: "submitted",
    creatorWallet: "0xbuyer",
    creatorDisplay: "0xbuyer",
    selectedAgentId: "platform_briefly",
    participatingAgentIds: ["platform_briefly"],
    maxParticipants: 1,
    transactionState: "accepted",
    onchainTaskRef: "onchain:task_1",
    createdAt: new Date("2026-03-29T10:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-03-29T10:00:00.000Z").toISOString(),
    attachments: [],
    evaluationPreference: "hybrid_review",
    structuredNotes: "Persisted result summary",
    hiringMode: "direct_hire",
    timeline: [],
    selectedAgents: [{ agentId: "platform_briefly", displayName: "Briefly", originType: "platform" }],
    reviewActions: ["approve", "reject"],
    latestSubmissionId: "submission_1",
    latestSubmissionTxHash: "tx_1",
    latestEvaluation: null,
    userReview: null,
    settlementState: "reward_funded",
    latestSettlement: null,
    disputeRecord: null,
  });
  store.executionRuns.set("run_1", {
    runId: "run_1",
    requestId: "req_1",
    taskId: "task_1",
    agentId: "platform_briefly",
    ownerWallet: "0xowner",
    endpointUrl: "platform://platform_briefly",
    callbackUrl: "http://localhost:4020/api/execution/callback",
    state: "completed",
    attempt: 1,
    maxRetries: 0,
    nextRetryAt: null,
    timeoutAt: new Date("2026-03-29T10:01:00.000Z").toISOString(),
    executionMode: "sync",
    remoteRunId: null,
    resultPointer: "memory://results/run_1",
    resultHash: "hash_1",
    rawPayload: { finalOutput: { summary: "Persisted output", sections: [] } },
    normalizedPayload: null,
    errorCode: null,
    failureCategory: null,
    lastErrorMessage: null,
    createdAt: new Date("2026-03-29T10:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-03-29T10:00:10.000Z").toISOString(),
    startedAt: new Date("2026-03-29T10:00:00.000Z").toISOString(),
    completedAt: new Date("2026-03-29T10:00:10.000Z").toISOString(),
  });
  store.erc8183Jobs.set("task_1", {
    standard: "erc-8183",
    mode: "adapter",
    dispatchTaskId: "task_1",
    jobId: "erc8183:task_1",
    payloadHash: "hash_payload_1",
    state: "submitted",
    requester: "0xbuyer",
    providerAgentId: "platform_briefly",
    evaluator: "0xbuyer",
    title: "Persist me",
    description: "Persistence should keep this task across restarts.",
    category: "research",
    constraints: ["evaluation_preference:hybrid_review"],
    reward: {
      amount: "25",
      tokenAddress: null,
      tokenSymbol: "USDC",
      tokenDecimals: 6,
    },
    deadlineTimestamp: Math.floor(new Date("2026-03-31T10:00:00.000Z").getTime() / 1000),
    routing: {
      hiringMode: "direct_hire",
      selectedAgentId: "platform_briefly",
      maxParticipants: 1,
    },
    attachments: [],
    outputRequirements: {
      resultStatus: "submitted",
      expectedReview: "hybrid_review",
      taskId: "task_1",
    },
    dispatchMetadata: {
      structuredNotes: "Persisted result summary",
      onchainTaskRef: "onchain:task_1",
      status: "SUBMITTED",
      resultStatus: "submitted",
      transactionState: "accepted",
    },
    inputPointer: null,
    hook: null,
    contractAddress: null,
    onchainJobId: null,
    notes: ["Persist this too"],
    createdAt: new Date("2026-03-29T10:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-03-29T10:00:10.000Z").toISOString(),
    lastDispatchedAt: null,
    lastSubmissionAt: new Date("2026-03-29T10:00:10.000Z").toISOString(),
    lastSettledAt: null,
  });

  const restored = new InMemoryRegistryStore();
  restored.importSnapshot(store.exportSnapshot());

  assert.equal(restored.tasks.get("task_1")?.title, "Persist me");
  assert.equal(restored.tasks.get("task_1")?.transactionState, "accepted");
  assert.equal(restored.executionRuns.get("run_1")?.taskId, "task_1");
  assert.equal(
    (restored.executionRuns.get("run_1")?.rawPayload as { finalOutput?: { summary?: string } })?.finalOutput?.summary,
    "Persisted output",
  );
  assert.equal(restored.erc8183Jobs.get("task_1")?.jobId, "erc8183:task_1");
  assert.equal(restored.erc8183Jobs.get("task_1")?.state, "submitted");
});

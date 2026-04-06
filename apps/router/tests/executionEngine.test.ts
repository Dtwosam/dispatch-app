import test from "node:test";
import assert from "node:assert/strict";
import { canonicalize } from "../src/lib/canonicalize";
import { hashCanonicalPayload } from "../src/lib/hash";
import { ExecutionRetryPolicy } from "../src/services/executionRetryPolicy";
import { ExecutionSecurity } from "../src/services/executionSecurity";
import { ResultStore } from "../src/services/resultStore";
import { ExecutionWorker } from "../src/services/executionWorker";
import { InMemoryRegistryStore } from "../src/db/store";
import { ExecutionLogStore } from "../src/services/executionLogStore";
import { bootstrapPlatformAgents } from "../src/services/platformAgentCatalog";
import { ExecutionEngine } from "../src/services/executionEngine";
import { SafetyService } from "../src/services/safetyService";

test("canonicalize produces stable ordering for object keys", () => {
  const a = { b: 2, a: 1, nested: { z: 3, y: 2 } };
  const b = { nested: { y: 2, z: 3 }, a: 1, b: 2 };
  assert.equal(canonicalize(a), canonicalize(b));
  assert.equal(hashCanonicalPayload(a), hashCanonicalPayload(b));
});

test("retry policy uses exponential backoff and terminal checks", () => {
  const policy = new ExecutionRetryPolicy(1000);
  const run = {
    attempt: 2,
    maxRetries: 4,
    errorCode: null,
    nextRetryAt: null,
    state: "failed",
    updatedAt: new Date().toISOString(),
  };
  const delay = policy.scheduleRetry(run as never);
  assert.equal(delay, 2000);
  assert.equal(run.state, "queued");
  assert.equal(policy.canRetry(run as never), true);

  run.errorCode = "UNAUTHORIZED";
  assert.equal(policy.canRetry(run as never), false);
});

test("execution security signs and verifies callback payloads", () => {
  const security = new ExecutionSecurity("secret");
  const signature = security.signCallback({
    requestId: "req_1",
    runId: "run_1",
    nonce: "nonce_1",
  });
  assert.equal(
    security.verifyCallback({
      requestId: "req_1",
      runId: "run_1",
      nonce: "nonce_1",
      signature,
    }),
    true,
  );
  assert.equal(
    security.verifyCallback({
      requestId: "req_1",
      runId: "run_1",
      nonce: "nonce_1",
      signature: "bad",
    }),
    false,
  );
});

test("execution worker rejects empty and partial results", async () => {
  const store = new InMemoryRegistryStore();
  const logs = new ExecutionLogStore(store);
  const resultStore = new ResultStore();
  const worker = new ExecutionWorker(store, logs, resultStore);

  const originalFetch = global.fetch;
  global.fetch = (async (url: string) => {
    if (url.includes("/result/")) {
      return new Response(
        JSON.stringify({
          result: {},
          structuredMetadata: {},
          completedAt: new Date().toISOString(),
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        state: "completed",
        progress: 1,
        resultPointer: "memory://pointer",
        error: null,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  await assert.rejects(
    () =>
      worker.fetchResult({
        runId: "run_1",
        remoteRunId: "remote_1",
        endpointUrl: "http://example.com",
      } as never),
    /empty result payload/i,
  );

  global.fetch = originalFetch;
});

test("built-in platform runs persist staged quality artifacts", async () => {
  const store = new InMemoryRegistryStore();
  bootstrapPlatformAgents(store);
  const now = new Date().toISOString();
  const task = {
    taskId: "task_platform_quality",
    title: "Summarize leadership update",
    description: "Q2 revenue exceeded plan by 12 percent. Customer churn improved after onboarding changes. Hiring remains frozen until Q3 planning.",
    category: "summarization",
    rewardAmount: 220,
    deadline: now,
    status: "ASSIGNED",
    resultStatus: "not_started",
    creatorWallet: "0xbuyer",
    creatorDisplay: "0xbuyer",
    selectedAgentId: "platform_briefly",
    participatingAgentIds: ["platform_briefly"],
    maxParticipants: 1,
    transactionState: "accepted",
    onchainTaskRef: null,
    createdAt: now,
    updatedAt: now,
    attachments: [],
    evaluationPreference: "hybrid_review",
    structuredNotes: "Quality: high_quality",
    hiringMode: "direct_hire",
    timeline: [],
    selectedAgents: [{ agentId: "platform_briefly", displayName: "Briefly", originType: "platform" }],
    reviewActions: [],
    latestEvaluation: null,
    userReview: null,
    settlementState: "reward_funded",
    latestSettlement: null,
    disputeRecord: null,
  };
  store.tasks.set(task.taskId, task);

  let submissionRecorded = false;
  const engine = new ExecutionEngine(
    store,
    {
      getTask(taskId: string) {
        assert.equal(taskId, task.taskId);
        return store.tasks.get(taskId);
      },
      async markExecutionStarted() {},
      async markSubmissionReceived() {
        submissionRecorded = true;
      },
      markExecutionFailed() {
        throw new Error("built-in run should not fail in this test");
      },
    } as never,
    {
      getAgent(agentId: string) {
        const row = store.agents.get(agentId);
        assert.ok(row);
        return {
          profile: row.profile,
          performanceSummary: store.ensurePerformance(agentId),
        };
      },
    } as never,
    new SafetyService(store),
    {
      maxRetries: 0,
      baseBackoffMs: 100,
      timeoutMs: 10000,
      endpointAllowlist: [],
    },
  );

  await engine.dispatchTask(task.taskId, "platform_briefly");

  const run = [...store.executionRuns.values()][0];
  assert.ok(run);
  assert.equal(submissionRecorded, true);
  assert.ok(run.normalizedPayload);
  assert.ok(run.rawPayload);
  assert.equal(run.state, "completed");
  assert.ok(run.resultPointer);
  assert.ok(run.resultHash);
  assert.equal(run.rawPayload.mode, "high_quality");
  assert.ok(run.rawPayload.structuredTask);
  assert.ok(run.rawPayload.draftOutput);
  assert.ok(run.rawPayload.finalOutput);
  assert.ok(run.rawPayload.stageTimingsMs.total >= 0);
});

test("Improve Again creates a new built-in run with refinement context", async () => {
  const store = new InMemoryRegistryStore();
  bootstrapPlatformAgents(store);
  const now = new Date().toISOString();
  const task = {
    taskId: "task_platform_refine",
    title: "Summarize leadership update",
    description: "Revenue beat plan. Churn improved. Hiring remains frozen.",
    category: "summarization",
    rewardAmount: 80,
    deadline: now,
    status: "EXECUTING",
    resultStatus: "in_progress",
    creatorWallet: "0xbuyer",
    creatorDisplay: "0xbuyer",
    selectedAgentId: "platform_briefly",
    participatingAgentIds: ["platform_briefly"],
    maxParticipants: 1,
    transactionState: "accepted",
    onchainTaskRef: null,
    createdAt: now,
    updatedAt: now,
    attachments: [],
    evaluationPreference: "user_review_only",
    structuredNotes: "Quality: fast",
    hiringMode: "direct_hire",
    timeline: [],
    selectedAgents: [{ agentId: "platform_briefly", displayName: "Briefly", originType: "platform" }],
    reviewActions: [],
    latestEvaluation: null,
    userReview: null,
    settlementState: "reward_funded",
    latestSettlement: null,
    disputeRecord: null,
  };
  store.tasks.set(task.taskId, task);

  const engine = new ExecutionEngine(
    store,
    {
      getTask(taskId: string) {
        assert.equal(taskId, task.taskId);
        return store.tasks.get(taskId);
      },
      async markExecutionStarted() {},
      async markSubmissionReceived() {},
      markExecutionFailed() {
        throw new Error("refinement run should not fail in this test");
      },
    } as never,
    {
      getAgent(agentId: string) {
        const row = store.agents.get(agentId);
        assert.ok(row);
        return {
          profile: row.profile,
          performanceSummary: store.ensurePerformance(agentId),
        };
      },
    } as never,
    new SafetyService(store),
    {
      maxRetries: 0,
      baseBackoffMs: 100,
      timeoutMs: 10000,
      endpointAllowlist: [],
    },
  );

  await engine.requestImproveAgain(task.taskId, "platform_briefly", {
    sourceRunId: "run_prev",
    requestedByWallet: "0xbuyer",
    previousMode: "fast",
    previousScore: 67,
    previousConfidence: "medium",
    feedbackSummary: ["Increase completeness.", "Make the result easier to approve quickly."],
  });

  const run = [...store.executionRuns.values()][0];
  assert.ok(run);
  assert.equal(run.rawPayload.refinement.sourceRunId, "run_prev");
  assert.equal(run.rawPayload.mode, "balanced");
});

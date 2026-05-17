import test from "node:test";
import assert from "node:assert/strict";
import { buildAgentIdentityBadges, buildRecentAgentWork, buildTaskLifecycleModel, buildTaskResultModel } from "./ui-models.js";

test("platform agents expose the Platform Agent badge for marketplace rendering", () => {
  const badges = buildAgentIdentityBadges({
    profile: {
      originType: "platform",
      skillCategories: ["research"],
    },
    performanceSummary: {
      status: "active",
      rankPosition: 2,
      tasksAttempted: 2,
    },
  });

  assert.ok(badges.includes("Platform Agent"));
  assert.ok(badges.includes("Research"));
});

test("external agents expose marketplace and interoperability badges", () => {
  const badges = buildAgentIdentityBadges({
    profile: {
      originType: "external",
      skillCategories: ["writing"],
    },
    performanceSummary: {
      status: "active",
      rankPosition: null,
      tasksAttempted: 1,
    },
  });

  assert.ok(badges.includes("External Agent"));
  assert.ok(badges.includes("ERC-8183 compatible"));
});

test("top and new badges are added from marketplace reputation state", () => {
  const topBadges = buildAgentIdentityBadges({
    profile: {
      originType: "external",
      skillCategories: [],
    },
    performanceSummary: {
      status: "active",
      rankPosition: 1,
      tasksAttempted: 4,
    },
  });

  const newBadges = buildAgentIdentityBadges({
    profile: {
      originType: "external",
      skillCategories: [],
    },
    performanceSummary: {
      status: "new",
      rankPosition: null,
      tasksAttempted: 0,
    },
  });

  assert.ok(topBadges.includes("Top Agent"));
  assert.ok(newBadges.includes("New"));
});

test("recent work uses task summaries and safe titles instead of full private content", () => {
  const items = buildRecentAgentWork(
    {
      profile: { agentId: "agent_1" },
    },
    {
      completedTasks: [
        {
          taskId: "task_1",
          title: "Very long private customer migration analysis title that should be safely shortened before rendering on profile",
          category: "research",
          status: "SETTLED",
          resultStatus: "settled",
          rewardAmount: 12,
          settlementSummary: {
            settlementReadinessLabel: "Payment released.",
          },
          latestEvaluation: {
            overallScore: 86,
          },
          participatingAgentIds: ["agent_1"],
          createdAt: "2026-04-01T10:00:00.000Z",
          updatedAt: "2026-04-03T10:00:00.000Z",
        },
      ],
      rejectedTasks: [],
      disputedTasks: [],
    },
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].approvalIndicator, "Paid");
  assert.ok(items[0].title.endsWith("..."));
  assert.equal(items[0].category, "Research");
  assert.equal(items[0].rewardAmount, 12);
  assert.equal(items[0].evaluationScore, 86);
  assert.equal(items[0].settlementStatus, "Payment released.");
});

test("task lifecycle marks approved funded work as settlement ready before payout", () => {
  const model = buildTaskLifecycleModel({
    taskId: "task_1",
    status: "APPROVED",
    resultStatus: "approved",
    transactionState: "accepted",
    settlementState: "pending_settlement",
    onchainTaskRef: "0xescrow:task_1",
    rewardAmount: 5,
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-03T10:00:00.000Z",
    selectedAgents: [{ agentId: "agent_1", displayName: "Thread Writer", originType: "platform" }],
    participatingAgentIds: ["agent_1"],
    reviewActions: ["settle"],
    timeline: [],
  });

  assert.equal(model.fundingLabel, "Funded");
  assert.equal(model.evaluationLabel, "Approved");
  assert.equal(model.settlementLabel, "Ready for settlement");
  assert.equal(model.settlementMessage, "Approved. USDC release is ready.");
});

test("task lifecycle marks refunded work as closed with reward refunded", () => {
  const model = buildTaskLifecycleModel({
    taskId: "task_2",
    status: "REFUNDED",
    resultStatus: "rejected",
    transactionState: "accepted",
    settlementState: "refunded",
    onchainTaskRef: "0xescrow:task_2",
    rewardAmount: 3,
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-03T10:00:00.000Z",
    selectedAgents: [],
    participatingAgentIds: [],
    reviewActions: [],
    latestSettlement: {
      settlementId: "set_1",
      grossReward: 3,
      platformFee: 0,
      agentPayout: 0,
      refundAmount: 3,
      settlementTimestamp: "2026-04-03T10:00:00.000Z",
      txReference: null,
      outcome: "refunded",
    },
    timeline: [],
  });

  assert.equal(model.settlementLabel, "Reward refunded");
  assert.equal(model.settlementMessage, "Reward refunded.");
  assert.equal(model.steps.at(-1).label, "Refund closed");
});

test("task lifecycle prefers backend settlement summaries for refund-ready and disputed messaging", () => {
  const refundModel = buildTaskLifecycleModel({
    taskId: "task_refund_ready",
    status: "REJECTED",
    resultStatus: "rejected",
    transactionState: "accepted",
    settlementState: "pending_settlement",
    onchainTaskRef: "0xescrow:task_refund_ready",
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-03T10:00:00.000Z",
    settlementSummary: {
      settlementAvailable: true,
      settlementNextAction: "refund_reward",
      settlementReadinessLabel: "Rejected. Refund available.",
      canReleasePayment: false,
      canRefund: true,
      isFunded: true,
    },
    selectedAgents: [],
    participatingAgentIds: [],
    reviewActions: [],
    timeline: [],
  });

  const disputedModel = buildTaskLifecycleModel({
    taskId: "task_disputed",
    status: "DISPUTED",
    resultStatus: "disputed",
    transactionState: "accepted",
    settlementState: "disputed",
    onchainTaskRef: "0xescrow:task_disputed",
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-03T10:00:00.000Z",
    settlementSummary: {
      settlementAvailable: false,
      settlementNextAction: "dispute_review",
      settlementReadinessLabel: "Disputed. Settlement paused.",
      canReleasePayment: false,
      canRefund: false,
      isFunded: true,
    },
    selectedAgents: [],
    participatingAgentIds: [],
    reviewActions: [],
    timeline: [],
  });

  assert.equal(refundModel.settlementLabel, "Refund available");
  assert.equal(refundModel.settlementMessage, "Rejected. Refund available.");
  assert.equal(disputedModel.settlementMessage, "Disputed. Settlement paused.");
});

test("live Arc-submitted tasks disable Improve Again before it can hit submit_task", () => {
  const model = buildTaskResultModel(
    {
      taskId: "task_arc",
      status: "SUBMITTED",
      settlementState: "reward_funded",
      onchainTaskRef: "0xbd79cff0ff452b566f7c84ffc4dd4a2ee24c73eb:task_arc",
      structuredNotes: "Submitted result",
      selectedAgents: [{ originType: "platform" }],
    },
    [{
      runId: "run_arc",
      state: "completed",
      endpointUrl: "platform://thread-writer",
      updatedAt: "2026-04-03T10:00:00.000Z",
      rawPayload: {
        finalOutput: { summary: "Final", sections: [] },
      },
    }],
  );

  assert.equal(model.canImproveAgain, false);
  assert.match(model.improveAgainUnavailableReason, /cannot safely reopen execution/);
});

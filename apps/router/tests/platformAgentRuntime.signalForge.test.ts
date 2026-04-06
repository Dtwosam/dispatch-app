import test from "node:test";
import assert from "node:assert/strict";
import type { TaskDetailView } from "@marketplace/shared";
import { PlatformAgentRuntime } from "../src/services/platformAgentRuntime";

const runtime = new PlatformAgentRuntime();

function makeTask(overrides: Partial<TaskDetailView> = {}): TaskDetailView {
  const now = new Date().toISOString();
  return {
    taskId: "task_runtime_signal_forge",
    title: "Assess mid-market expansion",
    description: "Need a strategy recommendation for competitor repositioning.",
    category: "research",
    rewardAmount: 50,
    deadline: now,
    status: "OPEN",
    resultStatus: "not_started",
    creatorWallet: "0xbuyer",
    selectedAgentId: null,
    participatingAgentIds: [],
    maxParticipants: 1,
    transactionState: "accepted",
    onchainTaskRef: null,
    createdAt: now,
    updatedAt: now,
    attachments: [],
    evaluationPreference: "hybrid_review",
    structuredNotes: null,
    hiringMode: "open_market",
    timeline: [],
    creatorDisplay: "0xbuyer",
    selectedAgents: [],
    reviewActions: [],
    latestEvaluation: null,
    userReview: null,
    settlementState: "reward_funded",
    latestSettlement: null,
    disputeRecord: null,
    ...overrides,
  };
}

test("Signal Forge stays bounded when research evidence is thin", async () => {
  const result = await runtime.execute(
    "platform_signal_forge",
    makeTask({
      title: "Research competitor repositioning",
      description: "Need a strategy recommendation for competitor repositioning.",
      structuredNotes: null,
    }),
  );

  assert.equal(result.payload.confidence, "low");
  assert.ok(result.payload.sections.some((section) => section.heading === "Signal"));
  assert.ok(result.payload.uncertainties.some((item) => /evidence/i.test(item)));
});

test("Signal Forge separates strong signals from evidence limits", async () => {
  const result = await runtime.execute(
    "platform_signal_forge",
    makeTask({
      title: "Assess mid-market expansion",
      description: [
        "3 recent deals closed at ~$120k ACV.",
        "Sales cycle increased from 14 to 35 days.",
        "No quantified ROI data is available yet.",
      ].join("\n"),
      structuredNotes: "Need a 2-quarter strategy brief.",
    }),
  );

  const signalSection = result.payload.sections.find((section) => section.heading === "Signal");
  const limitsSection = result.payload.sections.find((section) => section.heading === "Evidence Limits");
  assert.ok(signalSection);
  assert.ok(limitsSection);
  assert.ok(signalSection!.bullets.some((item) => /120k ACV|14 to 35 days/i.test(item)));
  assert.ok(limitsSection!.bullets.some((item) => /No quantified ROI data/i.test(item)));
});

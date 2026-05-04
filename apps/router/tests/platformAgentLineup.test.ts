import test from "node:test";
import assert from "node:assert/strict";
import type { TaskDetailView } from "@marketplace/shared";
import { getUserFacingBuiltInPlatformAgents, isDeprecatedBuiltInPlatformAgentId } from "../src/services/platformAgentCatalog";
import { PlatformAgentRuntime } from "../src/services/platformAgentRuntime";

const runtime = new PlatformAgentRuntime();

function makeTask(overrides: Partial<TaskDetailView> = {}): TaskDetailView {
  const now = new Date().toISOString();
  return {
    taskId: "task_lineup",
    title: "Turn launch notes into content",
    description: "We launched a creator payout dashboard. It helps operators see pending reviews, approved payouts, and agent performance in one place.",
    category: "writing",
    rewardAmount: 1,
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
    structuredNotes: "Audience: marketplace founders\nTone: clear and useful\nOutput: ready to publish",
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

test("user-facing built-in lineup is the five job-shaped agents", () => {
  const agents = getUserFacingBuiltInPlatformAgents();

  assert.deepEqual(agents.map((agent) => agent.agentId), [
    "platform_thread_writer",
    "platform_summarizer",
    "platform_rewriter",
    "platform_research_brief",
    "platform_content_repurposer",
  ]);
  assert.equal(agents.some((agent) => isDeprecatedBuiltInPlatformAgentId(agent.agentId)), false);
});

test("new built-in agents produce specialized output sections", async () => {
  const expectations = [
    ["platform_thread_writer", ["Hook", "Thread", "CTA (optional)"]],
    ["platform_summarizer", ["Summary", "Key Points", "Actionable (if applicable)"]],
    ["platform_rewriter", ["Polished Version", "Simplified Version (optional)"]],
    ["platform_research_brief", ["Overview", "Key Insights", "Pros", "Risks", "Conclusion"]],
    ["platform_content_repurposer", ["Thread", "Summary", "Bullet Points", "Short Post"]],
  ] as const;

  for (const [agentId, headings] of expectations) {
    const result = await runtime.execute(agentId, makeTask());
    const actualHeadings = result.payload.sections.map((section) => section.heading);
    for (const heading of headings) {
      assert.ok(actualHeadings.includes(heading), `${agentId} should include ${heading}`);
    }
    assert.equal(result.payload.executionSource, "heuristic");
  }
});

test("new built-in agents use the two-step quality pipeline without polish", async () => {
  const result = await runtime.execute("platform_thread_writer", makeTask());

  assert.equal(result.payload.qualityMode, "balanced");
  assert.ok(result.trace.draftOutput);
  assert.ok(result.trace.evaluation);
  assert.ok(result.trace.improvedOutput);
  assert.equal(result.trace.polishedOutput, null);
  assert.equal(result.trace.stageTimingsMs.polish, 0);
  assert.ok(result.trace.evaluation?.notes.some((note) => /Agent-specific criteria/.test(note)));
});

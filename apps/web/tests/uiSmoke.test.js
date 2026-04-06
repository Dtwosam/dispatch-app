import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAgentIdentityBadges,
  buildAgentProfileHighlights,
  buildHomeSnapshot,
  buildPostTaskChecklist,
  buildReviewPanelModel,
  buildTaskResultModel,
  shortWallet,
} from "../src/ui-models.js";

test("home snapshot counts open, active, completed tasks and agents", () => {
  const snapshot = buildHomeSnapshot({
    tasks: {
      allOpenTasks: [{}, {}],
      activeTasks: [{}, {}, {}],
      completedTasks: [{}],
    },
    agents: [{}, {}, {}],
  });

  assert.deepEqual(snapshot, {
    openCount: 2,
    completedCount: 1,
    activeCount: 3,
    agentCount: 3,
  });
});

test("post task checklist reflects direct-hire readiness", () => {
  const checklist = buildPostTaskChecklist(
    {
      title: "Pricing page rewrite",
      description: "Rewrite the pricing page with clearer value communication and stronger CTA hierarchy.",
      hiringMode: "direct_hire",
      selectedAgentId: "agent_1",
      evaluationPreference: "hybrid_review",
      maxParticipants: 1,
    },
    {
      profile: { publicName: "CopySprint" },
    },
  );

  assert.equal(checklist.items.every((item) => item.complete), true);
  assert.match(checklist.summary, /CopySprint/);
});

test("agent profile highlights keep trust module readable", () => {
  const highlights = buildAgentProfileHighlights({
    performanceSummary: {
      approvalRate: 0.94,
      averageScore: 91,
      tasksCompleted: 18,
      totalEarnings: 1420,
    },
  });

  assert.equal(highlights.length, 4);
  assert.match(highlights[0], /94% approval/);
});

test("review panel model keeps primary actions simple", () => {
  const reviewModel = buildReviewPanelModel({
    status: "SUBMITTED",
    settlementState: "reward_funded",
    latestEvaluation: null,
  });

  assert.deepEqual(reviewModel.primaryActions, ["approve", "reject"]);
  assert.deepEqual(reviewModel.advancedActions, ["assisted", "hybrid", "dispute"]);
  assert.equal(shortWallet("0xbuyer001122334455"), "0xbuye...4455");
});

test("task result model surfaces built-in run quality metadata cleanly", () => {
  const resultModel = buildTaskResultModel(
    {
      structuredNotes: "Fallback final result",
      status: "SUBMITTED",
      settlementState: "reward_funded",
      selectedAgents: [{ originType: "platform" }],
    },
    [
      {
        completedAt: new Date().toISOString(),
        endpointUrl: "platform://platform_briefly",
        rawPayload: {
          mode: "high_quality",
          score: 91,
          confidence: "high",
          structuredTask: { task: "Summarize leadership update" },
          draftOutput: { summary: "Draft summary", sections: [], nextActions: [], uncertainties: [], confidence: "medium" },
          finalOutput: {
            summary: "Final summary",
            sections: [{ heading: "Top Line", bullets: ["Revenue beat plan by 12 percent."] }],
            nextActions: ["Approve if ready for payout."],
            uncertainties: [],
            confidence: "high",
          },
          evaluation: { overall: 91 },
          stageTimingsMs: { structuring: 10, generation: 20, evaluation: 8, improvement: 12, polish: 5, total: 55 },
        },
      },
    ],
  );

  assert.equal(resultModel.qualityScore, 91);
  assert.equal(resultModel.confidence, "high");
  assert.equal(resultModel.modeUsed, "high_quality");
  assert.equal(resultModel.workerLabel, "Platform Agent");
  assert.equal(resultModel.hasDraft, true);
  assert.equal(resultModel.canImproveAgain, true);
  assert.match(resultModel.finalOutputText, /Revenue beat plan by 12 percent/);
});

test("platform agents get marketplace identity badges", () => {
  const badges = buildAgentIdentityBadges({
    profile: {
      originType: "platform",
    },
  });

  assert.deepEqual(badges, ["Platform Agent"]);
});

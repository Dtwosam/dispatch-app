import assert from "node:assert/strict";
import { createMarketplaceChainClient } from "../src/chain-client.js";
import {
  buildAgentIdentityBadges,
  buildAgentProfileHighlights,
  buildHomeSnapshot,
  buildPostTaskChecklist,
  buildReviewPanelModel,
  buildTaskResultModel,
  shortWallet,
} from "../src/ui-models.js";

async function main() {
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

  const highlights = buildAgentProfileHighlights({
    performanceSummary: {
      approvalRate: 0.94,
      averageScore: 91,
      tasksCompleted: 18,
      totalEarnings: 1420,
    },
  });
  assert.equal(highlights.length, 5);
  assert.match(highlights[0], /94% approval/);

  const reviewModel = buildReviewPanelModel({
    status: "SUBMITTED",
    settlementState: "reward_funded",
    latestEvaluation: null,
  });
  assert.deepEqual(reviewModel.primaryActions, ["approve", "reject"]);
  assert.equal(shortWallet("0xbuyer001122334455"), "0xbuye...4455");

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
  assert.equal(resultModel.workerLabel, "Platform Agent");
  assert.equal(resultModel.hasDraft, true);
  assert.equal(resultModel.canImproveAgain, true);
  assert.deepEqual(buildAgentIdentityBadges({ profile: { originType: "platform" } }), ["Platform Agent"]);

  const events = [];
  const originalFetch = global.fetch;
  let receiptCalls = 0;

  global.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/chain/config")) {
      return new Response(JSON.stringify({ chainMode: "server_signer_proxy" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/api/chain/receipts/")) {
      receiptCalls += 1;
      return new Response(JSON.stringify({
        hash: "tx_1",
        status: receiptCalls < 2 ? "PENDING" : "ACCEPTED",
        finalized: false,
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.endsWith("/api/chain/task-create")) {
      return new Response(JSON.stringify({
        taskId: "task_1",
        createTxHash: "tx_create",
        fundTxHash: "tx_fund",
        assignTxHash: null,
        latestReceipt: { hash: "tx_fund", status: "PENDING" },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`Unexpected fetch ${url}`);
  };

  const client = createMarketplaceChainClient({
    apiBase: "http://localhost:4020",
    getWalletAddress: () => "0xbuyer",
    onStatus: (state, message) => events.push(`${state}:${message}`),
  });

  await assert.rejects(() => client.createTaskLifecycle({
    taskId: "task_1",
    rewardAmount: 100,
    deadlineIso: new Date().toISOString(),
    taskMode: "single",
    metadataUri: "offchain://task_1",
    metadataHash: "hash_1",
    selectedAgentId: null,
  }), /GenLayer must be signed/);

  const receipt = await client.pollReceipt("tx_fund", { intervalMs: 0, maxAttempts: 3 });
  assert.equal(receipt.status, "ACCEPTED");
  assert.ok(events.some((item) => item.includes("accepted")));

  global.fetch = originalFetch;
  console.log("web smoke passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

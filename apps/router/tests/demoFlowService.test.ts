import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryRegistryStore } from "../src/db/store";
import { DemoFlowService } from "../src/services/demoFlowService";
import { SafetyService } from "../src/services/safetyService";
import { SettlementService } from "../src/services/settlementService";
import { TaskMarketService } from "../src/services/taskMarketService";
import { TrustRankingService } from "../src/services/trustRankingService";

const evaluatorClient = {
  async submitUserReview() { return null; },
  async runAssisted() { return null; },
  async runHybrid() { return null; },
  async runConsensus() { return null; },
  async confirmHybrid() { return null; },
};

function seedThreadWriter(store: InMemoryRegistryStore) {
  const now = new Date().toISOString();
  store.upsertAgent({
    profile: {
      agentId: "platform_thread_writer",
      ownerWallet: "platform_agent_wallet",
      publicName: "Thread Writer",
      slug: "thread-writer",
      description: "Turn any link, article, notes, or rough idea into a Twitter/X thread.",
      avatarUrl: null,
      originType: "platform",
      category: "writing",
      capabilityTags: ["X threads", "hooks", "CTA"],
      skills: ["thread_writing"],
      skillCategories: ["writing"],
      endpointUrl: null,
      expectedLatencyMsRange: { minMs: 2500, maxMs: 10000 },
      pricingHint: "Best for launch threads.",
      activeVersionHash: "ver_thread_writer",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    registrationState: "active",
    healthStatus: "healthy",
    compatibilityStatus: "compatible",
    latestVersionHash: "ver_thread_writer",
    suspensionReason: null,
    compatibilityDeclaration: null,
  });
}

function registryStub(store: InMemoryRegistryStore) {
  return {
    getAgent(agentId: string) {
      const row = store.agents.get(agentId);
      assert.ok(row, `agent ${agentId} should exist`);
      return {
        profile: row.profile,
        performanceSummary: store.ensurePerformance(agentId),
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

function createDemoHarness() {
  const store = new InMemoryRegistryStore();
  seedThreadWriter(store);
  const taskMarket = new TaskMarketService(store, registryStub(store) as never, evaluatorClient as never, new SafetyService(store));
  const settlement = new SettlementService(store, taskMarket, 250);
  const trust = new TrustRankingService(store);
  return {
    store,
    demo: new DemoFlowService(store, taskMarket, settlement, trust),
  };
}

test("Thread Writer demo advances through funded work, review, settlement, and paid reputation", async () => {
  const previous = process.env.DISPATCH_ENABLE_DEMO_FUNDING_FALLBACK;
  process.env.DISPATCH_ENABLE_DEMO_FUNDING_FALLBACK = "true";
  try {
    const { store, demo } = createDemoHarness();
    const started = demo.startThreadWriterDemo({ creatorWallet: "0xbuyer" });
    assert.equal(started.stage, "funded_assigned");
    assert.equal(started.task.rewardAmount, 10);
    assert.equal(started.task.status, "ASSIGNED");
    assert.equal(started.task.onchainTaskRef?.startsWith("demo:"), true);
    assert.equal(started.task.erc8183Job?.reward.tokenSymbol, "USDC");

    const running = await demo.advanceThreadWriterDemo(started.task.taskId, { actorWallet: "0xbuyer" });
    assert.equal(running.stage, "execution_started");
    assert.equal(running.task.status, "EXECUTING");

    const submitted = await demo.advanceThreadWriterDemo(started.task.taskId, { actorWallet: "0xbuyer" });
    assert.equal(submitted.stage, "output_submitted");
    assert.equal(submitted.task.status, "SUBMITTED");
    assert.ok([...store.executionRuns.values()].some((run) => run.rawPayload && run.state === "completed"));

    const reviewed = await demo.advanceThreadWriterDemo(started.task.taskId, { actorWallet: "0xbuyer" });
    assert.equal(reviewed.stage, "review_approved");
    assert.equal(reviewed.task.status, "APPROVED");
    assert.equal(reviewed.task.latestEvaluation?.overallScore, 86);
    assert.equal(reviewed.task.settlementSummary?.canReleasePayment, true);

    const paid = await demo.advanceThreadWriterDemo(started.task.taskId, { actorWallet: "0xbuyer" });
    assert.equal(paid.stage, "payment_released");
    assert.equal(paid.task.status, "SETTLED");
    assert.equal(paid.task.settlementSummary?.settlementReadinessLabel, "Payment released.");
    const performance = store.ensurePerformance("platform_thread_writer");
    assert.equal(performance.paidTasksCompleted, 1);
    assert.equal(performance.paidEarnings, 9.75);
    assert.equal(performance.approvalRate, 1);
  } finally {
    if (previous === undefined) {
      delete process.env.DISPATCH_ENABLE_DEMO_FUNDING_FALLBACK;
    } else {
      process.env.DISPATCH_ENABLE_DEMO_FUNDING_FALLBACK = previous;
    }
  }
});

test("Thread Writer demo is explicitly disabled unless demo funding fallback is enabled", () => {
  const previous = process.env.DISPATCH_ENABLE_DEMO_FUNDING_FALLBACK;
  delete process.env.DISPATCH_ENABLE_DEMO_FUNDING_FALLBACK;
  try {
    const { demo } = createDemoHarness();
    assert.throws(
      () => demo.startThreadWriterDemo({ creatorWallet: "0xbuyer" }),
      /Demo flow is disabled\. Enable DISPATCH_ENABLE_DEMO_FUNDING_FALLBACK=true for local demo mode\./,
    );
  } finally {
    if (previous === undefined) {
      delete process.env.DISPATCH_ENABLE_DEMO_FUNDING_FALLBACK;
    } else {
      process.env.DISPATCH_ENABLE_DEMO_FUNDING_FALLBACK = previous;
    }
  }
});

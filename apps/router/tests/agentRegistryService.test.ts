import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { InMemoryRegistryStore } from "../src/db/store";
import { AgentRegistryService } from "../src/services/agentRegistryService";
import { CompatibilityValidator } from "../src/services/compatibilityValidator";
import { HealthcheckRunner } from "../src/services/healthcheckRunner";
import { OwnerProofService } from "../src/services/ownerProofService";
import { DevelopmentOwnerProofVerifier } from "../src/services/ownerProofVerifier";
import { SafetyService } from "../src/services/safetyService";

async function createRegistryHarness() {
  const store = new InMemoryRegistryStore();
  const safety = new SafetyService(store);
  const verifier = new DevelopmentOwnerProofVerifier();
  const ownerProofService = new OwnerProofService(store, verifier);
  const healthcheckRunner = new HealthcheckRunner();
  const compatibilityValidator = new CompatibilityValidator(healthcheckRunner);
  const registry = new AgentRegistryService(store, ownerProofService, healthcheckRunner, compatibilityValidator, safety);

  const challenge = ownerProofService.issueChallenge("0xowner");
  const signature = createHash("sha256")
    .update(`0xowner::${challenge.message}`)
    .digest("hex");
  const verified = await ownerProofService.verifyChallenge(challenge.challengeId, "0xowner", signature);

  return {
    store,
    registry,
    proofId: verified.proofId!,
  };
}

test("registry registers and activates a platform agent", async () => {
  const { registry, proofId } = await createRegistryHarness();

  const registered = await registry.registerAgent({
    ownerProofId: proofId,
    ownerWallet: "0xowner",
    publicName: "Research Brief",
    slug: "research-brief",
    description: "Research a topic and break it down clearly.",
    avatarUrl: null,
    originType: "platform",
    category: "research",
    capabilityTags: ["research", "briefing"],
    endpointUrl: null,
    expectedLatencyMsRange: { minMs: 1200, maxMs: 8000 },
    pricingHint: "Strong for strategic briefs.",
    activeVersionHash: "ver_research_brief",
  });

  assert.equal(registered.registrationState, "draft");
  assert.equal(registered.profile.isActive, false);

  const published = await registry.publishVersion(registered.profile.agentId, {
    ownerWallet: "0xowner",
    version: {
      versionHash: "ver_signal_forge_v2",
      agentId: registered.profile.agentId,
      configType: "hybrid",
      systemPrompt: "Do sharp market analysis.",
      tools: ["structured_formatter"],
      outputSchema: { type: "object" },
      knowledgeAssetRefs: ["note://briefing-rules"],
      publishedAt: new Date().toISOString(),
    },
    runHealthcheck: false,
    runCompatibilityProbe: false,
  });
  const active = registry.activate(registered.profile.agentId, "0xowner");

  assert.equal(published.latestVersion?.versionHash, "ver_signal_forge_v2");
  assert.equal(active.registrationState, "active");
  assert.equal(active.profile.isActive, true);
});

test("registry can deactivate and admin suspend an agent", async () => {
  const { registry, proofId } = await createRegistryHarness();
  const registered = await registry.registerAgent({
    ownerProofId: proofId,
    ownerWallet: "0xowner",
    publicName: "PatchPilot",
    slug: "patchpilot",
    description: "Code helper for debugging and patch plans.",
    avatarUrl: null,
    originType: "platform",
    category: "code_helper",
    capabilityTags: ["bugfix", "patch"],
    endpointUrl: null,
    expectedLatencyMsRange: { minMs: 1400, maxMs: 9000 },
    pricingHint: "Best for scoped engineering tasks.",
    activeVersionHash: "ver_patchpilot",
  });

  registry.activate(registered.profile.agentId, "0xowner");
  const inactive = registry.deactivate(registered.profile.agentId, "0xowner");
  const suspended = registry.suspend(
    registered.profile.agentId,
    {
      adminWallet: "0xadmin",
      reason: "Disabled after repeated suspicious responses.",
    },
    new Set(["0xadmin"]),
  );

  assert.equal(inactive.registrationState, "inactive");
  assert.equal(suspended.registrationState, "suspended");
  assert.equal(suspended.suspensionReason, "Disabled after repeated suspicious responses.");
});

test("registry ensures built-in platform agents exist without duplicates", async () => {
  const { registry, store } = await createRegistryHarness();

  registry.ensurePlatformAgents();
  const firstPassIds = registry.listAgents().map((agent) => agent.profile.agentId);
  registry.ensurePlatformAgents();
  const secondPassIds = registry.listAgents().map((agent) => agent.profile.agentId);

  assert.deepEqual(firstPassIds.sort(), [
    "platform_content_repurposer",
    "platform_research_brief",
    "platform_rewriter",
    "platform_summarizer",
    "platform_thread_writer",
  ]);
  assert.ok(!firstPassIds.includes("platform_signal_forge"));
  assert.ok(!firstPassIds.includes("platform_copysprint"));
  assert.equal(firstPassIds.length, secondPassIds.length);
  assert.ok(store.agents.has("platform_signal_forge"));
  assert.ok(store.agents.size > firstPassIds.length);
});

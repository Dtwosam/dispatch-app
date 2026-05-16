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

test("registry stores external agent integration metadata and performance defaults", async () => {
  const store = new InMemoryRegistryStore();
  const safety = new SafetyService(store);
  const verifier = new DevelopmentOwnerProofVerifier();
  const ownerProofService = new OwnerProofService(store, verifier);
  const challenge = ownerProofService.issueChallenge("0xowner");
  const signature = createHash("sha256")
    .update(`0xowner::${challenge.message}`)
    .digest("hex");
  const verified = await ownerProofService.verifyChallenge(challenge.challengeId, "0xowner", signature);
  const healthcheckRunner = {
    async run() {
      return {
        ok: true,
        latencyMs: 120,
        payload: {
          ok: true,
          version: "1.0.0",
          supportedTaskTypes: ["research"],
          maxInputBytes: 500000,
          averageLatencyHintMs: 2000,
          schemaVersion: "dispatch-agent-v1",
        },
        errorMessage: null,
      };
    },
  };
  const compatibilityValidator = {
    async validateAgent() {
      return {
        compatible: true,
        compatibilityStatus: "compatible" as const,
        checkedAt: new Date().toISOString(),
        notes: ["ERC-8183 job envelope accepted."],
        healthcheck: {
          ok: true,
          version: "1.0.0",
          supportedTaskTypes: ["research"],
          maxInputBytes: 500000,
          averageLatencyHintMs: 2000,
          schemaVersion: "dispatch-agent-v1",
        },
        executeProbeAccepted: true,
        executeProbeMode: "async" as const,
      };
    },
  };
  const registry = new AgentRegistryService(store, ownerProofService, healthcheckRunner as never, compatibilityValidator as never, safety);

  const registered = await registry.registerAgent({
    ownerProofId: verified.proofId!,
    ownerWallet: "0xowner",
    publicName: "External Research Runtime",
    slug: "external-research-runtime",
    description: "External endpoint-backed agent that accepts funded research jobs.",
    avatarUrl: null,
    originType: "external",
    developerName: "Acme Agents",
    category: "research",
    capabilityTags: ["research", "external"],
    skills: ["research"],
    skillCategories: ["research"],
    endpointUrl: "https://agents.example.com",
    webhookUrl: "https://agents.example.com/dispatch-webhook",
    adapterType: "erc8183_adapter",
    outputSchema: { type: "object", fields: ["summary", "sources"] },
    payoutWallet: "0xpayout",
    erc8183Compatible: true,
    expectedLatencyMsRange: { minMs: 1000, maxMs: 5000 },
    pricingHint: "External paid research jobs.",
    activeVersionHash: "ver_external_research",
    compatibility: {
      supportedCategories: ["research"],
      declaredLatencyEstimateMs: 5000,
      declaredMaxPayloadSize: 250000,
      versionHashOrFingerprint: "ver_external_research",
    },
  });

  assert.equal(registered.profile.originType, "external");
  assert.equal(registered.profile.developerName, "Acme Agents");
  assert.equal(registered.profile.adapterType, "erc8183_adapter");
  assert.equal(registered.profile.erc8183Compatible, true);
  assert.equal(registered.profile.payoutWallet, "0xpayout");
  assert.equal(registered.profile.connectionStatus, "connected");
  assert.equal(registered.registrationState, "verified");
  assert.equal(registered.compatibilityStatus, "compatible");
  assert.equal(registered.performanceSummary.paidTasksCompleted, 0);
  assert.equal(registered.performanceSummary.paidEarnings, 0);
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

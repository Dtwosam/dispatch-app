import test from "node:test";
import assert from "node:assert/strict";
import { CompatibilityValidator } from "../src/services/compatibilityValidator";
import { HealthcheckRunner } from "../src/services/healthcheckRunner";

const baseAgent = {
  profile: {
    agentId: "agent_external",
    ownerWallet: "0xowner",
    publicName: "CopySprint",
    slug: "copysprint",
    description: "External conversion writer.",
    avatarUrl: null,
    originType: "external" as const,
    category: "writing",
    capabilityTags: ["copywriting"],
    endpointUrl: "http://agent.example.com",
    expectedLatencyMsRange: { minMs: 1000, maxMs: 12000 },
    pricingHint: "Fast turnaround.",
    activeVersionHash: "ver_1",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  registrationState: "verified" as const,
  healthStatus: "healthy" as const,
  compatibilityStatus: "unknown" as const,
  latestVersionHash: "ver_1",
  suspensionReason: null,
  compatibilityDeclaration: {
    supportedCategories: ["writing"],
    declaredLatencyEstimateMs: 4000,
    declaredMaxPayloadSize: 4000,
    versionHashOrFingerprint: "ver_1",
  },
};

test("compatibility validator marks a healthy endpoint compatible", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async (input: string, init?: RequestInit) => {
    if (input.endsWith("/health")) {
      return new Response(JSON.stringify({
        ok: true,
        version: "1.0.0",
        supportedTaskTypes: ["writing", "translation"],
        maxInputBytes: 10000,
        averageLatencyHintMs: 3200,
        signedOwnerProof: null,
        schemaVersion: "agent-adapter-v1",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }

    if (input.endsWith("/execute")) {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.taskType, "writing");
      return new Response(JSON.stringify({
        accepted: true,
        executionMode: "sync",
        runId: "run_probe",
        estimatedCompletionMs: 1200,
        immediateResult: { summary: "Probe accepted" },
        error: null,
      }), { status: 200, headers: { "content-type": "application/json" } });
    }

    throw new Error(`Unexpected fetch: ${input}`);
  }) as typeof fetch;

  const validator = new CompatibilityValidator(new HealthcheckRunner());
  const report = await validator.validateAgent(baseAgent as never, baseAgent.compatibilityDeclaration, true);

  assert.equal(report.compatible, true);
  assert.equal(report.compatibilityStatus, "compatible");
  assert.equal(report.executeProbeAccepted, true);

  global.fetch = originalFetch;
});

test("compatibility validator warns when declared categories are not exposed", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async (input: string) => {
    if (input.endsWith("/health")) {
      return new Response(JSON.stringify({
        ok: true,
        version: "1.0.0",
        supportedTaskTypes: ["translation"],
        maxInputBytes: 10000,
        averageLatencyHintMs: 3200,
        signedOwnerProof: null,
        schemaVersion: "agent-adapter-v1",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }

    if (input.endsWith("/execute")) {
      return new Response(JSON.stringify({
        accepted: true,
        executionMode: "sync",
        runId: "run_probe",
        estimatedCompletionMs: 1200,
        immediateResult: { summary: "Probe accepted" },
        error: null,
      }), { status: 200, headers: { "content-type": "application/json" } });
    }

    throw new Error(`Unexpected fetch: ${input}`);
  }) as typeof fetch;

  const validator = new CompatibilityValidator(new HealthcheckRunner());
  const report = await validator.validateAgent(baseAgent as never, baseAgent.compatibilityDeclaration, true);

  assert.equal(report.compatibilityStatus, "warning");
  assert.ok(report.notes.some((note) => note.includes("declared categories")));

  global.fetch = originalFetch;
});

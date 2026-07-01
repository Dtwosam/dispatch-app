import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAgentStackReadinessSummary,
  isNodeVersionReady,
  parseCircleHelpResources,
  readAgentStackReadinessConfig,
  redactReadinessOutput,
  runAgentStackReadiness,
} from "./nano-agent-stack-readiness.mjs";

test("Agent Stack readiness redacts token-looking output", () => {
  const secretKey = `0x${"a".repeat(64)}`;
  const bearer = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payloadpart.signature";
  const url = "https://example.test/path?token=super-secret-token&ok=1";
  const redacted = redactReadinessOutput(`${secretKey} ${bearer} ${url}`);

  assert.doesNotMatch(redacted, /aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/);
  assert.doesNotMatch(redacted, /super-secret-token/);
  assert.match(redacted, /\[redacted\]/);
});

test("Agent Stack readiness parses Circle CLI resources from help output", () => {
  const resources = parseCircleHelpResources("Commands: wallet gateway services transfer");

  assert.equal(resources.wallet, true);
  assert.equal(resources.gateway, true);
  assert.equal(resources.services, true);
});

test("Agent Stack readiness checks Node version floor", () => {
  assert.equal(isNodeVersionReady("v20.18.2"), true);
  assert.equal(isNodeVersionReady("v22.0.0"), true);
  assert.equal(isNodeVersionReady("v20.18.1"), false);
});

test("Agent Stack readiness summary never claims live custody or browser payment changes", () => {
  const summary = buildAgentStackReadinessSummary({
    nodeReady: true,
    nodeVersion: "v22.0.0",
    circleVersion: { ok: true, command: "circle", stdout: "circle 1.0.0", stderr: "" },
    circleHelp: { ok: true, command: "circle", stdout: "wallet gateway services", stderr: "" },
    arcCanteenHelp: { ok: true, command: "arc-canteen", stdout: "usage", stderr: "" },
    arcCanteenStatus: { ok: false, command: "arc-canteen", stdout: "", stderr: "not logged in" },
  });

  assert.equal(summary.ready, true);
  assert.equal(summary.agentWalletRuntimeLive, false);
  assert.equal(summary.circleWalletCustodyLive, false);
  assert.equal(summary.browserPaymentChanged, false);
  assert.equal(summary.autonomousAgentSpendingLive, false);
  assert.equal(summary.arcCanteenStatusReady, false);
});

test("Agent Stack readiness blocks when tools are missing unless partial is allowed", async () => {
  const runner = async (command, args) => ({
    ok: false,
    command,
    args,
    stdout: "",
    stderr: "not found",
  });

  const blocked = await runAgentStackReadiness({ allowPartial: false }, { runner, nodeVersion: "v22.0.0" });
  const partial = await runAgentStackReadiness({ allowPartial: true }, { runner, nodeVersion: "v22.0.0" });

  assert.equal(blocked.mode, "blocked");
  assert.equal(blocked.ready, false);
  assert.equal(partial.mode, "partial");
  assert.equal(partial.ready, true);
  assert.equal(partial.agentWalletRuntimeLive, false);
  assert.equal(partial.circleWalletCustodyLive, false);
  assert.equal(partial.browserPaymentChanged, false);
});

test("Agent Stack readiness env config only enables explicit partial mode", () => {
  assert.equal(readAgentStackReadinessConfig({}).allowPartial, false);
  assert.equal(readAgentStackReadinessConfig({ NANO_AGENT_STACK_READINESS_ALLOW_PARTIAL: "1" }).allowPartial, true);
});

#!/usr/bin/env node

import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const MIN_NODE_VERSION = "20.18.2";
const EXPECTED_CIRCLE_RESOURCES = ["wallet", "gateway", "services"];
const SECRET_PATTERNS = [
  /0x[a-fA-F0-9]{64}/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/gi,
  /\b(?:sk|pk|api|key|token|secret|jwt)_[A-Za-z0-9._-]{16,}/gi,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g,
];

export function redactReadinessOutput(value) {
  let output = String(value ?? "");
  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, "[redacted]");
  }
  output = output.replace(/([?&](?:token|key|secret|signature|authorization)=)[^&\s]+/gi, "$1[redacted]");
  return output;
}

function boolEnv(value) {
  return String(value ?? "").trim() === "1" || String(value ?? "").toLowerCase() === "true";
}

export function readAgentStackReadinessConfig(env = process.env) {
  return {
    allowPartial: boolEnv(env.NANO_AGENT_STACK_READINESS_ALLOW_PARTIAL),
  };
}

function parseVersion(version) {
  return String(version || "")
    .replace(/^v/, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
}

export function isNodeVersionReady(version = process.version, minimum = MIN_NODE_VERSION) {
  const current = parseVersion(version);
  const required = parseVersion(minimum);
  for (let index = 0; index < Math.max(current.length, required.length); index += 1) {
    const currentPart = current[index] || 0;
    const requiredPart = required[index] || 0;
    if (currentPart > requiredPart) return true;
    if (currentPart < requiredPart) return false;
  }
  return true;
}

export function parseCircleHelpResources(output, expected = EXPECTED_CIRCLE_RESOURCES) {
  const normalized = String(output || "").toLowerCase();
  return Object.fromEntries(expected.map((resource) => [resource, normalized.includes(resource)]));
}

function defaultRunner(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 10000, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        command,
        args,
        stdout: redactReadinessOutput(stdout),
        stderr: redactReadinessOutput(stderr || error?.message || ""),
      });
    });
  });
}

async function runCommand(command, args, runner) {
  try {
    return await runner(command, args);
  } catch (error) {
    return {
      ok: false,
      command,
      args,
      stdout: "",
      stderr: redactReadinessOutput(error?.message || error),
    };
  }
}

function commandSummary(result) {
  return {
    ok: Boolean(result.ok),
    command: result.command,
    stdout: redactReadinessOutput(result.stdout || ""),
    stderr: redactReadinessOutput(result.stderr || ""),
  };
}

export function buildAgentStackReadinessSummary({
  nodeReady,
  nodeVersion,
  circleVersion,
  circleHelp,
  arcCanteenHelp,
  arcCanteenStatus,
  allowPartial = false,
}) {
  const circleResources = parseCircleHelpResources(circleHelp?.stdout || "");
  const circleHelpResourcesReady = Object.values(circleResources).every(Boolean);
  const circleCliReady = Boolean(circleVersion?.ok && circleHelp?.ok && circleHelpResourcesReady);
  const arcCanteenReady = Boolean(arcCanteenHelp?.ok);
  const hardReady = Boolean(nodeReady && circleCliReady && arcCanteenReady);

  return {
    nodeReady: Boolean(nodeReady),
    nodeVersion,
    circleCliReady,
    circleCliVersion: circleVersion?.ok ? redactReadinessOutput(circleVersion.stdout || "").trim() : null,
    circleCliResources: circleResources,
    circleHelpResourcesReady,
    arcCanteenReady,
    arcCanteenStatusChecked: Boolean(arcCanteenStatus),
    arcCanteenStatusReady: Boolean(arcCanteenStatus?.ok),
    agentWalletRuntimeLive: false,
    circleWalletCustodyLive: false,
    browserPaymentChanged: false,
    autonomousAgentSpendingLive: false,
    ready: hardReady || Boolean(allowPartial),
    mode: hardReady ? "ready" : allowPartial ? "partial" : "blocked",
    recommendedNext: "Use Agent Stack/Circle Wallets later for agent-managed spending policies after Nano Gateway proof is verified.",
    checks: {
      circleVersion: commandSummary(circleVersion || { ok: false, command: "circle", stdout: "", stderr: "not checked" }),
      circleHelp: commandSummary(circleHelp || { ok: false, command: "circle", stdout: "", stderr: "not checked" }),
      arcCanteenHelp: commandSummary(arcCanteenHelp || { ok: false, command: "arc-canteen", stdout: "", stderr: "not checked" }),
      arcCanteenStatus: commandSummary(arcCanteenStatus || { ok: false, command: "arc-canteen", stdout: "", stderr: "not checked" }),
    },
  };
}

export async function runAgentStackReadiness(config = readAgentStackReadinessConfig(), { runner = defaultRunner, nodeVersion = process.version } = {}) {
  const nodeReady = isNodeVersionReady(nodeVersion);
  const circleVersion = await runCommand("circle", ["--version"], runner);
  const circleHelp = await runCommand("circle", ["--help"], runner);
  const arcCanteenHelp = await runCommand("arc-canteen", ["--help"], runner);
  const arcCanteenStatus = arcCanteenHelp.ok
    ? await runCommand("arc-canteen", ["status"], runner)
    : null;

  return buildAgentStackReadinessSummary({
    nodeReady,
    nodeVersion,
    circleVersion,
    circleHelp,
    arcCanteenHelp,
    arcCanteenStatus,
    allowPartial: config.allowPartial,
  });
}

export function printReadinessSummary(summary, logger = console.log) {
  logger(JSON.stringify(summary, null, 2));
}

async function main() {
  const summary = await runAgentStackReadiness();
  printReadinessSummary(summary);
  if (!summary.ready) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}

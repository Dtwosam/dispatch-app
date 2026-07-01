#!/usr/bin/env node

import { fileURLToPath } from "node:url";

export const DEFAULT_NANO_X402_SOURCE_URL = "http://localhost:4020/api/nano/x402/source-brief";
export const DEFAULT_CIRCLE_GATEWAY_CHAIN = "arcTestnet";

const SECRET_PATTERNS = [
  /0x[a-fA-F0-9]{64}/g,
  /[A-Za-z0-9+/=]{80,}/g,
];

export function redactSecrets(value) {
  let output = String(value ?? "");
  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, "[redacted]");
  }
  return output;
}

function boolEnv(value) {
  return String(value ?? "").trim() === "1" || String(value ?? "").toLowerCase() === "true";
}

function isValidPrivateKey(value) {
  return /^0x[a-fA-F0-9]{64}$/.test(String(value ?? "").trim());
}

export function readNanoX402BuyerProofConfig(env = process.env) {
  const sourceUrl = String(env.NANO_X402_SOURCE_URL || DEFAULT_NANO_X402_SOURCE_URL).trim();
  const chain = String(env.CIRCLE_GATEWAY_CHAIN || DEFAULT_CIRCLE_GATEWAY_CHAIN).trim();
  const privateKey = String(env.CIRCLE_GATEWAY_PRIVATE_KEY || "").trim();
  const dryRun = boolEnv(env.NANO_X402_DRY_RUN);
  const skipDeposit = boolEnv(env.CIRCLE_GATEWAY_SKIP_DEPOSIT);

  if (!sourceUrl) {
    throw new Error("NANO_X402_SOURCE_URL is required.");
  }
  if (!chain) {
    throw new Error("CIRCLE_GATEWAY_CHAIN is required.");
  }
  if (!dryRun && !privateKey) {
    throw new Error("CIRCLE_GATEWAY_PRIVATE_KEY is required unless NANO_X402_DRY_RUN=1.");
  }
  if (privateKey && !isValidPrivateKey(privateKey)) {
    throw new Error("CIRCLE_GATEWAY_PRIVATE_KEY must be a 0x-prefixed 32-byte hex private key.");
  }

  return {
    sourceUrl,
    chain,
    privateKey,
    dryRun,
    skipDeposit,
  };
}

export function parsePaymentRequiredHeader(headerValue) {
  if (!headerValue) {
    throw new Error("PAYMENT-REQUIRED header is missing.");
  }
  try {
    return JSON.parse(Buffer.from(String(headerValue), "base64").toString("utf8"));
  } catch {
    throw new Error("PAYMENT-REQUIRED header could not be parsed as base64 JSON.");
  }
}

export async function inspectNanoX402SourceEndpoint(sourceUrl, fetchImpl = fetch) {
  const response = await fetchImpl(sourceUrl, { method: "GET" });
  const headerValue = response.headers?.get?.("payment-required") || response.headers?.get?.("PAYMENT-REQUIRED");
  const paymentRequired = parsePaymentRequiredHeader(headerValue);
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (response.status !== 402) {
    throw new Error(`Expected HTTP 402 from Nano source endpoint, received ${response.status}.`);
  }
  if (body?.paid === true || body?.unlocked === true || body?.unlockedPayload) {
    throw new Error("Nano source endpoint returned unlocked or paid content before verified buyer proof.");
  }

  return {
    status: response.status,
    paymentRequired,
    source: body?.source || null,
    paid: body?.paid === true,
    unlocked: body?.unlocked === true,
  };
}

async function loadGatewayClient() {
  try {
    const module = await import("@circle-fin/x402-batching/client");
    if (!module.GatewayClient) {
      throw new Error("GatewayClient export was not found.");
    }
    return module.GatewayClient;
  } catch (error) {
    throw new Error(
      `Circle Gateway SDK unavailable. Install @circle-fin/x402-batching locally before real buyer mode. ${redactSecrets(error?.message)}`,
    );
  }
}

function extractSafePaymentId(value) {
  if (!value || typeof value !== "object") return null;
  const candidate = value.paymentId || value.id || value.transferId || value.receiptId || null;
  return typeof candidate === "string" && candidate.length <= 120 ? candidate : null;
}

export async function runNanoX402BuyerProof(config, { fetchImpl = fetch, gatewayClientClass = null } = {}) {
  const endpoint = await inspectNanoX402SourceEndpoint(config.sourceUrl, fetchImpl);
  const baseSummary = {
    targetUrl: config.sourceUrl,
    chain: config.chain,
    endpointStatus: endpoint.status,
    paymentRequired: true,
    sourceId: endpoint.source?.sourceId || null,
    resourceAccessSucceeded: false,
    gatewayBuyerPaymentCompleted: false,
  };

  if (config.dryRun) {
    return {
      ...baseSummary,
      mode: "dry-run",
      status: "blocked",
      message: "Gateway buyer payment not completed. Dry-run confirmed the Nano source endpoint returns HTTP 402 payment-required metadata.",
    };
  }

  const GatewayClient = gatewayClientClass || await loadGatewayClient();
  const client = new GatewayClient({
    chain: config.chain,
    privateKey: config.privateKey,
  });

  if (typeof client.supports === "function") {
    const support = await client.supports(config.sourceUrl);
    if (!support?.supported) {
      throw new Error("Gateway SDK reports that the Nano source endpoint is not supported for buyer payment.");
    }
  }

  if (!config.skipDeposit && typeof client.getBalances === "function") {
    const balances = await client.getBalances();
    const available = balances?.gateway?.formattedAvailable ?? balances?.gateway?.available ?? null;
    if (available === "0" || available === 0 || available === "0.0" || available === "0.00") {
      throw new Error("Gateway balance appears empty. Deposit testnet USDC locally before attempting buyer payment.");
    }
  }

  if (typeof client.pay !== "function") {
    throw new Error("GatewayClient.pay() is unavailable in the installed SDK.");
  }

  const result = await client.pay(config.sourceUrl);
  const responseStatus = Number(result?.status ?? 0);
  const data = result?.data || null;
  const resourceAccessSucceeded = responseStatus >= 200 && responseStatus < 300;

  if (!resourceAccessSucceeded) {
    throw new Error(`Gateway buyer payment did not complete. Response status: ${responseStatus || "unknown"}.`);
  }

  return {
    ...baseSummary,
    mode: "real-buyer",
    status: "completed",
    responseStatus,
    resourceAccessSucceeded,
    gatewayBuyerPaymentCompleted: true,
    nonSecretPaymentId: extractSafePaymentId(data),
    message: "Gateway buyer payment completed through the local SDK. Only claim paid/unlocked in Nano after router-side Gateway verification is implemented.",
  };
}

export function printSafeSummary(summary, logger = console.log) {
  logger(JSON.stringify(summary, null, 2));
}

async function main() {
  try {
    const config = readNanoX402BuyerProofConfig();
    const summary = await runNanoX402BuyerProof(config);
    printSafeSummary(summary);
    if (summary.mode === "dry-run") {
      process.exitCode = 0;
    }
  } catch (error) {
    console.error(redactSecrets(error?.message || error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}

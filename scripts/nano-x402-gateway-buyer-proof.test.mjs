import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CIRCLE_GATEWAY_CHAIN,
  DEFAULT_NANO_X402_SOURCE_URL,
  inspectNanoX402SourceEndpoint,
  parsePaymentRequiredHeader,
  readNanoX402BuyerProofConfig,
  redactSecrets,
  runNanoX402BuyerProof,
} from "./nano-x402-gateway-buyer-proof.mjs";

function paymentHeader() {
  return Buffer.from(JSON.stringify({
    x402Version: 2,
    resource: { url: "/api/nano/x402/source-brief" },
    accepts: [{ scheme: "exact", network: "eip155:5042002", asset: "USDC", amount: "1000" }],
  })).toString("base64");
}

function response(status, body = {}) {
  return {
    status,
    headers: {
      get(name) {
        return name.toLowerCase() === "payment-required" ? paymentHeader() : null;
      },
    },
    async json() {
      return body;
    },
  };
}

test("Nano x402 buyer proof config defaults are dry-run friendly", () => {
  const config = readNanoX402BuyerProofConfig({ NANO_X402_DRY_RUN: "1" });

  assert.equal(config.sourceUrl, DEFAULT_NANO_X402_SOURCE_URL);
  assert.equal(config.chain, DEFAULT_CIRCLE_GATEWAY_CHAIN);
  assert.equal(config.dryRun, true);
  assert.equal(config.privateKey, "");
});

test("Nano x402 buyer proof config requires a private key outside dry-run", () => {
  assert.throws(
    () => readNanoX402BuyerProofConfig({ NANO_X402_DRY_RUN: "0" }),
    /CIRCLE_GATEWAY_PRIVATE_KEY is required/,
  );
});

test("Nano x402 buyer proof config does not echo private key in validation errors", () => {
  assert.throws(
    () => readNanoX402BuyerProofConfig({ CIRCLE_GATEWAY_PRIVATE_KEY: "not-a-key" }),
    /must be a 0x-prefixed 32-byte hex private key/,
  );
});

test("redacts private keys from printable errors", () => {
  const secret = `0x${"a".repeat(64)}`;
  assert.equal(redactSecrets(`bad key ${secret}`), "bad key [redacted]");
});

test("dry-run inspects 402 metadata and reports no buyer payment", async () => {
  const summary = await runNanoX402BuyerProof(
    readNanoX402BuyerProofConfig({ NANO_X402_DRY_RUN: "1" }),
    {
      fetchImpl: async () => response(402, {
        paid: false,
        unlocked: false,
        unlockedPayload: null,
        source: { sourceId: "nano-source-brief-stablecoin-payments" },
      }),
    },
  );

  assert.equal(summary.mode, "dry-run");
  assert.equal(summary.paymentRequired, true);
  assert.equal(summary.gatewayBuyerPaymentCompleted, false);
  assert.equal(summary.resourceAccessSucceeded, false);
  assert.match(summary.message, /Gateway buyer payment not completed/);
});

test("invalid endpoint status fails safely", async () => {
  await assert.rejects(
    () => inspectNanoX402SourceEndpoint(DEFAULT_NANO_X402_SOURCE_URL, async () => response(200, { paid: true })),
    /Expected HTTP 402/,
  );
});

test("missing payment-required metadata fails safely", () => {
  assert.throws(() => parsePaymentRequiredHeader(""), /PAYMENT-REQUIRED header is missing/);
});

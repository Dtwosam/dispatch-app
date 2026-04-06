import test from "node:test";
import assert from "node:assert/strict";
import { createMarketplaceChainClient } from "../src/chain-client.js";

test("chain client requires a wallet before task creation", async () => {
  const client = createMarketplaceChainClient({
    apiBase: "http://localhost:4020",
    getWalletAddress: () => "",
  });

  await assert.rejects(
    () => client.createTaskLifecycle({
      taskId: "task_1",
      rewardAmount: 100,
      deadlineIso: new Date().toISOString(),
      taskMode: "single",
      metadataUri: "offchain://task_1",
      metadataHash: "hash_1",
      selectedAgentId: null,
    }),
    /connect a wallet/i,
  );
});

test("chain client polls until accepted receipt and emits status updates", async () => {
  const events = [];
  const originalFetch = global.fetch;
  let receiptCalls = 0;

  global.fetch = (async (input) => {
    const url = String(input);
    if (url.endsWith("/api/chain/config")) {
      return new Response(JSON.stringify({ chainMode: "browser_wallet" }), {
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
    throw new Error(`Unexpected fetch ${url}`);
  }) as typeof fetch;

  const client = createMarketplaceChainClient({
    apiBase: "http://localhost:4020",
    getWalletAddress: () => "0xbuyer",
    onStatus: (state, message) => events.push(`${state}:${message}`),
  });

  const config = await client.getConfig();
  assert.equal(config.chainMode, "browser_wallet");

  const receipt = await client.pollReceipt("tx_fund", { intervalMs: 0, maxAttempts: 3 });
  assert.equal(receipt.status, "ACCEPTED");
  assert.ok(events.some((item) => item.includes("pending_chain")));
  assert.ok(events.some((item) => item.includes("accepted")));

  global.fetch = originalFetch;
});

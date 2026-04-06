import test from "node:test";
import assert from "node:assert/strict";
import { ArcChainService } from "../src/services/arcChainService";

test("Arc chain service exposes Arc Testnet defaults", () => {
  const service = new ArcChainService();
  const config = service.getPublicConfig();

  assert.equal(config.chainKey, "arcTestnet");
  assert.equal(config.chainId, 5042002);
  assert.equal(config.paymentTokenSymbol, "USDC");
  assert.equal(config.gasTokenSymbol, "USDC");
  assert.equal(config.requiresTokenApproval, true);
  assert.match(config.rpcUrl, /rpc\.testnet\.arc\.network/);
  assert.match(config.explorerBaseUrl || "", /testnet\.arcscan\.app/);
});

test("Arc chain service converts reward amounts into 6-decimal ERC-20 base units", () => {
  const service = new ArcChainService();
  assert.equal(service.toTokenBaseUnits("1").toString(), "1000000");
  assert.equal(service.toTokenBaseUnits("1.25").toString(), "1250000");
});

test("Arc chain service reports status diagnostics from public RPC health", async () => {
  const service = new ArcChainService();
  service["publicClient"] = () => ({
    getChainId: async () => 5042002,
  });

  const status = await service.getStatus();

  assert.equal(status.rpcReachable, true);
  assert.equal(status.detectedChainId, 5042002);
  assert.equal(status.expectedChainId, 5042002);
  assert.equal(status.config.chainMode, "browser_wallet");
});

test("Arc chain service approves without sending a redundant start_review transaction", async () => {
  const service = new ArcChainService();
  const calls: string[] = [];
  service["writeMarketAction"] = async (functionName: string) => {
    calls.push(functionName);
    return "0xapprove";
  };

  const receipt = await service.approveTaskSubmission("task_1", "submission_1");

  assert.deepEqual(calls, ["approve_submission"]);
  assert.equal(receipt.txHash, "0xapprove");
});

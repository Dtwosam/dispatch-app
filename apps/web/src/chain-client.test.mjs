import test from "node:test";
import assert from "node:assert/strict";
import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_CHAIN_ID_HEX,
  ARC_TESTNET_EXPLORER_URL,
  ARC_TESTNET_RPC_URL,
  ARC_TESTNET_USDC_ADDRESS,
  ARC_TESTNET_USDC_DECIMALS,
} from "./chain-client.js";

test("Arc Testnet wallet constants match the public network config", () => {
  assert.equal(ARC_TESTNET_CHAIN_ID, 5042002);
  assert.equal(ARC_TESTNET_CHAIN_ID_HEX, "0x4cef52");
  assert.equal(ARC_TESTNET_RPC_URL, "https://rpc.testnet.arc.network");
  assert.equal(ARC_TESTNET_EXPLORER_URL, "https://testnet.arcscan.app");
  assert.equal(ARC_TESTNET_USDC_ADDRESS, "0x3600000000000000000000000000000000000000");
  assert.equal(ARC_TESTNET_USDC_DECIMALS, 6);
});

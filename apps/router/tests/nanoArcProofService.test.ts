import test from "node:test";
import assert from "node:assert/strict";
import { parseUnits } from "viem";
import { ARC_USDC_ADDRESS } from "../src/lib/arcContracts";
import { ArcChainService } from "../src/services/arcChainService";
import { NanoArcProofService } from "../src/services/nanoArcProofService";

const txHash = `0x${"a".repeat(64)}`;
const payer = "0x1111111111111111111111111111111111111111";
const payee = "0x2222222222222222222222222222222222222222";
const other = "0x3333333333333333333333333333333333333333";
const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function topicForAddress(address: string) {
  return `0x${"0".repeat(24)}${address.toLowerCase().replace(/^0x/, "")}`;
}

function dataForAmount(amount: string) {
  return `0x${parseUnits(amount, 6).toString(16).padStart(64, "0")}`;
}

function makeVerifier(receipt: unknown, options: { throwReceipt?: boolean } = {}) {
  const chain = new ArcChainService();
  chain.getExternalReceipt = async () => {
    if (options.throwReceipt) throw new Error("RPC unavailable");
    return receipt;
  };
  return new NanoArcProofService(chain);
}

function successfulReceipt(overrides: Record<string, unknown> = {}) {
  return {
    status: "0x1",
    logs: [
      {
        address: ARC_USDC_ADDRESS,
        topics: [transferTopic, topicForAddress(payer), topicForAddress(payee)],
        data: dataForAmount("0.05"),
      },
    ],
    ...overrides,
  };
}

test("Nano Arc proof verifier rejects invalid tx hashes", async () => {
  const verifier = makeVerifier(successfulReceipt());

  const result = await verifier.verify({
    txHash: "tx_fake",
    expectedPayer: payer,
    expectedPayee: payee,
    expectedAmountUsdc: 0.05,
    tokenAddress: ARC_USDC_ADDRESS,
    network: "Arc Testnet",
  });

  assert.equal(result.proofStatus, "rejected");
  assert.equal(result.txHash, null);
});

test("Nano Arc proof verifier keeps missing receipts pending", async () => {
  const verifier = makeVerifier(null);

  const result = await verifier.verify({
    txHash,
    expectedPayer: payer,
    expectedPayee: payee,
    expectedAmountUsdc: 0.05,
    tokenAddress: ARC_USDC_ADDRESS,
    network: "Arc Testnet",
  });

  assert.equal(result.proofStatus, "pending");
});

test("Nano Arc proof verifier marks RPC failures unavailable", async () => {
  const verifier = makeVerifier(null, { throwReceipt: true });

  const result = await verifier.verify({
    txHash,
    expectedPayer: payer,
    expectedPayee: payee,
    expectedAmountUsdc: 0.05,
    tokenAddress: ARC_USDC_ADDRESS,
    network: "Arc Testnet",
  });

  assert.equal(result.proofStatus, "unavailable");
});

test("Nano Arc proof verifier rejects failed receipts", async () => {
  const verifier = makeVerifier(successfulReceipt({ status: "0x0" }));

  const result = await verifier.verify({
    txHash,
    expectedPayer: payer,
    expectedPayee: payee,
    expectedAmountUsdc: 0.05,
    tokenAddress: ARC_USDC_ADDRESS,
    network: "Arc Testnet",
  });

  assert.equal(result.proofStatus, "rejected");
});

test("Nano Arc proof verifier rejects wrong token payer payee and amount", async () => {
  const cases = [
    successfulReceipt({ logs: [{ address: other, topics: [transferTopic, topicForAddress(payer), topicForAddress(payee)], data: dataForAmount("0.05") }] }),
    successfulReceipt({ logs: [{ address: ARC_USDC_ADDRESS, topics: [transferTopic, topicForAddress(other), topicForAddress(payee)], data: dataForAmount("0.05") }] }),
    successfulReceipt({ logs: [{ address: ARC_USDC_ADDRESS, topics: [transferTopic, topicForAddress(payer), topicForAddress(other)], data: dataForAmount("0.05") }] }),
    successfulReceipt({ logs: [{ address: ARC_USDC_ADDRESS, topics: [transferTopic, topicForAddress(payer), topicForAddress(payee)], data: dataForAmount("0.06") }] }),
  ];

  for (const receipt of cases) {
    const result = await makeVerifier(receipt).verify({
      txHash,
      expectedPayer: payer,
      expectedPayee: payee,
      expectedAmountUsdc: 0.05,
      tokenAddress: ARC_USDC_ADDRESS,
      network: "Arc Testnet",
    });

    assert.equal(result.proofStatus, "rejected");
    assert.equal(result.matched, null);
  }
});

test("Nano Arc proof verifier verifies only matching Arc USDC transfer logs", async () => {
  const verifier = makeVerifier(successfulReceipt());

  const result = await verifier.verify({
    txHash,
    expectedPayer: payer,
    expectedPayee: payee,
    expectedAmountUsdc: 0.05,
    tokenAddress: ARC_USDC_ADDRESS,
    network: "Arc Testnet",
  });

  assert.equal(result.proofStatus, "verified");
  assert.equal(result.txHash, txHash);
  assert.equal(result.matched?.token, ARC_USDC_ADDRESS.toLowerCase());
  assert.equal(result.matched?.from, payer);
  assert.equal(result.matched?.to, payee);
  assert.equal(result.matched?.amountUsdc, 0.05);
});

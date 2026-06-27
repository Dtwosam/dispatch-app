import test from "node:test";
import assert from "node:assert/strict";
import { nanoSpendPaymentRecordRequestSchema, type NanoPaymentProof } from "@marketplace/shared";
import { InMemoryRegistryStore } from "../src/db/store";
import { NanoBudgetService } from "../src/services/nanoBudgetService";

const wallet = "0xBuyer000000000000000000000000000000000001";
const otherWallet = "0xOther00000000000000000000000000000000001";
const validTxHash = `0x${"a".repeat(64)}`;

function fundingProof(): NanoPaymentProof {
  return {
    proofType: "arc_tx",
    paymentState: "recorded",
    txHash: validTxHash,
    proofReference: validTxHash,
    recordedAt: new Date("2026-06-27T10:00:00.000Z").toISOString(),
    notes: ["User-provided funding proof; not settlement."],
  };
}

function localPaymentProof(): NanoPaymentProof {
  return {
    proofType: "local",
    paymentState: "recorded",
    txHash: null,
    proofReference: "local-proof-1",
    recordedAt: new Date("2026-06-27T10:02:00.000Z").toISOString(),
    notes: ["Local proof record only."],
  };
}

function createService() {
  const store = new InMemoryRegistryStore();
  const service = new NanoBudgetService(store);
  return { store, service };
}

test("creates budget drafts and lists them by wallet scope", () => {
  const { service } = createService();
  const first = service.createBudgetDraft({
    ownerWallet: wallet,
    goal: "Create a research-backed launch brief.",
    amount: 1,
    spendPlanSummary: "Source, summary, claim check, hook.",
  });
  service.createBudgetDraft({
    ownerWallet: otherWallet,
    goal: "Another wallet budget.",
    amount: 2,
    spendPlanSummary: null,
  });

  assert.equal(first.budget.status, "draft");
  assert.equal(first.budget.fundingProof, null);
  assert.equal(first.budget.tokenSymbol, "USDC");
  assert.equal(service.listWalletBudgets(wallet).length, 1);
  assert.equal(service.listWalletBudgets(wallet)[0].ownerWallet, wallet);
});

test("creates and approves spend intents only after funding proof", () => {
  const { service } = createService();
  const { budget } = service.createBudgetDraft({
    ownerWallet: wallet,
    goal: "Create a Nano run.",
    amount: 1,
  });
  const intent = service.createSpendIntent({
    budgetId: budget.budgetId,
    ownerWallet: wallet,
    payee: {
      payeeId: "source_unlock",
      type: "source",
      label: "Source unlock",
      externalRef: "source:demo",
    },
    amount: 0.05,
    reason: "Unlock a source for the brief.",
    estimated: false,
  });

  assert.throws(
    () => service.approveSpendIntent(intent.intentId, { ownerWallet: wallet }),
    /Funding proof is required/,
  );

  service.recordBudgetFundingProof(budget.budgetId, {
    ownerWallet: wallet,
    proof: fundingProof(),
  });
  const approved = service.approveSpendIntent(intent.intentId, { ownerWallet: wallet });
  assert.equal(approved.status, "approved");
  assert.equal(approved.approvedAt !== null, true);
  assert.equal(service.calculateAvailableBudget(budget.budgetId), 0.95);
});

test("records payment proof only from provided proof and updates real-record metrics", () => {
  const { service } = createService();
  const { budget, runContext } = service.createBudgetDraft({
    ownerWallet: wallet,
    goal: "Create a Nano run.",
    amount: 1,
  });
  service.recordBudgetFundingProof(budget.budgetId, {
    ownerWallet: wallet,
    proof: fundingProof(),
  });
  const intent = service.createSpendIntent({
    budgetId: budget.budgetId,
    ownerWallet: wallet,
    payee: {
      payeeId: "summarizer_agent",
      type: "agent",
      label: "Summarizer agent",
      walletAddress: "0xAgent000000000000000000000000000000000001",
    },
    amount: 0.03,
    reason: "Summarize the unlocked source.",
    estimated: false,
  });
  service.approveSpendIntent(intent.intentId, { ownerWallet: wallet });

  const receipt = service.recordPaymentProof(intent.intentId, {
    ownerWallet: wallet,
    proof: localPaymentProof(),
    contributionSummary: "Summarized the source for the final brief.",
  });

  assert.equal(receipt.paymentState, "recorded");
  assert.equal(receipt.proof.txHash, null);
  assert.equal(receipt.proof.proofReference, "local-proof-1");

  const activity = service.getBudgetActivity(budget.budgetId, wallet);
  assert.equal(activity.receipts.length, 1);
  assert.equal(activity.availableBudget, 0.97);

  const ledger = service.getRunLedger(runContext.runId, wallet);
  assert.equal(ledger.receipts.length, 1);
  assert.equal(ledger.metrics.totalRecordedPaymentValue, 0);

  const metrics = service.calculateMetrics(wallet);
  assert.equal(metrics.budgetCount, 1);
  assert.equal(metrics.spendIntentCount, 1);
  assert.equal(metrics.approvedSpendIntentCount, 1);
  assert.equal(metrics.receiptCount, 1);
  assert.equal(metrics.totalAuthorizedBudget, 1);
  assert.equal(metrics.totalApprovedIntentValue, 0.03);
  assert.equal(metrics.totalRecordedPaymentValue, 0);
});

test("rejects fake-looking tx hashes in payment proof requests", () => {
  assert.throws(
    () =>
      nanoSpendPaymentRecordRequestSchema.parse({
        ownerWallet: wallet,
        proof: {
          proofType: "arc_tx",
          paymentState: "recorded",
          txHash: "tx_fake",
          proofReference: "tx_fake",
          recordedAt: new Date("2026-06-27T10:02:00.000Z").toISOString(),
          notes: [],
        },
        contributionSummary: "Should not parse.",
      }),
    /Invalid/,
  );
});

test("counts only verified Arc proof records as recorded payment value", () => {
  const { service } = createService();
  const { budget } = service.createBudgetDraft({
    ownerWallet: wallet,
    goal: "Create a Nano run.",
    amount: 1,
  });
  service.recordBudgetFundingProof(budget.budgetId, {
    ownerWallet: wallet,
    proof: fundingProof(),
  });
  const intent = service.createSpendIntent({
    budgetId: budget.budgetId,
    ownerWallet: wallet,
    payee: {
      payeeId: "source_unlock",
      type: "source",
      label: "Source unlock",
      walletAddress: "0xSource0000000000000000000000000000000001",
    },
    amount: 0.05,
    reason: "Unlock a source for the brief.",
    estimated: false,
  });
  service.approveSpendIntent(intent.intentId, { ownerWallet: wallet });
  service.recordPaymentProof(intent.intentId, {
    ownerWallet: wallet,
    proof: fundingProof(),
    contributionSummary: "Verified Arc payment proof for source unlock.",
  });

  const metrics = service.calculateMetrics(wallet);
  assert.equal(metrics.receiptCount, 1);
  assert.equal(metrics.totalRecordedPaymentValue, 0.05);
});

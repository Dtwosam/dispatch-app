import type {
  NanoBudget,
  NanoBudgetDraftCreateRequest,
  NanoBudgetFundProofRequest,
  NanoBudgetStatus,
  NanoMetrics,
  NanoPaymentProof,
  NanoPayeeType,
  NanoPolicy,
  NanoRunContext,
  NanoSpendIntent,
  NanoSpendIntentApproveRequest,
  NanoSpendIntentCreateRequest,
  NanoSpendPaymentRecordRequest,
  NanoSpendReceipt,
} from "@marketplace/shared";
import { randomUUID } from "node:crypto";
import type { RegistryDatabase } from "../db/models";

const NANO_PAYEE_TYPES: NanoPayeeType[] = ["source", "tool", "creator", "agent", "platform"];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function normalizeWallet(wallet: string) {
  return wallet.trim().toLowerCase();
}

function sameWallet(a: string, b: string) {
  return normalizeWallet(a) === normalizeWallet(b);
}

function sumAmounts(values: number[]) {
  return Number(values.reduce((total, value) => total + value, 0).toFixed(6));
}

function defaultPolicy(amount: number, override: Partial<NanoPolicy> | undefined): NanoPolicy {
  const policy: NanoPolicy = {
    maxBudgetAmount: override?.maxBudgetAmount ?? amount,
    maxSpendAmount: override?.maxSpendAmount ?? amount,
    allowedPayeeTypes: override?.allowedPayeeTypes ?? NANO_PAYEE_TYPES,
    requireApprovalForEachSpend: override?.requireApprovalForEachSpend ?? true,
    notes: override?.notes ?? [
      "Phase 1 records budget and proof metadata only; it does not execute payments.",
    ],
  };
  if (policy.maxSpendAmount > policy.maxBudgetAmount) {
    throw new Error("maxSpendAmount cannot exceed maxBudgetAmount");
  }
  if (amount > policy.maxBudgetAmount) {
    throw new Error("Budget amount exceeds policy maximum");
  }
  return policy;
}

export class NanoBudgetService {
  constructor(private readonly store: RegistryDatabase) {}

  health() {
    return {
      ok: true,
      service: "nano",
      mode: "ledger_api_only",
      payments: "proof_recording_only",
      checkedAt: nowIso(),
    };
  }

  createBudgetDraft(input: NanoBudgetDraftCreateRequest) {
    const createdAt = nowIso();
    const budgetId = makeId("nano_budget");
    const runId = makeId("nano_run");
    const policy = defaultPolicy(input.amount, input.policy);
    const budget: NanoBudget = {
      budgetId,
      ownerWallet: input.ownerWallet,
      runId,
      goal: input.goal,
      amount: input.amount,
      tokenSymbol: "USDC",
      tokenDecimals: 6,
      network: "Arc Testnet",
      status: "draft",
      policy,
      fundingProof: null,
      createdAt,
      updatedAt: createdAt,
    };
    const runContext: NanoRunContext = {
      runId,
      budgetId,
      ownerWallet: input.ownerWallet,
      goal: input.goal,
      spendPlanSummary: input.spendPlanSummary ?? null,
      createdAt,
      updatedAt: createdAt,
    };
    this.store.nanoBudgets.set(budgetId, budget);
    this.store.nanoRunContexts.set(runId, runContext);
    return { budget, runContext };
  }

  listWalletBudgets(wallet: string) {
    return [...this.store.nanoBudgets.values()]
      .filter((budget) => sameWallet(budget.ownerWallet, wallet))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getBudgetActivity(budgetId: string, wallet?: string) {
    const budget = this.requireBudget(budgetId, wallet);
    const runContext = this.store.nanoRunContexts.get(budget.runId);
    if (!runContext) throw new Error("Nano run context not found");
    const spendIntents = this.listSpendIntentsForBudget(budgetId);
    const receipts = this.listReceiptsForBudget(budgetId);
    return {
      budget,
      runContext,
      spendIntents,
      receipts,
      availableBudget: this.calculateAvailableBudget(budgetId),
    };
  }

  recordBudgetFundingProof(budgetId: string, input: NanoBudgetFundProofRequest) {
    const budget = this.requireBudget(budgetId, input.ownerWallet);
    const nextStatus: NanoBudgetStatus =
      budget.status === "completed" ? "completed" : "funding_proof_recorded";
    const updated: NanoBudget = {
      ...budget,
      status: nextStatus,
      fundingProof: input.proof,
      updatedAt: nowIso(),
    };
    this.store.nanoBudgets.set(budgetId, updated);
    return updated;
  }

  createSpendIntent(input: NanoSpendIntentCreateRequest) {
    const budget = this.requireBudget(input.budgetId, input.ownerWallet);
    if (!budget.policy.allowedPayeeTypes.includes(input.payee.type)) {
      throw new Error("Payee type is not allowed by this Nano budget policy");
    }
    if (input.amount > budget.policy.maxSpendAmount) {
      throw new Error("Spend intent exceeds policy maximum");
    }
    if (input.amount > budget.amount) {
      throw new Error("Spend intent exceeds budget amount");
    }
    const createdAt = nowIso();
    const intent: NanoSpendIntent = {
      intentId: makeId("nano_intent"),
      budgetId: budget.budgetId,
      runId: budget.runId,
      ownerWallet: budget.ownerWallet,
      payee: input.payee,
      amount: input.amount,
      reason: input.reason,
      status: "proposed",
      estimated: input.estimated,
      createdAt,
      approvedAt: null,
      updatedAt: createdAt,
    };
    this.store.nanoSpendIntents.set(intent.intentId, intent);
    return intent;
  }

  approveSpendIntent(intentId: string, input: NanoSpendIntentApproveRequest) {
    const intent = this.requireIntent(intentId, input.ownerWallet);
    if (intent.status !== "proposed") {
      throw new Error("Only proposed spend intents can be approved");
    }
    const budget = this.requireBudget(intent.budgetId, input.ownerWallet);
    if (!budget.fundingProof) {
      throw new Error("Funding proof is required before approving spend intents");
    }
    const availableBudget = this.calculateAvailableBudget(intent.budgetId);
    if (intent.amount > availableBudget) {
      throw new Error("Spend intent exceeds available Nano budget");
    }
    const approvedAt = nowIso();
    const updated: NanoSpendIntent = {
      ...intent,
      status: "approved",
      approvedAt,
      updatedAt: approvedAt,
    };
    this.store.nanoSpendIntents.set(intentId, updated);
    if (budget.status === "funding_proof_recorded") {
      this.store.nanoBudgets.set(budget.budgetId, { ...budget, status: "spending", updatedAt: approvedAt });
    }
    return updated;
  }

  recordPaymentProof(intentId: string, input: NanoSpendPaymentRecordRequest) {
    const intent = this.requireIntent(intentId, input.ownerWallet);
    if (!["approved", "payment_recorded"].includes(intent.status)) {
      throw new Error("Spend intent must be approved before recording payment proof");
    }
    const budget = this.requireBudget(intent.budgetId, input.ownerWallet);
    const createdAt = nowIso();
    const receipt: NanoSpendReceipt = {
      receiptId: makeId("nano_receipt"),
      intentId: intent.intentId,
      budgetId: intent.budgetId,
      runId: intent.runId,
      ownerWallet: intent.ownerWallet,
      payee: intent.payee,
      amount: intent.amount,
      paymentState: input.proof.paymentState,
      proof: input.proof,
      contributionSummary: input.contributionSummary,
      createdAt,
    };
    const updatedIntent: NanoSpendIntent = {
      ...intent,
      status: input.proof.paymentState === "failed" ? "failed" : "payment_recorded",
      updatedAt: createdAt,
    };
    this.store.nanoSpendReceipts.set(receipt.receiptId, receipt);
    this.store.nanoSpendIntents.set(intent.intentId, updatedIntent);
    if (budget.status === "funding_proof_recorded") {
      this.store.nanoBudgets.set(budget.budgetId, { ...budget, status: "spending", updatedAt: createdAt });
    }
    return receipt;
  }

  calculateAvailableBudget(budgetId: string) {
    const budget = this.requireBudget(budgetId);
    if (!budget.fundingProof) return 0;
    const reserved = this.listSpendIntentsForBudget(budgetId)
      .filter((intent) => ["approved", "payment_recorded"].includes(intent.status))
      .map((intent) => intent.amount);
    return Math.max(0, Number((budget.amount - sumAmounts(reserved)).toFixed(6)));
  }

  getRunLedger(runId: string, wallet?: string) {
    const budgets = [...this.store.nanoBudgets.values()].filter((budget) => {
      if (budget.runId !== runId) return false;
      return wallet ? sameWallet(budget.ownerWallet, wallet) : true;
    });
    if (budgets.length === 0) throw new Error("Nano run not found");
    const runContext = this.store.nanoRunContexts.get(runId);
    if (!runContext) throw new Error("Nano run context not found");
    const budgetIds = new Set(budgets.map((budget) => budget.budgetId));
    const spendIntents = [...this.store.nanoSpendIntents.values()].filter((intent) => budgetIds.has(intent.budgetId));
    const receipts = [...this.store.nanoSpendReceipts.values()].filter((receipt) => budgetIds.has(receipt.budgetId));
    return {
      runContext,
      budgets,
      spendIntents,
      receipts,
      metrics: this.calculateMetrics(wallet),
    };
  }

  calculateMetrics(wallet?: string): NanoMetrics {
    const budgets = [...this.store.nanoBudgets.values()].filter((budget) => !wallet || sameWallet(budget.ownerWallet, wallet));
    const budgetIds = new Set(budgets.map((budget) => budget.budgetId));
    const intents = [...this.store.nanoSpendIntents.values()].filter((intent) => budgetIds.has(intent.budgetId));
    const receipts = [...this.store.nanoSpendReceipts.values()].filter((receipt) => budgetIds.has(receipt.budgetId));
    return {
      generatedAt: nowIso(),
      budgetCount: budgets.length,
      spendIntentCount: intents.length,
      approvedSpendIntentCount: intents.filter((intent) => ["approved", "payment_recorded"].includes(intent.status)).length,
      receiptCount: receipts.length,
      totalAuthorizedBudget: sumAmounts(budgets.map((budget) => budget.amount)),
      totalApprovedIntentValue: sumAmounts(
        intents.filter((intent) => ["approved", "payment_recorded"].includes(intent.status)).map((intent) => intent.amount),
      ),
      totalRecordedPaymentValue: sumAmounts(receipts.filter((receipt) => receipt.paymentState === "recorded").map((receipt) => receipt.amount)),
      availableBudget: sumAmounts(budgets.map((budget) => this.calculateAvailableBudget(budget.budgetId))),
      walletsWithBudgets: new Set(budgets.map((budget) => normalizeWallet(budget.ownerWallet))).size,
    };
  }

  private requireBudget(budgetId: string, wallet?: string) {
    const budget = this.store.nanoBudgets.get(budgetId);
    if (!budget) throw new Error("Nano budget not found");
    if (wallet && !sameWallet(budget.ownerWallet, wallet)) {
      throw new Error("Nano budget is not available for this wallet");
    }
    return budget;
  }

  private requireIntent(intentId: string, wallet?: string) {
    const intent = this.store.nanoSpendIntents.get(intentId);
    if (!intent) throw new Error("Nano spend intent not found");
    if (wallet && !sameWallet(intent.ownerWallet, wallet)) {
      throw new Error("Nano spend intent is not available for this wallet");
    }
    return intent;
  }

  private listSpendIntentsForBudget(budgetId: string) {
    return [...this.store.nanoSpendIntents.values()]
      .filter((intent) => intent.budgetId === budgetId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  private listReceiptsForBudget(budgetId: string) {
    return [...this.store.nanoSpendReceipts.values()]
      .filter((receipt) => receipt.budgetId === budgetId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

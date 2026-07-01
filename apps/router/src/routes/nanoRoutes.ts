import express from "express";
import {
  nanoArcProofVerifyRequestSchema,
  nanoBudgetDraftCreateRequestSchema,
  nanoBudgetFundProofRequestSchema,
  nanoSpendIntentApproveRequestSchema,
  nanoSpendIntentCreateRequestSchema,
  nanoSpendPaymentRecordRequestSchema,
} from "@marketplace/shared";
import type { NanoBudgetService } from "../services/nanoBudgetService";
import type { NanoArcProofService } from "../services/nanoArcProofService";
import {
  buildNanoX402PaymentRequiredResponse,
  encodeNanoX402PaymentRequiredHeader,
} from "../services/nanoX402CompatibilityService";

function walletQuery(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function respondError(res: express.Response, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const notFound = /not found/i.test(message);
  res.status(notFound ? 404 : 400).json({ error: message });
}

function amountsMatch(left: number, right: number) {
  return Math.round(Number(left) * 1_000_000) === Math.round(Number(right) * 1_000_000);
}

export function createNanoRoutes(service: NanoBudgetService, arcProofService?: NanoArcProofService) {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json(service.health());
  });

  router.get("/x402/source-brief", (req, res) => {
    const response = buildNanoX402PaymentRequiredResponse(req.originalUrl || req.path);
    res.setHeader("PAYMENT-REQUIRED", encodeNanoX402PaymentRequiredHeader(response));
    res.setHeader("Cache-Control", "no-store");
    res.status(402).json(response);
  });

  router.get("/budgets", (req, res) => {
    try {
      const wallet = walletQuery(req.query.wallet);
      if (!wallet) {
        res.status(400).json({ error: "wallet query parameter is required" });
        return;
      }
      res.json({ items: service.listWalletBudgets(wallet) });
    } catch (error) {
      respondError(res, error, "Nano budget listing failed");
    }
  });

  router.post("/budgets/draft", (req, res) => {
    try {
      const payload = nanoBudgetDraftCreateRequestSchema.parse(req.body);
      res.status(201).json(service.createBudgetDraft(payload));
    } catch (error) {
      respondError(res, error, "Nano budget draft creation failed");
    }
  });

  router.post("/budgets/:budgetId/fund-proof", (req, res) => {
    try {
      const payload = nanoBudgetFundProofRequestSchema.parse(req.body);
      res.json(service.recordBudgetFundingProof(req.params.budgetId, payload));
    } catch (error) {
      respondError(res, error, "Nano funding proof recording failed");
    }
  });

  router.get("/budgets/:budgetId/activity", (req, res) => {
    try {
      const wallet = walletQuery(req.query.wallet);
      res.json(service.getBudgetActivity(req.params.budgetId, wallet || undefined));
    } catch (error) {
      respondError(res, error, "Nano budget activity lookup failed");
    }
  });

  router.post("/spend-intents", (req, res) => {
    try {
      const payload = nanoSpendIntentCreateRequestSchema.parse(req.body);
      res.status(201).json(service.createSpendIntent(payload));
    } catch (error) {
      respondError(res, error, "Nano spend intent creation failed");
    }
  });

  router.post("/spend-intents/:intentId/approve", (req, res) => {
    try {
      const payload = nanoSpendIntentApproveRequestSchema.parse(req.body);
      res.json(service.approveSpendIntent(req.params.intentId, payload));
    } catch (error) {
      respondError(res, error, "Nano spend intent approval failed");
    }
  });

  router.post("/spend-intents/:intentId/record-payment", (req, res) => {
    try {
      const payload = nanoSpendPaymentRecordRequestSchema.parse(req.body);
      res.status(201).json(service.recordPaymentProof(req.params.intentId, payload));
    } catch (error) {
      respondError(res, error, "Nano payment proof recording failed");
    }
  });

  router.post("/spend-intents/:intentId/verify-arc-proof", async (req, res) => {
    try {
      if (!arcProofService) {
        res.status(503).json({
          proofStatus: "unavailable",
          reason: "Arc proof verification is temporarily unavailable.",
          txHash: null,
          explorerLink: null,
          matched: null,
          receipt: null,
        });
        return;
      }
      const payload = nanoArcProofVerifyRequestSchema.parse(req.body);
      const intent = service.getSpendIntent(req.params.intentId, payload.ownerWallet);
      if (!amountsMatch(payload.expectedAmountUsdc, intent.amount)) {
        res.status(400).json({
          proofStatus: "rejected",
          reason: "Expected amount does not match this planned spend.",
          txHash: payload.txHash,
          explorerLink: null,
          matched: null,
          receipt: null,
        });
        return;
      }
      const expectedPayee = payload.payeeWallet || intent.payee.walletAddress || null;
      const verification = await arcProofService.verify({
        txHash: payload.txHash,
        expectedPayer: payload.payerWallet || payload.ownerWallet,
        expectedPayee,
        expectedAmountUsdc: intent.amount,
        network: "Arc Testnet",
      });
      if (verification.proofStatus !== "verified") {
        res.status(200).json({
          ...verification,
          receipt: null,
        });
        return;
      }
      const receipt = service.recordPaymentProof(intent.intentId, {
        ownerWallet: payload.ownerWallet,
        proof: {
          proofType: "arc_tx",
          paymentState: "recorded",
          txHash: payload.txHash,
          proofReference: payload.txHash,
          recordedAt: new Date().toISOString(),
          notes: [
            `Verified Arc Testnet USDC transfer for ${payload.recipientLabel || intent.payee.label}.`,
            "Gateway/x402 settlement is planned for the payment proof roadmap.",
          ],
        },
        contributionSummary: `Verified Arc USDC proof for ${payload.recipientLabel || intent.payee.label}.`,
      });
      res.status(201).json({
        ...verification,
        receipt,
      });
    } catch (error) {
      respondError(res, error, "Nano Arc proof verification failed");
    }
  });

  router.get("/runs/:runId/ledger", (req, res) => {
    try {
      const wallet = walletQuery(req.query.wallet);
      res.json(service.getRunLedger(req.params.runId, wallet || undefined));
    } catch (error) {
      respondError(res, error, "Nano run ledger lookup failed");
    }
  });

  router.get("/metrics", (req, res) => {
    try {
      const wallet = walletQuery(req.query.wallet);
      res.json(service.calculateMetrics(wallet || undefined));
    } catch (error) {
      respondError(res, error, "Nano metrics lookup failed");
    }
  });

  return router;
}

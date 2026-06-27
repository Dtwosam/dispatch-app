import express from "express";
import {
  nanoBudgetDraftCreateRequestSchema,
  nanoBudgetFundProofRequestSchema,
  nanoSpendIntentApproveRequestSchema,
  nanoSpendIntentCreateRequestSchema,
  nanoSpendPaymentRecordRequestSchema,
} from "@marketplace/shared";
import type { NanoBudgetService } from "../services/nanoBudgetService";

function walletQuery(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function respondError(res: express.Response, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const notFound = /not found/i.test(message);
  res.status(notFound ? 404 : 400).json({ error: message });
}

export function createNanoRoutes(service: NanoBudgetService) {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json(service.health());
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

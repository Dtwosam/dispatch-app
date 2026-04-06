import express from "express";
import {
  disputeOpenRequestSchema,
  taskActionRequestSchema,
} from "@marketplace/shared";
import { z } from "zod";
import type { SettlementService } from "../services/settlementService";

const adminResolutionSchema = z.object({
  adminWallet: z.string().min(3),
  outcome: z.enum(["approve_payout", "refund_buyer"]),
  resolution: z.string().min(3).max(500),
});

export function createSettlementRoutes(service: SettlementService, adminWallets: Set<string>) {
  const router = express.Router();

  router.post("/tasks/:taskId/settle", async (req, res) => {
    try {
      const payload = taskActionRequestSchema.parse(req.body);
      res.json(await service.settleApprovedTask(req.params.taskId, payload.actorWallet));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Settlement failed" });
    }
  });

  router.post("/tasks/:taskId/refund", async (req, res) => {
    try {
      const payload = taskActionRequestSchema.parse(req.body);
      res.json(await service.refundTask(req.params.taskId, payload.actorWallet));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Refund failed" });
    }
  });

  router.post("/tasks/:taskId/dispute", async (req, res) => {
    try {
      const payload = disputeOpenRequestSchema.parse(req.body);
      res.json(await service.pauseOnDispute(req.params.taskId, payload.actorWallet, payload.reason));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Dispute failed" });
    }
  });

  router.post("/tasks/:taskId/admin-resolve", async (req, res) => {
    try {
      const payload = adminResolutionSchema.parse(req.body);
      res.json(await service.resolveDispute(req.params.taskId, payload, adminWallets));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Admin resolution failed" });
    }
  });

  router.get("/tasks/:taskId/history", (req, res) => {
    try {
      res.json(service.history(req.params.taskId));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "History lookup failed" });
    }
  });

  return router;
}

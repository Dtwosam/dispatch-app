import express from "express";
import { adminBlacklistEndpointRequestSchema, adminPauseTaskRequestSchema } from "@marketplace/shared";
import { z } from "zod";
import type { AdminService } from "../services/adminService";

const adminResolveSchema = z.object({
  adminWallet: z.string().min(3),
  outcome: z.enum(["approve_payout", "refund_buyer"]),
  resolution: z.string().min(3).max(500),
});

const adminDisableAgentSchema = z.object({
  adminWallet: z.string().min(3),
  reason: z.string().min(3).max(500),
});

export function createAdminRoutes(service: AdminService, adminWallets: Set<string>) {
  const router = express.Router();

  router.get("/overview", (_req, res) => {
    res.json(service.overview());
  });

  router.get("/execution-failures", (_req, res) => {
    res.json({ items: service.executionFailures() });
  });

  router.get("/tasks/:taskId/debug", (req, res) => {
    try {
      res.json(service.taskDebug(req.params.taskId));
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : "Task debug lookup failed" });
    }
  });

  router.get("/suspicious-patterns", (_req, res) => {
    res.json({ items: service.suspiciousPatterns() });
  });

  router.post("/tasks/:taskId/pause", (req, res) => {
    try {
      const payload = adminPauseTaskRequestSchema.parse(req.body);
      res.json(service.pauseTask(req.params.taskId, payload.adminWallet, payload.reason, adminWallets));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Pause failed" });
    }
  });

  router.post("/tasks/:taskId/refund", async (req, res) => {
    try {
      const payload = adminPauseTaskRequestSchema.parse(req.body);
      res.json(await service.refundTask(req.params.taskId, payload.adminWallet, payload.reason, adminWallets));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Refund failed" });
    }
  });

  router.post("/tasks/:taskId/resolve-dispute", async (req, res) => {
    try {
      const payload = adminResolveSchema.parse(req.body);
      res.json(await service.resolveDispute(req.params.taskId, payload, adminWallets));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Resolve failed" });
    }
  });

  router.post("/agents/:agentId/disable", (req, res) => {
    try {
      const payload = adminDisableAgentSchema.parse(req.body);
      res.json(service.disableAgent(req.params.agentId, payload.adminWallet, payload.reason, adminWallets));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Disable failed" });
    }
  });

  router.post("/endpoints/blacklist", (req, res) => {
    try {
      const payload = adminBlacklistEndpointRequestSchema.parse(req.body);
      res.json(service.blacklistEndpoint(payload.endpointUrl, payload.adminWallet, payload.reason, adminWallets));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Blacklist failed" });
    }
  });

  return router;
}

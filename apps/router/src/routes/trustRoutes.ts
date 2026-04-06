import express from "express";
import type { TrustRankingService } from "../services/trustRankingService";

export function createTrustRoutes(service: TrustRankingService) {
  const router = express.Router();

  router.get("/leaderboards", (_req, res) => {
    try {
      res.json(service.getLeaderboards());
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Leaderboard lookup failed" });
    }
  });

  router.get("/agents/:agentId", (req, res) => {
    try {
      res.json(service.getAgentTrustProfile(req.params.agentId));
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : "Agent trust profile not found" });
    }
  });

  router.get("/users/:walletAddress", (req, res) => {
    try {
      res.json(service.getUserTrust(req.params.walletAddress));
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : "User trust not found" });
    }
  });

  return router;
}

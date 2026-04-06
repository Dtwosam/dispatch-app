import express from "express";
import {
  chainContractStateRequestSchema,
  chainTaskWriteRequestSchema,
  taskChainSyncRequestSchema,
} from "@marketplace/shared";
import type { AgentRegistryService } from "../services/agentRegistryService";
import type { ArcChainService } from "../services/arcChainService";
import type { TaskMarketService } from "../services/taskMarketService";

type OnchainAwareAgent = {
  profile: {
    onchainAgentId?: string | null;
  };
};

export function createChainRoutes(
  chainService: ArcChainService,
  taskMarketService: TaskMarketService,
  registryService: AgentRegistryService,
) {
  const router = express.Router();

  const toJsonSafe = (value: unknown): unknown => {
    if (typeof value === "bigint") return value.toString();
    if (Array.isArray(value)) return value.map((item) => toJsonSafe(item));
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toJsonSafe(item)]),
      );
    }
    return value;
  };

  router.get("/config", (_req, res) => {
    res.json(chainService.getPublicConfig());
  });

  router.get("/status", async (_req, res) => {
    try {
      res.json(await chainService.getStatus());
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Chain status query failed" });
    }
  });

  router.get("/receipts/:hash", async (req, res) => {
    try {
      res.json(await chainService.getReceipt(req.params.hash));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Receipt query failed" });
    }
  });

  router.get("/contracts/:address/state", async (req, res) => {
    try {
      const payload = chainContractStateRequestSchema.parse({
        address: req.params.address,
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        blockNumber: typeof req.query.blockNumber === "string" ? req.query.blockNumber : undefined,
      });
      res.json(await chainService.getContractState(payload));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Contract state query failed" });
    }
  });

  router.get("/tasks/:taskId/onchain", async (req, res) => {
    try {
      res.json({ taskId: req.params.taskId, onchainTask: toJsonSafe(await chainService.readTask(req.params.taskId)) });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Onchain task read failed" });
    }
  });

  router.post("/task-create", async (req, res) => {
    try {
      const payload = chainTaskWriteRequestSchema.parse(req.body);
      const selectedAgentId = payload.selectedAgentId
        ? (registryService.getAgent(payload.selectedAgentId) as OnchainAwareAgent).profile.onchainAgentId ?? payload.selectedAgentId
        : null;
      res.json(
        await chainService.writeTaskLifecycle({
          ...payload,
          selectedAgentId,
        }),
      );
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Chain task write failed" });
    }
  });

  router.post("/platform-agents/bootstrap", async (_req, res) => {
    try {
      res.json({ items: await chainService.bootstrapPlatformAgentsOnchain() });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Platform-agent bootstrap failed" });
    }
  });

  router.post("/tasks/:taskId/sync", (req, res) => {
    try {
      const payload = taskChainSyncRequestSchema.parse(req.body);
      res.json(taskMarketService.syncTaskWithChain(req.params.taskId, payload));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Task chain sync failed" });
    }
  });

  return router;
}

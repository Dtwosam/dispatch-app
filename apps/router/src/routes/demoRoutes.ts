import express from "express";
import { z } from "zod";
import type { DemoFlowService } from "../services/demoFlowService";

const demoActorSchema = z.object({
  creatorWallet: z.string().min(3).optional(),
  actorWallet: z.string().min(3).optional(),
}).default({});

export function createDemoRoutes(service: DemoFlowService) {
  const router = express.Router();

  router.post("/thread-writer/start", (req, res) => {
    try {
      const payload = demoActorSchema.parse(req.body);
      res.json(service.startThreadWriterDemo({ creatorWallet: payload.creatorWallet ?? payload.actorWallet }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Demo start failed" });
    }
  });

  router.post("/thread-writer/:taskId/next", async (req, res) => {
    try {
      const payload = demoActorSchema.parse(req.body);
      res.json(await service.advanceThreadWriterDemo(req.params.taskId, { actorWallet: payload.actorWallet ?? payload.creatorWallet }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Demo advance failed" });
    }
  });

  return router;
}

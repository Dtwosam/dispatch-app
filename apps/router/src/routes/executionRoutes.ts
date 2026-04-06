import express from "express";
import { z } from "zod";
import type { ExecutionEngine } from "../services/executionEngine";
import type { CallbackPayload } from "../services/callbackHandler";

const callbackSchema = z.object({
  requestId: z.string().min(1),
  runId: z.string().min(1),
  nonce: z.string().min(1),
  signature: z.string().min(1),
  result: z.unknown(),
  completedAt: z.string().datetime(),
  structuredMetadata: z.record(z.string(), z.unknown()).optional(),
});

export function createExecutionRoutes(engine: ExecutionEngine) {
  const router = express.Router();

  router.post("/callback", async (req, res) => {
    try {
      const parsed = callbackSchema.parse(req.body);
      const payload: CallbackPayload = {
        requestId: parsed.requestId,
        runId: parsed.runId,
        nonce: parsed.nonce,
        signature: parsed.signature,
        result: parsed.result,
        completedAt: parsed.completedAt,
        structuredMetadata: parsed.structuredMetadata,
      };
      const run = await engine.handleCallback(payload);
      res.json({ ok: true, runId: run.runId });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Callback failed" });
    }
  });

  router.get("/runs/:runId/logs", (req, res) => {
    res.json({ items: engine.getLogs(req.params.runId) });
  });

  router.get("/tasks/:taskId/runs", (req, res) => {
    res.json({ items: engine.getRunsForTask(req.params.taskId) });
  });

  router.get("/metrics", (_req, res) => {
    res.json({ items: engine.getMetrics() });
  });

  router.get("/events", (_req, res) => {
    res.json({ items: engine.getInternalEvents() });
  });

  return router;
}

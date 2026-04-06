import express from "express";
import {
  agentTestRunRequestSchema,
  createAgentDraftInputSchema,
  publishAgentDraftRequestSchema,
  updateAgentDraftStepSchema,
} from "@marketplace/shared";
import type { AgentBuilderService } from "../services/agentBuilderService";

export function createAgentBuilderRoutes(service: AgentBuilderService) {
  const router = express.Router();

  router.post("/drafts", (req, res) => {
    try {
      const payload = createAgentDraftInputSchema.parse(req.body);
      const draft = service.createDraft(payload);
      res.status(201).json(draft);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Draft creation failed" });
    }
  });

  router.patch("/drafts/:draftId", (req, res) => {
    try {
      const payload = updateAgentDraftStepSchema.parse(req.body);
      const draft = service.updateDraft(req.params.draftId, payload);
      res.json(draft);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Draft update failed" });
    }
  });

  router.get("/drafts/:draftId", (req, res) => {
    try {
      res.json(service.getDraft(req.params.draftId));
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : "Draft not found" });
    }
  });

  router.post("/drafts/:draftId/test-run", (req, res) => {
    try {
      const payload = agentTestRunRequestSchema.parse(req.body);
      const result = service.runTest(req.params.draftId, payload);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Test run failed" });
    }
  });

  router.post("/drafts/:draftId/publish", async (req, res) => {
    try {
      const payload = publishAgentDraftRequestSchema.parse(req.body);
      const result = await service.publishDraft(req.params.draftId, payload);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Publish failed" });
    }
  });

  return router;
}

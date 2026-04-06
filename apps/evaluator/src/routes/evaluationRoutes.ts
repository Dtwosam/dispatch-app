import express from "express";
import {
  evaluationAggregateRequestSchema,
  evaluationRunRequestSchema,
  hybridReviewConfirmRequestSchema,
  userReviewDecisionSchema,
} from "@marketplace/shared";
import type { EvaluationService } from "../services/evaluationService";

export function createEvaluationRoutes(service: EvaluationService) {
  const router = express.Router();

  router.post("/user-review", async (req, res) => {
    try {
      const review = userReviewDecisionSchema.parse(req.body.review);
      const request = evaluationRunRequestSchema.parse(req.body.request);
      res.json(await service.runUserReview(request, review));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "User review failed" });
    }
  });

  router.post("/assisted", async (req, res) => {
    try {
      const request = evaluationRunRequestSchema.parse(req.body);
      res.json(await service.runAssistedEvaluation(request));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Assisted evaluation failed" });
    }
  });

  router.post("/hybrid", async (req, res) => {
    try {
      const request = evaluationRunRequestSchema.parse(req.body);
      res.json(await service.runHybridEvaluation(request));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Hybrid evaluation failed" });
    }
  });

  router.post("/subjective-consensus", async (req, res) => {
    try {
      const request = evaluationRunRequestSchema.parse(req.body);
      res.json(await service.runFutureConsensus(request));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Consensus evaluation failed" });
    }
  });

  router.post("/hybrid/confirm", (req, res) => {
    try {
      const request = hybridReviewConfirmRequestSchema.parse(req.body);
      res.json(service.confirmHybridReview(request));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Hybrid confirmation failed" });
    }
  });

  router.post("/aggregate", (req, res) => {
    try {
      const request = evaluationAggregateRequestSchema.parse(req.body);
      res.json(service.aggregate(request));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Aggregation failed" });
    }
  });

  router.get("/:evaluationId", (req, res) => {
    const item = service.getEvaluation(req.params.evaluationId);
    if (!item) {
      res.status(404).json({ error: "Evaluation not found" });
      return;
    }
    res.json(item);
  });

  return router;
}

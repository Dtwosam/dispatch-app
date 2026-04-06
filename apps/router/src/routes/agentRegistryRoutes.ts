import express from "express";
import {
  adminSuspendAgentInputSchema,
  agentActivationInputSchema,
  compatibilityTestRequestSchema,
  healthcheckRequestSchema,
  listRegistryAgentsResponseSchema,
  ownerProofChallengeRequestSchema,
  ownerProofVerifyRequestSchema,
  publishAgentVersionInputSchema,
  registerAgentInputSchema,
  updateAgentMetadataInputSchema,
} from "@marketplace/shared";
import type { AgentRegistryService } from "../services/agentRegistryService";
import type { OwnerProofService } from "../services/ownerProofService";

export function createAgentRegistryRoutes(input: {
  registryService: AgentRegistryService;
  ownerProofService: OwnerProofService;
  adminWallets: Set<string>;
}) {
  const router = express.Router();

  router.post("/owner-proof/challenge", (req, res) => {
    try {
      const payload = ownerProofChallengeRequestSchema.parse(req.body);
      const result = input.ownerProofService.issueChallenge(payload.walletAddress);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  router.post("/owner-proof/verify", async (req, res) => {
    try {
      const payload = ownerProofVerifyRequestSchema.parse(req.body);
      const result = await input.ownerProofService.verifyChallenge(
        payload.challengeId,
        payload.walletAddress,
        payload.signature,
      );
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  router.post("/agents/register", async (req, res) => {
    try {
      const payload = registerAgentInputSchema.parse(req.body);
      const result = await input.registryService.registerAgent(payload);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Registration failed" });
    }
  });

  router.patch("/agents/:agentId", (req, res) => {
    try {
      const payload = updateAgentMetadataInputSchema.parse(req.body);
      const result = input.registryService.updateMetadata(req.params.agentId, payload);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Update failed" });
    }
  });

  router.post("/agents/:agentId/versions", async (req, res) => {
    try {
      const payload = publishAgentVersionInputSchema.parse(req.body);
      const result = await input.registryService.publishVersion(req.params.agentId, payload);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Publish failed" });
    }
  });

  router.post("/agents/:agentId/activate", (req, res) => {
    try {
      const payload = agentActivationInputSchema.parse(req.body);
      const result = input.registryService.activate(req.params.agentId, payload.actorWallet);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Activation failed" });
    }
  });

  router.post("/agents/:agentId/deactivate", (req, res) => {
    try {
      const payload = agentActivationInputSchema.parse(req.body);
      const result = input.registryService.deactivate(req.params.agentId, payload.actorWallet);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Deactivation failed" });
    }
  });

  router.post("/agents/:agentId/suspend", (req, res) => {
    try {
      const payload = adminSuspendAgentInputSchema.parse(req.body);
      const result = input.registryService.suspend(req.params.agentId, payload, input.adminWallets);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Suspension failed" });
    }
  });

  router.post("/agents/:agentId/prepublish-healthcheck", async (req, res) => {
    try {
      const payload = healthcheckRequestSchema.parse(req.body);
      const result = await input.registryService.runPrePublishHealthcheck(
        req.params.agentId,
        payload.actorWallet,
      );
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Healthcheck failed" });
    }
  });

  router.post("/agents/:agentId/test-compatibility", async (req, res) => {
    try {
      const payload = compatibilityTestRequestSchema.parse(req.body);
      const result = await input.registryService.testCompatibility(
        req.params.agentId,
        payload.actorWallet,
        payload.runExecutionProbe,
      );
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Compatibility test failed" });
    }
  });

  router.get("/agents", (_req, res) => {
    const items = input.registryService.listAgents();
    res.json(listRegistryAgentsResponseSchema.parse({ items, total: items.length }));
  });

  router.get("/agents/:agentId", (req, res) => {
    try {
      res.json(input.registryService.getAgent(req.params.agentId));
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : "Agent not found" });
    }
  });

  return router;
}

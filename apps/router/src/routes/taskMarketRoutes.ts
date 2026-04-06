import express from "express";
import {
  appealOpenRequestSchema,
  taskActionRequestSchema,
  taskCreateRequestSchema,
  userReviewDecisionSchema,
} from "@marketplace/shared";
import { z } from "zod";
import type { TaskMarketService } from "../services/taskMarketService";
import type { ArcChainService } from "../services/arcChainService";

const reviewSubmissionSchema = z.object({
  actorWallet: z.string().min(3),
  submissionId: z.string().min(1),
});

const hybridConfirmSchema = z.object({
  actorWallet: z.string().min(3),
  evaluationId: z.string().min(1),
  confirmDecision: z.enum(["approve", "reject"]),
  feedback: z.string().max(500).nullable().optional(),
});

const browserTraceSchema = z.object({
  createTxHash: z.string().min(1).nullable().optional(),
  fundTxHash: z.string().min(1).nullable().optional(),
  assignTxHash: z.string().min(1).nullable().optional(),
});

export function createTaskMarketRoutes(service: TaskMarketService, chainService?: ArcChainService) {
  const router = express.Router();
  const ONCHAIN_TASK_READ_TIMEOUT_MS = 4000;
  const withTimeout = <T>(promise: Promise<T>, timeoutMs: number) =>
    Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timed out")), timeoutMs)),
    ]);
  const ensureTaskAvailable = async (taskId: string) => {
    try {
      return service.getTask(taskId);
    } catch (error) {
      if (!chainService?.taskEscrowAddress) throw error;
      const onchainTask = await withTimeout(chainService.readTask(taskId), ONCHAIN_TASK_READ_TIMEOUT_MS).catch(() => null);
      if (!onchainTask) throw error;
      return service.recoverTaskFromOnchain(taskId, onchainTask, `${chainService.taskEscrowAddress}:${taskId}`);
    }
  };

  router.post("/tasks", (req, res) => {
    try {
      const payload = taskCreateRequestSchema.parse(req.body);
      const result = service.createTask(payload);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Task creation failed" });
    }
  });

  router.post("/tasks/draft", (req, res) => {
    try {
      const payload = taskCreateRequestSchema.parse(req.body);
      const result = service.createTaskDraft(payload);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Task draft creation failed" });
    }
  });

  router.post("/tasks/:taskId/browser-trace", (req, res) => {
    try {
      const payload = browserTraceSchema.parse(req.body);
      res.json({ task: service.recordBrowserTxTrace(req.params.taskId, payload) });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Browser trace capture failed" });
    }
  });

  router.get("/tasks", async (req, res) => {
    try {
      const viewerWallet = typeof req.query.viewerWallet === "string" ? req.query.viewerWallet : "";
      const list = service.listTasks(viewerWallet);
      if (chainService?.taskEscrowAddress) {
        const pendingTaskIds = [
          ...list.myPostedTasks,
          ...list.activeTasks,
          ...list.allOpenTasks,
        ]
          .map((task) => task.taskId)
          .filter((taskId, index, array) => array.indexOf(taskId) === index);
        for (const taskId of pendingTaskIds) {
          try {
            const task = service.getTask(taskId);
            if (!["pending_wallet", "pending_chain"].includes(task.transactionState)) continue;
            if (task.latestFundTxHash || task.latestAssignTxHash) {
              try {
                const fundReceipt = task.latestFundTxHash
                  ? await withTimeout(chainService.getExternalReceipt(task.latestFundTxHash), 350).catch(() => null)
                  : null;
                const assignReceipt = task.latestAssignTxHash
                  ? await withTimeout(chainService.getExternalReceipt(task.latestAssignTxHash), 350).catch(() => null)
                  : null;
                const fundOk = chainService.isExternalReceiptSuccessful(fundReceipt);
                const assignOk = chainService.isExternalReceiptSuccessful(assignReceipt);
                if (fundOk || assignOk) {
                  service.reconcileTaskFromExternalReceipts(taskId, {
                    fundingConfirmed: fundOk,
                    assignmentConfirmed: assignOk,
                  });
                  continue;
                }
              } catch {
                // keep list responses fast; avoid blocking homepage on slow contract reads
              }
              service.reconcileTaskFromCapturedTrace(taskId);
            }
          } catch {
            // best-effort reconciliation only
          }
        }
      }
      res.json(service.listTasks(viewerWallet));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Task listing failed" });
    }
  });

  router.get("/tasks/:taskId", async (req, res) => {
    try {
      if (chainService?.taskEscrowAddress) {
        try {
          const task = await ensureTaskAvailable(req.params.taskId);
          if (["pending_wallet", "pending_chain"].includes(task.transactionState)) {
            if (task.latestFundTxHash || task.latestAssignTxHash) {
              try {
                const fundReceipt = task.latestFundTxHash
                  ? await withTimeout(chainService.getExternalReceipt(task.latestFundTxHash), 400).catch(() => null)
                  : null;
                const assignReceipt = task.latestAssignTxHash
                  ? await withTimeout(chainService.getExternalReceipt(task.latestAssignTxHash), 400).catch(() => null)
                  : null;
                const fundOk = chainService.isExternalReceiptSuccessful(fundReceipt);
                const assignOk = chainService.isExternalReceiptSuccessful(assignReceipt);
                if (fundOk || assignOk) {
                  service.reconcileTaskFromExternalReceipts(req.params.taskId, {
                    fundingConfirmed: fundOk,
                    assignmentConfirmed: assignOk,
                  });
                }
              } catch {
                service.reconcileTaskFromCapturedTrace(req.params.taskId);
              }
            } else {
              service.reconcileTaskFromCapturedTrace(req.params.taskId);
            }
          }
          const shouldRefreshFromArc =
            Boolean(task.onchainTaskRef)
            || Boolean(task.latestCreateTxHash)
            || Boolean(task.latestFundTxHash)
            || Boolean(task.latestAssignTxHash)
            || ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "DISPUTED", "APPEALED", "UNRESOLVED"].includes(task.status);
          if (shouldRefreshFromArc) {
            const onchainTask = await withTimeout(chainService.readTask(req.params.taskId), ONCHAIN_TASK_READ_TIMEOUT_MS).catch(() => null);
            if (onchainTask) {
              service.reconcileTaskFromOnchain(
                req.params.taskId,
                onchainTask,
                `${chainService.taskEscrowAddress}:${req.params.taskId}`,
              );
            }
          }
        } catch {
          // best-effort onchain reconciliation only
        }
      }
      res.json(await ensureTaskAvailable(req.params.taskId));
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : "Task not found" });
    }
  });

  router.post("/tasks/:taskId/accept", async (req, res) => {
    try {
      await ensureTaskAvailable(req.params.taskId);
      const payload = taskActionRequestSchema.parse(req.body);
      res.json(await service.acceptTask(req.params.taskId, payload.actorWallet));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Accept failed" });
    }
  });

  router.post("/tasks/:taskId/approve", async (req, res) => {
    try {
      await ensureTaskAvailable(req.params.taskId);
      const payload = taskActionRequestSchema.parse(req.body);
      res.json(await service.approveTask(req.params.taskId, payload.actorWallet));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Approve failed" });
    }
  });

  router.post("/tasks/:taskId/reject", async (req, res) => {
    try {
      await ensureTaskAvailable(req.params.taskId);
      const payload = taskActionRequestSchema.parse(req.body);
      res.json(await service.rejectTask(req.params.taskId, payload.actorWallet));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Reject failed" });
    }
  });

  router.post("/tasks/:taskId/cancel", async (req, res) => {
    try {
      await ensureTaskAvailable(req.params.taskId);
      const payload = taskActionRequestSchema.parse(req.body);
      res.json(await service.cancelTask(req.params.taskId, payload.actorWallet));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cancel failed" });
    }
  });

  router.post("/tasks/:taskId/dispute", (_req, res) => {
    res.status(410).json({ error: "This endpoint moved. Use /api/settlements/tasks/:taskId/dispute." });
  });

  router.post("/tasks/:taskId/improve-again", async (req, res) => {
    try {
      await ensureTaskAvailable(req.params.taskId);
      const payload = taskActionRequestSchema.parse(req.body);
      res.json(await service.requestImproveAgain(req.params.taskId, payload.actorWallet));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Improve Again failed" });
    }
  });

  router.post("/tasks/:taskId/appeal", async (req, res) => {
    try {
      await ensureTaskAvailable(req.params.taskId);
      const payload = appealOpenRequestSchema.parse(req.body);
      res.json(await service.appealTask(req.params.taskId, payload.actorWallet, payload.reason));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Appeal failed" });
    }
  });

  router.post("/tasks/:taskId/settle", (_req, res) => {
    res.status(410).json({ error: "This endpoint moved. Use /api/settlements/tasks/:taskId/settle." });
  });

  router.post("/tasks/:taskId/refund", (_req, res) => {
    res.status(410).json({ error: "This endpoint moved. Use /api/settlements/tasks/:taskId/refund." });
  });

  router.post("/tasks/:taskId/review/user", async (req, res) => {
    try {
      await ensureTaskAvailable(req.params.taskId);
      const review = userReviewDecisionSchema.parse(req.body);
      res.json(await service.reviewWithUser(req.params.taskId, review.submissionId, review));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "User review failed" });
    }
  });

  router.post("/tasks/:taskId/review/assisted", async (req, res) => {
    try {
      await ensureTaskAvailable(req.params.taskId);
      const payload = reviewSubmissionSchema.parse(req.body);
      res.json(await service.reviewAssisted(req.params.taskId, payload.actorWallet, payload.submissionId));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Assisted review failed" });
    }
  });

  router.post("/tasks/:taskId/review/hybrid", async (req, res) => {
    try {
      await ensureTaskAvailable(req.params.taskId);
      const payload = reviewSubmissionSchema.parse(req.body);
      res.json(await service.reviewHybrid(req.params.taskId, payload.actorWallet, payload.submissionId));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Hybrid review failed" });
    }
  });

  router.post("/tasks/:taskId/review/hybrid/confirm", async (req, res) => {
    try {
      await ensureTaskAvailable(req.params.taskId);
      const payload = hybridConfirmSchema.parse(req.body);
      res.json(
        await service.confirmHybrid(
          req.params.taskId,
          payload.actorWallet,
          payload.evaluationId,
          payload.confirmDecision,
          payload.feedback ?? null,
        ),
      );
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Hybrid confirmation failed" });
    }
  });

  return router;
}

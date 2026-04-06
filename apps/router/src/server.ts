import express from "express";
import { createPersistedRegistryStore } from "./db/persistedStore";
import { createAgentBuilderRoutes } from "./routes/agentBuilderRoutes";
import { createExecutionRoutes } from "./routes/executionRoutes";
import { createAgentRegistryRoutes } from "./routes/agentRegistryRoutes";
import { createAdminRoutes } from "./routes/adminRoutes";
import { createChainRoutes } from "./routes/chainRoutes";
import { createSettlementRoutes } from "./routes/settlementRoutes";
import { createTaskMarketRoutes } from "./routes/taskMarketRoutes";
import { createTrustRoutes } from "./routes/trustRoutes";
import { AgentBuilderService } from "./services/agentBuilderService";
import { AgentRegistryService } from "./services/agentRegistryService";
import { EvaluatorClient } from "./services/evaluatorClient";
import { CompatibilityValidator } from "./services/compatibilityValidator";
import { HealthcheckRunner } from "./services/healthcheckRunner";
import { OwnerProofService } from "./services/ownerProofService";
import { createOwnerProofVerifier } from "./services/ownerProofVerifier";
import { ExecutionEngine } from "./services/executionEngine";
import { SettlementService } from "./services/settlementService";
import { TaskMarketService } from "./services/taskMarketService";
import { TrustRankingService } from "./services/trustRankingService";
import { ArcChainService } from "./services/arcChainService";
import { SafetyService } from "./services/safetyService";
import { AdminService } from "./services/adminService";
import { seedMarketplaceData } from "./seed/seedMarketplace";
import { resolvePlatformAgentOwnerWallet } from "./services/platformAgentCatalog";
import { resolveAllowedOrigins } from "./lib/publicBaseUrl";

type OnchainAwareAgent = {
  profile: {
    agentId: string;
    onchainAgentId?: string | null;
  };
};

const app = express();
const allowedOrigins = resolveAllowedOrigins();
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.has(origin) || /^http:\/\/localhost:\d+$/.test(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});
app.use(express.json());

const store = await createPersistedRegistryStore();
const verifier = createOwnerProofVerifier();
const healthcheckRunner = new HealthcheckRunner();
const compatibilityValidator = new CompatibilityValidator(healthcheckRunner);
const ownerProofService = new OwnerProofService(store, verifier);
const evaluatorClient = new EvaluatorClient();
const safetyService = new SafetyService(store);
const registryService = new AgentRegistryService(
  store,
  ownerProofService,
  healthcheckRunner,
  compatibilityValidator,
  safetyService,
);
const builderService = new AgentBuilderService(store, registryService);
const taskMarketService = new TaskMarketService(store, registryService, evaluatorClient, safetyService);
const settlementService = new SettlementService(store, taskMarketService);
const trustRankingService = new TrustRankingService(store);
const chainService = new ArcChainService();
for (const issue of chainService.startupIssues()) {
  console.warn(`arc config warning: ${issue}`);
}
const executionEngine = new ExecutionEngine(store, taskMarketService, registryService, safetyService, {
  maxRetries: Number(process.env.EXECUTION_MAX_RETRIES ?? "3"),
  baseBackoffMs: Number(process.env.EXECUTION_BASE_BACKOFF_MS ?? "1500"),
  timeoutMs: Number(process.env.EXECUTION_TIMEOUT_MS ?? "120000"),
  endpointAllowlist: (process.env.EXECUTION_ENDPOINT_ALLOWLIST ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
});
const adminService = new AdminService(store, taskMarketService, settlementService, registryService, executionEngine, safetyService);
taskMarketService.attachExecutionEngine(executionEngine);
taskMarketService.attachChainBridge({
  async readTaskState(taskId) {
    if (!chainService.taskEscrowAddress) return null;
    return {
      onchainTask: await chainService.readTask(taskId),
      onchainTaskRef: `${chainService.taskEscrowAddress}:${taskId}`,
    };
  },
  async assignTask(task, agent) {
    const onchainAgentId = (agent as OnchainAwareAgent).profile.onchainAgentId ?? agent.profile.agentId;
    if (!task.onchainTaskRef || !onchainAgentId || !chainService.canServerWrite) return null;
    return await chainService.assignTaskToAgent(task.taskId, onchainAgentId);
  },
  async startExecution(task, agent) {
    const onchainAgentId = (agent as OnchainAwareAgent).profile.onchainAgentId ?? agent.profile.agentId;
    if (!task.onchainTaskRef || !onchainAgentId || !chainService.canServerWrite) return null;
    return await chainService.startTaskExecution(task.taskId, onchainAgentId);
  },
  async submitTaskResult({ task, agent, submissionNonce, resultHash, resultPointer }) {
    const onchainAgentId = (agent as OnchainAwareAgent).profile.onchainAgentId ?? agent.profile.agentId;
    if (!task.onchainTaskRef || !onchainAgentId || !chainService.canServerWrite) return null;
    return chainService.submitTaskResult({
      taskId: task.taskId,
      agentOnchainId: onchainAgentId,
      submissionNonce,
      resultHash,
      metadataUri: resultPointer ?? `memory://results/${submissionNonce}`,
      metadataHash: resultHash,
    });
  },
  async approveSubmission(task, submissionId) {
    if (!task.onchainTaskRef || !chainService.canServerWrite) return null;
    return chainService.approveTaskSubmission(task.taskId, submissionId);
  },
  async rejectSubmission(task, submissionId) {
    if (!task.onchainTaskRef || !chainService.canServerWrite) return null;
    return chainService.rejectTaskSubmission(task.taskId, submissionId);
  },
  async finalizeReview({ task, submissionId, requestedOutcome, consensusScore, validatorAgreement, consensusConfidence, evaluationHash }) {
    if (!task.onchainTaskRef || !chainService.canServerWrite) return null;
    return chainService.finalizeTaskReview({
      taskId: task.taskId,
      submissionId,
      requestedOutcome,
      consensusScore,
      validatorAgreement,
      consensusConfidence,
      evaluationHash,
    });
  },
  async appealTask(task, reasonHash) {
    if (!task.onchainTaskRef || !chainService.canServerWrite) return null;
    return chainService.appealTask(task.taskId, reasonHash);
  },
  async cancelTask(task) {
    if (!task.onchainTaskRef || !chainService.canServerWrite) return null;
    return chainService.cancelTask(task.taskId);
  },
});
settlementService.attachChainBridge({
  async disputeTask(taskId) {
    if (!chainService.canServerWrite) return null;
    return chainService.disputeTask(taskId);
  },
  async settleTask(taskId) {
    if (!chainService.canServerWrite) return null;
    return chainService.settleTask(taskId);
  },
  async refundTask(taskId) {
    if (!chainService.canServerWrite) return null;
    return chainService.refundTask(taskId);
  },
});
executionEngine.start();
trustRankingService.startJobs();

const adminWallets = new Set(
  (process.env.ADMIN_WALLETS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const enableMarketplaceSeeding = String(process.env.ENABLE_MARKETPLACE_SEEDING ?? "").toLowerCase() === "true";

registryService.ensurePlatformAgents();
if (chainService.canServerWrite) {
  try {
    const results = await chainService.bootstrapPlatformAgentsOnchain();
    console.log(`platform agents synced onchain (${results.length})`);
  } catch (error) {
    console.warn(`platform agent onchain bootstrap failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "router",
    version: "0.1.0",
    checkedAt: new Date().toISOString(),
  });
});

app.use(
  "/api/agent-registry",
  createAgentRegistryRoutes({
    registryService,
    ownerProofService,
    adminWallets,
  }),
);
app.use("/api/agent-builder", createAgentBuilderRoutes(builderService));
app.use("/api/task-market", createTaskMarketRoutes(taskMarketService, chainService));
app.use("/api/chain", createChainRoutes(chainService, taskMarketService, registryService));
app.use("/api/execution", createExecutionRoutes(executionEngine));
app.use("/api/settlements", createSettlementRoutes(settlementService, adminWallets));
app.use("/api/trust", createTrustRoutes(trustRankingService));
app.use("/api/admin", createAdminRoutes(adminService, adminWallets));

if (enableMarketplaceSeeding) {
  await seedMarketplaceData({
    store,
    builderService,
    taskMarketService,
    settlementService,
    adminWallets,
  });
}
trustRankingService.recomputeAll();

const port = Number(process.env.PORT ?? 4020);
app.listen(port, () => {
  console.log(`router listening on ${port}`);
  console.log(`platform agents ready (${resolvePlatformAgentOwnerWallet()})`);
  console.log(`allowed origins: ${[...allowedOrigins].join(", ") || "none"}`);
  if (enableMarketplaceSeeding) {
    console.log("demo marketplace seeding enabled");
  }
});

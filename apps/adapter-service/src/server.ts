import express from "express";
import { createHash, createHmac, randomBytes } from "node:crypto";
import {
  agentAdapterTaskRequestSchema,
  agentAdapterTaskResponseSchema,
  agentResultResponseSchema,
  agentStatusResponseSchema,
  healthcheckResponseSchema,
  type AgentAdapterTaskRequest,
} from "@marketplace/shared";

const app = express();
app.use(express.json());

const health = healthcheckResponseSchema.parse({
  ok: true,
  version: "0.1.0",
  supportedTaskTypes: ["research", "analysis", "writing"],
  maxInputBytes: 262144,
  averageLatencyHintMs: 12000,
  signedOwnerProof: null,
  schemaVersion: "agent-adapter-v1",
});

const runs = new Map<string, { state: "running" | "completed"; resultPointer: string; result: unknown; completedAt: string; requestId: string; callbackUrl: string | null }>();

app.get("/health", (_req, res) => {
  res.json(health);
});

app.post("/agents/verify-ownership", (req, res) => {
  const owner = typeof req.body?.owner === "string" ? req.body.owner : "";
  const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";

  if (!owner || !endpoint) {
    res.status(400).json({ ok: false, error: "owner and endpoint are required" });
    return;
  }

  res.json({
    ok: true,
    challenge: `prove:${owner}:${endpoint}`,
    verificationMode: "signed-challenge",
  });
});

app.post("/execute", (req, res) => {
  const parsed = agentAdapterTaskRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: parsed.error.flatten() });
    return;
  }

  const payload: AgentAdapterTaskRequest = parsed.data;
  const outputText = [
    `Task: ${payload.title}`,
    `Description: ${payload.description}`,
    `Type: ${payload.taskType}`,
    `Structured result generated for request ${payload.requestId}.`,
  ].join("\n");

  const outputHash = createHash("sha256").update(outputText).digest("hex");
  const runId = `run_${payload.taskId}_${Date.now()}`;
  const resultPointer = `memory://artifacts/${payload.taskId}/${runId}`;
  const completedAt = new Date().toISOString();
  const result = {
    outputText,
    outputHash,
    sections: payload.structuredInput,
  };
  runs.set(runId, {
    state: "running",
    resultPointer,
    result,
    completedAt,
    requestId: payload.requestId,
    callbackUrl: payload.callbackUrl,
  });

  setTimeout(() => {
    const run = runs.get(runId);
    if (!run) return;
    run.state = "completed";
    run.completedAt = new Date().toISOString();
    runs.set(runId, run);
    if (run.callbackUrl) {
      void sendCallback({
        callbackUrl: run.callbackUrl,
        requestId: run.requestId,
        runId,
        result: run.result,
        completedAt: run.completedAt,
      });
    }
  }, 1200);

  const response = agentAdapterTaskResponseSchema.parse({
    accepted: true,
    executionMode: "async",
    runId,
    estimatedCompletionMs: 1500,
    error: null,
  });

  res.json(response);
});

app.get("/status/:runId", (req, res) => {
  const run = runs.get(req.params.runId);
  if (!run) {
    res.status(404).json({
      state: "failed",
      progress: 0,
      resultPointer: null,
      error: {
        code: "NOT_FOUND",
        message: "Run not found",
      },
    });
    return;
  }

  res.json(
    agentStatusResponseSchema.parse({
      state: run.state,
      progress: run.state === "completed" ? 1 : 0.5,
      resultPointer: run.resultPointer,
      error: null,
    }),
  );
});

app.get("/result/:runId", (req, res) => {
  const run = runs.get(req.params.runId);
  if (!run) {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Run not found",
      },
    });
    return;
  }

  res.json(
    agentResultResponseSchema.parse({
      result: run.result,
      confidence: 0.82,
      structuredMetadata: {
        provider: "adapter-service-demo",
        runId: req.params.runId,
      },
      completedAt: run.completedAt,
    }),
  );
});

const port = Number(process.env.PORT ?? 4010);
app.listen(port, () => {
  console.log(`adapter-service listening on ${port}`);
});

async function sendCallback(input: {
  callbackUrl: string;
  requestId: string;
  runId: string;
  result: unknown;
  completedAt: string;
}) {
  const nonce = randomBytes(8).toString("hex");
  const secret = process.env.ROUTER_CALLBACK_SECRET ?? process.env.ROUTER_AGENT_SHARED_SECRET ?? "dev-router-secret";
  const signature = createHmac("sha256", secret)
    .update(`${input.requestId}::${input.runId}::${nonce}`)
    .digest("hex");

  try {
    await fetch(input.callbackUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: input.requestId,
        runId: input.runId,
        nonce,
        signature,
        result: input.result,
        completedAt: input.completedAt,
      }),
    });
  } catch {
    // The router also supports polling, so callback failure is non-terminal for this demo adapter.
  }
}

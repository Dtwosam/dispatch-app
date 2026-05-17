import type { EvaluationResult, TaskDetailView } from "@marketplace/shared";
import { evaluationResultSchema } from "@marketplace/shared";
import type { ExecutionRunRow } from "../db/models";
import { InMemoryRegistryStore } from "../db/store";
import { makeId } from "../lib/ids";
import { SettlementService } from "./settlementService";
import { TaskMarketService } from "./taskMarketService";
import { TrustRankingService } from "./trustRankingService";

const DEMO_AGENT_ID = "platform_thread_writer";
const DEMO_TITLE = "Write a launch thread for a new stablecoin payment app";
const DEMO_DESCRIPTION = [
  "Create a launch-ready Twitter/X thread for a new stablecoin payment app on Arc Testnet.",
  "The output must include a strong hook, thread body, CTA, suggested visuals, and notes.",
  "Keep it useful for a crypto-native audience without sounding generic.",
].join("\n\n");
const DEMO_STRUCTURED_NOTES = [
  "Expected output:",
  "- Hook",
  "- Thread body",
  "- CTA",
  "- Suggested visuals",
  "- Notes",
  "",
  "Evaluation criteria:",
  "- clear hook",
  "- simple explanation",
  "- strong CTA",
  "- not generic",
  "- useful for crypto-native audience",
  "- follows requested thread format",
].join("\n");

export type DemoFlowStage =
  | "funded_assigned"
  | "execution_started"
  | "output_submitted"
  | "review_approved"
  | "payment_released";

export type DemoFlowResponse = {
  task: TaskDetailView;
  stage: DemoFlowStage;
  message: string;
  demoMode: {
    network: "Arc Testnet";
    settlement: "Demo USDC settlement";
    productionPayment: false;
  };
};

export class DemoFlowService {
  constructor(
    private readonly store: InMemoryRegistryStore,
    private readonly taskMarket: TaskMarketService,
    private readonly settlementService: SettlementService,
    private readonly trustRankingService: TrustRankingService,
  ) {}

  startThreadWriterDemo(input: { creatorWallet?: string | null } = {}): DemoFlowResponse {
    this.assertDemoEnabled();
    this.assertThreadWriterAvailable();
    const creatorWallet = this.resolveCreatorWallet(input.creatorWallet);
    const created = this.taskMarket.createTaskDraft({
      title: DEMO_TITLE,
      description: DEMO_DESCRIPTION,
      category: "writing",
      rewardAmount: 10,
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      hiringMode: "direct_hire",
      selectedAgentId: DEMO_AGENT_ID,
      attachments: [],
      evaluationPreference: "hybrid_review",
      structuredNotes: DEMO_STRUCTURED_NOTES,
      creatorWallet,
      maxParticipants: 1,
    });

    const task = this.requireTask(created.task.taskId);
    task.transactionState = "accepted";
    task.onchainTaskRef = `demo:${task.taskId}`;
    task.latestCreateTxHash = `demo_create:${task.taskId}`;
    task.latestFundTxHash = `demo_fund:${task.taskId}`;
    task.latestAssignTxHash = `demo_assign:${task.taskId}`;
    task.status = "ASSIGNED";
    task.resultStatus = "not_started";
    task.settlementState = "reward_funded";
    task.reviewActions = ["cancel"];
    task.updatedAt = new Date().toISOString();
    task.timeline.push(
      this.timeline("escrow_funded", "Arc Testnet demo funding", "Demo mode marks 10 USDC as funded so the marketplace flow can be shown without production payment settlement."),
      this.timeline("agent_invited", "Thread Writer assigned", "Thread Writer is assigned as the demo worker through the normal marketplace task model."),
    );
    this.store.tasks.set(task.taskId, task);

    return this.response(this.taskMarket.getTask(task.taskId), "funded_assigned", "Demo funded task is ready. Next step: start Thread Writer execution.");
  }

  async advanceThreadWriterDemo(taskId: string, input: { actorWallet?: string | null } = {}): Promise<DemoFlowResponse> {
    this.assertDemoEnabled();
    const actorWallet = this.resolveCreatorWallet(input.actorWallet);
    const task = this.requireTask(taskId);
    this.assertDemoTask(task);

    if (task.status === "ASSIGNED" || task.status === "OPEN") {
      await this.taskMarket.markExecutionStarted(taskId, DEMO_AGENT_ID);
      return this.response(this.taskMarket.getTask(taskId), "execution_started", "Thread Writer is executing the funded task.");
    }

    if (task.status === "EXECUTING") {
      const output = this.demoOutput();
      const resultHash = `demo_result_hash_${taskId}`;
      this.attachCompletedRun(task, output, resultHash);
      await this.taskMarket.markSubmissionReceived(
        taskId,
        DEMO_AGENT_ID,
        `demo://results/${taskId}`,
        resultHash,
        output.summary,
        `${taskId}_submission`,
      );
      return this.response(this.taskMarket.getTask(taskId), "output_submitted", "Structured Thread Writer output is submitted and ready for evaluator review.");
    }

    if (task.status === "SUBMITTED" || task.status === "UNDER_REVIEW") {
      const current = this.requireTask(taskId);
      current.latestEvaluation = this.demoEvaluation(taskId);
      current.userReview = {
        taskId,
        submissionId: current.latestSubmissionId ?? `${taskId}_submission`,
        reviewerWallet: current.creatorWallet,
        decision: "approve",
        starRating: 5,
        feedback: "Demo evaluator approved the structured thread for settlement.",
        rejectionReason: null,
      };
      this.store.tasks.set(taskId, current);
      await this.taskMarket.approveTask(taskId, current.creatorWallet, current.latestSubmissionId);
      const approvedTask = this.requireTask(taskId);
      approvedTask.latestEvaluation = this.demoEvaluation(taskId);
      this.store.tasks.set(taskId, approvedTask);
      this.annotateLatestRun(taskId, {
        reviewOutcome: "approve",
        consensusScore: 86,
        validatorAgreement: 0.91,
        consensusConfidence: 0.88,
        finalOutcome: "accepted",
      });
      return this.response(this.taskMarket.getTask(taskId), "review_approved", "Score 86/100. Approved. USDC release is ready.");
    }

    if (task.status === "APPROVED") {
      await this.settlementService.settleApprovedTask(taskId, task.creatorWallet || actorWallet);
      this.trustRankingService.recomputeAll();
      return this.response(this.taskMarket.getTask(taskId), "payment_released", "Payment released. Thread Writer earnings, paid work, and reputation are updated.");
    }

    if (task.status === "SETTLED") {
      return this.response(this.taskMarket.getTask(taskId), "payment_released", "Demo task is already settled and reputation has been updated.");
    }

    throw new Error(`Demo flow cannot advance from ${task.status}`);
  }

  private assertDemoEnabled() {
    if (process.env.DISPATCH_ENABLE_DEMO_FUNDING_FALLBACK !== "true") {
      throw new Error("Demo flow is disabled. Enable DISPATCH_ENABLE_DEMO_FUNDING_FALLBACK=true for local demo mode.");
    }
  }

  private assertThreadWriterAvailable() {
    if (!this.store.agents.has(DEMO_AGENT_ID)) {
      throw new Error("Thread Writer platform agent is not registered.");
    }
  }

  private assertDemoTask(task: TaskDetailView) {
    if (task.title !== DEMO_TITLE || task.selectedAgentId !== DEMO_AGENT_ID || !task.onchainTaskRef?.startsWith("demo:")) {
      throw new Error("This action only advances the built-in Thread Writer demo task.");
    }
  }

  private resolveCreatorWallet(wallet?: string | null) {
    const trimmed = wallet?.trim();
    return trimmed || process.env.DEMO_BUYER_WALLET || "demo_buyer_wallet";
  }

  private requireTask(taskId: string) {
    const task = this.store.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    return task;
  }

  private timeline(kind: TaskDetailView["timeline"][number]["kind"], title: string, description: string) {
    return {
      id: makeId("evt"),
      kind,
      title,
      description,
      createdAt: new Date().toISOString(),
    };
  }

  private response(task: TaskDetailView, stage: DemoFlowStage, message: string): DemoFlowResponse {
    return {
      task,
      stage,
      message,
      demoMode: {
        network: "Arc Testnet",
        settlement: "Demo USDC settlement",
        productionPayment: false,
      },
    };
  }

  private demoOutput() {
    return {
      summary: "Launch thread ready: Hook, thread body, CTA, suggested visuals, and notes for a stablecoin payment app.",
      sections: [
        {
          heading: "Hook",
          bullets: ["Stablecoin payments should feel as instant as sending a message, not as heavy as wiring money."],
        },
        {
          heading: "Thread body",
          bullets: [
            "1/ Most payment apps make crypto feel like an extra step. This launch flips that: pay in USDC, settle on Arc, and keep the flow simple enough for everyday operators.",
            "2/ The promise is not another dashboard. It is faster invoices, cleaner vendor payouts, and fewer settlement delays for teams already working across borders.",
            "3/ Arc Testnet gives the app a low-friction place to prove the payment loop: funded intent, visible status, verified completion, and settlement-ready records.",
            "4/ For users, the win is clarity. You know what was funded, what was delivered, what passed review, and when USDC release is ready.",
            "5/ For builders, the win is composability. Agents, apps, and external workflows can plug into the same verified outcome path instead of rebuilding trust from scratch.",
          ],
        },
        {
          heading: "CTA",
          bullets: ["Try the demo flow, send a test payment task, and see how fast funded work can move from request to verified settlement."],
        },
        {
          heading: "Suggested visuals",
          bullets: [
            "A simple three-step product screenshot: Fund task -> Verify output -> Release USDC.",
            "A compact Arc Testnet status card showing funded, approved, and settlement-ready states.",
          ],
        },
        {
          heading: "Notes",
          bullets: [
            "Keep copy grounded in testnet/demo settlement until production Circle rails are live.",
            "Add one sharper usage metric once the payment app has live pilot data.",
          ],
        },
      ],
      confidence: "high",
    };
  }

  private attachCompletedRun(task: TaskDetailView, finalOutput: ReturnType<DemoFlowService["demoOutput"]>, resultHash: string) {
    const now = new Date();
    const startedAt = new Date(now.getTime() - 6500).toISOString();
    const completedAt = now.toISOString();
    const run: ExecutionRunRow = {
      runId: `demo_run_${task.taskId}`,
      requestId: `demo_req_${task.taskId}`,
      taskId: task.taskId,
      agentId: DEMO_AGENT_ID,
      ownerWallet: this.store.agents.get(DEMO_AGENT_ID)?.profile.ownerWallet ?? "platform_agent_wallet",
      endpointUrl: `platform://${DEMO_AGENT_ID}`,
      callbackUrl: "demo://callback",
      state: "completed",
      attempt: 1,
      maxRetries: 1,
      nextRetryAt: null,
      timeoutAt: new Date(now.getTime() + 60000).toISOString(),
      executionMode: "sync",
      remoteRunId: `demo_remote_${task.taskId}`,
      resultPointer: `demo://results/${task.taskId}`,
      resultHash,
      rawPayload: {
        mode: "demo",
        structuredTask: {
          title: task.title,
          expectedOutput: ["Hook", "Thread body", "CTA", "Suggested visuals", "Notes"],
          evaluationCriteria: ["clear hook", "simple explanation", "strong CTA", "not generic", "crypto-native usefulness", "thread format"],
        },
        finalOutput,
        score: 86,
        confidence: "high",
        evaluation: {
          overall: 86,
          decision: "Pass",
          payoutRecommendation: "release_full_payment",
          strengths: ["clear hook", "simple narrative", "strong CTA"],
          weaknesses: ["could use one sharper data point"],
          settlementReadiness: "Approved. USDC release is ready.",
        },
        runSummary: "Thread Writer produced a launch-ready stablecoin payment app thread with CTA and visual guidance.",
        stageTimingsMs: {
          structuring: 310,
          generation: 2600,
          evaluation: 900,
          improvement: 1700,
        },
      },
      normalizedPayload: finalOutput,
      errorCode: null,
      failureCategory: null,
      lastErrorMessage: null,
      createdAt: startedAt,
      updatedAt: completedAt,
      startedAt,
      completedAt,
    };
    this.store.executionRuns.set(run.runId, run);
  }

  private demoEvaluation(taskId: string): EvaluationResult {
    const createdAt = new Date().toISOString();
    return evaluationResultSchema.parse({
      evaluationId: `demo_eval_${taskId}`,
      taskId,
      winningSubmissionId: `${taskId}_submission`,
      scores: [
        {
          submissionId: `${taskId}_submission`,
          agentId: DEMO_AGENT_ID,
          score: 86,
          normalizedScore: 0.86,
          notes: "Clear hook, simple narrative, strong CTA, and the requested thread structure is followed.",
        },
      ],
      summary: "Score: 86/100. Decision: Pass. Payout recommendation: release_full_payment.",
      reasoning: "The output follows the requested thread format, explains the stablecoin payment app simply, includes a useful CTA, and avoids generic filler. It could be stronger with one concrete usage metric.",
      normalizedScore: 0.86,
      overallScore: 86,
      finalDecision: "approve",
      finalOutcome: "accepted",
      consensusScore: 86,
      validatorAgreement: 0.91,
      consensusConfidence: 0.88,
      equivalenceSummary: "AI review judged the delivered thread strong enough to recommend approval.",
      path: "hybrid_review",
      findings: [
        {
          reviewerId: "demo_ai_reviewer_1",
          reviewerType: "machine_assisted",
          decision: "approve",
          acceptanceSignal: "accept",
          overallScore: 86,
          confidence: 0.88,
          summary: "Pass. Approved. USDC release is ready.",
          reasoning: "Strengths: clear hook, simple narrative, strong CTA. Weakness: could use one sharper data point.",
          criteriaScores: {
            completionScore: 88,
            relevanceScore: 87,
            correctnessProxyScore: 82,
            formatComplianceScore: 91,
            usefulnessScore: 86,
            latencyAwarenessScore: 90,
          },
          createdAt,
        },
      ],
      reviewerType: "machine_assisted",
      createdAt,
    });
  }

  private annotateLatestRun(taskId: string, patch: Partial<ExecutionRunRow["rawPayload"] & Record<string, unknown>>) {
    const run = [...this.store.executionRuns.values()]
      .filter((item) => item.taskId === taskId)
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0];
    if (!run || !run.rawPayload || typeof run.rawPayload !== "object" || Array.isArray(run.rawPayload)) return;
    run.rawPayload = {
      ...run.rawPayload,
      ...patch,
    };
    run.updatedAt = new Date().toISOString();
    this.store.executionRuns.set(run.runId, run);
  }
}

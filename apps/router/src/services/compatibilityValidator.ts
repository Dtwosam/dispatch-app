import {
  agentAdapterTaskRequestSchema,
  agentAdapterTaskResponseSchema,
  agentStatusResponseSchema,
  type CompatibilityCheck,
  type HealthcheckResponse,
} from "@marketplace/shared";
import type { AgentCompatibilityDeclarationRow, AgentRegistryRow } from "../db/models";
import { fetchJson } from "../lib/http";
import { makeId } from "../lib/ids";
import { mapDispatchTaskToErc8183Job } from "../lib/arcStandards";
import { signRouterRequest } from "./routerAuth";
import { HealthcheckRunner } from "./healthcheckRunner";

export class CompatibilityValidator {
  constructor(private readonly healthcheckRunner: HealthcheckRunner) {}

  async validateAgent(
    row: AgentRegistryRow,
    declaration: AgentCompatibilityDeclarationRow | null,
    runExecutionProbe: boolean,
  ): Promise<CompatibilityCheck> {
    const checkedAt = new Date().toISOString();
    const notes: string[] = [];
    const healthRun = row.profile.endpointUrl
      ? await this.healthcheckRunner.run(row.profile.endpointUrl)
      : { ok: false, latencyMs: 0, payload: null as HealthcheckResponse | null, errorMessage: "Endpoint missing" };

    if (!healthRun.ok || !healthRun.payload) {
      if (healthRun.errorMessage) notes.push(healthRun.errorMessage);
      return {
        compatible: false,
        compatibilityStatus: "incompatible",
        checkedAt,
        notes,
        healthcheck: null,
        executeProbeAccepted: null,
        executeProbeMode: null,
      };
    }

    if (declaration) {
      const unsupported = declaration.supportedCategories.filter(
        (category) => !healthRun.payload?.supportedTaskTypes.includes(category as never),
      );
      if (unsupported.length > 0) {
        notes.push(`Healthcheck does not advertise declared categories: ${unsupported.join(", ")}`);
      }
      if (healthRun.payload.maxInputBytes < declaration.declaredMaxPayloadSize) {
        notes.push("Declared max payload exceeds endpoint healthcheck maxInputBytes");
      }
    }

    if (!runExecutionProbe || !row.profile.endpointUrl) {
      return {
        compatible: notes.length === 0,
        compatibilityStatus: notes.length === 0 ? "compatible" : "warning",
        checkedAt,
        notes,
        healthcheck: healthRun.payload,
        executeProbeAccepted: null,
        executeProbeMode: null,
      };
    }

    const requestId = makeId("probe");
    const probeTaskId = `compat_${requestId}`;
    const erc8183Job = mapDispatchTaskToErc8183Job({
      taskId: probeTaskId,
      title: "Compatibility probe",
      description: "Compatibility probe for registry validation. Do not treat as billable work.",
      category: row.profile.category,
      rewardAmount: 0,
      deadline: new Date(Date.now() + 60_000).toISOString(),
      status: "CREATED",
      resultStatus: "not_started",
      creatorWallet: row.profile.ownerWallet,
      creatorDisplay: row.profile.ownerWallet,
      selectedAgentId: row.profile.agentId,
      participatingAgentIds: [row.profile.agentId],
      maxParticipants: 1,
      transactionState: "pending_wallet",
      onchainTaskRef: null,
      createdAt: checkedAt,
      updatedAt: checkedAt,
      attachments: [],
      evaluationPreference: "assisted_evaluation",
      structuredNotes: "Compatibility validation payload only.",
      hiringMode: "direct_hire",
      timeline: [],
      selectedAgents: [],
      reviewActions: [],
      latestEvaluation: null,
      userReview: null,
      latestSubmissionId: null,
      latestSettlement: null,
      disputeRecord: null,
      appealRecord: null,
      settlementState: "reward_funded",
    }, {
      providerAgentId: row.profile.agentId,
      evaluator: row.profile.ownerWallet,
      state: "mapped",
      hook: null,
      paymentTokenAddress: null,
      paymentTokenSymbol: "USDC",
      paymentTokenDecimals: 6,
      now: checkedAt,
    });
    const probePayload = agentAdapterTaskRequestSchema.parse({
      requestId,
      taskId: probeTaskId,
      taskType: row.profile.category,
      title: "Compatibility probe",
      description: "Compatibility probe for registry validation. Do not treat as billable work.",
      structuredInput: { probe: true },
      attachments: [],
      expectedOutputSchema: { type: "object", probe: true },
      deadlineTimestamp: Math.floor(Date.now() / 1000) + 60,
      callbackUrl: null,
      auth: {
        ownerWallet: row.profile.ownerWallet,
        signature: signRouterRequest({
          ownerWallet: row.profile.ownerWallet,
          requestId,
          taskId: probeTaskId,
        }),
        timestamp: Math.floor(Date.now() / 1000),
      },
      interop: {
        erc8183Job,
      },
    });

    try {
      const executeResponse = await fetchJson<unknown>(
        `${row.profile.endpointUrl.replace(/\/$/, "")}/execute`,
        {
          method: "POST",
          body: JSON.stringify(probePayload),
        },
        10000,
      );

      const parsedExecute = agentAdapterTaskResponseSchema.parse(executeResponse.data);
      if (!parsedExecute.accepted) {
        notes.push("Execution probe was rejected by external agent");
      }

      if (parsedExecute.executionMode === "async") {
        const statusResponse = await fetchJson<unknown>(
          `${row.profile.endpointUrl.replace(/\/$/, "")}/status/${parsedExecute.runId}`,
          {},
          5000,
        );
        agentStatusResponseSchema.parse(statusResponse.data);
      }

      return {
        compatible: notes.length === 0 && parsedExecute.accepted,
        compatibilityStatus: notes.length === 0 && parsedExecute.accepted ? "compatible" : "warning",
        checkedAt,
        notes,
        healthcheck: healthRun.payload,
        executeProbeAccepted: parsedExecute.accepted,
        executeProbeMode: parsedExecute.executionMode,
      };
    } catch (error) {
      notes.push(error instanceof Error ? error.message : "Unknown compatibility probe error");
      return {
        compatible: false,
        compatibilityStatus: "incompatible",
        checkedAt,
        notes,
        healthcheck: healthRun.payload,
        executeProbeAccepted: false,
        executeProbeMode: null,
      };
    }
  }
}

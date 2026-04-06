import type {
  AgentTestRunRequest,
  AgentTestRunResponse,
  CreateAgentDraft,
  CreateAgentDraftInput,
  PublishAgentDraftRequest,
  PublishAgentDraftResponse,
  RegisterAgentInput,
  RegistryAgentView,
  UpdateAgentDraftStepInput,
} from "@marketplace/shared";
import { createAgentDraftSchema } from "@marketplace/shared";
import { createCompatibilityFingerprint } from "@marketplace/agent-sdk";
import { InMemoryRegistryStore } from "../db/store";
import { makeId } from "../lib/ids";
import { AgentRegistryService } from "./agentRegistryService";

export class AgentBuilderService {
  constructor(
    private readonly store: InMemoryRegistryStore,
    private readonly registryService: AgentRegistryService,
  ) {}

  createDraft(input: CreateAgentDraftInput): CreateAgentDraft {
    const now = new Date().toISOString();
    const draft = createAgentDraftSchema.parse({
      draftId: makeId("draft"),
      ownerWallet: input.ownerWallet,
      currentStep: input.currentStep,
      identity: input.identity,
      behavior: input.behavior,
      tools: input.tools,
      knowledge: input.knowledge,
      schemaDefinition: input.schemaDefinition,
      lastTestRun: null,
      createdAt: now,
      updatedAt: now,
    });
    this.store.agentDrafts.set(draft.draftId, draft);
    return draft;
  }

  updateDraft(draftId: string, input: UpdateAgentDraftStepInput): CreateAgentDraft {
    const current = this.requireDraft(draftId);
    const updated = createAgentDraftSchema.parse({
      ...current,
      currentStep: input.currentStep,
      identity: input.identity ?? current.identity,
      behavior: input.behavior ?? current.behavior,
      tools: input.tools ?? current.tools,
      knowledge: input.knowledge ?? current.knowledge,
      schemaDefinition: input.schemaDefinition ?? current.schemaDefinition,
      updatedAt: new Date().toISOString(),
    });
    this.store.agentDrafts.set(draftId, updated);
    return updated;
  }

  getDraft(draftId: string): CreateAgentDraft {
    return this.requireDraft(draftId);
  }

  runTest(draftId: string, input: AgentTestRunRequest): AgentTestRunResponse {
    const draft = this.requireDraft(draftId);
    const startedAt = Date.now();

    const enabledTools = draft.tools.selectedTools.filter((tool) => tool.enabled).map((tool) => tool.id);
    const result = {
      title: draft.identity.publicName,
      summary: `${draft.identity.tagline} completed a test task in ${draft.identity.category}.`,
      tone: draft.behavior.toneStyle,
      output: {
        requestedTask: input.sampleTask,
        appliedConstraints: draft.behavior.domainConstraints,
        knowledgeSources: draft.knowledge.attachments.map((item) => item.title),
        enabledTools,
      },
    };

    const errors: string[] = [];
    const outputKeys = draft.schemaDefinition.outputFields.map((field) => field.key);
    const parseValid = outputKeys.length > 0;
    if (!parseValid) {
      errors.push("Define at least one output field before publishing.");
    }

    const response: AgentTestRunResponse = {
      runId: makeId("testrun"),
      result,
      latencyMs: Math.max(1200, Date.now() - startedAt + 850),
      parseValid,
      errors,
      toolTrace: enabledTools.length > 0 ? enabledTools : ["no_tool_mode"],
      runAt: new Date().toISOString(),
    };

    this.store.agentDrafts.set(draftId, {
      ...draft,
      lastTestRun: {
        runId: response.runId,
        sampleTask: input.sampleTask,
        result: response.result,
        latencyMs: response.latencyMs,
        parseValid: response.parseValid,
        errors: response.errors,
        runAt: response.runAt,
      },
      updatedAt: new Date().toISOString(),
    });

    return response;
  }

  async publishDraft(draftId: string, input: PublishAgentDraftRequest): Promise<PublishAgentDraftResponse> {
    const draft = this.requireDraft(draftId);
    if (draft.ownerWallet !== input.ownerWallet) {
      throw new Error("Only the draft owner can publish this agent");
    }
    if (!draft.lastTestRun) {
      throw new Error("Run a test before publishing");
    }

    const versionHash = createCompatibilityFingerprint({
      endpointUrl: draft.identity.slug,
      schemaVersion: "agent-builder-v1",
      versionHashOrFingerprint: JSON.stringify({
        identity: draft.identity,
        behavior: draft.behavior,
        tools: draft.tools,
        knowledge: draft.knowledge,
        schemaDefinition: draft.schemaDefinition,
      }),
      supportedCategories: [draft.identity.category],
    });

    const registerInput: RegisterAgentInput = {
      ownerProofId: input.ownerProofId,
      ownerWallet: input.ownerWallet,
      publicName: draft.identity.publicName,
      slug: draft.identity.slug,
      description: `${draft.identity.tagline}\n\n${draft.behavior.systemInstructions}`,
      avatarUrl: draft.identity.avatarUrl,
      originType: "platform",
      category: draft.identity.category,
      capabilityTags: draft.identity.capabilityTags,
      skills: draft.identity.capabilityTags,
      skillCategories: [draft.identity.category],
      endpointUrl: null,
      expectedLatencyMsRange: {
        minMs: 1000,
        maxMs: Math.max(5000, draft.lastTestRun.latencyMs * 2),
      },
      pricingHint: "Newly published platform agent",
      activeVersionHash: versionHash,
    };

    const registryAgent = await this.registryService.registerAgent(registerInput);
    const version = {
      versionHash,
      agentId: registryAgent.profile.agentId,
      configType: "hybrid" as const,
      systemPrompt: draft.behavior.systemInstructions,
      tools: draft.tools.selectedTools.filter((tool) => tool.enabled).map((tool) => tool.id),
      outputSchema: {
        inputFields: draft.schemaDefinition.inputFields,
        outputFields: draft.schemaDefinition.outputFields,
        outputExample: draft.schemaDefinition.outputExample,
      },
      knowledgeAssetRefs: draft.knowledge.attachments.map((item) => item.pointer),
      publishedAt: new Date().toISOString(),
    };

    let publishedAgent: RegistryAgentView = await this.registryService.publishVersion(
      registryAgent.profile.agentId,
      {
        ownerWallet: input.ownerWallet,
        version,
        runHealthcheck: false,
        runCompatibilityProbe: false,
      },
    );

    if (input.activateAfterPublish) {
      publishedAgent = this.registryService.activate(registryAgent.profile.agentId, input.ownerWallet);
    }

    return {
      draftId,
      versionHash,
      registryAgent: publishedAgent,
      publicProfilePath: `/agents/${publishedAgent.profile.slug}`,
    };
  }

  private requireDraft(draftId: string): CreateAgentDraft {
    const draft = this.store.agentDrafts.get(draftId);
    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }
    return draft;
  }
}

import type {
  AdminSuspendAgentInput,
  PublishAgentVersionInput,
  RegisterAgentInput,
  RegistryAgentView,
  UpdateAgentMetadataInput,
} from "@marketplace/shared";
import { publishAgentVersionResponseSchema, registerAgentResponseSchema } from "@marketplace/shared";
import type {
  AgentCompatibilityCheckRow,
  AgentHealthcheckRow,
  AgentRegistryRow,
  AgentVersionRow,
} from "../db/models";
import { toRegistryAgentView } from "../db/models";
import { InMemoryRegistryStore } from "../db/store";
import { makeId } from "../lib/ids";
import { CompatibilityValidator } from "./compatibilityValidator";
import { HealthcheckRunner } from "./healthcheckRunner";
import { OwnerProofService } from "./ownerProofService";
import { SafetyService } from "./safetyService";
import { bootstrapPlatformAgents, isDeprecatedBuiltInPlatformAgentId } from "./platformAgentCatalog";

type SkillAwareProfile = AgentRegistryRow["profile"] & {
  skills?: string[];
  skillCategories?: string[];
  developerName?: string;
  webhookUrl?: string | null;
  adapterType?: "platform" | "http" | "webhook" | "erc8183_adapter";
  outputSchema?: string | Record<string, unknown>;
  payoutWallet?: string;
  erc8183Compatible?: boolean;
  connectionStatus?: "unknown" | "connected" | "degraded" | "offline";
};

type SkillAwareRegisterInput = RegisterAgentInput & {
  skills?: string[];
  skillCategories?: string[];
  developerName?: string;
  webhookUrl?: string | null;
  adapterType?: "platform" | "http" | "webhook" | "erc8183_adapter";
  outputSchema?: string | Record<string, unknown>;
  payoutWallet?: string;
  erc8183Compatible?: boolean;
};

type SkillAwareUpdateInput = UpdateAgentMetadataInput & {
  skills?: string[];
  skillCategories?: string[];
  developerName?: string;
  webhookUrl?: string | null;
  adapterType?: "platform" | "http" | "webhook" | "erc8183_adapter";
  outputSchema?: string | Record<string, unknown>;
  payoutWallet?: string;
  erc8183Compatible?: boolean;
};

export class AgentRegistryService {
  constructor(
    private readonly store: InMemoryRegistryStore,
    private readonly ownerProofService: OwnerProofService,
    private readonly healthcheckRunner: HealthcheckRunner,
    private readonly compatibilityValidator: CompatibilityValidator,
    private readonly safetyService: SafetyService,
  ) {}

  async registerAgent(input: RegisterAgentInput): Promise<RegistryAgentView> {
    this.ownerProofService.requireVerifiedProof(input.ownerProofId, input.ownerWallet);
    const skillAwareInput = input as SkillAwareRegisterInput;

    const profile: SkillAwareProfile = {
      agentId: makeId("agent"),
      onchainAgentId: null,
      ownerWallet: input.ownerWallet,
      publicName: input.publicName,
      slug: input.slug,
      description: input.description,
      avatarUrl: input.avatarUrl,
      originType: input.originType,
      developerName: skillAwareInput.developerName,
      category: input.category,
      capabilityTags: input.capabilityTags,
      skills: skillAwareInput.skills ?? [],
      skillCategories: skillAwareInput.skillCategories ?? [],
      endpointUrl: input.endpointUrl,
      webhookUrl: skillAwareInput.webhookUrl ?? null,
      adapterType: skillAwareInput.adapterType ?? (input.originType === "external" ? "erc8183_adapter" : "platform"),
      outputSchema: skillAwareInput.outputSchema,
      payoutWallet: skillAwareInput.payoutWallet ?? input.ownerWallet,
      erc8183Compatible: skillAwareInput.erc8183Compatible ?? (input.originType === "external"),
      connectionStatus: input.originType === "external" ? "unknown" : "connected",
      expectedLatencyMsRange: input.expectedLatencyMsRange,
      pricingHint: input.pricingHint,
      activeVersionHash: input.activeVersionHash,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const row: AgentRegistryRow = {
      profile,
      registrationState: input.originType === "external" ? "verified" : "draft",
      healthStatus: "unknown",
      compatibilityStatus: "unknown",
      latestVersionHash: input.activeVersionHash,
      suspensionReason: null,
      compatibilityDeclaration: input.compatibility ?? null,
    };

    this.store.upsertAgent(row);
    this.store.ensurePerformance(profile.agentId);

    if (input.originType === "external" && input.endpointUrl) {
      this.safetyService.validateEndpoint(input.endpointUrl);
      await this.runPrePublishHealthcheck(profile.agentId, input.ownerWallet);
      await this.testCompatibility(profile.agentId, input.ownerWallet, true);
    }

    return registerAgentResponseSchema.parse(this.getAgent(profile.agentId));
  }

  updateMetadata(agentId: string, input: UpdateAgentMetadataInput): RegistryAgentView {
    const row = this.requireAgent(agentId);
    this.assertOwner(row, input.ownerWallet);
    const skillAwareInput = input as SkillAwareUpdateInput;
    const currentProfile = row.profile as SkillAwareProfile;

    row.profile = {
      ...currentProfile,
      publicName: input.publicName ?? row.profile.publicName,
      description: input.description ?? row.profile.description,
      avatarUrl: input.avatarUrl ?? row.profile.avatarUrl,
      developerName: skillAwareInput.developerName ?? currentProfile.developerName,
      category: input.category ?? row.profile.category,
      capabilityTags: input.capabilityTags ?? row.profile.capabilityTags,
      skills: skillAwareInput.skills ?? currentProfile.skills ?? [],
      skillCategories: skillAwareInput.skillCategories ?? currentProfile.skillCategories ?? [],
      webhookUrl: skillAwareInput.webhookUrl ?? currentProfile.webhookUrl ?? null,
      adapterType: skillAwareInput.adapterType ?? currentProfile.adapterType,
      outputSchema: skillAwareInput.outputSchema ?? currentProfile.outputSchema,
      payoutWallet: skillAwareInput.payoutWallet ?? currentProfile.payoutWallet,
      erc8183Compatible: skillAwareInput.erc8183Compatible ?? currentProfile.erc8183Compatible,
      pricingHint: input.pricingHint ?? row.profile.pricingHint,
      expectedLatencyMsRange: input.expectedLatencyMsRange ?? row.profile.expectedLatencyMsRange,
      updatedAt: new Date().toISOString(),
    } as SkillAwareProfile;
    this.store.upsertAgent(row);
    return this.getAgent(agentId);
  }

  async publishVersion(agentId: string, input: PublishAgentVersionInput): Promise<RegistryAgentView> {
    const row = this.requireAgent(agentId);
    this.assertOwner(row, input.ownerWallet);

    const versionRow: AgentVersionRow = {
      version: input.version,
      publishedByWallet: input.ownerWallet,
    };
    this.store.appendVersion(agentId, versionRow);
    row.latestVersionHash = input.version.versionHash;
    row.profile.activeVersionHash = input.version.versionHash;
    row.registrationState = "published";
    row.profile.updatedAt = new Date().toISOString();
    this.store.upsertAgent(row);

    if (row.profile.originType === "external" && row.profile.endpointUrl) {
      if (input.runHealthcheck) {
        await this.runPrePublishHealthcheck(agentId, input.ownerWallet);
      }
      if (input.runCompatibilityProbe) {
        await this.testCompatibility(agentId, input.ownerWallet, true);
      }
    }

    return publishAgentVersionResponseSchema.parse(this.getAgent(agentId));
  }

  activate(agentId: string, actorWallet: string): RegistryAgentView {
    const row = this.requireAgent(agentId);
    this.assertOwner(row, actorWallet);
    if (row.registrationState === "suspended") {
      throw new Error("Suspended agents cannot be activated");
    }
    row.profile.isActive = true;
    row.registrationState = "active";
    row.profile.updatedAt = new Date().toISOString();
    this.store.upsertAgent(row);
    return this.getAgent(agentId);
  }

  deactivate(agentId: string, actorWallet: string): RegistryAgentView {
    const row = this.requireAgent(agentId);
    this.assertOwner(row, actorWallet);
    row.profile.isActive = false;
    row.registrationState = "inactive";
    row.profile.updatedAt = new Date().toISOString();
    this.store.upsertAgent(row);
    return this.getAgent(agentId);
  }

  suspend(agentId: string, input: AdminSuspendAgentInput, adminWallets: Set<string>): RegistryAgentView {
    if (!adminWallets.has(input.adminWallet)) {
      throw new Error("Admin wallet is not allowed to suspend agents");
    }
    const row = this.requireAgent(agentId);
    row.profile.isActive = false;
    row.registrationState = "suspended";
    row.healthStatus = "suspended";
    row.suspensionReason = input.reason;
    row.profile.updatedAt = new Date().toISOString();
    this.store.upsertAgent(row);
    return this.getAgent(agentId);
  }

  async runPrePublishHealthcheck(agentId: string, actorWallet: string) {
    const row = this.requireAgent(agentId);
    this.assertOwner(row, actorWallet);
    if (!row.profile.endpointUrl) {
      throw new Error("External agent endpointUrl is required for healthchecks");
    }
    this.safetyService.validateEndpoint(row.profile.endpointUrl);

    const result = await this.healthcheckRunner.run(row.profile.endpointUrl);
    row.healthStatus = result.ok ? "healthy" : "unhealthy";
    (row.profile as SkillAwareProfile).connectionStatus = result.ok ? "connected" : "offline";
    this.store.upsertAgent(row);

    const healthRow: AgentHealthcheckRow = {
      id: makeId("health"),
      agentId,
      status: row.healthStatus,
      checkedAt: new Date().toISOString(),
      latencyMs: result.latencyMs,
      response: result.payload,
      errorMessage: result.errorMessage,
    };
    this.store.appendHealthcheck(agentId, healthRow);
    return healthRow;
  }

  async testCompatibility(agentId: string, actorWallet: string, runExecutionProbe: boolean) {
    const row = this.requireAgent(agentId);
    this.assertOwner(row, actorWallet);
    if (row.profile.endpointUrl) {
      this.safetyService.validateEndpoint(row.profile.endpointUrl);
    }

    const report = await this.compatibilityValidator.validateAgent(
      row,
      row.compatibilityDeclaration,
      runExecutionProbe,
    );
    row.compatibilityStatus = report.compatibilityStatus;
    (row.profile as SkillAwareProfile).connectionStatus =
      report.compatibilityStatus === "compatible"
        ? "connected"
        : report.compatibilityStatus === "warning"
          ? "degraded"
          : "offline";
    this.store.upsertAgent(row);

    const checkRow: AgentCompatibilityCheckRow = {
      id: makeId("compat"),
      agentId,
      report,
    };
    this.store.appendCompatibilityCheck(agentId, checkRow);
    return checkRow;
  }

  listAgents(): RegistryAgentView[] {
    this.ensurePlatformAgents();
    return [...this.store.agents.keys()]
      .filter((agentId) => !isDeprecatedBuiltInPlatformAgentId(agentId))
      .map((agentId) => this.getAgent(agentId));
  }

  getAgent(agentId: string): RegistryAgentView {
    this.ensurePlatformAgents();
    const row = this.requireAgent(agentId);
    const versions = this.store.versions.get(agentId) ?? [];
    const compatibility = this.store.compatibilityChecks.get(agentId) ?? [];
    const performance = this.store.ensurePerformance(agentId);
    return toRegistryAgentView(
      row,
      versions.length > 0 ? versions[versions.length - 1].version : null,
      compatibility.length > 0 ? compatibility[compatibility.length - 1].report : null,
      performance,
    );
  }

  ensurePlatformAgents() {
    bootstrapPlatformAgents(this.store);
  }

  private requireAgent(agentId: string): AgentRegistryRow {
    const row = this.store.agents.get(agentId);
    if (!row) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return row;
  }

  private assertOwner(row: AgentRegistryRow, ownerWallet: string): void {
    if (row.profile.ownerWallet !== ownerWallet) {
      throw new Error("Only the agent owner can perform this action");
    }
  }
}

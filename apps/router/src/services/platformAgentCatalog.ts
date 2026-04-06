import { createHash } from "node:crypto";
import type { AgentProfile, AgentVersion, CapabilityCategory } from "@marketplace/shared";
import type { AgentRegistryRow } from "../db/models";
import type { InMemoryRegistryStore } from "../db/store";

export interface BuiltInPlatformAgentDefinition {
  readonly agentId: string;
  readonly slug: string;
  readonly publicName: string;
  readonly description: string;
  readonly specialization?:
    | "executive_summarizer"
    | "document_reviewer"
    | "field_extractor"
    | "research_analyst"
    | "conversion_writer"
    | "localization_specialist"
    | "schema_designer"
    | "operations_designer"
    | "campaign_strategist";
  readonly category: CapabilityCategory;
  readonly capabilityTags: string[];
  readonly skills: string[];
  readonly skillCategories: string[];
  readonly benchmarkSuites: string[];
  readonly expectedLatencyMsRange: {
    readonly minMs: number;
    readonly maxMs: number;
  };
  readonly pricingHint: string;
  readonly systemPrompt: string;
  readonly tools: string[];
  readonly outputSchema: Record<string, unknown>;
  readonly knowledgeAssetRefs: string[];
}

const builtInAgents: BuiltInPlatformAgentDefinition[] = [
  {
    agentId: "platform_signal_forge",
    slug: "signal-forge",
    publicName: "Signal Forge",
    description: "Turns research, customer signals, and market notes into clear strategy briefs.",
    specialization: "research_analyst",
    category: "research",
    capabilityTags: ["competitive-scan", "briefing", "strategic-synthesis"],
    skills: ["research_synthesis", "competitive_analysis", "strategy_briefing"],
    skillCategories: ["research", "strategy"],
    benchmarkSuites: ["signal_forge_core_v1"],
    expectedLatencyMsRange: { minMs: 4000, maxMs: 18000 },
    pricingHint: "Best for research and strategic framing work.",
    systemPrompt: "Operate like a fast strategy associate. Surface signal, implications, and one clear recommendation.",
    tools: ["internal-research-templates", "structured-formatter"],
    outputSchema: { sections: ["signal", "implications", "recommendation"] },
    knowledgeAssetRefs: ["platform://playbooks/research"],
  },
  {
    agentId: "platform_copysprint",
    slug: "copysprint",
    publicName: "CopySprint",
    description: "Writes sharper landing page, email, and launch copy.",
    specialization: "conversion_writer",
    category: "writing",
    capabilityTags: ["copywriting", "conversion", "lifecycle"],
    skills: ["homepage_copy", "email_copy", "launch_copy"],
    skillCategories: ["writing", "marketing"],
    benchmarkSuites: ["copysprint_core_v1"],
    expectedLatencyMsRange: { minMs: 3000, maxMs: 12000 },
    pricingHint: "Fast on copy rewrites and headline packs.",
    systemPrompt: "Write with clarity, momentum, and buyer relevance. Prefer sharp language over hype.",
    tools: ["copy-frameworks", "tone-checker"],
    outputSchema: { sections: ["angle", "draft", "variants"] },
    knowledgeAssetRefs: ["platform://playbooks/copywriting"],
  },
  {
    agentId: "platform_briefly",
    slug: "briefly",
    publicName: "Briefly",
    description: "Turns long notes, meetings, and documents into clear summaries.",
    specialization: "executive_summarizer",
    category: "summarization",
    capabilityTags: ["executive-brief", "compression", "transcripts"],
    skills: ["meeting_summary", "executive_briefing", "transcript_digest"],
    skillCategories: ["summarization"],
    benchmarkSuites: ["briefly_core_v1"],
    expectedLatencyMsRange: { minMs: 2500, maxMs: 10000 },
    pricingHint: "Designed for concise decision-ready summaries.",
    systemPrompt: "Compress information without losing signal. Make the next decision obvious.",
    tools: ["summary-templates", "bullet-formatter"],
    outputSchema: { sections: ["summary", "key-points", "next-steps"] },
    knowledgeAssetRefs: ["platform://playbooks/summarization"],
  },
  {
    agentId: "platform_polylane",
    slug: "polylane",
    publicName: "PolyLane",
    description: "Translates and localizes product, support, and launch content.",
    specialization: "localization_specialist",
    category: "translation",
    capabilityTags: ["translation", "localization", "tone-preservation"],
    skills: ["translation", "localization", "terminology_preservation"],
    skillCategories: ["translation", "localization"],
    benchmarkSuites: ["polylane_core_v1"],
    expectedLatencyMsRange: { minMs: 2800, maxMs: 11000 },
    pricingHint: "Best for multilingual product and support work.",
    systemPrompt: "Preserve meaning, product terminology, and tone while making language feel natural.",
    tools: ["locale-style-guides", "terminology-checker"],
    outputSchema: { sections: ["source-intent", "localized-output", "notes"] },
    knowledgeAssetRefs: ["platform://playbooks/localization"],
  },
  {
    agentId: "platform_clauselens",
    slug: "clauselens",
    publicName: "ClauseLens",
    description: "Reviews contracts and policy text and answers questions from the source.",
    specialization: "document_reviewer",
    category: "document_qa",
    capabilityTags: ["doc-review", "clauses", "source-grounding"],
    skills: ["contract_qa", "source_grounding", "clause_review"],
    skillCategories: ["document_qa", "legal"],
    benchmarkSuites: ["clauselens_core_v1"],
    expectedLatencyMsRange: { minMs: 4200, maxMs: 16000 },
    pricingHint: "Built for dense documents and cited answers.",
    systemPrompt: "Answer precisely, stay grounded in the source, and flag uncertainty instead of guessing.",
    tools: ["citation-formatter", "qa-checklist"],
    outputSchema: { sections: ["answer", "evidence", "risk"] },
    knowledgeAssetRefs: ["platform://playbooks/document-qa"],
  },
  {
    agentId: "platform_tableminer",
    slug: "tableminer",
    publicName: "TableMiner",
    description: "Pulls clean structured data from messy text, tables, invoices, and forms.",
    specialization: "field_extractor",
    category: "data_extraction",
    capabilityTags: ["structured-fields", "tables", "normalization"],
    skills: ["field_extraction", "table_parsing", "data_normalization"],
    skillCategories: ["data_extraction"],
    benchmarkSuites: ["tableminer_core_v1"],
    expectedLatencyMsRange: { minMs: 3200, maxMs: 13500 },
    pricingHint: "Strong on turning messy inputs into usable fields.",
    systemPrompt: "Extract what is explicit, normalize where safe, and separate uncertain values from confirmed ones.",
    tools: ["schema-mapper", "field-normalizer"],
    outputSchema: { sections: ["records", "normalized-fields", "uncertain-items"] },
    knowledgeAssetRefs: ["platform://playbooks/data-extraction"],
  },
  {
    agentId: "platform_schemasmith",
    slug: "schemasmith",
    publicName: "SchemaSmith",
    description: "Turns messy input into clean JSON schemas and structured outputs.",
    specialization: "schema_designer",
    category: "automation",
    capabilityTags: ["json", "schemas", "automation"],
    skills: ["schema_design", "field_mapping", "structured_output"],
    skillCategories: ["automation", "structured_data"],
    benchmarkSuites: ["schemasmith_core_v1"],
    expectedLatencyMsRange: { minMs: 2400, maxMs: 9000 },
    pricingHint: "Ideal for machine-readable deliverables.",
    systemPrompt: "Think in fields, objects, and downstream systems. Favor predictable structure over prose.",
    tools: ["json-template-engine", "schema-checker"],
    outputSchema: { sections: ["schema", "sample-output", "mapping-notes"] },
    knowledgeAssetRefs: ["platform://playbooks/automation"],
  },
  {
    agentId: "platform_opspilot",
    slug: "opspilot",
    publicName: "OpsPilot",
    description: "Creates runbooks, workflows, handoff docs, and operational checklists.",
    specialization: "operations_designer",
    category: "operations",
    capabilityTags: ["runbooks", "handoffs", "workflows"],
    skills: ["runbook_design", "workflow_planning", "handoff_docs"],
    skillCategories: ["operations"],
    benchmarkSuites: ["opspilot_core_v1"],
    expectedLatencyMsRange: { minMs: 3500, maxMs: 14000 },
    pricingHint: "Best for operational docs and repeatable processes.",
    systemPrompt: "Turn requests into concrete workflows, owners, dependencies, and next actions.",
    tools: ["runbook-generator", "checklist-formatter"],
    outputSchema: { sections: ["workflow", "owners", "risks"] },
    knowledgeAssetRefs: ["platform://playbooks/operations"],
  },
  {
    agentId: "platform_campaignpilot",
    slug: "campaignpilot",
    publicName: "CampaignPilot",
    description: "Builds campaign plans with audience, message, channels, and rollout steps.",
    specialization: "campaign_strategist",
    category: "marketing",
    capabilityTags: ["campaigns", "messaging", "launches"],
    skills: ["campaign_planning", "audience_messaging", "launch_sequencing"],
    skillCategories: ["marketing"],
    benchmarkSuites: ["campaignpilot_core_v1"],
    expectedLatencyMsRange: { minMs: 3200, maxMs: 12500 },
    pricingHint: "Useful for content strategy and launch execution.",
    systemPrompt: "Build campaigns around audience, message, proof, and execution rhythm.",
    tools: ["campaign-frameworks", "offer-checker"],
    outputSchema: { sections: ["audience", "message", "plan"] },
    knowledgeAssetRefs: ["platform://playbooks/marketing"],
  },
];

export function getBuiltInPlatformAgents(): BuiltInPlatformAgentDefinition[] {
  return builtInAgents;
}

export function deriveDeterministicOnchainId(prefix: string, ...parts: string[]) {
  return `${prefix}_${createHash("sha256").update(parts.join("::"), "utf8").digest("hex").slice(0, 32)}`;
}

export function derivePlatformAgentOnchainId(ownerWallet: string, definition: BuiltInPlatformAgentDefinition) {
  return deriveDeterministicOnchainId("agent", ownerWallet, definition.slug);
}

export function resolvePlatformAgentOwnerWallet(): string {
  const explicit = process.env.PLATFORM_AGENT_OWNER_WALLET?.trim();
  if (explicit) return explicit;

  const serverWallet = process.env.ARC_SERVER_WALLET_ADDRESS?.trim();
  if (serverWallet) return serverWallet;

  const adminWallet = (process.env.ADMIN_WALLETS ?? "")
    .split(",")
    .map((value) => value.trim())
    .find(Boolean);
  if (adminWallet) return adminWallet;

  return "0xplatform0001";
}

export function bootstrapPlatformAgents(store: InMemoryRegistryStore) {
  const ownerWallet = resolvePlatformAgentOwnerWallet();
  const now = new Date().toISOString();

  for (const definition of builtInAgents) {
    const row: AgentRegistryRow = {
      profile: {
        agentId: definition.agentId,
        onchainAgentId: derivePlatformAgentOnchainId(ownerWallet, definition),
        ownerWallet,
        publicName: definition.publicName,
        slug: definition.slug,
        description: definition.description,
        avatarUrl: null,
        originType: "platform",
        category: definition.category,
        capabilityTags: definition.capabilityTags,
        skills: definition.skills,
        skillCategories: definition.skillCategories,
        endpointUrl: null,
        expectedLatencyMsRange: definition.expectedLatencyMsRange,
        pricingHint: definition.pricingHint,
        activeVersionHash: versionHashFor(definition),
        isActive: true,
        createdAt: store.agents.get(definition.agentId)?.profile.createdAt ?? now,
        updatedAt: now,
      } as AgentProfile,
      registrationState: "active",
      healthStatus: "healthy",
      compatibilityStatus: "compatible",
      latestVersionHash: versionHashFor(definition),
      suspensionReason: null,
      compatibilityDeclaration: null,
    };

    store.upsertAgent(row);
    const performance = store.ensurePerformance(definition.agentId);
    performance.specialistCategory = definition.category;
    store.performance.set(definition.agentId, performance);

    const version: AgentVersion = {
      versionHash: versionHashFor(definition),
      agentId: definition.agentId,
      configType: "hybrid",
      systemPrompt: definition.systemPrompt,
      tools: definition.tools,
      outputSchema: definition.outputSchema,
      knowledgeAssetRefs: definition.knowledgeAssetRefs,
      publishedAt: now,
    };
    store.versions.set(definition.agentId, [{ version, publishedByWallet: ownerWallet }]);
  }
}

function versionHashFor(definition: BuiltInPlatformAgentDefinition) {
  return `builtin_${definition.slug}_v1`;
}

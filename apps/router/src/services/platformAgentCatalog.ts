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
    | "thread_writer"
    | "summarizer"
    | "rewriter"
    | "research_brief"
    | "content_repurposer"
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

export const DEPRECATED_BUILT_IN_PLATFORM_AGENT_IDS = new Set([
  "platform_signal_forge",
  "platform_copysprint",
  "platform_briefly",
  "platform_polylane",
  "platform_clauselens",
  "platform_tableminer",
  "platform_schemasmith",
  "platform_opspilot",
  "platform_campaignpilot",
]);

const builtInAgents: BuiltInPlatformAgentDefinition[] = [
  {
    agentId: "platform_thread_writer",
    slug: "thread-writer",
    publicName: "Thread Writer",
    description: "Turn any link, article, notes, or rough idea into a Twitter/X thread.",
    specialization: "thread_writer",
    category: "writing",
    capabilityTags: ["X threads", "hooks", "CTA"],
    skills: ["thread_writing", "hook_writing", "social_copy"],
    skillCategories: ["writing", "social"],
    benchmarkSuites: ["thread_writer_core_v1"],
    expectedLatencyMsRange: { minMs: 2500, maxMs: 10000 },
    pricingHint: "Best for turning links, notes, and rough ideas into clean thread drafts.",
    systemPrompt: "Write like a practical social content operator. Produce a strong hook, a clean Twitter/X thread, and an optional CTA without hype or filler.",
    tools: ["thread-frameworks", "hook-checker"],
    outputSchema: {
      inputExamples: ["blog link", "article text", "notes", "rough idea"],
      sections: ["Hook", "Thread", "CTA (optional)"],
    },
    knowledgeAssetRefs: ["platform://playbooks/thread-writing"],
  },
  {
    agentId: "platform_summarizer",
    slug: "summarizer",
    publicName: "Summarizer",
    description: "Summarize any document, notes, article, or long text into key points.",
    specialization: "summarizer",
    category: "summarization",
    capabilityTags: ["summaries", "key points", "action items"],
    skills: ["document_summary", "key_takeaways", "action_item_extraction"],
    skillCategories: ["summarization"],
    benchmarkSuites: ["summarizer_core_v1"],
    expectedLatencyMsRange: { minMs: 2200, maxMs: 9000 },
    pricingHint: "Best for compressing articles, transcripts, documents, and messy notes.",
    systemPrompt: "Compress long content into a short summary, key takeaways, and optional action items. Preserve the useful signal and avoid loose prose.",
    tools: ["summary-templates", "bullet-formatter"],
    outputSchema: {
      inputExamples: ["article", "notes", "transcript", "document text"],
      sections: ["Summary", "Key Points", "Actionable (if applicable)"],
    },
    knowledgeAssetRefs: ["platform://playbooks/summarization"],
  },
  {
    agentId: "platform_rewriter",
    slug: "rewriter",
    publicName: "Rewriter",
    description: "Rewrite your text so it sounds clearer, better, and more polished.",
    specialization: "rewriter",
    category: "writing",
    capabilityTags: ["rewriting", "clarity", "tone"],
    skills: ["text_rewriting", "tone_polish", "clarity_editing"],
    skillCategories: ["writing", "editing"],
    benchmarkSuites: ["rewriter_core_v1"],
    expectedLatencyMsRange: { minMs: 2200, maxMs: 8500 },
    pricingHint: "Best for rough paragraphs, emails, posts, and messy drafts.",
    systemPrompt: "Rewrite the user's text while preserving meaning. Improve clarity, structure, and tone, then provide a simpler version when useful.",
    tools: ["tone-checker", "clarity-editor"],
    outputSchema: {
      inputExamples: ["rough paragraph", "post draft", "email draft", "messy text"],
      sections: ["Polished Version", "Simplified Version (optional)"],
    },
    knowledgeAssetRefs: ["platform://playbooks/rewriting"],
  },
  {
    agentId: "platform_research_brief",
    slug: "research-brief",
    publicName: "Research Brief",
    description: "Research a topic and give a clear, structured breakdown.",
    specialization: "research_brief",
    category: "research",
    capabilityTags: ["research", "insights", "risks"],
    skills: ["topic_research", "briefing", "risk_analysis"],
    skillCategories: ["research", "strategy"],
    benchmarkSuites: ["research_brief_core_v1"],
    expectedLatencyMsRange: { minMs: 3500, maxMs: 14000 },
    pricingHint: "Best for topic breakdowns, project analysis, and decision briefs.",
    systemPrompt: "Operate like a concise research analyst. Give an overview, key insights, pros, risks, and a practical conclusion based only on visible input.",
    tools: ["research-templates", "structured-formatter"],
    outputSchema: {
      inputExamples: ["topic", "project name", "question", "subject to analyze"],
      sections: ["Overview", "Key Insights", "Pros", "Risks", "Conclusion"],
    },
    knowledgeAssetRefs: ["platform://playbooks/research"],
  },
  {
    agentId: "platform_content_repurposer",
    slug: "content-repurposer",
    publicName: "Content Repurposer",
    description: "Turn one piece of content into multiple usable formats.",
    specialization: "content_repurposer",
    category: "marketing",
    capabilityTags: ["repurposing", "threads", "captions"],
    skills: ["content_repurposing", "social_copy", "summary_writing"],
    skillCategories: ["marketing", "writing"],
    benchmarkSuites: ["content_repurposer_core_v1"],
    expectedLatencyMsRange: { minMs: 3000, maxMs: 12000 },
    pricingHint: "Best for turning articles, notes, transcripts, and long posts into reusable assets.",
    systemPrompt: "Repurpose one source into a thread, short summary, bullet points, and a short post or caption. Keep each format usable on its own.",
    tools: ["repurposing-frameworks", "format-checker"],
    outputSchema: {
      inputExamples: ["article", "notes", "transcript", "long post"],
      sections: ["Thread", "Summary", "Bullet Points", "Short Post"],
    },
    knowledgeAssetRefs: ["platform://playbooks/content-repurposing"],
  },
  {
    agentId: "platform_signal_forge",
    slug: "signal-forge",
    publicName: "Signal Forge",
    description: "Legacy platform research agent kept for historical task compatibility.",
    specialization: "research_analyst",
    category: "research",
    capabilityTags: ["competitive-scan", "briefing", "strategic-synthesis"],
    skills: ["research_synthesis", "competitive_analysis", "strategy_briefing"],
    skillCategories: ["research", "strategy"],
    benchmarkSuites: ["signal_forge_core_v1"],
    expectedLatencyMsRange: { minMs: 4000, maxMs: 18000 },
    pricingHint: "Deprecated public listing; retained for old task history.",
    systemPrompt: "Operate like a fast strategy associate. Surface signal, implications, and one clear recommendation.",
    tools: ["internal-research-templates", "structured-formatter"],
    outputSchema: { sections: ["signal", "implications", "recommendation"] },
    knowledgeAssetRefs: ["platform://playbooks/research"],
  },
  {
    agentId: "platform_copysprint",
    slug: "copysprint",
    publicName: "CopySprint",
    description: "Legacy platform copy agent kept for historical task compatibility.",
    specialization: "conversion_writer",
    category: "writing",
    capabilityTags: ["copywriting", "conversion", "lifecycle"],
    skills: ["homepage_copy", "email_copy", "launch_copy"],
    skillCategories: ["writing", "marketing"],
    benchmarkSuites: ["copysprint_core_v1"],
    expectedLatencyMsRange: { minMs: 3000, maxMs: 12000 },
    pricingHint: "Deprecated public listing; retained for old task history.",
    systemPrompt: "Write with clarity, momentum, and buyer relevance. Prefer sharp language over hype.",
    tools: ["copy-frameworks", "tone-checker"],
    outputSchema: { sections: ["angle", "draft", "variants"] },
    knowledgeAssetRefs: ["platform://playbooks/copywriting"],
  },
  {
    agentId: "platform_briefly",
    slug: "briefly",
    publicName: "Briefly",
    description: "Legacy platform summary agent kept for historical task compatibility.",
    specialization: "executive_summarizer",
    category: "summarization",
    capabilityTags: ["executive-brief", "compression", "transcripts"],
    skills: ["meeting_summary", "executive_briefing", "transcript_digest"],
    skillCategories: ["summarization"],
    benchmarkSuites: ["briefly_core_v1"],
    expectedLatencyMsRange: { minMs: 2500, maxMs: 10000 },
    pricingHint: "Deprecated public listing; retained for old task history.",
    systemPrompt: "Compress information without losing signal. Make the next decision obvious.",
    tools: ["summary-templates", "bullet-formatter"],
    outputSchema: { sections: ["summary", "key-points", "next-steps"] },
    knowledgeAssetRefs: ["platform://playbooks/summarization"],
  },
  {
    agentId: "platform_polylane",
    slug: "polylane",
    publicName: "PolyLane",
    description: "Legacy platform localization agent kept for historical task compatibility.",
    specialization: "localization_specialist",
    category: "translation",
    capabilityTags: ["translation", "localization", "tone-preservation"],
    skills: ["translation", "localization", "terminology_preservation"],
    skillCategories: ["translation", "localization"],
    benchmarkSuites: ["polylane_core_v1"],
    expectedLatencyMsRange: { minMs: 2800, maxMs: 11000 },
    pricingHint: "Deprecated public listing; retained for old task history.",
    systemPrompt: "Preserve meaning, product terminology, and tone while making language feel natural.",
    tools: ["locale-style-guides", "terminology-checker"],
    outputSchema: { sections: ["source-intent", "localized-output", "notes"] },
    knowledgeAssetRefs: ["platform://playbooks/localization"],
  },
  {
    agentId: "platform_clauselens",
    slug: "clauselens",
    publicName: "ClauseLens",
    description: "Legacy platform document QA agent kept for historical task compatibility.",
    specialization: "document_reviewer",
    category: "document_qa",
    capabilityTags: ["doc-review", "clauses", "source-grounding"],
    skills: ["contract_qa", "source_grounding", "clause_review"],
    skillCategories: ["document_qa", "legal"],
    benchmarkSuites: ["clauselens_core_v1"],
    expectedLatencyMsRange: { minMs: 4200, maxMs: 16000 },
    pricingHint: "Deprecated public listing; retained for old task history.",
    systemPrompt: "Answer precisely, stay grounded in the source, and flag uncertainty instead of guessing.",
    tools: ["citation-formatter", "qa-checklist"],
    outputSchema: { sections: ["answer", "evidence", "risk"] },
    knowledgeAssetRefs: ["platform://playbooks/document-qa"],
  },
  {
    agentId: "platform_tableminer",
    slug: "tableminer",
    publicName: "TableMiner",
    description: "Legacy platform extraction agent kept for historical task compatibility.",
    specialization: "field_extractor",
    category: "data_extraction",
    capabilityTags: ["structured-fields", "tables", "normalization"],
    skills: ["field_extraction", "table_parsing", "data_normalization"],
    skillCategories: ["data_extraction"],
    benchmarkSuites: ["tableminer_core_v1"],
    expectedLatencyMsRange: { minMs: 3200, maxMs: 13500 },
    pricingHint: "Deprecated public listing; retained for old task history.",
    systemPrompt: "Extract what is explicit, normalize where safe, and separate uncertain values from confirmed ones.",
    tools: ["schema-mapper", "field-normalizer"],
    outputSchema: { sections: ["records", "normalized-fields", "uncertain-items"] },
    knowledgeAssetRefs: ["platform://playbooks/data-extraction"],
  },
  {
    agentId: "platform_schemasmith",
    slug: "schemasmith",
    publicName: "SchemaSmith",
    description: "Legacy platform schema agent kept for historical task compatibility.",
    specialization: "schema_designer",
    category: "automation",
    capabilityTags: ["json", "schemas", "automation"],
    skills: ["schema_design", "field_mapping", "structured_output"],
    skillCategories: ["automation", "structured_data"],
    benchmarkSuites: ["schemasmith_core_v1"],
    expectedLatencyMsRange: { minMs: 2400, maxMs: 9000 },
    pricingHint: "Deprecated public listing; retained for old task history.",
    systemPrompt: "Think in fields, objects, and downstream systems. Favor predictable structure over prose.",
    tools: ["json-template-engine", "schema-checker"],
    outputSchema: { sections: ["schema", "sample-output", "mapping-notes"] },
    knowledgeAssetRefs: ["platform://playbooks/automation"],
  },
  {
    agentId: "platform_opspilot",
    slug: "opspilot",
    publicName: "OpsPilot",
    description: "Legacy platform operations agent kept for historical task compatibility.",
    specialization: "operations_designer",
    category: "operations",
    capabilityTags: ["runbooks", "handoffs", "workflows"],
    skills: ["runbook_design", "workflow_planning", "handoff_docs"],
    skillCategories: ["operations"],
    benchmarkSuites: ["opspilot_core_v1"],
    expectedLatencyMsRange: { minMs: 3500, maxMs: 14000 },
    pricingHint: "Deprecated public listing; retained for old task history.",
    systemPrompt: "Turn requests into concrete workflows, owners, dependencies, and next actions.",
    tools: ["runbook-generator", "checklist-formatter"],
    outputSchema: { sections: ["workflow", "owners", "risks"] },
    knowledgeAssetRefs: ["platform://playbooks/operations"],
  },
  {
    agentId: "platform_campaignpilot",
    slug: "campaignpilot",
    publicName: "CampaignPilot",
    description: "Legacy platform campaign agent kept for historical task compatibility.",
    specialization: "campaign_strategist",
    category: "marketing",
    capabilityTags: ["campaigns", "messaging", "launches"],
    skills: ["campaign_planning", "audience_messaging", "launch_sequencing"],
    skillCategories: ["marketing"],
    benchmarkSuites: ["campaignpilot_core_v1"],
    expectedLatencyMsRange: { minMs: 3200, maxMs: 12500 },
    pricingHint: "Deprecated public listing; retained for old task history.",
    systemPrompt: "Build campaigns around audience, message, proof, and execution rhythm.",
    tools: ["campaign-frameworks", "offer-checker"],
    outputSchema: { sections: ["audience", "message", "plan"] },
    knowledgeAssetRefs: ["platform://playbooks/marketing"],
  },
];

export function getBuiltInPlatformAgents(): BuiltInPlatformAgentDefinition[] {
  return builtInAgents;
}

export function getUserFacingBuiltInPlatformAgents(): BuiltInPlatformAgentDefinition[] {
  return builtInAgents.filter((definition) => !isDeprecatedBuiltInPlatformAgentId(definition.agentId));
}

export function isDeprecatedBuiltInPlatformAgentId(agentId: string) {
  return DEPRECATED_BUILT_IN_PLATFORM_AGENT_IDS.has(agentId);
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

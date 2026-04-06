import type { TaskDetailView } from "@marketplace/shared";
import { PlatformAgentRuntime } from "../services/platformAgentRuntime";
import { getPlatformAgentTaskPack } from "./platformAgentTaskPacks";

type ConfidenceLevel = "low" | "medium" | "high";
type BenchmarkProfile = "baseline" | "adversarial";

type BenchmarkExpectation = {
  requiredSectionHeadings?: string[];
  requiredSummaryIncludes?: string[];
  requiredBulletIncludes?: string[];
  requiredUncertaintyIncludes?: string[];
  expectedConfidence?: ConfidenceLevel;
  expectedExecutionSource?: "heuristic" | "llm";
};

type BenchmarkCase = {
  id: string;
  agentId: string;
  title: string;
  profile: BenchmarkProfile;
  task: TaskDetailView;
  expectation: BenchmarkExpectation;
};

export type PlatformAgentBenchmarkCheck = {
  label: string;
  passed: boolean;
  detail: string;
};

export type PlatformAgentBenchmarkResult = {
  id: string;
  agentId: string;
  title: string;
  profile: BenchmarkProfile;
  passed: boolean;
  score: number;
  checks: PlatformAgentBenchmarkCheck[];
  confidence: ConfidenceLevel;
  executionSource: "heuristic" | "llm";
};

export type PlatformAgentBenchmarkProfileSummary = {
  total: number;
  passed: number;
  averageScore: number;
};

export type PlatformAgentBenchmarkSuiteResult = {
  benchmarkVersion: string;
  generatedAt: string;
  total: number;
  passed: number;
  averageScore: number;
  profiles: Record<BenchmarkProfile, PlatformAgentBenchmarkProfileSummary>;
  results: PlatformAgentBenchmarkResult[];
};

export const PLATFORM_AGENT_BENCHMARK_VERSION = "2026-03-29.4";

export async function runPlatformAgentBenchmarkSuite(
  runtime = new PlatformAgentRuntime(),
): Promise<PlatformAgentBenchmarkSuiteResult> {
  const results: PlatformAgentBenchmarkResult[] = [];

  for (const benchmark of benchmarks) {
    const execution = await runtime.execute(benchmark.agentId, benchmark.task);
    const checks = evaluateBenchmark(execution.payload, benchmark.expectation);
    const passed = checks.every((check) => check.passed);
    const score = Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);

    results.push({
      id: benchmark.id,
      agentId: benchmark.agentId,
      title: benchmark.title,
      profile: benchmark.profile,
      passed,
      score,
      checks,
      confidence: execution.payload.confidence,
      executionSource: execution.payload.executionSource,
    });
  }

  const passed = results.filter((item) => item.passed).length;
  const averageScore =
    results.length === 0 ? 0 : Math.round(results.reduce((sum, item) => sum + item.score, 0) / results.length);

  return {
    benchmarkVersion: PLATFORM_AGENT_BENCHMARK_VERSION,
    generatedAt: new Date().toISOString(),
    total: results.length,
    passed,
    averageScore,
    profiles: buildProfileSummary(results),
    results,
  };
}

function buildProfileSummary(results: PlatformAgentBenchmarkResult[]) {
  return {
    baseline: summarizeProfile(results, "baseline"),
    adversarial: summarizeProfile(results, "adversarial"),
  } satisfies Record<BenchmarkProfile, PlatformAgentBenchmarkProfileSummary>;
}

function summarizeProfile(results: PlatformAgentBenchmarkResult[], profile: BenchmarkProfile): PlatformAgentBenchmarkProfileSummary {
  const filtered = results.filter((item) => item.profile === profile);
  const passed = filtered.filter((item) => item.passed).length;
  const averageScore =
    filtered.length === 0 ? 0 : Math.round(filtered.reduce((sum, item) => sum + item.score, 0) / filtered.length);

  return {
    total: filtered.length,
    passed,
    averageScore,
  };
}

function evaluateBenchmark(
  payload: Awaited<ReturnType<PlatformAgentRuntime["execute"]>>["payload"],
  expectation: BenchmarkExpectation,
) {
  const bullets = payload.sections.flatMap((section) => section.bullets);
  const checks: PlatformAgentBenchmarkCheck[] = [];

  for (const heading of expectation.requiredSectionHeadings ?? []) {
    const passed = payload.sections.some((section) => section.heading === heading);
    checks.push({
      label: `section:${heading}`,
      passed,
      detail: passed ? `Found section ${heading}.` : `Missing section ${heading}.`,
    });
  }

  for (const fragment of expectation.requiredSummaryIncludes ?? []) {
    const passed = payload.summary.toLowerCase().includes(fragment.toLowerCase());
    checks.push({
      label: `summary:${fragment}`,
      passed,
      detail: passed ? `Summary references "${fragment}".` : `Summary does not include "${fragment}".`,
    });
  }

  for (const fragment of expectation.requiredBulletIncludes ?? []) {
    const passed = bullets.some((bullet) => bullet.toLowerCase().includes(fragment.toLowerCase()));
    checks.push({
      label: `bullet:${fragment}`,
      passed,
      detail: passed ? `Bullet content references "${fragment}".` : `Expected bullet content "${fragment}" was not found.`,
    });
  }

  for (const fragment of expectation.requiredUncertaintyIncludes ?? []) {
    const passed = payload.uncertainties.some((item) => item.toLowerCase().includes(fragment.toLowerCase()));
    checks.push({
      label: `uncertainty:${fragment}`,
      passed,
      detail: passed ? `Uncertainty references "${fragment}".` : `Expected uncertainty "${fragment}" was not found.`,
    });
  }

  if (expectation.expectedConfidence) {
    const passed = payload.confidence === expectation.expectedConfidence;
    checks.push({
      label: "confidence",
      passed,
      detail: passed
        ? `Confidence matched ${expectation.expectedConfidence}.`
        : `Expected confidence ${expectation.expectedConfidence}, got ${payload.confidence}.`,
    });
  }

  if (expectation.expectedExecutionSource) {
    const passed = payload.executionSource === expectation.expectedExecutionSource;
    checks.push({
      label: "executionSource",
      passed,
      detail: passed
        ? `Execution source matched ${expectation.expectedExecutionSource}.`
        : `Expected execution source ${expectation.expectedExecutionSource}, got ${payload.executionSource}.`,
    });
  }

  return checks;
}

function makeTask(overrides: Partial<TaskDetailView> = {}): TaskDetailView {
  const now = new Date().toISOString();
  return {
    taskId: "task_benchmark",
    title: "Benchmark task",
    description: "Benchmark task description.",
    category: "research",
    rewardAmount: 100,
    deadline: now,
    status: "OPEN",
    resultStatus: "not_started",
    creatorWallet: "0xbuyer",
    selectedAgentId: null,
    participatingAgentIds: [],
    maxParticipants: 1,
    transactionState: "accepted",
    onchainTaskRef: null,
    createdAt: now,
    updatedAt: now,
    attachments: [],
    evaluationPreference: "hybrid_review",
    structuredNotes: null,
    hiringMode: "open_market",
    timeline: [],
    creatorDisplay: "0xbuyer",
    selectedAgents: [],
    reviewActions: [],
    latestEvaluation: null,
    userReview: null,
    settlementState: "reward_funded",
    latestSettlement: null,
    disputeRecord: null,
    ...overrides,
  };
}

function makeTaskFromPack(
  agent: string,
  taskId: string,
  overrides: Partial<TaskDetailView> = {},
): TaskDetailView {
  const pack = getPlatformAgentTaskPack(agent);
  const packTask = pack?.tasks.find((task) => task.id === taskId);
  if (!pack || !packTask) {
    throw new Error(`Task pack ${agent} / ${taskId} is not registered`);
  }

  return makeTask({
    title: packTask.title,
    description: packTask.description,
    structuredNotes: packTask.structuredNotes,
    attachments: [
      {
        id: `att_${packTask.id}`,
        title: `${packTask.title} source`,
        pointer: `inline://${packTask.id}.txt`,
        mimeType: "text/plain",
        sizeBytes: packTask.attachmentText.length,
        textContent: packTask.attachmentText,
      },
    ],
    ...overrides,
  });
}

const benchmarks: BenchmarkCase[] = [
  {
    id: "briefly_exec_summary",
    agentId: "platform_briefly",
    profile: "baseline",
    title: "Briefly summarizes visible source material",
    task: makeTask({
      category: "summarization",
      title: "Summarize board update",
      description: "Revenue grew 14 percent quarter over quarter. Churn fell after onboarding changes. Hiring remains frozen.",
      structuredNotes: "Need a one-screen summary for leadership.",
    }),
    expectation: {
      requiredSectionHeadings: ["Top Line", "Decision Signals"],
      requiredBulletIncludes: ["Revenue grew 14 percent", "Churn fell"],
      expectedExecutionSource: "heuristic",
    },
  },
  {
    id: "clauselens_fail_safe",
    agentId: "platform_clauselens",
    profile: "baseline",
    title: "ClauseLens fails safe without evidence",
    task: makeTask({
      category: "document_qa",
      title: "Check termination clause",
      description: "Tell me whether the contract has a termination clause.",
    }),
    expectation: {
      requiredSectionHeadings: ["Answer", "Evidence"],
      requiredSummaryIncludes: ["cannot safely answer"],
      requiredUncertaintyIncludes: ["cannot verify"],
      expectedConfidence: "low",
    },
  },
  {
    id: "tableminer_structured_fields",
    agentId: "platform_tableminer",
    profile: "baseline",
    title: "TableMiner separates confirmed and uncertain fields",
    task: makeTask({
      category: "data_extraction",
      title: "Extract invoice details",
      description: "Invoice Number: INV-42\nAmount: $500\nDue Date: TBD",
    }),
    expectation: {
      requiredSectionHeadings: ["Confirmed Fields", "Uncertain Fields"],
      requiredBulletIncludes: ["Invoice Number: INV-42", "Due Date: TBD"],
    },
  },
  {
    id: "schemasmith_explicit_keys",
    agentId: "platform_schemasmith",
    profile: "baseline",
    title: "SchemaSmith turns explicit fields into stable schema keys",
    task: makeTask({
      category: "automation",
      title: "Map CRM schema",
      description: "Lead Name: Ada\nLead Email: ada@example.com\nCompany: Northwind",
    }),
    expectation: {
      requiredSectionHeadings: ["Schema", "Example JSON"],
      requiredBulletIncludes: ['"lead_name": string | null', '"lead_email": email-string | null'],
    },
  },
  {
    id: "polylane_requires_source",
    agentId: "platform_polylane",
    profile: "baseline",
    title: "PolyLane refuses translation without source text",
    task: makeTask({
      category: "translation",
      title: "Translate hero copy to French",
      description: "Translate our hero copy to French.",
    }),
    expectation: {
      requiredSummaryIncludes: ["cannot localize"],
      requiredUncertaintyIncludes: ["source text"],
      expectedConfidence: "low",
    },
  },
  {
    id: "opspilot_runbook",
    agentId: "platform_opspilot",
    profile: "baseline",
    title: "OpsPilot converts visible steps into a runbook",
    task: makeTask({
      category: "operations",
      title: "Prepare launch handoff",
      description: "- Draft checklist\n- Review with marketing lead\n- Hand off to support",
      structuredNotes: "Owner: launch ops",
    }),
    expectation: {
      requiredSectionHeadings: ["Workflow", "Owners", "Risks"],
      requiredBulletIncludes: ["Draft checklist"],
    },
  },
  {
    id: "signalforge_bounded",
    agentId: "platform_signal_forge",
    profile: "baseline",
    title: "Signal Forge keeps thin-evidence strategy work low-confidence",
    task: makeTask({
      category: "research",
      title: "Research competitor shift",
      description: "Need a strategy recommendation for competitor repositioning.",
    }),
    expectation: {
      requiredSectionHeadings: ["Signal", "Recommendation"],
      requiredUncertaintyIncludes: ["evidence"],
      expectedConfidence: "low",
    },
  },
  {
    id: "copysprint_bounded_copy",
    agentId: "platform_copysprint",
    profile: "baseline",
    title: "CopySprint avoids unsupported proof claims",
    task: makeTask({
      category: "writing",
      title: "Rewrite homepage copy",
      description: "Need homepage copy for a workflow product used by ops teams.",
    }),
    expectation: {
      requiredSectionHeadings: ["Angle", "Draft", "Variants"],
      requiredBulletIncludes: ["No concrete product proof was visible, so the angle should stay conservative.", "CTA: Use one direct action"],
      requiredUncertaintyIncludes: ["proof"],
    },
  },
  {
    id: "campaignpilot_conservative_plan",
    agentId: "platform_campaignpilot",
    profile: "baseline",
    title: "CampaignPilot creates conservative campaign planning when context is thin",
    task: makeTask({
      category: "marketing",
      title: "Plan launch campaign",
      description: "Need a campaign plan for a workflow automation launch.",
    }),
    expectation: {
      requiredSectionHeadings: ["Audience", "Message", "Plan"],
      expectedConfidence: "low",
    },
  },
  {
    id: "clauselens_grounded_clause",
    agentId: "platform_clauselens",
    profile: "adversarial",
    title: "ClauseLens stays grounded when explicit clause text is present",
    task: makeTask({
      category: "document_qa",
      title: "Review termination rights",
      description:
        "Section 8. Termination: Either party may terminate this agreement with 30 days written notice.\nSection 9. Survival: Confidentiality obligations survive termination.",
      structuredNotes: "Check whether mutual termination rights are visible in the excerpt.",
    }),
    expectation: {
      requiredBulletIncludes: ["Best grounded answer: Section 8. Termination", "Visible source: Section 9. Survival"],
      expectedConfidence: "high",
    },
  },
  {
    id: "tableminer_attachment_grounding",
    agentId: "platform_tableminer",
    profile: "adversarial",
    title: "TableMiner extracts grounded fields from attachment text and keeps uncertain values separate",
    task: makeTask({
      category: "data_extraction",
      title: "Parse vendor intake",
      description: "Extract the structured fields from the attached intake sheet.",
      attachments: [
        {
          id: "att_vendor_intake",
          title: "Vendor intake",
          pointer: "inline://vendor-intake.txt",
          mimeType: "text/plain",
          sizeBytes: 96,
          textContent: "Vendor Name: Northwind Freight\nAccount ID: NF-1002\nRenewal Date: TBD\nPrimary Contact: Dana Cole",
        },
      ],
    }),
    expectation: {
      requiredBulletIncludes: ["Vendor Name: Northwind Freight", "Account ID: NF-1002", "Renewal Date: TBD"],
      expectedConfidence: "high",
    },
  },
  {
    id: "schemasmith_sparse_input_stays_conservative",
    agentId: "platform_schemasmith",
    profile: "adversarial",
    title: "SchemaSmith stays conservative when explicit source fields are missing",
    task: makeTask({
      category: "automation",
      title: "Need a CRM import schema",
      description: "Build a schema for the CRM import.",
    }),
    expectation: {
      requiredBulletIncludes: ['"notes": string | null', '"notes": "Add concrete fields from source material before production use."'],
      requiredUncertaintyIncludes: ["partly inferred"],
      expectedConfidence: "low",
    },
  },
  {
    id: "polylane_grounded_translation",
    agentId: "platform_polylane",
    profile: "adversarial",
    title: "PolyLane localizes only when source text and target language are explicit",
    task: makeTask({
      category: "translation",
      title: "Translate onboarding banner",
      description: 'Translate to Spanish: "Launch faster with fewer handoffs."',
    }),
    expectation: {
      requiredBulletIncludes: ["Target language: Spanish", 'Visible source copy: Launch faster with fewer handoffs.', "[Spanish] Launch faster with fewer handoffs."],
      expectedConfidence: "medium",
    },
  },
  {
    id: "opspilot_owner_aware_runbook",
    agentId: "platform_opspilot",
    profile: "adversarial",
    title: "OpsPilot uses explicit step and owner signals instead of generic workflow prose",
    task: makeTask({
      category: "operations",
      title: "Prepare incident handoff",
      description:
        "1. Review the incident timeline\n2. Draft customer update\n3. Hand off to support lead",
      structuredNotes: "Owner: reliability team\nReviewer: support lead",
    }),
    expectation: {
      requiredBulletIncludes: ["1. Review the incident timeline", "Primary owner: reliability team."],
      expectedConfidence: "high",
    },
  },
  {
    id: "signalforge_instruction_filter",
    agentId: "platform_signal_forge",
    profile: "adversarial",
    title: "Signal Forge does not mistake the task ask itself for market evidence",
    task: makeTask({
      category: "research",
      title: "Decide our pricing move",
      description: "Need a strategy recommendation for enterprise pricing.",
      structuredNotes: "Need a fast answer for leadership.",
    }),
    expectation: {
      requiredBulletIncludes: ["No concrete market or customer evidence was provided in the visible task context."],
      requiredUncertaintyIncludes: ["evidence"],
      expectedConfidence: "low",
    },
  },
  {
    id: "copysprint_rejects_hype_claims",
    agentId: "platform_copysprint",
    profile: "adversarial",
    title: "CopySprint stays conservative when asked to make unsupported market-dominance claims",
    task: makeTask({
      category: "writing",
      title: "Write homepage hero",
      description: "Write homepage copy that says we are the number one workflow platform.",
    }),
    expectation: {
      requiredBulletIncludes: ["No concrete product proof was visible, so the angle should stay conservative."],
      requiredUncertaintyIncludes: ["proof"],
      expectedConfidence: "low",
    },
  },
  {
    id: "campaignpilot_audience_and_proof",
    agentId: "platform_campaignpilot",
    profile: "adversarial",
    title: "CampaignPilot can move to medium confidence when audience and proof are explicit",
    task: makeTask({
      category: "marketing",
      title: "Plan finance launch campaign",
      description:
        "Audience: finance ops leaders\nProof: Customers reduced reconciliation time by 22 percent\nNeed a measured launch sequence for the new reporting workflow.",
    }),
    expectation: {
      requiredBulletIncludes: ["Primary working audience: finance ops leaders", "Visible support point: Audience: finance ops leaders"],
      expectedConfidence: "medium",
    },
  },
  {
    id: "briefly_conflicting_metrics_from_pack",
    agentId: "platform_briefly",
    profile: "adversarial",
    title: "Briefly preserves conflicts instead of flattening them away",
    task: makeTaskFromPack("Briefly", "br_conflicting_metrics_board_notes_007", {
      category: "summarization",
    }),
    expectation: {
      requiredBulletIncludes: ["MRR $2.1M (+4% MoM)", "MRR $2.3M (+6% MoM)"],
      expectedConfidence: "medium",
    },
  },
  {
    id: "clauselens_ownership_gap_from_pack",
    agentId: "platform_clauselens",
    profile: "adversarial",
    title: "ClauseLens refuses to infer ownership from a usage clause",
    task: makeTaskFromPack("ClauseLens", "cl_data_ownership_trap_010", {
      category: "document_qa",
    }),
    expectation: {
      requiredBulletIncludes: ["Vendor may use Customer Data solely for the purpose of providing the Services.", "Treat any implication beyond the cited text as interpretive rather than confirmed."],
      requiredUncertaintyIncludes: ["does not clearly confirm ownership"],
      expectedConfidence: "medium",
    },
  },
  {
    id: "tableminer_conflicting_totals_from_pack",
    agentId: "platform_tableminer",
    profile: "adversarial",
    title: "TableMiner preserves conflicting totals instead of resolving them silently",
    task: makeTaskFromPack("TableMiner", "tm_conflicting_invoice_totals_007", {
      category: "data_extraction",
    }),
    expectation: {
      requiredBulletIncludes: ["Subtotal: 1,000", "Total: 1,200", "Amount Due: 1,100"],
      expectedConfidence: "high",
    },
  },
  {
    id: "schemasmith_over_inference_from_pack",
    agentId: "platform_schemasmith",
    profile: "adversarial",
    title: "SchemaSmith does not invent telemetry fields from a tiny event brief",
    task: makeTaskFromPack("SchemaSmith", "ss_over_inference_of_fields_010", {
      category: "automation",
    }),
    expectation: {
      requiredBulletIncludes: ['"user": string | null', '"action": string | null'],
      expectedConfidence: "high",
    },
  },
  {
    id: "polylane_conflicting_glossary_from_pack",
    agentId: "platform_polylane",
    profile: "adversarial",
    title: "PolyLane honors glossary constraints when the prompt conflicts with itself",
    task: makeTaskFromPack("PolyLane", "pl_conflicting_glossary_instructions_011", {
      category: "translation",
    }),
    expectation: {
      requiredBulletIncludes: ["Target language:", "Store your API Key in your Workspace.", "[de-DE (DE)] Store your API Key in your Workspace."],
      expectedConfidence: "medium",
    },
  },
  {
    id: "opspilot_missing_owners_from_pack",
    agentId: "platform_opspilot",
    profile: "adversarial",
    title: "OpsPilot leaves ownership as missing when the brief provides none",
    task: makeTaskFromPack("OpsPilot", "op_missing_owners_trap_010", {
      category: "operations",
    }),
    expectation: {
      requiredBulletIncludes: ["1. QA", "Assign one primary owner before execution starts.", "Assign one reviewer or approver for the final handoff."],
      expectedConfidence: "medium",
    },
  },
  {
    id: "copysprint_small_sample_from_pack",
    agentId: "platform_copysprint",
    profile: "adversarial",
    title: "CopySprint stays careful when proof is tiny and mixed",
    task: makeTaskFromPack("CopySprint", "cs_conflicting_inputs_metrics_007", {
      category: "writing",
    }),
    expectation: {
      requiredBulletIncludes: ["5% faster response (n=3)"],
      requiredUncertaintyIncludes: ["small sample"],
      expectedConfidence: "low",
    },
  },
  {
    id: "campaignpilot_thin_brief_from_pack",
    agentId: "platform_campaignpilot",
    profile: "adversarial",
    title: "CampaignPilot stays scaffold-level when the brief is missing core inputs",
    task: makeTaskFromPack("CampaignPilot", "cp_thin_context_campaign_brief_008", {
      category: "marketing",
    }),
    expectation: {
      requiredBulletIncludes: ["Primary working audience: the task owner", "No concrete proof point was provided, so keep messaging conservative."],
      expectedConfidence: "low",
    },
  },
  {
    id: "signalforge_missing_context_from_pack",
    agentId: "platform_signal_forge",
    profile: "adversarial",
    title: "Signal Forge does not make strategic decisions from an empty brief",
    task: makeTaskFromPack("Signal Forge", "sf_missing_context_decision_012", {
      category: "research",
    }),
    expectation: {
      requiredBulletIncludes: ["No concrete market or customer evidence was provided in the visible task context."],
      requiredUncertaintyIncludes: ["evidence"],
      expectedConfidence: "low",
    },
  },
];

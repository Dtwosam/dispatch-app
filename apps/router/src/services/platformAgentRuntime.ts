import type { TaskDetailView } from "@marketplace/shared";
import {
  getBuiltInPlatformAgents,
  type BuiltInPlatformAgentDefinition,
} from "./platformAgentCatalog";
import {
  PlatformAgentModelClient,
  type PlatformAgentCandidate,
} from "./platformAgentModelClient";
import { PlatformQualityEngine } from "./platformQualityEngine";
import type { PlatformAgentStageTrace, PlatformQualityMode, PlatformRefinementContext } from "./platformQualityTypes";

type RuntimeExecutionResult = {
  payload: {
    agent: string;
    category: string;
    title: string;
    summary: string;
    sections: Array<{ heading: string; bullets: string[] }>;
    nextActions: string[];
    uncertainties: string[];
    confidence: "low" | "medium" | "high";
    executionSource: "heuristic" | "llm";
    deliveryNote: string;
    qualityMode: PlatformQualityMode;
    qualityScore: number;
    promptVersions: PlatformAgentStageTrace["promptVersions"];
    stageTimingsMs: PlatformAgentStageTrace["stageTimingsMs"];
  };
  preview: string;
  latencyMs: number;
  trace: PlatformAgentStageTrace;
};

type HeuristicDraftResult = {
  payload: PlatformAgentCandidate & {
    executionSource: "heuristic" | "llm";
    deliveryNote: string;
  };
  latencyMs: number;
};

type SpecialistHeuristic = {
  summary: string;
  sections: Array<{ heading: string; bullets: string[] }>;
  nextActions: string[];
  uncertainties: string[];
  confidence: "low" | "medium" | "high";
  deliveryNote: string;
};

export class PlatformAgentRuntime {
  private readonly modelClient = new PlatformAgentModelClient();
  private readonly qualityEngine = new PlatformQualityEngine();
  private readonly definitions = new Map(
    getBuiltInPlatformAgents().map((definition) => [definition.agentId, definition] as const),
  );

  supports(agentId: string) {
    return this.definitions.has(agentId);
  }

  getDefinition(agentId: string) {
    return this.definitions.get(agentId) ?? null;
  }

  async execute(
    agentId: string,
    task: TaskDetailView,
    options: { refinementContext?: PlatformRefinementContext | null } = {},
  ): Promise<RuntimeExecutionResult> {
    const definition = this.definitions.get(agentId);
    if (!definition) {
      throw new Error(`Built-in platform agent ${agentId} is not registered`);
    }

      const execution = await this.qualityEngine.execute({
        definition,
        task,
        refinementContext: options.refinementContext ?? null,
        generateHeuristicDraft: () => this.buildHeuristic(definition, task),
        generateModelDraft: this.modelClient.isEnabled()
          ? async (structuredTask, mode) => this.modelClient.generate(definition, task, structuredTask, mode)
          : undefined,
      });

      const refinementNote = options.refinementContext
        ? ` This pass was requested through Improve Again from run ${options.refinementContext.sourceRunId}.`
        : "";
      const deliveryBase = execution.executionSource === "llm"
        ? `${definition.publicName} used the guarded platform LLM path, then passed through the marketplace quality engine.`
        : `${definition.publicName} used the staged platform quality engine on the deterministic fallback path.`;

    return {
      payload: {
        agent: definition.publicName,
        category: definition.category,
        title: task.title,
        summary: execution.finalOutput.summary,
        sections: execution.finalOutput.sections,
        nextActions: execution.finalOutput.nextActions,
        uncertainties: execution.finalOutput.uncertainties,
        confidence: execution.confidence,
        executionSource: execution.executionSource,
          deliveryNote: `${deliveryBase}${refinementNote} This run is stored as a benchmarkable marketplace worker output, not a standalone assistant reply.`,
        qualityMode: execution.mode,
        qualityScore: execution.qualityScore,
        promptVersions: execution.promptVersions,
        stageTimingsMs: execution.stageTimingsMs,
      },
      preview: formatPreview(
        execution.finalOutput.summary,
        execution.finalOutput.sections,
        execution.finalOutput.nextActions,
        execution.finalOutput.uncertainties,
        execution.confidence,
        execution.executionSource,
      ),
      latencyMs: execution.latencyMs,
      trace: execution.trace,
    };
  }

  private buildHeuristic(definition: BuiltInPlatformAgentDefinition, task: TaskDetailView): HeuristicDraftResult {
    const focus = inferFocus(task);
    const specialist = buildSpecialistHeuristic(definition, task, focus);
    const sections = specialist?.sections ?? buildSections(definition, task, focus);
    const nextActions = specialist?.nextActions ?? buildNextActions(definition, task, focus);
    const summary = specialist?.summary ?? summarize(definition, task, focus);
    const latencyMs = estimateLatency(definition, task);
    const uncertainties = specialist?.uncertainties ?? buildHeuristicUncertainties(task);
    const confidence = specialist?.confidence ?? (uncertainties.length > 1 ? "low" : "medium");
    const deliveryNote = specialist?.deliveryNote ?? `${definition.publicName} produced a platform-run deliverable tuned for ${labelize(definition.category)} work using the deterministic fallback path.`;

    return {
      payload: {
        summary,
        sections,
        nextActions,
        uncertainties,
        confidence,
        executionSource: "heuristic",
        deliveryNote,
      },
      latencyMs,
    };
  }
}

function buildSpecialistHeuristic(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
): SpecialistHeuristic | null {
  switch (definition.specialization) {
    case "thread_writer":
      return buildThreadWriterHeuristic(definition, task, focus);
    case "summarizer":
      return buildSummarizerHeuristic(definition, task, focus);
    case "rewriter":
      return buildRewriterHeuristic(definition, task, focus);
    case "research_brief":
      return buildResearchBriefHeuristic(definition, task, focus);
    case "content_repurposer":
      return buildContentRepurposerHeuristic(definition, task, focus);
    case "executive_summarizer":
      return buildBrieflyHeuristic(definition, task, focus);
    case "document_reviewer":
      return buildClauseLensHeuristic(definition, task, focus);
    case "field_extractor":
      return buildTableMinerHeuristic(definition, task, focus);
    case "research_analyst":
      return buildSignalForgeHeuristic(definition, task, focus);
    case "conversion_writer":
      return buildCopySprintHeuristic(definition, task, focus);
    case "schema_designer":
      return buildSchemaSmithHeuristic(definition, task, focus);
    case "localization_specialist":
      return buildPolyLaneHeuristic(definition, task, focus);
    case "operations_designer":
      return buildOpsPilotHeuristic(definition, task, focus);
    case "campaign_strategist":
      return buildCampaignPilotHeuristic(definition, task, focus);
    default:
      return null;
  }
}

function inferFocus(task: TaskDetailView) {
  const text = buildTaskSourceCorpus(task).replace(/\s+/g, " ").trim();
  const sentences = text
    .split(/[.!?]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  return {
    sentence: sentences[0] ?? task.title,
    audience: inferAudience(text),
    primaryNoun: extractPrimaryNoun(text),
    attachmentCount: task.attachments.length,
  };
}

function buildSections(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
) {
  switch (definition.category) {
    case "research":
      return [
        {
          heading: "Signal",
          bullets: [
            `Primary ask: ${focus.sentence}`,
            `Most decision-relevant lens: contrast current assumptions with live market evidence and buyer expectations.`,
            `Deliverable should stay anchored to ${focus.audience}.`,
          ],
        },
        {
          heading: "Implications",
          bullets: [
            `Prioritize the strongest wedge around ${focus.primaryNoun}.`,
            "Separate evidence from interpretation so the buyer can approve quickly.",
            `Use concise proof points instead of long narrative blocks${focus.attachmentCount > 0 ? `, especially because ${focus.attachmentCount} attachment(s) were supplied` : ""}.`,
          ],
        },
      ];
    case "writing":
    case "marketing":
      return [
        {
          heading: "Angle",
          bullets: [
            `Lead with the sharpest buyer outcome around ${focus.primaryNoun}.`,
            "Keep the first line concrete and low-friction.",
            `Write for ${focus.audience} with a confident, premium tone.`,
          ],
        },
        {
          heading: "Draft Direction",
          bullets: [
            "Favor short, high-clarity lines over abstract positioning.",
            "Use one proof point and one action cue in each variant.",
            "Remove filler adjectives and duplicated benefit statements.",
          ],
        },
      ];
    case "summarization":
      return [
        {
          heading: "Compressed Summary",
          bullets: [
            `Core takeaway: ${focus.sentence}`,
            "Separate the top-line update from secondary details.",
            "Make the next decision or next action obvious in the first screenful.",
          ],
        },
        {
          heading: "What Matters",
          bullets: [
            `Highlight what affects ${focus.audience}.`,
            "Pull only the strongest proof, risk, and recommendation.",
            "Reduce repeated context and timeline noise.",
          ],
        },
      ];
    case "translation":
      return [
        {
          heading: "Localization Intent",
          bullets: [
            `Preserve the meaning of ${focus.primaryNoun} while making the language feel native.`,
            "Keep product terms stable and do not over-literalize UI or brand phrasing.",
            `Maintain a tone suitable for ${focus.audience}.`,
          ],
        },
        {
          heading: "Delivery Notes",
          bullets: [
            "Flag any phrasing that needs glossary review.",
            "Prefer clean sentence rhythm over word-for-word fidelity.",
            "Keep labels and structured terms consistently formatted.",
          ],
        },
      ];
    case "document_qa":
      return [
        {
          heading: "Answer Frame",
          bullets: [
            `Question focus: ${focus.sentence}`,
            "Answer directly first, then support with source-grounded evidence.",
            "Call out missing support or ambiguity explicitly instead of guessing.",
          ],
        },
        {
          heading: "Risk Review",
          bullets: [
            `Most likely risk area centers on ${focus.primaryNoun}.`,
            "Separate confirmed clauses from interpretation.",
            "Make escalation points obvious if source confidence is low.",
          ],
        },
      ];
    case "data_extraction":
    case "automation":
      return [
        {
          heading: "Structured Output Plan",
          bullets: [
            `Target entity: ${focus.primaryNoun}.`,
            "Keep extracted values normalized and machine-readable.",
            "Mark uncertain fields separately from validated fields.",
          ],
        },
        {
          heading: "Schema Guidance",
          bullets: [
            "Prefer stable keys, predictable ordering, and explicit null handling.",
            "Bundle assumptions in notes, not inside extracted values.",
            "Return enough structure for direct downstream reuse.",
          ],
        },
      ];
    case "operations":
      return [
        {
          heading: "Execution Flow",
          bullets: [
            `Operational goal: ${focus.sentence}`,
            "Translate the request into ordered steps, owners, and dependencies.",
            "Keep handoff language concrete enough for another operator to run.",
          ],
        },
        {
          heading: "Operational Risks",
          bullets: [
            `Watch for drift around ${focus.primaryNoun}.`,
            "Surface blockers before optional improvements.",
            "Keep the checklist short enough to use during real execution.",
          ],
        },
      ];
    default:
      return [
        {
          heading: "Execution Summary",
          bullets: [
            `Task focus: ${focus.sentence}`,
            `Category: ${labelize(definition.category)}.`,
            "Return a concise deliverable with clear next actions.",
          ],
        },
      ];
  }
}

function buildNextActions(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
) {
  return [
    `Review the ${labelize(definition.category)} output against the original task goal.`,
    `Confirm the deliverable is usable by ${focus.audience}.`,
    task.hiringMode === "direct_hire"
      ? "Approve the result if it is ready for payout, or reject with a specific revision note."
      : "Decide whether to approve this submission or leave the task open for more competition.",
  ];
}

function summarize(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
) {
  return `${definition.publicName} prepared a ${labelize(definition.category).toLowerCase()} deliverable for "${task.title}" with emphasis on ${focus.primaryNoun} and fast buyer review.`;
}

function formatPreview(
  summary: string,
  sections: Array<{ heading: string; bullets: string[] }>,
  nextActions: string[],
  uncertainties: string[],
  confidence: "low" | "medium" | "high",
  executionSource: "heuristic" | "llm",
) {
  const lines = [summary, ""];
  for (const section of sections) {
    lines.push(`${section.heading}`);
    for (const bullet of section.bullets) {
      lines.push(`- ${bullet}`);
    }
    lines.push("");
  }
  lines.push("Next actions");
  for (const action of nextActions) {
    lines.push(`- ${action}`);
  }
  if (uncertainties.length > 0) {
    lines.push("");
    lines.push("Uncertainties");
    for (const item of uncertainties) {
      lines.push(`- ${item}`);
    }
  }
  lines.push("");
  lines.push(`Confidence: ${confidence}`);
  lines.push(`Execution source: ${executionSource}`);
  return lines.join("\n").trim();
}

function validateCandidate(candidate: PlatformAgentCandidate, fallback: HeuristicDraftResult) {
  const summary = typeof candidate.summary === "string" && candidate.summary.trim()
    ? candidate.summary.trim()
    : fallback.payload.summary;
  const sections = Array.isArray(candidate.sections)
    ? candidate.sections
        .map((section) => ({
          heading: typeof section?.heading === "string" && section.heading.trim() ? section.heading.trim() : "Section",
          bullets: Array.isArray(section?.bullets)
            ? section.bullets.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 5)
            : [],
        }))
        .filter((section) => section.bullets.length > 0)
        .slice(0, 4)
    : [];
  const nextActions = Array.isArray(candidate.nextActions)
    ? candidate.nextActions.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 4)
    : [];
  const uncertainties = Array.isArray(candidate.uncertainties)
    ? candidate.uncertainties.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 4)
    : [];
  const confidence = candidate.confidence === "high" || candidate.confidence === "medium" || candidate.confidence === "low"
    ? candidate.confidence
    : "low";

  return {
    summary,
    sections: sections.length > 0 ? sections : fallback.payload.sections,
    nextActions: nextActions.length > 0 ? nextActions : fallback.payload.nextActions,
    uncertainties,
    confidence: confidence === "high" && uncertainties.length > 0 ? "medium" : confidence,
  };
}

function buildHeuristicUncertainties(task: TaskDetailView) {
  const items: string[] = [];
  if (task.attachments.some((item) => item.textContent?.trim())) {
    items.push("Attachment text was read from inline task context, but binary or non-text file contents still require a richer ingestion path.");
  } else if (task.attachments.length > 0) {
    items.push("Attachment contents were not directly read by the platform fallback path; only attachment metadata was available.");
  }
  if (!task.structuredNotes?.trim()) {
    items.push("No additional structured notes were provided, so nuanced execution constraints may be missing.");
  }
  items.push("Any external facts or citations still need retrieval-backed execution before they should be treated as verified.");
  return items.slice(0, 3);
}

function buildThreadWriterHeuristic(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
): SpecialistHeuristic {
  const sourceLines = collectSourceSentences(task);
  const lead = sourceLines[0] ?? task.description ?? task.title;
  const usefulContext = sourceLines.slice(1, 4);

  return {
    summary: `${definition.publicName} turned "${task.title}" into a concise Twitter/X thread with a hook, readable flow, and optional CTA.`,
    sections: [
      {
        heading: "Hook",
        bullets: [`${clipForJobOutput(lead, 118)}. Here is the useful breakdown.`],
      },
      {
        heading: "Thread",
        bullets: [
          `1/ ${clipForJobOutput(lead, 180)}`,
          `2/ The core idea: ${clipForJobOutput(focus.sentence, 160)}`,
          `3/ Why it matters: ${clipForJobOutput(usefulContext[0] ?? `It helps ${focus.audience} understand ${focus.primaryNoun} faster.`, 160)}`,
          `4/ Practical takeaway: ${clipForJobOutput(usefulContext[1] ?? `Turn ${focus.primaryNoun} into one clear next step instead of a loose idea.`, 160)}`,
          `5/ Save this when you need a clear way to explain ${focus.primaryNoun}.`,
        ],
      },
      {
        heading: "CTA (optional)",
        bullets: ["Want the next piece turned into a thread? Paste the source and keep the momentum going."],
      },
    ],
    nextActions: ["Review the hook for voice.", "Confirm whether the CTA should be educational, promotional, or soft."],
    uncertainties: buildHeuristicUncertainties(task),
    confidence: sourceLines.length >= 2 ? "medium" : "low",
    deliveryNote: `${definition.publicName} produced a job-shaped X thread using the staged platform quality engine.`,
  };
}

function buildSummarizerHeuristic(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
): SpecialistHeuristic {
  const sourceLines = collectSourceSentences(task);
  const takeaways = sourceLines.length > 0
    ? sourceLines.slice(0, 4).map((line) => clipForJobOutput(line, 150))
    : [`The task asks for a concise summary of ${focus.primaryNoun}.`];

  return {
    summary: `${definition.publicName} compressed "${task.title}" into a short summary, key takeaways, and action items.`,
    sections: [
      {
        heading: "Summary",
        bullets: [clipForJobOutput(sourceLines[0] ?? focus.sentence, 220)],
      },
      {
        heading: "Key Points",
        bullets: takeaways,
      },
      {
        heading: "Actionable (if applicable)",
        bullets: [
          "Confirm which takeaway matters most for the next decision.",
          "Use the summary as the approval-ready version before sharing the full source.",
        ],
      },
    ],
    nextActions: ["Add source text or attachment content for a more complete summary.", "Mark any decision-critical points that need extra emphasis."],
    uncertainties: buildHeuristicUncertainties(task),
    confidence: sourceLines.length >= 3 ? "medium" : "low",
    deliveryNote: `${definition.publicName} produced a structured summary instead of loose prose.`,
  };
}

function buildRewriterHeuristic(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
): SpecialistHeuristic {
  const sourceLines = collectSourceSentences(task);
  const original = sourceLines[0] ?? task.description ?? focus.sentence;
  const polished = polishVisibleText(original, focus);

  return {
    summary: `${definition.publicName} rewrote "${task.title}" for clarity, structure, and a more polished tone while preserving meaning.`,
    sections: [
      {
        heading: "Polished Version",
        bullets: [polished],
      },
      {
        heading: "Simplified Version (optional)",
        bullets: [`${clipForJobOutput(focus.sentence, 120)}. The main point should be easy to understand and ready to act on.`],
      },
    ],
    nextActions: ["Confirm the desired tone: professional, casual, direct, or persuasive.", "Paste the full draft if more than one paragraph needs editing."],
    uncertainties: buildHeuristicUncertainties(task),
    confidence: sourceLines.length > 0 ? "medium" : "low",
    deliveryNote: `${definition.publicName} preserved the user's meaning while improving clarity and tone.`,
  };
}

function buildResearchBriefHeuristic(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
): SpecialistHeuristic {
  const sourceLines = collectSourceSentences(task);
  const evidence = sourceLines.slice(0, 4);

  return {
    summary: `${definition.publicName} prepared a structured research brief for "${task.title}" with insights, pros, risks, and a conclusion.`,
    sections: [
      {
        heading: "Overview",
        bullets: [`The brief focuses on ${focus.primaryNoun} for ${focus.audience}.`, clipForJobOutput(evidence[0] ?? focus.sentence, 160)],
      },
      {
        heading: "Key Insights",
        bullets: evidence.length > 1
          ? evidence.slice(1, 4).map((line) => clipForJobOutput(line, 150))
          : [`The strongest visible signal is the task owner's need to understand ${focus.primaryNoun} clearly before acting.`],
      },
      {
        heading: "Pros",
        bullets: [
          `Creates a clearer decision frame around ${focus.primaryNoun}.`,
          "Turns a broad topic into reviewable points and next steps.",
        ],
      },
      {
        heading: "Risks",
        bullets: [
          "External facts are not verified unless source material or retrieval is provided.",
          "Thin prompts can make the brief useful but not exhaustive.",
        ],
      },
      {
        heading: "Conclusion",
        bullets: [`Use this as a first-pass brief, then add evidence or links where the decision needs stronger support.`],
      },
    ],
    nextActions: ["Add links, notes, or source material for stronger research grounding.", "Tell the agent whether the brief is for strategy, learning, or execution."],
    uncertainties: buildHeuristicUncertainties(task),
    confidence: evidence.length >= 2 ? "medium" : "low",
    deliveryNote: `${definition.publicName} stayed bounded to visible input and separated useful analysis from unverified claims.`,
  };
}

function buildContentRepurposerHeuristic(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
): SpecialistHeuristic {
  const sourceLines = collectSourceSentences(task);
  const lead = sourceLines[0] ?? task.description ?? focus.sentence;

  return {
    summary: `${definition.publicName} repurposed "${task.title}" into multiple ready-to-use content formats.`,
    sections: [
      {
        heading: "Thread",
        bullets: [
          `1/ ${clipForJobOutput(lead, 160)}`,
          `2/ The main takeaway is simple: ${clipForJobOutput(focus.sentence, 140)}`,
          `3/ Use this idea to make ${focus.primaryNoun} clearer, faster, and easier to share.`,
        ],
      },
      {
        heading: "Summary",
        bullets: [clipForJobOutput(lead, 220)],
      },
      {
        heading: "Bullet Points",
        bullets: (sourceLines.length > 0 ? sourceLines : [focus.sentence])
          .slice(0, 4)
          .map((line) => clipForJobOutput(line, 130)),
      },
      {
        heading: "Short Post",
        bullets: [`${clipForJobOutput(lead, 120)}. Here is the practical takeaway: make ${focus.primaryNoun} easier to understand and act on.`],
      },
    ],
    nextActions: ["Choose the strongest format for publishing first.", "Add platform preference if the output should be optimized for X, LinkedIn, email, or a caption."],
    uncertainties: buildHeuristicUncertainties(task),
    confidence: sourceLines.length >= 2 ? "medium" : "low",
    deliveryNote: `${definition.publicName} created distinct reusable formats from the same source material.`,
  };
}

function buildBrieflyHeuristic(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
): SpecialistHeuristic {
  const sourceSentences = collectSourceSentences(task);
  const signalSummary = analyzeBriefSignals(task);
  const keySignals =
    signalSummary.strongSignals.length > 0
      ? signalSummary.strongSignals
      : sourceSentences.slice(0, 3);
  const uncertainties: string[] = [];
  const sourceCorpus = buildTaskEvidenceCorpus(task);

  if (sourceSentences.length < 2) {
    uncertainties.push("The summarization context is thin, so the brief may miss nuance that would normally come from fuller source material.");
  }
  if (signalSummary.conflicts.length > 0 || /\bvs\b/i.test(sourceCorpus)) {
    uncertainties.push("Some visible source lines conflict, so the brief should preserve discrepancies instead of collapsing them into one metric.");
  }
  if (task.attachments.length > 0) {
    uncertainties.push("Attachment contents were not directly ingested, so this brief only reflects the task text and any structured notes.");
  }
  if (task.attachments.some((item) => item.textContent?.trim())) {
    uncertainties.splice(
      0,
      uncertainties.length,
      ...uncertainties.filter((item) => !item.includes("Attachment contents were not directly ingested")),
    );
  }

  return {
    summary:
      keySignals[0] ??
      `${definition.publicName} prepared a concise brief for "${task.title}" but needs richer source material for a stronger summary.`,
    sections: [
      {
        heading: "Top Line",
        bullets: keySignals.length > 0 ? keySignals : [`Task objective: ${focus.sentence}`],
      },
      {
        heading: "Decision Signals",
        bullets: keySignals.length > 1
          ? keySignals.slice(1, 4)
          : [
              ...signalSummary.weakSignals.slice(0, 2),
              `Primary audience: ${focus.audience}.`,
            ].slice(0, 3),
      },
      {
        heading: "Risks / Gaps",
        bullets:
          [
            ...signalSummary.conflicts.slice(0, 2).map((item) => `Conflict to preserve: ${item}`),
            ...signalSummary.risks.slice(0, 2),
          ].slice(0, 3).length > 0
            ? [
                ...signalSummary.conflicts.slice(0, 2).map((item) => `Conflict to preserve: ${item}`),
                ...signalSummary.risks.slice(0, 2),
              ].slice(0, 3)
            : [
                "No major visible risks were called out in the source text.",
                "Treat missing detail as a follow-up item rather than filling it in.",
              ],
      },
      {
        heading: "Recommended Next Step",
        bullets: [
          signalSummary.strongSignals[0]
            ? `Lead with "${signalSummary.strongSignals[0]}" when sharing the brief upward.`
            : `Lead with the clearest available signal for ${focus.primaryNoun}.`,
          "Add fuller source text if you need stronger compression or conflict resolution.",
        ],
      },
    ],
    nextActions: [
      "Check whether the top-line summary reflects the actual source intent.",
      "Add supporting notes or transcript excerpts if you need a higher-confidence executive brief.",
      "Approve if this summary is already enough for decision-making.",
    ],
    uncertainties: uncertainties.slice(0, 4),
    confidence: uncertainties.length > 0 ? "medium" : "high",
    deliveryNote: `${definition.publicName} now runs as a source-bounded executive summarizer and explicitly refuses to invent missing details.`,
  };
}

function buildClauseLensHeuristic(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
): SpecialistHeuristic {
  const evidence = collectEvidenceLines(task);
  const questions = extractClauseQuestions(task);
  const asksAboutOwnership = /\bown(?:s|er|ership)?\b/i.test(buildTaskSourceCorpus(task));
  const hasOwnershipEvidence = evidence.some((line) => /\bown(?:s|er|ership)?\b/i.test(line));
  const missingSource = evidence.length === 0;
  const questionAnswers = questions
    .map((question) => answerClauseQuestion(question, evidence))
    .filter((item) => item !== null);
  const uncertainties = [
      ...(missingSource
        ? ["No source excerpt or structured notes were provided, so ClauseLens cannot verify the requested clause with confidence."]
      : []),
      ...(!missingSource && asksAboutOwnership && !hasOwnershipEvidence
        ? ["The visible text references customer data but does not clearly confirm ownership, so any ownership answer stays bounded."]
        : []),
      ...(questions.length > 0 && questionAnswers.length < questions.length
        ? ["Some requested questions are only partially supported by the visible source text, so unsupported answers stay marked as insufficient evidence."]
        : []),
    ...(!task.attachments.some((item) => item.textContent?.trim()) && task.attachments.length > 0
      ? ["Attachment contents are not directly readable in the current platform path, so only visible task text can be used as evidence."]
      : []),
  ].slice(0, 4);

  return {
    summary: missingSource
      ? `ClauseLens cannot safely answer "${task.title}" from the current task text alone.`
      : `ClauseLens reviewed the provided task text for "${task.title}" and prepared a source-bounded answer.`,
    sections: [
      {
        heading: "Answer",
        bullets: missingSource
          ? [
              "Insufficient evidence to provide a grounded clause answer from the currently visible task context.",
              "Provide the relevant clause text or paste the governing excerpt into structured notes.",
            ]
          : questionAnswers.length > 0
            ? questionAnswers.map((item) => `${item.question}: ${item.answer}`)
          : [
              `Best grounded answer: ${evidence[0]}`,
              "This answer is limited to the text that was explicitly provided in the task.",
            ],
      },
      {
        heading: "Evidence",
        bullets: missingSource
          ? ["No clause excerpt was available in task description or structured notes."]
          : evidence.map((line) => `Visible source: ${line}`),
      },
      {
        heading: "Risk Review",
        bullets: [
          `Primary interpretation risk concerns ${focus.primaryNoun}.`,
          missingSource
            ? "Any stronger conclusion would require speculation, which this agent intentionally avoids."
            : "Treat any implication beyond the cited text as interpretive rather than confirmed.",
        ],
      },
    ],
    nextActions: [
      "Paste the relevant source excerpt into structured notes for a higher-confidence review.",
      "Use the evidence section to confirm the answer is grounded in visible text.",
      "Escalate to human review when contractual or policy stakes are high.",
    ],
    uncertainties,
    confidence: missingSource ? "low" : uncertainties.length > 0 ? "medium" : "high",
    deliveryNote: `${definition.publicName} now behaves like a source-bounded reviewer: no visible source, no confident answer.`,
  };
}

function buildTableMinerHeuristic(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
): SpecialistHeuristic {
  const { confirmed, uncertain, conflicts } = extractStructuredFields(task);
  const confirmedBullets =
    confirmed.length > 0
      ? confirmed.map((item) => `${item.key}: ${item.value}`)
      : ["No explicit field/value pairs were found in the task text or structured notes."];
  const uncertainBullets =
    uncertain.length > 0
      ? uncertain.map((item) => `${item.key}: ${item.value}`)
      : ["No uncertain values were detected in the visible task text."];
  const conflictBullets =
    conflicts.length > 0
      ? conflicts.map((item) => `${item.key}: ${item.values.join(" vs ")}`)
      : [];
  const uncertainties = [
    ...(confirmed.length === 0 ? ["No strongly structured source material was provided, so extraction confidence is limited."] : []),
    ...(conflicts.length > 0 ? ["Some repeated fields conflict across the visible source text, so they should be reviewed before downstream use."] : []),
    ...(!task.attachments.some((item) => item.textContent?.trim()) && task.attachments.length > 0
      ? ["Attachment contents were not parsed directly, so any values inside files still need ingestion before they can be confirmed."]
      : []),
  ].slice(0, 4);

  return {
    summary:
      confirmed.length > 0
        ? `${definition.publicName} extracted ${confirmed.length} explicit field${confirmed.length === 1 ? "" : "s"} for "${task.title}".`
        : `${definition.publicName} could not confirm structured fields for "${task.title}" from the visible task text alone.`,
    sections: [
      {
        heading: "Confirmed Fields",
        bullets: confirmedBullets,
      },
      {
        heading: "Uncertain Fields",
        bullets: uncertainBullets,
      },
      ...(conflictBullets.length > 0
        ? [
            {
              heading: "Conflicts",
              bullets: conflictBullets,
            },
          ]
        : []),
      {
        heading: "Normalization Notes",
        bullets: [
          "Confirmed fields include only explicit values visible in task description or structured notes.",
          "Missing or ambiguous values are kept out of confirmed output to avoid false precision.",
          ...(conflictBullets.length > 0
            ? ["Conflicting repeats are isolated so buyers can decide which source value to trust."]
            : []),
          `Extraction stayed focused on ${focus.primaryNoun}.`,
        ].slice(0, 4),
      },
    ],
    nextActions: [
      "Review the confirmed fields before using them downstream.",
      "Paste raw rows or key/value blocks into structured notes if you need fuller extraction.",
      "Treat uncertain fields as follow-up items, not validated output.",
    ],
    uncertainties,
    confidence: confirmed.length >= 3 && uncertainties.length === 0 ? "high" : confirmed.length > 0 ? "medium" : "low",
    deliveryNote: `${definition.publicName} now uses fail-safe extraction rules: explicit values become confirmed fields, everything else stays uncertain.`,
  };
}

function buildSignalForgeHeuristic(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
): SpecialistHeuristic {
  const evidence = collectEvidenceLines(task);
  const signalSummary = analyzeResearchSignals(task);
  const uncertainties = [
    ...(evidence.length < 2 ? ["The task does not include enough grounded evidence to support a high-confidence strategic recommendation."] : []),
    ...(signalSummary.weakSignals.length > 0 ? ["Some visible inputs are weak or incomplete signals, so recommendation strength should stay proportional to the evidence."] : []),
    ...(!task.attachments.some((item) => item.textContent?.trim()) && task.attachments.length > 0
      ? ["Referenced attachments were not readable as inline text, so this strategy brief may be missing important source signal."]
      : []),
  ].slice(0, 4);

  return {
    summary:
      evidence[0]
        ? `${definition.publicName} prepared a bounded strategy brief for "${task.title}" using only visible task evidence.`
        : `${definition.publicName} can frame the strategy question for "${task.title}", but stronger source evidence is still needed.`,
    sections: [
      {
        heading: "Signal",
        bullets:
          signalSummary.strongSignals.length > 0
            ? signalSummary.strongSignals.slice(0, 3).map((line) => `Observed signal: ${line}`)
            : [`Primary ask: ${focus.sentence}`, "No concrete market or customer evidence was provided in the visible task context."],
      },
      {
        heading: "Evidence Limits",
        bullets:
          signalSummary.weakSignals.length > 0
            ? signalSummary.weakSignals.slice(0, 3).map((line) => `Weak or incomplete signal: ${line}`)
            : ["No material evidence gaps were obvious beyond the visible source limits."],
      },
      {
        heading: "Implications",
        bullets: [
          `Current task focus centers on ${focus.primaryNoun}.`,
          signalSummary.strongSignals.length > 0
            ? "Implications are bounded to the evidence above and should not be treated as a full market scan."
            : "Any stronger implication would be speculative until more evidence is supplied.",
          ...signalSummary.implications.slice(0, 1),
        ],
      },
      {
        heading: "Recommendation",
        bullets: [
          signalSummary.strongSignals.length > 0
            ? "Use the strongest observed signal as the wedge, then validate with a fuller research pass before major decisions."
            : "Attach customer, market, or performance evidence before acting on a strategic recommendation.",
          ...signalSummary.recommendations.slice(0, 1),
        ],
      },
    ],
    nextActions: [
      "Add customer quotes, market notes, or performance evidence for a stronger strategy brief.",
      "Check that the recommendation is actually supported by the visible evidence.",
      "Treat this as a bounded first-pass analysis, not a full external research report.",
    ],
    uncertainties,
    confidence: evidence.length >= 2 && uncertainties.length === 0 ? "medium" : "low",
    deliveryNote: `${definition.publicName} now distinguishes evidence, implications, and recommendation instead of pretending a full market scan happened.`,
  };
}

function buildCopySprintHeuristic(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
): SpecialistHeuristic {
  const sourceLines = collectEvidenceLines(task);
  const copyBlueprint = analyzeCopyTask(task);
  const thinQuantEvidence = sourceLines.some((line) => {
    const match = line.match(/\bn\s*=\s*(\d+)/i);
    return match ? Number(match[1]) < 5 : false;
  });
  const uncertainties = [
      ...(sourceLines.length < 2 ? ["The copy brief is thin, so product proof and differentiation may still be underspecified."] : []),
      ...(thinQuantEvidence ? ["Any quantitative proof in the brief comes from a very small sample, so the copy should stay conservative."] : []),
      ...(task.attachments.length > 0 && !task.attachments.some((item) => item.textContent?.trim())
        ? ["Referenced brand or product materials were attached but not readable as inline text."]
        : []),
  ].slice(0, 4);

  return {
    summary: `${definition.publicName} drafted bounded conversion copy directions for "${task.title}" without inventing unsupported claims.`,
    sections: [
      {
        heading: "Angle",
        bullets: [
          copyBlueprint.angle,
          sourceLines[0] ? `Anchor the message in this visible brief signal: ${sourceLines[0]}` : "No concrete product proof was visible, so the angle should stay conservative.",
        ],
      },
      {
        heading: "Draft",
        bullets: copyBlueprint.draft,
      },
      {
        heading: "Variants",
        bullets: copyBlueprint.variants,
      },
    ],
    nextActions: [
      "Add actual product proof points, testimonials, or feature constraints before publishing copy externally.",
      "Choose one angle and rewrite the draft around the best-supported claim.",
      "Reject any copy line that implies performance proof not present in the source material.",
    ],
    uncertainties,
    confidence: sourceLines.length >= 2 && uncertainties.length === 0 ? "medium" : "low",
    deliveryNote: `${definition.publicName} now ships safer copy direction by avoiding unsupported claims and keeping proof requirements explicit.`,
  };
}

function buildSchemaSmithHeuristic(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
): SpecialistHeuristic {
  const fields = collectSchemaCandidateFields(task);
  const keys = fields.map((field) => field.key);
  const uncertainties = [
    ...(keys.length < 2 ? ["The task does not provide many explicit fields, so the schema proposal is partly inferred from the task goal."] : []),
    ...(task.attachments.length > 0 && !task.attachments.some((item) => item.textContent?.trim())
      ? ["Attached files were referenced but not readable as inline text, so some source fields may still be missing."]
      : []),
    ...fields
      .filter((field) => field.uncertain)
      .slice(0, 3)
      .map((field) => `${field.key} is uncertain from the visible source and should be validated before production use.`),
  ].slice(0, 4);
  const schemaBullets =
    fields.length > 0
      ? fields.map((field) => `"${field.key}": ${field.type}`)
      : [`"${normalizeKey(focus.primaryNoun)}": string | null`, '"notes": string | null'];
  const exampleBullets =
    fields.length > 0
      ? fields.slice(0, 8).map((field) => `"${field.key}": ${field.example}`)
      : ['"notes": "Add concrete fields from source material before production use."'];
  const uncertainBullets =
    fields.filter((field) => field.uncertain).length > 0
      ? fields
        .filter((field) => field.uncertain)
        .slice(0, 4)
        .map((field) => `"${field.key}": source value ${JSON.stringify(field.sourceValue)}`)
      : ["No uncertain fields were detected in the visible source text."];

  return {
    summary: `${definition.publicName} drafted a machine-readable schema for "${task.title}" with emphasis on stable keys and safe downstream mapping.`,
    sections: [
      {
        heading: "Schema",
        bullets: schemaBullets,
      },
      {
        heading: "Example JSON",
        bullets: exampleBullets,
      },
      {
        heading: "Uncertain Fields",
        bullets: uncertainBullets,
      },
      {
        heading: "Mapping Notes",
        bullets: [
          "Use explicit nulls for missing fields rather than inventing placeholder values.",
          "Keep assumptions outside the schema whenever the source text does not name a field directly.",
          "Prefer normalized machine-safe keys while preserving the visible source meaning.",
          `Schema is optimized for ${focus.primaryNoun} and downstream automation stability.`,
        ],
      },
    ],
    nextActions: [
      "Validate the proposed keys against the real downstream payload you need to support.",
      "Add missing source examples if the schema needs tighter field names or typing.",
      "Approve once the schema is specific enough for the target workflow.",
    ],
    uncertainties,
    confidence: keys.length >= 3 && uncertainties.length === 0 ? "high" : keys.length > 0 ? "medium" : "low",
    deliveryNote: `${definition.publicName} now proposes schemas conservatively: explicit keys first, assumptions clearly separated.`,
  };
}

function buildPolyLaneHeuristic(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
): SpecialistHeuristic {
  const translationPayload = inferTranslationPayload(task);
  const localizationPlan = analyzeLocalizationTask(task, translationPayload);
  const missingSource = !translationPayload.sourceText;
  const uncertainties = [
    ...(missingSource ? ["No explicit source text was provided, so a trustworthy translation cannot be produced yet."] : []),
    ...(!translationPayload.targetLanguage ? ["No target language was specified clearly, so the localization direction may still need confirmation."] : []),
    ...(localizationPlan.glossaryTerms.length > 0 ? ["Glossary-sensitive product terms were detected and should be checked before publishing localized output."] : []),
  ].slice(0, 4);

  return {
    summary: missingSource
      ? `${definition.publicName} cannot localize "${task.title}" until actual source copy is provided.`
      : `${definition.publicName} prepared a source-bounded localization pass for "${task.title}".`,
    sections: [
      {
        heading: "Source Intent",
        bullets: missingSource
          ? ["No source passage was visible in task description, structured notes, or attachments."]
          : [
              `Target language: ${localizationPlan.targetLabel}.`,
              `Visible source copy: ${translationPayload.sourceText}`,
            ],
      },
      {
        heading: "Localized Output",
        bullets: missingSource
          ? ["Provide the source copy and target language before asking this agent for a final translation."]
          : [buildLocalizationPlaceholder(translationPayload, localizationPlan.localeSuffix)],
      },
      {
        heading: "Terminology",
        bullets:
          localizationPlan.glossaryTerms.length > 0
            ? localizationPlan.glossaryTerms.map((term) => `Preserve term: ${term}`)
            : ["No glossary-locked product terms were obvious in the visible source text."],
      },
      {
        heading: "Notes",
        bullets: [
          "Preserve product terms and glossary-sensitive language exactly when instructed.",
          missingSource
            ? "This agent intentionally avoids fabricating translations without visible source text."
            : localizationPlan.localeSuffix
              ? `Locale direction was detected, so review tone and regional wording for ${localizationPlan.targetLabel}.`
              : "Review any branded terms or UI labels before publishing the localized output.",
        ],
      },
    ],
    nextActions: [
      "Provide exact source copy and target language for higher-confidence localization.",
      "Review terminology and branded phrases before final approval.",
      "Use attachments for longer source passages instead of paraphrasing them into the task form.",
    ],
    uncertainties,
    confidence: missingSource || !translationPayload.targetLanguage ? "low" : "medium",
    deliveryNote: `${definition.publicName} now refuses to invent translations without visible source text and language direction.`,
  };
}

function buildOpsPilotHeuristic(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
): SpecialistHeuristic {
  const orderedSteps = collectOperationalSteps(task);
  const workflowPlan = analyzeOpsWorkflow(task, orderedSteps);
  const uncertainties = [
    ...(orderedSteps.length < 2 ? ["The task does not define enough concrete steps, so this runbook is still a first-pass operating draft."] : []),
    ...(!mentionsOwnerOrTeam(task) ? ["No explicit owners or teams were provided, so role assignments are generic placeholders."] : []),
    ...(workflowPlan.escalations.length === 0 ? ["No explicit escalation threshold was visible, so escalation timing may still need to be added."] : []),
  ].slice(0, 4);

  return {
    summary: `${definition.publicName} turned "${task.title}" into an execution runbook with ordered steps, ownership guidance, and risk flags.`,
    sections: [
      {
        heading: "Workflow",
        bullets:
          orderedSteps.length > 0
            ? orderedSteps.map((step, index) => `${index + 1}. ${step}`)
            : [
                `1. Clarify the requested outcome around ${focus.primaryNoun}.`,
                "2. Assign an owner and define completion criteria.",
                "3. Run the workflow and review blockers before handoff.",
              ],
      },
      {
        heading: "Owners",
        bullets: workflowPlan.owners,
      },
      {
        heading: "Handoffs",
        bullets: workflowPlan.handoffs,
      },
      {
        heading: "Escalation",
        bullets: workflowPlan.escalations,
      },
      {
        heading: "Risks",
        bullets: workflowPlan.risks.length > 0
          ? workflowPlan.risks
          : [
              `Main execution risk centers on ${focus.primaryNoun}.`,
              "Missing prerequisites should block execution instead of being discovered late.",
              "Keep the checklist short enough to use live during execution.",
            ],
      },
    ],
    nextActions: [
      "Confirm step order and owner assignments before running this workflow.",
      "Add missing prerequisites or SLAs if the operation is time-sensitive.",
      "Approve once another operator could execute this without extra explanation.",
    ],
    uncertainties,
    confidence: orderedSteps.length >= 3 && uncertainties.length === 0 ? "high" : "medium",
    deliveryNote: `${definition.publicName} now generates execution-first runbooks with explicit step order and safer ownership assumptions.`,
  };
}

function buildCampaignPilotHeuristic(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  focus: ReturnType<typeof inferFocus>,
): SpecialistHeuristic {
  const sourceLines = collectEvidenceLines(task);
  const campaignPlan = analyzeCampaignTask(task);
  const uncertainties = [
    ...(sourceLines.length < 2 ? ["Campaign context is still thin, so the message and proof strategy should be treated as a first-pass plan."] : []),
    ...(!/\b(audience|segment|persona|customer|buyer)\b/i.test(buildTaskSourceCorpus(task))
      ? ["No explicit audience segment was provided, so audience targeting remains generic."]
      : []),
  ].slice(0, 4);

  return {
    summary: `${definition.publicName} mapped "${task.title}" into a bounded campaign plan organized around audience, message, proof, and execution rhythm.`,
    sections: [
      {
        heading: "Audience",
        bullets: campaignPlan.audience,
      },
      {
        heading: "Message",
        bullets: campaignPlan.message,
      },
      {
        heading: "Channels",
        bullets: campaignPlan.channels,
      },
      {
        heading: "Plan",
        bullets: campaignPlan.plan.length > 0
          ? campaignPlan.plan
          : [
              "Stage 1: Align on one audience and one proof-backed message.",
              "Stage 2: Prepare channel-specific assets once proof and offer language are confirmed.",
              "Stage 3: Review results and adjust the next wave based on actual performance.",
            ],
      },
    ],
    nextActions: [
      "Add explicit audience, offer, and proof details before launching the campaign.",
      "Use the plan as a sequencing draft, not a substitute for real channel performance data.",
      "Check every campaign claim against visible source evidence before approval.",
    ],
    uncertainties,
    confidence: sourceLines.length >= 2 && uncertainties.length === 0 ? "medium" : "low",
    deliveryNote: `${definition.publicName} now builds campaign plans conservatively, with audience and proof gaps called out instead of guessed over.`,
  };
}

function inferAudience(text: string) {
  const explicitAudience =
    text.match(/\baudience\s*[:=-]\s*([^\n]+)/i)?.[1]?.trim() ??
    text.match(/\b(?:segment|persona)\s*[:=-]\s*([^\n]+)/i)?.[1]?.trim() ??
    null;
  if (explicitAudience) return explicitAudience;
  const lower = text.toLowerCase();
  if (lower.includes("buyer") || lower.includes("customer")) return "customer-facing reviewers";
  if (lower.includes("leadership") || lower.includes("board") || lower.includes("executive")) return "leadership stakeholders";
  if (lower.includes("support")) return "support operators";
  if (lower.includes("sales") || lower.includes("gtm")) return "go-to-market teams";
  return "the task owner";
}

function clipForJobOutput(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function polishVisibleText(value: string, focus: ReturnType<typeof inferFocus>) {
  const normalized = clipForJobOutput(value, 220);
  if (!normalized) {
    return `Here is a clearer version focused on ${focus.primaryNoun}: make the main point direct, specific, and easy to act on.`;
  }
  const withoutFiller = normalized
    .replace(/\b(just|really|very|basically|actually)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentence = withoutFiller.endsWith(".") ? withoutFiller : `${withoutFiller}.`;
  return `${sentence} The revised version keeps the idea focused, readable, and ready for ${focus.audience}.`;
}

function collectSourceSentences(task: TaskDetailView) {
  const lines = buildTaskEvidenceCorpus(task)
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value.length > 12)
    .filter((value) => !looksLikeStructuralHeader(value));
  if (lines.length > 0) {
    return lines.slice(0, 6);
  }
  return buildTaskEvidenceCorpus(task)
    .split(/[.!?]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 12)
    .filter((value) => !looksLikeStructuralHeader(value))
    .slice(0, 6);
}

function collectEvidenceLines(task: TaskDetailView) {
  return buildTaskEvidenceCorpus(task)
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value.length > 8)
    .filter((value) => !looksLikeStructuralHeader(value))
    .filter((value) => !looksLikeInstructionLine(value))
    .slice(0, 4);
}

function extractStructuredFields(task: TaskDetailView) {
  const lines = buildTaskSourceCorpus(task)
    .split(/\r?\n|;/)
    .map((value) => value.trim())
    .filter(Boolean);
  const confirmed: Array<{ key: string; value: string }> = [];
  const uncertain: Array<{ key: string; value: string }> = [];
  const seenValues = new Map<string, Set<string>>();
  const conflicts: Array<{ key: string; values: string[] }> = [];

  for (const line of lines) {
    const kvMatch = line.match(/^([A-Za-z][A-Za-z0-9 _/-]{1,40})\s*[:=-]\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const value = kvMatch[2].trim();
      const normalizedKey = normalizeKey(key);
      const knownValues = seenValues.get(normalizedKey) ?? new Set<string>();
      knownValues.add(value);
      seenValues.set(normalizedKey, knownValues);
      if (knownValues.size > 1 && !conflicts.some((item) => normalizeKey(item.key) === normalizedKey)) {
        conflicts.push({ key, values: [...knownValues] });
      }
      const bucket = /\b(?:unknown|tbd|unsure|approx|maybe)\b/i.test(value) ? uncertain : confirmed;
      bucket.push({ key, value });
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      confirmed.push({ key: "item", value: listMatch[1].trim() });
    }
  }

  return {
    confirmed: confirmed.slice(0, 12),
    uncertain: uncertain.slice(0, 8),
    conflicts: conflicts.slice(0, 6),
  };
}

function collectCandidateKeys(task: TaskDetailView) {
  const keys = new Set<string>();
  const lines = buildTaskSourceCorpus(task)
    .split(/\r?\n|;/)
    .map((value) => value.trim())
    .filter(Boolean);

  for (const line of lines) {
    const kvMatch = line.match(/^([A-Za-z][A-Za-z0-9 _/-]{1,40})\s*[:=-]\s*(.+)$/);
    if (kvMatch) {
      keys.add(normalizeKey(kvMatch[1]));
    }
  }

  return [...keys].slice(0, 8);
}

function collectSchemaCandidateFields(task: TaskDetailView) {
  const lines = buildTaskSourceCorpus(task)
    .split(/\r?\n|;/)
    .map((value) => value.trim())
    .filter(Boolean);
  const fields: Array<{ key: string; type: string; example: string; uncertain: boolean; sourceValue: string }> = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const kvMatch = line.match(/^([A-Za-z][A-Za-z0-9 _/-]{1,40})\s*[:=-]\s*(.+)$/);
    if (!kvMatch) continue;
    const key = normalizeSchemaKey(kvMatch[1]);
    if (seen.has(key)) continue;
    const sourceValue = kvMatch[2].trim();
    const uncertain = /\b(?:unknown|tbd|unsure|approx|approximately|maybe|~)\b/i.test(sourceValue);
    fields.push({
      key,
      type: inferSchemaFieldType(key, sourceValue),
      example: formatSchemaExampleValue(key, sourceValue),
      uncertain,
      sourceValue,
    });
    seen.add(key);
  }

  return fields.slice(0, 10);
}

function inferSchemaFieldType(key: string, sourceValue: string) {
  const lowerKey = key.toLowerCase();
  const lowerValue = sourceValue.toLowerCase();
  if (hasDateSemantics(lowerKey) || /\b\d{4}-\d{2}-\d{2}\b/.test(sourceValue)) {
    return "date-string | null";
  }
  if (/\b(yes|no|true|false)\b/.test(lowerValue) || lowerKey.startsWith("is_") || lowerKey.startsWith("has_") || lowerKey.includes("subscribed")) {
    return "boolean | null";
  }
  if (lowerKey.includes("email") || /@/.test(sourceValue)) {
    return "email-string | null";
  }
  if (lowerKey.includes("phone")) {
    return "phone-string | null";
  }
  if (/[+,]/.test(sourceValue) && /\b(use_case|tags|items|features|stakeholders)\b/i.test(lowerKey)) {
    return "string[] | null";
  }
  if (lowerKey.includes("budget") || lowerKey.includes("amount") || lowerKey.includes("price") || lowerKey.includes("total")) {
    return "number | string | null";
  }
  return "string | null";
}

function formatSchemaExampleValue(key: string, sourceValue: string) {
  const lowerKey = key.toLowerCase();
  const trimmed = sourceValue.trim();
  if (hasDateSemantics(lowerKey) || /\b\d{4}-\d{2}-\d{2}\b/.test(trimmed)) {
    const dateMatch = trimmed.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (dateMatch) return JSON.stringify(dateMatch[0]);
  }
  if (lowerKey.includes("phone")) {
    return JSON.stringify(trimmed.replace(/[^\d+]/g, ""));
  }
  if (/[+,]/.test(trimmed) && /\b(use_case|tags|items|features|stakeholders)\b/i.test(lowerKey)) {
    const parts = trimmed
      .split(/\s*(?:,|\+|\/)\s*/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (parts.length > 1) {
      return JSON.stringify(parts);
    }
  }
  if (lowerKey.includes("budget") || lowerKey.includes("amount") || lowerKey.includes("price") || lowerKey.includes("total")) {
    const amountMatch = trimmed.replace(/,/g, "").match(/(\d+(?:\.\d+)?)(k)?/i);
    if (amountMatch) {
      const base = Number(amountMatch[1]);
      const scaled = amountMatch[2] ? base * 1000 : base;
      if (Number.isFinite(scaled)) {
        return String(scaled);
      }
    }
  }
  if (/\b(yes|true)\b/i.test(trimmed)) return "true";
  if (/\b(no|false)\b/i.test(trimmed)) return "false";
  return JSON.stringify(trimmed);
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "field";
}

function normalizeSchemaKey(value: string) {
  const normalized = normalizeKey(value);
  if (normalized === "subscribe_to_updates") return "subscribed_to_updates";
  return normalized;
}

function hasDateSemantics(key: string) {
  return /(?:^|_)(date|dated|deadline|kickoff|renewal)(?:$|_)/.test(key);
}

function extractClauseQuestions(task: TaskDetailView) {
  return buildTaskSourceCorpus(task)
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value.length > 4)
    .filter((value) => /\?$/.test(value) || /^\d+\./.test(value))
    .map((value) => value.replace(/^\d+\.\s*/, ""))
    .slice(0, 6);
}

function answerClauseQuestion(question: string, evidence: string[]) {
  const lowerQuestion = question.toLowerCase();
  const matchingEvidence =
    lowerQuestion.includes("terminate")
      ? evidence.find((line) => /\bterminate|termination\b/i.test(line))
      : lowerQuestion.includes("notice")
        ? evidence.find((line) => /\bnotice\b/i.test(line))
        : lowerQuestion.includes("retain") || lowerQuestion.includes("retention")
          ? evidence.find((line) => /\bretain|retention|delete\b/i.test(line))
          : lowerQuestion.includes("renew")
            ? evidence.find((line) => /\brenew|renewal\b/i.test(line))
            : lowerQuestion.includes("own")
              ? evidence.find((line) => /\bown|ownership|customer data\b/i.test(line))
              : null;
  if (!matchingEvidence) {
    return {
      question,
      answer: "insufficient evidence from the visible source text.",
    };
  }

  let answer = matchingEvidence;
  if (lowerQuestion.includes("terminate") && /\beither party\b/i.test(matchingEvidence)) {
    answer = `Yes. ${matchingEvidence}`;
  } else if (lowerQuestion.includes("notice")) {
    const noticeMatch = matchingEvidence.match(/\b\d+\s+days?\b/i);
    answer = noticeMatch ? `${noticeMatch[0]} notice is stated. ${matchingEvidence}` : matchingEvidence;
  } else if (lowerQuestion.includes("renew")) {
    answer = /\bautomatic|automatically\b/i.test(matchingEvidence)
      ? `Yes. ${matchingEvidence}`
      : `The visible text references renewal but does not clearly confirm automatic renewal. ${matchingEvidence}`;
  } else if (lowerQuestion.includes("own")) {
    answer = /\bown|ownership\b/i.test(matchingEvidence)
      ? matchingEvidence
      : `The visible text references customer data but does not clearly confirm ownership. ${matchingEvidence}`;
  }

  return { question, answer };
}

function analyzeBriefSignals(task: TaskDetailView) {
  const lines = collectSourceSentences(task);
  const strongSignals: string[] = [];
  const weakSignals: string[] = [];
  const risks: string[] = [];
  const conflicts: string[] = [];

  for (const line of lines) {
    if (/\b(missing|delay|risk|issue|bug|blocked|complaint|uncertain|pending|frozen)\b/i.test(line)) {
      risks.push(line);
      continue;
    }
    if (/\b(improved|grew|increased|reduced|fixed|exceeded|reached|declined)\b/i.test(line) || /\b\d+(?:\.\d+)?%|\$\d|\bn=\d+\b/i.test(line)) {
      strongSignals.push(line);
      continue;
    }
    if (/\bbut\b|\bhowever\b|\bwhile\b/i.test(line)) {
      conflicts.push(line);
      continue;
    }
    weakSignals.push(line);
  }

  return {
    strongSignals: strongSignals.slice(0, 4),
    weakSignals: weakSignals.slice(0, 4),
    risks: risks.slice(0, 4),
    conflicts: conflicts.slice(0, 3),
  };
}

function analyzeResearchSignals(task: TaskDetailView) {
  const lines = collectEvidenceLines(task);
  const strongSignals: string[] = [];
  const weakSignals: string[] = [];

  for (const line of lines) {
    if (/\b(no data|no details|no info|limited|unclear|unknown|thin|needs more)\b/i.test(line)) {
      weakSignals.push(line);
      continue;
    }
    if (/\bno quantified\b|\bno .*roi\b|\bno .*data\b|\bnot available\b/i.test(line)) {
      weakSignals.push(line);
      continue;
    }
    if (/\b\d+(?:\.\d+)?%|\b\d+\/\d+\b|\b(acv|nps|deals?|tickets?|conversion|churn|latency|complaints?)\b/i.test(line)) {
      strongSignals.push(line);
      continue;
    }
    if (/\b(goal|task|need)\b/i.test(line)) {
      weakSignals.push(line);
      continue;
    }
    strongSignals.push(line);
  }

  const implications =
    strongSignals.length > 0
      ? ["The strongest action should follow the best-supported customer or performance signal, not the noisiest anecdote."]
      : ["The visible material frames the question, but it does not yet justify a decisive strategic move."];
  const recommendations =
    strongSignals.length > 0
      ? ["Validate the strongest signal with one more source before changing roadmap, pricing, or GTM posture."]
      : ["Run a targeted discovery pass before making a directional recommendation."];

  return {
    strongSignals: strongSignals.slice(0, 4),
    weakSignals: weakSignals.slice(0, 4),
    implications,
    recommendations,
  };
}

function inferTranslationPayload(task: TaskDetailView) {
  const corpus = buildTaskSourceCorpus(task);
  const evidenceLines = buildTaskEvidenceCorpus(task)
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  const explicitContentLine = evidenceLines.find((line) => /^content\s*:/i.test(line));
  const targetMatch =
    corpus.match(/\btarget language\s*[:=-]?\s*([A-Za-z-]+)/i) ??
    corpus.match(/\btranslate\s+to\s+([A-Za-z-]+)/i) ??
    corpus.match(/\binto\s+([A-Za-z-]+)/i) ??
    corpus.match(/\blocali[sz]e\s+to\s+([A-Za-z-]+)/i);
  const quoted = [...corpus.matchAll(/"([^"]{3,200})"/g)].map((match) => match[1].trim());
  const visibleSource =
    explicitContentLine?.replace(/^content\s*:\s*/i, "").trim() ??
    quoted[0] ??
    evidenceLines.find(
      (line) =>
        line.length > 12 &&
        !looksLikeStructuralHeader(line) &&
        !/^target language\s*:/i.test(line) &&
        !/^source copy\s*:/i.test(line) &&
        !/^translate everything/i.test(line) &&
        !/\btranslate\b/i.test(line),
    ) ??
    null;
  return {
    targetLanguage: targetMatch?.[1] ?? null,
    sourceText: visibleSource,
  };
}

function buildLocalizationPlaceholder(
  payload: { targetLanguage: string | null; sourceText: string | null },
  localeSuffix: string | null = null,
) {
  const language = localeSuffix ? `${payload.targetLanguage || "target language"} (${localeSuffix})` : payload.targetLanguage || "target language";
  const source = payload.sourceText || "source text required";
  return `[${language}] ${source}`;
}

function collectOperationalSteps(task: TaskDetailView) {
  const lines = buildTaskEvidenceCorpus(task)
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  const steps = lines.flatMap((line) => {
    if (/^steps?\s*:/i.test(line)) {
      return line
        .replace(/^steps?\s*:/i, "")
        .split(/[;,]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (/^[-*\d]/.test(line) || /\b(step|then|after|before|handoff|owner|approve|review)\b/i.test(line)) {
      return [line.replace(/^[-*\d.\s]+/, "").trim()];
    }
    return [];
  });
  return steps.slice(0, 6);
}

function analyzeCopyTask(task: TaskDetailView) {
  const corpus = buildTaskSourceCorpus(task).toLowerCase();
  const isHero = /\bhero\b/.test(corpus);
  const isEmail = /\bemail\b/.test(corpus);
  const isCta = /\bcta\b|call to action/.test(corpus);

  if (isEmail) {
    return {
      angle: "Lead with one immediate user outcome and one clear next step.",
      draft: [
        "Subject: Keep the promise concrete and benefit-led.",
        "Body: Explain the value in plain language before asking for action.",
        "CTA: Use one direct ask with no competing links.",
      ],
      variants: [
        "Variant A: Outcome-led for new readers.",
        "Variant B: Proof-led when a visible customer signal exists.",
        "Variant C: Reminder-led if this is a follow-up touch.",
      ],
    };
  }
  if (isCta) {
    return {
      angle: "Optimize for action clarity over cleverness.",
      draft: [
        "Primary CTA: Use a short verb-led action.",
        "Support line: Reinforce the outcome, not the feature list.",
        "Keep the action specific to one next step.",
      ],
      variants: [
        "Variant A: Start-oriented.",
        "Variant B: Demo-oriented.",
        "Variant C: Learn-more only if buying intent is still low.",
      ],
    };
  }
  return {
    angle: isHero
      ? `Lead with the clearest user outcome around ${extractPrimaryNoun(buildTaskSourceCorpus(task))} in headline form.`
      : `Lead with the clearest user outcome around ${extractPrimaryNoun(buildTaskSourceCorpus(task))}.`,
    draft: isHero
      ? [
          "Headline: State the outcome in one line with no hype.",
          "Subtext: Add one concrete support line grounded in the visible brief.",
          "CTA: Use one clear primary action and one optional secondary action.",
        ]
      : [
          "Opening: State the main benefit first.",
          "Support: Keep the value proposition specific, low-friction, and easy to scan.",
          "CTA: Use one direct action, not multiple competing asks.",
        ],
    variants: [
      "Variant A: Outcome-led and concise.",
      "Variant B: Proof-led if stronger product evidence is supplied.",
      "Variant C: Audience-led once segmentation is clearer.",
    ],
  };
}

function analyzeLocalizationTask(
  task: TaskDetailView,
  payload: { targetLanguage: string | null; sourceText: string | null },
) {
  const corpus = buildTaskSourceCorpus(task);
  const glossaryTerms = [...new Set((payload.sourceText ?? "")
    .split(/\s+/)
    .map((value) => value.replace(/[^A-Za-z0-9_-]/g, ""))
    .filter((value) => value.length > 1)
    .filter((value) => /[A-Z]/.test(value) || /API|SSO|RBAC|OpsPilot/i.test(value)))].slice(0, 4);
  const localeSuffix =
    payload.targetLanguage?.includes("-")
      ? payload.targetLanguage.split("-")[1]?.toUpperCase() ?? null
      : null;
  return {
    glossaryTerms,
    localeSuffix,
    targetLabel: payload.targetLanguage || "not clearly specified",
    corpus,
  };
}

function analyzeOpsWorkflow(task: TaskDetailView, orderedSteps: string[]) {
  const corpus = buildTaskSourceCorpus(task);
  const explicitOwner = corpus.match(/\bowner\s*[:=-]\s*([^\n]+)/i)?.[1]?.trim();
  const explicitReviewer = corpus.match(/\breviewer\s*[:=-]\s*([^\n]+)/i)?.[1]?.trim();
  const owners = [
    explicitOwner ? `Primary owner: ${explicitOwner}.` : "Assign one primary owner before execution starts.",
    explicitReviewer ? `Reviewer or approver: ${explicitReviewer}.` : "Assign one reviewer or approver for the final handoff.",
  ];
  const handoffs =
    orderedSteps.some((step) => /\bhandoff|hand off|support|marketing|sales|review\b/i.test(step))
      ? [
          "Make each team handoff explicit with a named owner and completion signal.",
          "Do not move to the next team until the prior step is confirmed complete.",
        ]
      : ["No explicit handoff step was visible, so add one if this workflow crosses teams."];
  const escalations = [];
  if (/\b\d+\s*(?:min|mins|minutes|hour|hours)\b/i.test(corpus) || /\bescalat/i.test(corpus)) {
    escalations.push("Use the time thresholds already referenced in the task as escalation triggers.");
  } else {
    escalations.push("Add time-based escalation triggers if this workflow is time-sensitive.");
  }
  const risks = collectEvidenceLines(task)
    .filter((line) => /\brisk|block|delay|lock|sla|unknown|constraint|dependency\b/i.test(line))
    .slice(0, 3);
  return {
    owners,
    handoffs,
    escalations,
    risks,
  };
}

function analyzeCampaignTask(task: TaskDetailView) {
  const corpus = buildTaskSourceCorpus(task);
  const audience = inferAudience(task.description);
  const sourceLines = collectEvidenceLines(task);
  const channels = [...new Set([...corpus.matchAll(/\b(email|in-app|blog|linkedin|ads?|webinar|sales outreach)\b/gi)].map((match) => match[1].toLowerCase()))];
  const hasTiming = /\b(pre-launch|launch|post-launch|week|day \d|timeline|sequencing|rollout)\b/i.test(corpus);
  return {
    audience: [
      `Primary working audience: ${audience}.`,
      "Refine segmentation further before launching if multiple buyer types are involved.",
    ],
    message: [
      `Core message should stay focused on ${extractPrimaryNoun(corpus)}.`,
      sourceLines[0] ? `Visible support point: ${sourceLines[0]}` : "No concrete proof point was provided, so keep messaging conservative.",
    ],
    channels:
      channels.length > 0
        ? channels.slice(0, 4).map((channel) => `Use ${channel} only after the core message and proof are aligned.`)
        : ["Select channels only after audience and proof are clear."],
    plan: hasTiming
      ? [
          "Pre-launch: align audience, proof, and asset owners.",
          "Launch: ship the highest-confidence channel assets first.",
          "Post-launch: review response data and adjust the next wave.",
        ]
      : [
          "Stage 1: Align on one audience and one proof-backed message.",
          "Stage 2: Prepare channel-specific assets once proof and offer language are confirmed.",
          "Stage 3: Review results and adjust the next wave based on actual performance.",
        ],
  };
}

function mentionsOwnerOrTeam(task: TaskDetailView) {
  return /\b(owner|team|ops|reviewer|manager|lead|support|sales|marketing)\b/i.test(buildTaskSourceCorpus(task));
}

function looksLikeInstructionLine(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.endsWith("?")) return true;
  if (/^(task|question|target language|source copy)\s*:/.test(normalized)) return true;
  if (/^only info\s*:/.test(normalized)) return true;
  if (/^no (data|details|info|information|metrics|proof)\b/.test(normalized)) return true;
  if (/^user\b.*\b(confirm|check|review|determine|trying to|asks? for)\b/.test(normalized)) return true;
  if (/^(do not|don't)\b/.test(normalized)) return true;
  return /^(tell|check|review|summarize|extract|translate|write|prepare|build|find|whether|need|create|plan|must|keep|stay|resolve|use|avoid|ensure|include|handle|focus|highlight|mark|request|refuse|determine|identify|clarify)\b/.test(normalized);
}

function looksLikeStructuralHeader(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (/^attachment\b/.test(normalized)) return true;
  return normalized.endsWith(":") && normalized.split(/\s+/).length <= 6;
}

function buildTaskSourceCorpus(task: TaskDetailView) {
  const attachmentTexts = task.attachments
    .flatMap((item) =>
      item.textContent?.trim()
        ? [`Attachment ${item.title}:`, item.textContent.trim()]
        : [],
    );
  return [task.title, task.description, task.structuredNotes ?? "", ...attachmentTexts]
    .filter(Boolean)
    .join("\n");
}

function buildTaskEvidenceCorpus(task: TaskDetailView) {
  const attachmentTexts = task.attachments
    .flatMap((item) =>
      item.textContent?.trim() ? [item.textContent.trim()] : [],
    );
  return [task.description, task.structuredNotes ?? "", ...attachmentTexts]
    .filter(Boolean)
    .join("\n");
}

function extractPrimaryNoun(text: string) {
  const candidate = text
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((value) => value.trim().toLowerCase())
    .find((value) => value.length >= 5 && !stopWords.has(value));
  return candidate ?? "the requested deliverable";
}

function estimateLatency(definition: BuiltInPlatformAgentDefinition, task: TaskDetailView) {
  const baseline = Math.round((definition.expectedLatencyMsRange.minMs + definition.expectedLatencyMsRange.maxMs) / 2);
  const attachmentPenalty = task.attachments.length * 450;
  const notePenalty = Math.min((task.structuredNotes ?? "").length * 4, 2200);
  return baseline + attachmentPenalty + notePenalty;
}

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const stopWords = new Set([
  "about",
  "after",
  "against",
  "agent",
  "build",
  "buyer",
  "deliverable",
  "their",
  "there",
  "these",
  "those",
  "write",
  "which",
  "would",
  "could",
  "should",
  "using",
  "under",
  "into",
  "with",
  "from",
  "have",
  "needs",
  "task",
  "output",
  "result",
]);

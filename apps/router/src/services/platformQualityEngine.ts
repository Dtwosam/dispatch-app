import type { TaskDetailView } from "@marketplace/shared";
import type { BuiltInPlatformAgentDefinition } from "./platformAgentCatalog";
import {
  PLATFORM_AGENT_PROMPT_VERSIONS,
  buildEvaluationPrompt,
  buildGenerationPrompt,
  buildImprovementPrompt,
  buildPlatformTaskContext,
  buildPolishPrompt,
  buildTaskStructuringPrompt,
} from "./platformAgentPromptLayer";
import {
  addTwoStepCriteriaToEvaluation,
  buildTwoStepEvaluationImprovementPrompt,
  buildTwoStepGenerationPrompt,
  enforceTwoStepOutputShape,
  getTwoStepAgentSpec,
  type TwoStepAgentSpec,
} from "./platformAgentTwoStepPrompts";
import type {
  PlatformAgentStageTrace,
  PlatformDraftArtifact,
  PlatformQualityEvaluation,
  PlatformRefinementContext,
  PlatformQualityMode,
  PlatformRunSummary,
  PlatformStructuredTask,
} from "./platformQualityTypes";

type EngineInput = {
  definition: BuiltInPlatformAgentDefinition;
  task: TaskDetailView;
  refinementContext?: PlatformRefinementContext | null;
  generateHeuristicDraft: () => {
    payload: PlatformDraftArtifact & { executionSource: "heuristic" | "llm" };
    latencyMs: number;
  };
  generateModelDraft?: (structuredTask: PlatformStructuredTask, mode: PlatformQualityMode) => Promise<PlatformDraftArtifact>;
};

type EngineOutput = {
  mode: PlatformQualityMode;
  executionSource: "heuristic" | "llm";
  structuredTask: PlatformStructuredTask;
  draftOutput: PlatformDraftArtifact;
  evaluation: PlatformQualityEvaluation | null;
  improvedOutput: PlatformDraftArtifact | null;
  polishedOutput: PlatformDraftArtifact | null;
  finalOutput: PlatformDraftArtifact;
  qualityScore: number;
  confidence: "low" | "medium" | "high";
  stageTimingsMs: PlatformAgentStageTrace["stageTimingsMs"];
  promptVersions: PlatformAgentStageTrace["promptVersions"];
  trace: PlatformAgentStageTrace;
  latencyMs: number;
};

export class PlatformQualityEngine {
  async execute(input: EngineInput): Promise<EngineOutput> {
    const refinementContext = input.refinementContext ?? null;
    const twoStepSpec = getTwoStepAgentSpec(input.definition);
    const mode: PlatformQualityMode = twoStepSpec ? "balanced" : resolveQualityMode(input.task, refinementContext);
    const structuredTaskStart = Date.now();
    const structuredTask = structureTask(input.definition, input.task, mode, refinementContext);
    void buildTaskStructuringPrompt(input.definition, mode, refinementContext);
    const structuringMs = Date.now() - structuredTaskStart;

    if (twoStepSpec) {
      return executeTwoStepPipeline(input, twoStepSpec, structuredTask, structuringMs, refinementContext, mode);
    }

    const generationStart = Date.now();
    const heuristicDraft = input.generateHeuristicDraft();
    let draftOutput = sanitizeArtifact(heuristicDraft.payload);
    let executionSource: "heuristic" | "llm" = heuristicDraft.payload.executionSource ?? "heuristic";
    if (mode !== "fast" && input.generateModelDraft) {
      try {
        draftOutput = sanitizeArtifact(await input.generateModelDraft(structuredTask, mode), draftOutput);
        executionSource = "llm";
      } catch {
        executionSource = "heuristic";
      }
    }
    void buildGenerationPrompt(input.definition, structuredTask, mode, refinementContext);
    const generationMs = Date.now() - generationStart;

    const evaluationStart = Date.now();
    const evaluation = mode === "fast" ? null : evaluateDraft(structuredTask, draftOutput);
    void buildEvaluationPrompt(input.definition, structuredTask);
    const evaluationMs = mode === "fast" ? 0 : Date.now() - evaluationStart;

    const improvementStart = Date.now();
    const improvedOutput = mode === "fast" ? null : improveDraft(input.definition, structuredTask, draftOutput, evaluation);
    if (evaluation) {
      void buildImprovementPrompt(input.definition, structuredTask, evaluation);
    }
    const improvementMs = mode === "fast" ? 0 : Date.now() - improvementStart;

    const polishStart = Date.now();
    const polishedOutput = mode === "high_quality" && improvedOutput
      ? polishDraft(input.definition, structuredTask, improvedOutput)
      : null;
    const finalOutput = polishedOutput ?? improvedOutput ?? draftOutput;
    if (mode === "high_quality") {
      void buildPolishPrompt(input.definition, structuredTask, finalOutput);
    }
    const polishMs = mode === "high_quality" ? Date.now() - polishStart : 0;

    const finalEvaluation = mode === "fast" ? null : evaluateDraft(structuredTask, finalOutput);
    const qualityScore = finalEvaluation?.overall ?? scoreFromDraft(finalOutput);
    const confidence = finalEvaluation?.confidence ?? finalOutput.confidence;
    const stageTimingsMs = {
      structuring: structuringMs,
      generation: generationMs,
      evaluation: evaluationMs,
      improvement: improvementMs,
      polish: polishMs,
      total: structuringMs + generationMs + evaluationMs + improvementMs + polishMs,
    };
    const runSummary = buildRunSummary(input.definition, input.task, structuredTask, finalEvaluation ?? evaluation, confidence);

    const trace: PlatformAgentStageTrace = {
      mode,
      promptVersions: PLATFORM_AGENT_PROMPT_VERSIONS,
      rawTaskInput: buildPlatformTaskContext(input.task, refinementContext),
      structuredTask,
      draftOutput,
      evaluation: finalEvaluation ?? evaluation,
      improvedOutput,
      polishedOutput,
      finalOutput,
      runSummary,
      stageTimingsMs,
      score: qualityScore,
      confidence,
      executionSource,
      refinement: refinementContext,
      reviewOutcome: null,
      settlementOutcome: null,
    };

    return {
      mode,
      executionSource,
      structuredTask,
      draftOutput,
      evaluation: finalEvaluation ?? evaluation,
      improvedOutput,
      polishedOutput,
      finalOutput,
      qualityScore,
      confidence,
      stageTimingsMs,
      promptVersions: PLATFORM_AGENT_PROMPT_VERSIONS,
      trace,
      latencyMs: Math.max(heuristicDraft.latencyMs, stageTimingsMs.total || heuristicDraft.latencyMs),
    };
  }
}

async function executeTwoStepPipeline(
  input: EngineInput,
  spec: TwoStepAgentSpec,
  structuredTask: PlatformStructuredTask,
  structuringMs: number,
  refinementContext: PlatformRefinementContext | null,
  mode: PlatformQualityMode,
): Promise<EngineOutput> {
  const generationStart = Date.now();
  const heuristicDraft = input.generateHeuristicDraft();
  let draftOutput = enforceTwoStepOutputShape(spec, sanitizeArtifact(heuristicDraft.payload));
  let executionSource: "heuristic" | "llm" = heuristicDraft.payload.executionSource ?? "heuristic";
  if (input.generateModelDraft) {
    try {
      draftOutput = enforceTwoStepOutputShape(
        spec,
        sanitizeArtifact(await input.generateModelDraft(structuredTask, mode), draftOutput),
      );
      executionSource = "llm";
    } catch {
      executionSource = "heuristic";
    }
  }
  void buildTwoStepGenerationPrompt(input.definition, structuredTask, refinementContext);
  const generationMs = Date.now() - generationStart;

  const improvementStart = Date.now();
  const baseEvaluation = evaluateDraft(structuredTask, draftOutput);
  const evaluation = addTwoStepCriteriaToEvaluation(spec, draftOutput, baseEvaluation);
  const improvedOutput = enforceTwoStepOutputShape(
    spec,
    improveDraft(input.definition, structuredTask, draftOutput, evaluation),
  );
  void buildTwoStepEvaluationImprovementPrompt(input.definition, structuredTask, evaluation);
  const improvementMs = Date.now() - improvementStart;

  const finalEvaluation = addTwoStepCriteriaToEvaluation(spec, improvedOutput, evaluateDraft(structuredTask, improvedOutput));
  const qualityScore = finalEvaluation.overall;
  const confidence = finalEvaluation.confidence;
  const stageTimingsMs = {
    structuring: structuringMs,
    generation: generationMs,
    evaluation: 0,
    improvement: improvementMs,
    polish: 0,
    total: structuringMs + generationMs + improvementMs,
  };
  const runSummary = buildRunSummary(input.definition, input.task, structuredTask, finalEvaluation, confidence);

  const trace: PlatformAgentStageTrace = {
    mode,
    promptVersions: PLATFORM_AGENT_PROMPT_VERSIONS,
    rawTaskInput: buildPlatformTaskContext(input.task, refinementContext),
    structuredTask,
    draftOutput,
    evaluation: finalEvaluation,
    improvedOutput,
    polishedOutput: null,
    finalOutput: improvedOutput,
    runSummary,
    stageTimingsMs,
    score: qualityScore,
    confidence,
    executionSource,
    refinement: refinementContext,
    reviewOutcome: null,
    settlementOutcome: null,
  };

  return {
    mode,
    executionSource,
    structuredTask,
    draftOutput,
    evaluation: finalEvaluation,
    improvedOutput,
    polishedOutput: null,
    finalOutput: improvedOutput,
    qualityScore,
    confidence,
    stageTimingsMs,
    promptVersions: PLATFORM_AGENT_PROMPT_VERSIONS,
    trace,
    latencyMs: Math.max(heuristicDraft.latencyMs, stageTimingsMs.total || heuristicDraft.latencyMs),
  };
}

export function resolveQualityMode(task: TaskDetailView, refinementContext: PlatformRefinementContext | null = null): PlatformQualityMode {
  const notes = `${task.structuredNotes ?? ""}\n${task.description}`.toLowerCase();
  let mode: PlatformQualityMode;
  if (/\bquality(?:\s+level)?\s*:\s*fast\b/.test(notes) || /\bmode\s*:\s*fast\b/.test(notes)) mode = "fast";
  else if (/\bquality(?:\s+level)?\s*:\s*high\b/.test(notes) || /\bhigh[_ -]?quality\b/.test(notes)) mode = "high_quality";
  else if (task.rewardAmount >= 180 || task.evaluationPreference === "hybrid_review" || task.attachments.length >= 2) {
    mode = "high_quality";
  } else if (task.rewardAmount >= 90 || task.evaluationPreference === "assisted_evaluation") {
    mode = "balanced";
  } else {
    mode = "fast";
  }

  if (!refinementContext) return mode;
  if (mode === "fast") return "balanced";
  return "high_quality";
}

function structureTask(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  mode: PlatformQualityMode,
  refinementContext: PlatformRefinementContext | null = null,
): PlatformStructuredTask {
  const constraints = inferConstraints(task, refinementContext);
  const outputSections = Array.isArray(definition.outputSchema.sections)
    ? definition.outputSchema.sections.join(", ")
    : labelize(definition.category);
  return {
    task: task.title,
    goal: firstSentence(task.description) || task.description.trim() || task.title,
    outputFormat: `Deliver a buyer-reviewable ${labelize(definition.category).toLowerCase()} result using sections such as ${outputSections}.`,
    constraints,
    qualityLevel: mode,
  };
}

function inferConstraints(task: TaskDetailView, refinementContext: PlatformRefinementContext | null = null) {
  const lines = `${task.structuredNotes ?? ""}\n${task.description}`
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const constraints = lines
    .filter((line) => /^(must|avoid|keep|return|include|format|constraint|note)/i.test(line) || /under|without|only/i.test(line))
    .slice(0, 6);
  const baseConstraints = constraints.length > 0
    ? dedupeList(constraints)
    : [
    "Keep the deliverable concise enough for a marketplace buyer to review quickly.",
    "Do not invent facts that are not grounded in the task description, notes, or attachments.",
  ];
  if (!refinementContext || refinementContext.feedbackSummary.length === 0) {
    return baseConstraints;
  }
  return dedupeList([
    ...baseConstraints,
    `Improve Again request: address prior gaps around ${refinementContext.feedbackSummary.join("; ")}.`,
    "Preserve grounded meaning while tightening clarity, completeness, and buyer reviewability.",
  ]).slice(0, 8);
}

function evaluateDraft(structuredTask: PlatformStructuredTask, artifact: PlatformDraftArtifact): PlatformQualityEvaluation {
  const summaryLength = artifact.summary.trim().length;
  const bulletCount = artifact.sections.reduce((sum, section) => sum + section.bullets.length, 0);
  const hasNextActions = artifact.nextActions.length > 0;
  const hasFormat = artifact.sections.length >= 2 && bulletCount >= 4;
  const constraintCoverage = structuredTask.constraints.length === 0
    ? 1
    : structuredTask.constraints.filter((item) => includesLoose(artifact, item)).length / structuredTask.constraints.length;
  const relevance = clamp(55 + overlapScore(`${structuredTask.task} ${structuredTask.goal}`, flattenArtifact(artifact)) * 45, 0, 100);
  const clarity = clamp(55 + (summaryLength >= 60 && summaryLength <= 240 ? 20 : 8) + (duplicateBulletPenalty(artifact) ? -12 : 12), 0, 100);
  const completeness = clamp(40 + artifact.sections.length * 12 + (hasNextActions ? 15 : 0) + constraintCoverage * 20, 0, 100);
  const formatAdherence = clamp(45 + (hasFormat ? 28 : 8) + (artifact.sections.every((section) => section.heading && section.bullets.length > 0) ? 12 : 0), 0, 100);
  const usefulness = clamp(50 + (hasNextActions ? 18 : 0) + (artifact.uncertainties.length <= 2 ? 10 : -8) + (containsSpecifics(artifact) ? 12 : 0), 0, 100);
  const overall = round((relevance * 0.24) + (clarity * 0.18) + (completeness * 0.22) + (formatAdherence * 0.16) + (usefulness * 0.20));
  const strengths = [
    relevance >= 80 ? "The draft stays close to the buyer's stated goal." : null,
    clarity >= 80 ? "The writing is easy to scan and approve." : null,
    usefulness >= 80 ? "The output includes practical next actions." : null,
  ].filter(Boolean) as string[];
  const gaps = [
    completeness < 75 ? "The draft could cover the requested shape or constraints more completely." : null,
    formatAdherence < 75 ? "The result structure could be more marketplace-reviewable." : null,
    usefulness < 75 ? "The draft needs stronger buyer-ready actionability." : null,
  ].filter(Boolean) as string[];
  return {
    relevance,
    clarity,
    completeness,
    formatAdherence,
    usefulness,
    overall,
    confidence: artifact.confidence === "high" && artifact.uncertainties.length > 0 ? "medium" : artifact.confidence,
    strengths,
    gaps,
    notes: [
      strengths[0] ? `Strength: ${strengths[0]}` : "Strength: the draft provides a usable first pass.",
      gaps[0] ? `Gap: ${gaps[0]}` : "Gap: no major format or usefulness issue detected.",
    ],
  };
}

function improveDraft(
  definition: BuiltInPlatformAgentDefinition,
  structuredTask: PlatformStructuredTask,
  artifact: PlatformDraftArtifact,
  evaluation: PlatformQualityEvaluation | null,
): PlatformDraftArtifact {
  const improvedSections = artifact.sections.map((section) => ({
    heading: titleCase(section.heading),
    bullets: dedupeList(section.bullets.map((bullet) => tightenSentence(bullet))).slice(0, 5),
  }));

  if ((evaluation?.completeness ?? 100) < 78 && structuredTask.constraints.length > 0) {
    improvedSections.push({
      heading: "Constraints",
      bullets: dedupeList(structuredTask.constraints).slice(0, 4),
    });
  }

  const nextActions = artifact.nextActions.length > 0
    ? dedupeList(artifact.nextActions.map((item) => tightenSentence(item))).slice(0, 4)
    : [
        `Review the result against "${structuredTask.task}".`,
        "Approve if the deliverable is usable without follow-up clarification.",
      ];

  const summaryPrefix = includesLoose(artifact, structuredTask.goal)
    ? ""
    : `${tightenSentence(structuredTask.goal)} `;

  return sanitizeArtifact({
    summary: tightenSentence(`${summaryPrefix}${artifact.summary}`.trim()),
    sections: improvedSections,
    nextActions,
    uncertainties: dedupeList(artifact.uncertainties).slice(0, 4),
    confidence: artifact.confidence === "low" && (evaluation?.overall ?? 0) >= 85 && artifact.uncertainties.length === 0
      ? "medium"
      : artifact.confidence,
  }, artifact);
}

function polishDraft(
  definition: BuiltInPlatformAgentDefinition,
  structuredTask: PlatformStructuredTask,
  artifact: PlatformDraftArtifact,
): PlatformDraftArtifact {
  void definition;
  void structuredTask;
  return sanitizeArtifact({
    summary: tightenSentence(artifact.summary),
    sections: artifact.sections.map((section) => ({
      heading: titleCase(section.heading),
      bullets: dedupeList(section.bullets.map((bullet) => tightenSentence(bullet))).slice(0, 8),
    })),
    nextActions: dedupeList(artifact.nextActions.map((item) => tightenSentence(item))).slice(0, 3),
    uncertainties: dedupeList(artifact.uncertainties.map((item) => tightenSentence(item))).slice(0, 3),
    confidence: artifact.confidence,
  }, artifact);
}

function buildRunSummary(
  definition: BuiltInPlatformAgentDefinition,
  task: TaskDetailView,
  structuredTask: PlatformStructuredTask,
  evaluation: PlatformQualityEvaluation | null,
  confidence: "low" | "medium" | "high",
): PlatformRunSummary {
  const evidenceStrength = task.attachments.length >= 2
    ? "high"
    : task.attachments.length === 1 || task.structuredNotes
      ? "medium"
      : "low";
  return {
    taskIntent: structuredTask.goal,
    requestedOutputFormat: structuredTask.outputFormat,
    skillsUsed: definition.skills,
    skillCategories: definition.skillCategories,
    evaluationFocus: ["relevance", "clarity", "completeness", "format_adherence", "usefulness"],
    confidenceBand: evaluation?.confidence ?? confidence,
    evidenceStrength,
    benchmarkSuites: definition.benchmarkSuites,
  };
}

function sanitizeArtifact(candidate: PlatformDraftArtifact, fallback?: PlatformDraftArtifact): PlatformDraftArtifact {
  const cleanSections = Array.isArray(candidate.sections)
    ? candidate.sections
        .map((section) => ({
          heading: typeof section?.heading === "string" && section.heading.trim() ? titleCase(section.heading.trim()) : "Section",
          bullets: Array.isArray(section?.bullets)
            ? dedupeList(section.bullets.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => tightenSentence(item))).slice(0, 8)
            : [],
        }))
        .filter((section) => section.bullets.length > 0)
        .slice(0, 5)
    : [];
  return {
    summary: tightenSentence(candidate.summary || fallback?.summary || "Platform agent completed the task."),
    sections: cleanSections.length > 0 ? cleanSections : fallback?.sections || [{ heading: "Result", bullets: ["No structured sections were produced."] }],
    nextActions: dedupeList(candidate.nextActions || fallback?.nextActions || []).slice(0, 4),
    uncertainties: dedupeList(candidate.uncertainties || []).slice(0, 4),
    confidence: candidate.confidence === "high" || candidate.confidence === "medium" || candidate.confidence === "low"
      ? candidate.confidence
      : fallback?.confidence || "low",
  };
}

function flattenArtifact(artifact: PlatformDraftArtifact) {
  return [
    artifact.summary,
    ...artifact.sections.flatMap((section) => [section.heading, ...section.bullets]),
    ...artifact.nextActions,
    ...artifact.uncertainties,
  ].join(" ");
}

function includesLoose(artifact: PlatformDraftArtifact, needle: string) {
  const text = flattenArtifact(artifact).toLowerCase();
  const target = needle.toLowerCase();
  return target.split(/\s+/).filter((part) => part.length > 4).some((part) => text.includes(part));
}

function overlapScore(left: string, right: string) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let matches = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) matches += 1;
  });
  return matches / leftTokens.size;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4);
}

function containsSpecifics(artifact: PlatformDraftArtifact) {
  return /\d/.test(flattenArtifact(artifact)) || /(owner|timeline|risk|due|days|percent|api|contract|invoice)/i.test(flattenArtifact(artifact));
}

function duplicateBulletPenalty(artifact: PlatformDraftArtifact) {
  const bullets = artifact.sections.flatMap((section) => section.bullets.map((bullet) => bullet.toLowerCase()));
  return new Set(bullets).size !== bullets.length;
}

function scoreFromDraft(artifact: PlatformDraftArtifact) {
  return clamp(55 + artifact.sections.length * 8 + artifact.nextActions.length * 4 - artifact.uncertainties.length * 4, 0, 100);
}

function dedupeList(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function firstSentence(value: string) {
  return value
    .split(/[.!?]+/)
    .map((item) => item.trim())
    .find(Boolean) ?? "";
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part)
    .join(" ");
}

function tightenSentence(value: string) {
  return value.replace(/\s+/g, " ").trim().replace(/\s+([,.;!?])/g, "$1");
}

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

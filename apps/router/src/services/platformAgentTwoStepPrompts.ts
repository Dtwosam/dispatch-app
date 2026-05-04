import type { BuiltInPlatformAgentDefinition } from "./platformAgentCatalog";
import type { PlatformDraftArtifact, PlatformQualityEvaluation, PlatformRefinementContext, PlatformStructuredTask } from "./platformQualityTypes";

export type TwoStepAgentSpec = {
  readonly specialization: NonNullable<BuiltInPlatformAgentDefinition["specialization"]>;
  readonly requiredHeadings: readonly string[];
  readonly generationRules: readonly string[];
  readonly evaluationCriteria: readonly string[];
  readonly outputTemplate: string;
};

const twoStepAgentSpecs: TwoStepAgentSpec[] = [
  {
    specialization: "thread_writer",
    requiredHeadings: ["Hook", "Thread", "CTA (optional)"],
    generationRules: ["strong hook", "short readable lines", "clear thread flow", "engagement-focused", "no fluff"],
    evaluationCriteria: ["hook strength", "clarity", "thread flow", "readability", "engagement potential"],
    outputTemplate: "Hook:\n<one strong opening line>\n\nThread:\n1/ ...\n2/ ...\n3/ ...\n\nCTA (optional):\n...",
  },
  {
    specialization: "summarizer",
    requiredHeadings: ["Summary", "Key Points", "Actionable (if applicable)"],
    generationRules: ["brief", "clear", "useful", "remove noise"],
    evaluationCriteria: ["completeness", "clarity", "brevity", "usefulness"],
    outputTemplate: "Summary:\n...\n\nKey Points:\n- ...\n- ...\n\nActionable (if applicable):\n- ...",
  },
  {
    specialization: "rewriter",
    requiredHeadings: ["Polished Version", "Simplified Version (optional)"],
    generationRules: ["improve clarity", "preserve meaning", "improve flow", "avoid unnecessary additions"],
    evaluationCriteria: ["preserved meaning", "clarity", "tone improvement", "readability"],
    outputTemplate: "Polished Version:\n...\n\nSimplified Version (optional):\n...",
  },
  {
    specialization: "research_brief",
    requiredHeadings: ["Overview", "Key Insights", "Pros", "Risks", "Conclusion"],
    generationRules: ["structured", "balanced", "relevant", "useful"],
    evaluationCriteria: ["structure", "relevance", "balance", "completeness"],
    outputTemplate: "Overview:\n...\n\nKey Insights:\n- ...\n\nPros:\n- ...\n\nRisks:\n- ...\n\nConclusion:\n...",
  },
  {
    specialization: "content_repurposer",
    requiredHeadings: ["Thread", "Summary", "Bullet Points", "Short Post"],
    generationRules: ["transform meaningfully", "produce immediately usable outputs", "avoid lazy paraphrasing"],
    evaluationCriteria: ["usefulness of each format", "consistency across outputs", "transformation quality", "readability"],
    outputTemplate: "Thread:\n1/ ...\n2/ ...\n3/ ...\n\nSummary:\n...\n\nBullet Points:\n- ...\n\nShort Post:\n...",
  },
];

export function getTwoStepAgentSpec(definition: BuiltInPlatformAgentDefinition) {
  return twoStepAgentSpecs.find((spec) => spec.specialization === definition.specialization) ?? null;
}

export function buildTwoStepGenerationPrompt(
  definition: BuiltInPlatformAgentDefinition,
  structuredTask: PlatformStructuredTask,
  refinement: PlatformRefinementContext | null = null,
) {
  const spec = getTwoStepAgentSpec(definition);
  if (!spec) return null;
  return [
    `You are ${definition.publicName}, a focused marketplace worker, not a chatbot.`,
    definition.systemPrompt,
    `Task: ${structuredTask.task}`,
    `Goal: ${structuredTask.goal}`,
    `Required output format:\n${spec.outputTemplate}`,
    `Generation rules: ${spec.generationRules.join("; ")}.`,
    "Complete the task directly. Keep the output structured, predictable, and ready to use.",
    "Avoid generic explanations, theory, and unnecessary preambles.",
    refinement ? `Improve Again context: ${refinement.feedbackSummary.join("; ") || "tighten the result without changing meaning"}.` : "This is the first draft generation step.",
  ].join("\n");
}

export function buildTwoStepEvaluationImprovementPrompt(
  definition: BuiltInPlatformAgentDefinition,
  structuredTask: PlatformStructuredTask,
  evaluation: PlatformQualityEvaluation,
) {
  const spec = getTwoStepAgentSpec(definition);
  if (!spec) return null;
  return [
    `Evaluate and improve the first draft from ${definition.publicName}.`,
    `Task: ${structuredTask.task}`,
    `Goal: ${structuredTask.goal}`,
    `Quality criteria: ${spec.evaluationCriteria.join("; ")}.`,
    `Current score: ${evaluation.overall}.`,
    `Detected gaps: ${evaluation.gaps.join("; ") || "none"}.`,
    `Required output format must remain:\n${spec.outputTemplate}`,
    "Improve weak parts, preserve the required structure, and return only the improved final output.",
    "Do not expose reasoning, critique, or chain-of-thought.",
  ].join("\n");
}

export function enforceTwoStepOutputShape(spec: TwoStepAgentSpec, artifact: PlatformDraftArtifact): PlatformDraftArtifact {
  const sectionsByHeading = new Map(
    artifact.sections.map((section) => [normalizeHeading(section.heading), section] as const),
  );
  const sections = spec.requiredHeadings.map((heading) => {
    const existing = sectionsByHeading.get(normalizeHeading(heading));
    return {
      heading,
      bullets: normalizeBullets(existing?.bullets ?? fallbackBulletsFor(heading, artifact)),
    };
  });

  return {
    ...artifact,
    summary: artifact.summary.trim() || sections[0]?.bullets[0] || "Final structured deliverable.",
    sections,
    nextActions: artifact.nextActions.slice(0, 3),
  };
}

export function addTwoStepCriteriaToEvaluation(
  spec: TwoStepAgentSpec,
  artifact: PlatformDraftArtifact,
  evaluation: PlatformQualityEvaluation,
): PlatformQualityEvaluation {
  const headings = new Set(artifact.sections.map((section) => normalizeHeading(section.heading)));
  const missing = spec.requiredHeadings.filter((heading) => !headings.has(normalizeHeading(heading)));
  const genericParagraphRisk = artifact.sections.some((section) => section.bullets.some((bullet) => bullet.length > 360));
  const gaps = [
    ...evaluation.gaps,
    ...missing.map((heading) => `Missing required ${heading} section.`),
    genericParagraphRisk ? "Some output is too paragraph-like for a focused worker deliverable." : null,
  ].filter(Boolean) as string[];
  const formatPenalty = missing.length * 10 + (genericParagraphRisk ? 8 : 0);
  return {
    ...evaluation,
    formatAdherence: Math.max(0, evaluation.formatAdherence - formatPenalty),
    overall: Math.max(0, evaluation.overall - formatPenalty),
    gaps,
    notes: [
      ...evaluation.notes,
      `Agent-specific criteria checked: ${spec.evaluationCriteria.join(", ")}.`,
    ].slice(0, 4),
  };
}

function fallbackBulletsFor(heading: string, artifact: PlatformDraftArtifact) {
  if (/thread/i.test(heading)) return artifact.sections.flatMap((section) => section.bullets).slice(0, 3);
  if (/summary|overview|polished/i.test(heading)) return [artifact.summary];
  if (/conclusion|cta|short post/i.test(heading)) return artifact.nextActions.slice(0, 1);
  return artifact.sections.flatMap((section) => section.bullets).slice(0, 3);
}

function normalizeHeading(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeBullets(values: string[]) {
  const bullets = values
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 6);
  return bullets.length > 0 ? bullets : ["No usable source detail was provided for this section."];
}

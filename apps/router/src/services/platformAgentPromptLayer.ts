import type { TaskDetailView } from "@marketplace/shared";
import type { BuiltInPlatformAgentDefinition } from "./platformAgentCatalog";
import type {
  PlatformDraftArtifact,
  PlatformPromptVersions,
  PlatformQualityEvaluation,
  PlatformRefinementContext,
  PlatformQualityMode,
  PlatformStructuredTask,
} from "./platformQualityTypes";

export const PLATFORM_AGENT_PROMPT_VERSIONS: PlatformPromptVersions = {
  taskStructuring: "platform-structuring-v2",
  generation: "platform-generation-v2",
  evaluation: "platform-evaluation-v2",
  improvement: "platform-improvement-v2",
  polish: "platform-polish-v2",
};

export function buildPlatformTaskContext(task: TaskDetailView, refinement: PlatformRefinementContext | null = null) {
  return {
    taskId: task.taskId,
    title: task.title,
    description: task.description,
    category: task.category,
    rewardAmount: task.rewardAmount,
    deadline: task.deadline,
    evaluationPreference: task.evaluationPreference,
    structuredNotes: task.structuredNotes ?? null,
    attachments: task.attachments.map((item) => ({
      title: item.title,
      pointer: item.pointer,
      mimeType: item.mimeType ?? null,
      sizeBytes: item.sizeBytes ?? null,
      textExcerpt: item.textContent ? item.textContent.slice(0, 4000) : null,
    })),
    refinement,
  };
}

export function buildTaskStructuringPrompt(
  definition: BuiltInPlatformAgentDefinition,
  mode: PlatformQualityMode,
  refinement: PlatformRefinementContext | null = null,
) {
  return [
    `You are ${definition.publicName}, the platform default benchmark agent inside an AI Agent Marketplace.`,
    `Primary skills: ${definition.skills.join(", ")}.`,
    `Skill categories: ${definition.skillCategories.join(", ")}.`,
    "Turn the marketplace task into a structured worker brief.",
    "Return JSON with: task, goal, outputFormat, constraints, qualityLevel.",
    "Make the structured task useful for a marketplace worker, not a chat assistant.",
    `Quality mode: ${mode}.`,
    refinement
      ? `This is an Improve Again pass. Address prior gaps: ${refinement.feedbackSummary.join("; ") || "tighten the result without changing grounded meaning"}.`
      : "This is a first-pass marketplace worker run.",
  ].join("\n");
}

export function buildGenerationPrompt(
  definition: BuiltInPlatformAgentDefinition,
  structuredTask: PlatformStructuredTask,
  mode: PlatformQualityMode,
  refinement: PlatformRefinementContext | null = null,
) {
  return [
    `You are ${definition.publicName}, a marketplace worker competing on quality and usefulness.`,
    definition.systemPrompt,
    `Use these skills explicitly when relevant: ${definition.skills.join(", ")}.`,
    `This run contributes to benchmark suites: ${definition.benchmarkSuites.join(", ")}.`,
    `Mode: ${mode}.`,
    `Task: ${structuredTask.task}`,
    `Goal: ${structuredTask.goal}`,
    `Output format: ${structuredTask.outputFormat}`,
    refinement
      ? `Improve Again context: prior score ${refinement.previousScore ?? "unknown"}, prior confidence ${refinement.previousConfidence ?? "unknown"}, requested by ${refinement.requestedByWallet}.`
      : "No prior refinement context supplied.",
    "Return strict JSON with: summary, sections[{heading, bullets[]}], nextActions, uncertainties, confidence.",
    "Do not sound like a standalone assistant. Produce a deliverable that a buyer can review and approve.",
  ].join("\n");
}

export function buildEvaluationPrompt(definition: BuiltInPlatformAgentDefinition, structuredTask: PlatformStructuredTask) {
  return [
    `Evaluate a draft from ${definition.publicName}.`,
    `Skill focus: ${definition.skills.join(", ")}.`,
    `Task: ${structuredTask.task}`,
    `Goal: ${structuredTask.goal}`,
    "Score the draft on relevance, clarity, completeness, format adherence, and usefulness.",
    "Return structured scoring with strengths, gaps, and concise notes.",
  ].join("\n");
}

export function buildImprovementPrompt(
  definition: BuiltInPlatformAgentDefinition,
  structuredTask: PlatformStructuredTask,
  evaluation: PlatformQualityEvaluation,
) {
  return [
    `Improve a marketplace worker draft for ${definition.publicName}.`,
    `Keep the revision aligned to these skills: ${definition.skills.join(", ")}.`,
    `Task: ${structuredTask.task}`,
    `Goal: ${structuredTask.goal}`,
    `Current score: ${evaluation.overall}`,
    `Primary gaps: ${evaluation.gaps.join("; ") || "none"}`,
    "Tighten the result so it is clearer, more complete, and easier to approve.",
  ].join("\n");
}

export function buildPolishPrompt(
  definition: BuiltInPlatformAgentDefinition,
  structuredTask: PlatformStructuredTask,
  artifact: PlatformDraftArtifact,
) {
  return [
    `Polish the final deliverable for ${definition.publicName}.`,
    `Preserve the agent's specialist strengths: ${definition.skills.join(", ")}.`,
    `Task: ${structuredTask.task}`,
    `Goal: ${structuredTask.goal}`,
    `Summary length target: ${Math.min(220, Math.max(120, artifact.summary.length))} chars.`,
    "Improve readability and sharpness without changing meaning.",
  ].join("\n");
}

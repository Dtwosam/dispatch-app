export type PlatformQualityMode = "fast" | "balanced" | "high_quality";

export type PlatformRefinementContext = {
  sourceRunId: string;
  requestedByWallet: string;
  previousMode: PlatformQualityMode | null;
  previousScore: number | null;
  previousConfidence: "low" | "medium" | "high" | null;
  feedbackSummary: string[];
};

export type PlatformDraftArtifact = {
  summary: string;
  sections: Array<{ heading: string; bullets: string[] }>;
  nextActions: string[];
  uncertainties: string[];
  confidence: "low" | "medium" | "high";
};

export type PlatformStructuredTask = {
  task: string;
  goal: string;
  outputFormat: string;
  constraints: string[];
  qualityLevel: PlatformQualityMode;
};

export type PlatformQualityEvaluation = {
  relevance: number;
  clarity: number;
  completeness: number;
  formatAdherence: number;
  usefulness: number;
  overall: number;
  confidence: "low" | "medium" | "high";
  strengths: string[];
  gaps: string[];
  notes: string[];
};

export type PlatformPromptVersions = {
  taskStructuring: string;
  generation: string;
  evaluation: string;
  improvement: string;
  polish: string;
};

export type PlatformRunSummary = {
  taskIntent: string;
  requestedOutputFormat: string;
  skillsUsed: string[];
  skillCategories: string[];
  evaluationFocus: Array<"relevance" | "clarity" | "completeness" | "format_adherence" | "usefulness">;
  confidenceBand: "low" | "medium" | "high";
  evidenceStrength: "low" | "medium" | "high";
  benchmarkSuites: string[];
};

export type PlatformStageTimings = {
  structuring: number;
  generation: number;
  evaluation: number;
  improvement: number;
  polish: number;
  total: number;
};

export type PlatformAgentStageTrace = {
  mode: PlatformQualityMode;
  promptVersions: PlatformPromptVersions;
  rawTaskInput: {
    taskId: string;
    title: string;
    description: string;
    category: string;
    rewardAmount: number;
    evaluationPreference: string;
    structuredNotes: string | null;
    attachments: Array<{
      title: string;
      pointer: string;
      mimeType: string | null;
      textExcerpt: string | null;
    }>;
    refinement: PlatformRefinementContext | null;
  };
  structuredTask: PlatformStructuredTask;
  draftOutput: PlatformDraftArtifact;
  evaluation: PlatformQualityEvaluation | null;
  improvedOutput: PlatformDraftArtifact | null;
  polishedOutput: PlatformDraftArtifact | null;
  finalOutput: PlatformDraftArtifact;
  runSummary: PlatformRunSummary;
  stageTimingsMs: PlatformStageTimings;
  score: number;
  confidence: "low" | "medium" | "high";
  executionSource: "heuristic" | "llm";
  refinement: PlatformRefinementContext | null;
  reviewOutcome: "approve" | "reject" | "needs_human_review" | null;
  settlementOutcome: "settled" | "refunded" | "disputed" | null;
};

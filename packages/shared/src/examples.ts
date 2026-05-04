import type {
  AgentAdapterTaskRequest,
  AgentAdapterTaskResponse,
  AgentProfile,
  EvaluationResult,
  LeaderboardEntry,
  SettlementRecord,
  TaskCreateInput,
  TaskRecord,
  TaskSubmission,
  UserProfile,
} from "./schemas";

export const exampleUserProfile: UserProfile = {
  id: "usr_01",
  walletAddress: "0xabc123buyer",
  username: "marketmaker",
  avatarUrl: "https://cdn.example.com/avatars/user-01.png",
  bio: "Posts growth and research tasks for AI agents.",
  createdAt: "2026-03-26T12:00:00.000Z",
};

export const exampleAgentProfile: AgentProfile = {
  agentId: "agent_signal_forge",
  ownerWallet: "0xdef456owner",
  publicName: "Signal Forge",
  slug: "signal-forge",
  description: "Research agent specialized in market scans, evidence summaries, and strategic briefs.",
  avatarUrl: "https://cdn.example.com/avatars/signal-forge.png",
  originType: "platform",
  category: "research",
  capabilityTags: ["market-intelligence", "competitive-analysis", "briefing"],
  skills: ["research_synthesis", "competitive_analysis", "strategy_briefing"],
  skillCategories: ["research", "strategy"],
  endpointUrl: "https://agents.example.com/signal-forge",
  expectedLatencyMsRange: { minMs: 12000, maxMs: 90000 },
  pricingHint: "Usually competitive for tasks in the 100-500 TEST range.",
  activeVersionHash: "0xver_signal_forge_4",
  isActive: true,
  createdAt: "2026-03-26T12:00:00.000Z",
  updatedAt: "2026-03-26T12:30:00.000Z",
};

export const exampleTaskCreateInput: TaskCreateInput = {
  title: "Competitive positioning memo",
  description: "Compare three competitors and deliver a concise memo with risks, opportunities, and messaging gaps.",
  category: "research",
  rewardAmount: 350,
  deadlineTimestamp: 1770000000,
  taskMode: "open_market",
  selectedAgentId: null,
  evaluationPreference: "assisted_scoring",
  attachmentRefs: ["ipfs://brief-001", "ipfs://brand-notes-001"],
  creatorWallet: "0xabc123buyer",
};

export const exampleTaskRecord: TaskRecord = {
  taskId: "task_01",
  creatorWallet: "0xabc123buyer",
  onchainTaskRef: "0xcontract:task_01",
  metadataHash: "0xmeta_task_01",
  status: "OPEN",
  rewardAmount: 350,
  deadlineTimestamp: 1770000000,
  taskMode: "open_market",
  selectedAgentId: null,
  assignedAgentIds: ["agent_signal_forge"],
  createdAt: "2026-03-26T12:05:00.000Z",
  updatedAt: "2026-03-26T12:05:00.000Z",
};

export const exampleTaskSubmission: TaskSubmission = {
  submissionId: "sub_01",
  taskId: "task_01",
  agentId: "agent_signal_forge",
  resultHash: "0xresult_01",
  rawResultPointer: "ipfs://output-01",
  executionDurationMs: 28400,
  status: "submitted",
  submittedAt: "2026-03-26T12:18:00.000Z",
};

export const exampleEvaluationResult: EvaluationResult = {
  evaluationId: "eval_01",
  taskId: "task_01",
  winningSubmissionId: "sub_01",
  scores: [
    {
      submissionId: "sub_01",
      agentId: "agent_signal_forge",
      score: 91,
      normalizedScore: 0.91,
      notes: "Strong evidence coverage and clear structure.",
    },
  ],
  summary: "Signal Forge produced the strongest memo.",
  reasoning: "The submission satisfied the requested structure, used the attached sources, and surfaced actionable differentiation insights.",
  normalizedScore: 0.91,
  overallScore: 91,
  finalDecision: "approve",
  finalOutcome: "accepted",
  consensusScore: 91,
  validatorAgreement: 0.67,
  consensusConfidence: 0.82,
  equivalenceSummary: "Validators agreed the memo solved the task even if alternate wording would also have been acceptable.",
  path: "assisted_evaluation",
  findings: [
    {
      reviewerId: "demo_reviewer",
      reviewerType: "machine_assisted",
      decision: "approve",
      acceptanceSignal: "accept",
      overallScore: 91,
      confidence: 0.82,
      summary: "Strong evidence coverage and clear structure.",
      reasoning: "The memo answered the task directly, stayed well structured, and produced a recommendation a buyer could act on.",
      criteriaScores: {
        completionScore: 92,
        relevanceScore: 90,
        correctnessProxyScore: 88,
        formatComplianceScore: 93,
        usefulnessScore: 91,
        latencyAwarenessScore: 84,
      },
      createdAt: "2026-03-26T12:20:00.000Z",
    },
  ],
  reviewerType: "machine_assisted",
  createdAt: "2026-03-26T12:20:00.000Z",
};

export const exampleSettlementRecord: SettlementRecord = {
  settlementId: "set_01",
  taskId: "task_01",
  grossReward: 350,
  protocolFee: 8.75,
  netPayout: 341.25,
  receiverWallet: "0xdef456owner",
  txHash: "0xtxhash_01",
  settledAt: "2026-03-26T12:22:00.000Z",
};

export const exampleLeaderboardEntry: LeaderboardEntry = {
  rank: 1,
  agentId: "agent_signal_forge",
  displayName: "Signal Forge",
  avatarUrl: "https://cdn.example.com/avatars/signal-forge.png",
  successRate: 0.94,
  approvalRate: 0.96,
  averageScore: 92,
  averageResponseTimeMs: 31200,
  totalEarnings: 18250,
  averageLatencyMs: 31200,
  reliabilityScore: 88,
  rankScore: 91,
  status: "active",
  trustBadges: [
    { id: "verified_compatible", label: "Verified Compatible", tone: "good" },
    { id: "high_approval", label: "High Approval", tone: "good" },
  ],
  trend: "up",
};

export const exampleAgentAdapterTaskRequest: AgentAdapterTaskRequest = {
  requestId: "req_01",
  taskId: "task_01",
  taskType: "research",
  title: "Competitive positioning memo",
  description: "Compare three competitors and produce a concise memo.",
  structuredInput: {
    competitors: ["Acme", "Northstar", "Bluewave"],
  },
  attachments: [
    {
      name: "brief.md",
      contentType: "text/markdown",
      pointer: "ipfs://brief-001",
      sizeBytes: 2048,
    },
  ],
  expectedOutputSchema: {
    sections: ["summary", "competitors", "opportunities", "recommendations"],
  },
  deadlineTimestamp: 1770000000,
  callbackUrl: "https://router.example.com/agent-callback",
  auth: {
    ownerWallet: "0xdef456owner",
    signature: "0xsignedpayload",
    timestamp: 1770000100,
  },
};

export const exampleAgentAdapterTaskResponse: AgentAdapterTaskResponse = {
  accepted: true,
  executionMode: "async",
  runId: "run_01",
  estimatedCompletionMs: 30000,
  error: null,
};

import test from "node:test";
import assert from "node:assert/strict";
import type { TaskDetailView } from "@marketplace/shared";
import { InMemoryRegistryStore } from "../src/db/store";
import { bootstrapPlatformAgents } from "../src/services/platformAgentCatalog";
import { PlatformAgentRuntime } from "../src/services/platformAgentRuntime";

const runtime = new PlatformAgentRuntime();

function makeTask(overrides: Partial<TaskDetailView> = {}): TaskDetailView {
  const now = new Date().toISOString();
  return {
    taskId: "task_runtime",
    title: "Review service agreement",
    description: "Check whether the service agreement includes a termination notice requirement.",
    category: "document_qa",
    rewardAmount: 50,
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

test("ClauseLens fails safe when no grounded source text is provided", async () => {
  const result = await runtime.execute(
    "platform_clauselens",
    makeTask({
      description: "Tell me if there is a termination notice clause.",
      structuredNotes: null,
      attachments: [],
    }),
  );

  assert.equal(result.payload.executionSource, "heuristic");
  assert.equal(result.payload.confidence, "low");
  assert.match(result.payload.summary, /cannot safely answer/i);
  assert.ok(result.payload.uncertainties.some((item) => /insufficient|no source excerpt/i.test(item)));
});

test("ClauseLens uses visible source text as evidence instead of inventing clauses", async () => {
  const result = await runtime.execute(
    "platform_clauselens",
    makeTask({
      description: "Review the clause below.",
      structuredNotes: "Termination: Either party may terminate with 30 days written notice.\nRenewal: Renews automatically unless either party objects.",
      attachments: [],
    }),
  );

  const evidenceSection = result.payload.sections.find((section) => section.heading === "Evidence");
  assert.ok(evidenceSection);
  assert.ok(evidenceSection!.bullets.some((item) => item.includes("30 days written notice")));
  assert.notEqual(result.payload.confidence, "low");
});

test("ClauseLens can ground its answer from inline attachment text", async () => {
  const result = await runtime.execute(
    "platform_clauselens",
    makeTask({
      description: "Review the attached agreement excerpt.",
      structuredNotes: null,
      attachments: [
        {
          id: "att_1",
          title: "agreement excerpt",
          pointer: "inline://agreement",
          textContent: "Termination: Either party may terminate with 15 days written notice for convenience.",
        },
      ],
    }),
  );

  const evidenceSection = result.payload.sections.find((section) => section.heading === "Evidence");
  assert.ok(evidenceSection);
  assert.ok(evidenceSection!.bullets.some((item) => item.includes("15 days written notice")));
});

test("ClauseLens answers explicit contract questions one by one and marks unsupported answers clearly", async () => {
  const result = await runtime.execute(
    "platform_clauselens",
    makeTask({
      description: [
        "Review the agreement excerpt below.",
        "1. Can either party terminate for convenience?",
        "2. How much notice is required?",
        "3. Does the text confirm who owns customer data?",
      ].join("\n"),
      structuredNotes: [
        "Termination for Convenience: Either party may terminate this Agreement for any reason upon thirty (30) days' prior written notice.",
        "Data Usage: Vendor may use Customer Data only as necessary to provide the Services.",
      ].join("\n"),
    }),
  );

  const answerSection = result.payload.sections.find((section) => section.heading === "Answer");
  assert.ok(answerSection);
  assert.ok(answerSection!.bullets.some((item) => /terminate for convenience.*Yes\./i.test(item)));
  assert.ok(answerSection!.bullets.some((item) => /notice.*30 days|thirty \(30\) days/i.test(item)));
  assert.ok(answerSection!.bullets.some((item) => /owns customer data.*(insufficient evidence|does not clearly confirm ownership)/i.test(item)));
});

test("TableMiner extracts explicit field/value pairs and keeps uncertain values separate", async () => {
  const result = await runtime.execute(
    "platform_tableminer",
    makeTask({
      category: "data_extraction",
      title: "Extract invoice fields",
      description: "Invoice Number: INV-204\nAmount: $1,200\nDue Date: TBD",
      structuredNotes: "Vendor: Northwind Labs\nStatus: paid",
    }),
  );

  const confirmedSection = result.payload.sections.find((section) => section.heading === "Confirmed Fields");
  const uncertainSection = result.payload.sections.find((section) => section.heading === "Uncertain Fields");
  assert.ok(confirmedSection);
  assert.ok(uncertainSection);
  assert.ok(confirmedSection!.bullets.some((item) => item.includes("Invoice Number: INV-204")));
  assert.ok(confirmedSection!.bullets.some((item) => item.includes("Amount: $1,200")));
  assert.ok(uncertainSection!.bullets.some((item) => item.includes("Due Date: TBD")));
});

test("TableMiner reads inline attachment text for additional confirmed fields", async () => {
  const result = await runtime.execute(
    "platform_tableminer",
    makeTask({
      category: "data_extraction",
      title: "Extract shipment fields",
      description: "Track the shipment details.",
      structuredNotes: null,
      attachments: [
        {
          id: "att_2",
          title: "shipment manifest",
          pointer: "inline://manifest",
          textContent: "Carrier: DHL\nTracking Number: DH-9912\nStatus: in transit",
        },
      ],
    }),
  );

  const confirmedSection = result.payload.sections.find((section) => section.heading === "Confirmed Fields");
  assert.ok(confirmedSection);
  assert.ok(confirmedSection!.bullets.some((item) => item.includes("Carrier: DHL")));
  assert.ok(confirmedSection!.bullets.some((item) => item.includes("Tracking Number: DH-9912")));
});

test("TableMiner isolates conflicting repeated fields instead of collapsing them", async () => {
  const result = await runtime.execute(
    "platform_tableminer",
    makeTask({
      category: "data_extraction",
      title: "Extract reimbursement rows",
      description: "Amount: 500\nAmount: 650\nStatus: approved",
      structuredNotes: null,
    }),
  );

  const conflictsSection = result.payload.sections.find((section) => section.heading === "Conflicts");
  assert.ok(conflictsSection);
  assert.ok(conflictsSection!.bullets.some((item) => item.includes("Amount: 500 vs 650")));
  assert.ok(result.payload.uncertainties.some((item) => /conflict/i.test(item)));
});

test("Briefly produces a bounded executive brief from visible task context", async () => {
  const result = await runtime.execute(
    "platform_briefly",
    makeTask({
      category: "summarization",
      title: "Summarize leadership update",
      description:
        "Q2 revenue exceeded plan by 12 percent. Customer churn improved after onboarding changes. Hiring remains frozen until Q3 planning.",
      structuredNotes: "Leadership needs a one-screen update with the main signal and next decision.",
    }),
  );

  assert.equal(result.payload.executionSource, "heuristic");
  assert.ok(result.payload.sections.some((section) => section.heading === "Top Line"));
  assert.ok(result.payload.sections.some((section) => section.heading === "Decision Signals"));
  assert.ok(
    result.payload.summary.includes("Summarize leadership update") ||
      result.payload.sections.some((section) => section.bullets.some((item) => item.includes("Q2 revenue exceeded plan"))),
  );
});

test("Briefly separates strong signals from risks and preserves visible gaps", async () => {
  const result = await runtime.execute(
    "platform_briefly",
    makeTask({
      category: "summarization",
      title: "Summarize launch risks",
      description: [
        "Completion improved from 41% to 58% after the redesign.",
        "Step 3 analytics were missing for 36 hours after launch.",
        "Two UI bugs were reported and fixed.",
      ].join("\n"),
    }),
  );

  const risksSection = result.payload.sections.find((section) => section.heading === "Risks / Gaps");
  assert.ok(risksSection);
  assert.ok(risksSection!.bullets.some((item) => /missing for 36 hours|UI bugs/i.test(item)));
});

test("SchemaSmith proposes stable keys from explicit source fields", async () => {
  const result = await runtime.execute(
    "platform_schemasmith",
    makeTask({
      category: "automation",
      title: "Create CRM payload schema",
      description: "Lead Name: Ada Lovelace\nLead Email: ada@example.com\nCompany: Analytical Engines",
      structuredNotes: "Map this into a clean automation payload.",
    }),
  );

  const schemaSection = result.payload.sections.find((section) => section.heading === "Schema");
  assert.ok(schemaSection);
  assert.ok(schemaSection!.bullets.some((item) => item.includes('"lead_name": string | null')));
  assert.ok(schemaSection!.bullets.some((item) => item.includes('"lead_email": email-string | null')));
});

test("SchemaSmith returns richer example output and separates uncertain fields", async () => {
  const result = await runtime.execute(
    "platform_schemasmith",
    makeTask({
      category: "automation",
      title: "Design intake schema",
      description:
        "Name: Tunde A.\nEmail: tunde@acme.io\nPhone: +234 803 555 1212\nBudget: ~5k USD\nSubscribe to updates: yes",
      structuredNotes: "Return schema, example JSON, uncertain fields, and notes.",
    }),
  );

  const exampleSection = result.payload.sections.find((section) => section.heading === "Example JSON");
  const uncertainSection = result.payload.sections.find((section) => section.heading === "Uncertain Fields");
  const schemaSection = result.payload.sections.find((section) => section.heading === "Schema");
  assert.ok(exampleSection);
  assert.ok(uncertainSection);
  assert.ok(schemaSection);
  assert.ok(schemaSection!.bullets.some((item) => item.includes('"phone": phone-string | null')));
  assert.ok(schemaSection!.bullets.some((item) => item.includes('"budget": number | string | null')));
  assert.ok(exampleSection!.bullets.some((item) => item.includes('"email": "tunde@acme.io"')));
  assert.ok(exampleSection!.bullets.some((item) => item.includes('"phone": "+2348035551212"')));
  assert.ok(exampleSection!.bullets.some((item) => item.includes('"budget": 5000')));
  assert.ok(exampleSection!.bullets.some((item) => item.includes('"subscribed_to_updates": true')));
  assert.ok(uncertainSection!.bullets.some((item) => /budget|No uncertain fields were detected/i.test(item)));
});

test("SchemaSmith infers richer field types for dates and list-like values", async () => {
  const result = await runtime.execute(
    "platform_schemasmith",
    makeTask({
      category: "automation",
      title: "Design customer handoff schema",
      description: "Kickoff Date: 2026-04-01\nUse case: onboarding + reporting\nEmail: owner@example.com",
      structuredNotes: null,
    }),
  );

  const schemaSection = result.payload.sections.find((section) => section.heading === "Schema");
  const exampleSection = result.payload.sections.find((section) => section.heading === "Example JSON");
  assert.ok(schemaSection);
  assert.ok(exampleSection);
  assert.ok(schemaSection!.bullets.some((item) => item.includes('"kickoff_date": date-string | null')));
  assert.ok(schemaSection!.bullets.some((item) => item.includes('"use_case": string[] | null')));
  assert.ok(schemaSection!.bullets.some((item) => item.includes('"email": email-string | null')));
  assert.ok(exampleSection!.bullets.some((item) => item.includes('"use_case": ["onboarding","reporting"]')));
});

test("PolyLane refuses confident localization when source text is missing", async () => {
  const result = await runtime.execute(
    "platform_polylane",
    makeTask({
      category: "translation",
      title: "Translate onboarding copy to French",
      description: "Translate our onboarding copy into French.",
      structuredNotes: null,
    }),
  );

  assert.equal(result.payload.confidence, "low");
  assert.match(result.payload.summary, /cannot localize/i);
  assert.ok(result.payload.uncertainties.some((item) => /source text/i.test(item)));
});

test("PolyLane uses visible source text when localization input is provided", async () => {
  const result = await runtime.execute(
    "platform_polylane",
    makeTask({
      category: "translation",
      title: "Translate hero line to Spanish",
      description: 'Translate to Spanish: "Move faster with trusted execution."',
      structuredNotes: null,
    }),
  );

  const localizedSection = result.payload.sections.find((section) => section.heading === "Localized Output");
  assert.ok(localizedSection);
  assert.ok(localizedSection!.bullets.some((item) => item.includes("[Spanish]") || item.includes("[spanish]")));
});

test("PolyLane preserves glossary-sensitive terms and locale hints when visible", async () => {
  const result = await runtime.execute(
    "platform_polylane",
    makeTask({
      category: "translation",
      title: "Localize product copy to de-DE",
      description: 'Target Language: de-DE\nTranslate this UI string: "Connect OpsPilot API to your SSO provider."',
      structuredNotes: null,
    }),
  );

  const terminologySection = result.payload.sections.find((section) => section.heading === "Terminology");
  const localizedSection = result.payload.sections.find((section) => section.heading === "Localized Output");
  assert.ok(terminologySection);
  assert.ok(localizedSection);
  assert.ok(terminologySection!.bullets.some((item) => /OpsPilot|API|SSO/.test(item)));
  assert.ok(localizedSection!.bullets.some((item) => item.includes("[de-DE (DE)]") || item.includes("[de-DE]")));
});

test("OpsPilot turns visible workflow steps into an execution runbook", async () => {
  const result = await runtime.execute(
    "platform_opspilot",
    makeTask({
      category: "operations",
      title: "Prepare launch handoff",
      description: "- Draft launch checklist\n- Review with marketing lead\n- Hand off approved checklist to support",
      structuredNotes: "Owner: launch ops\nReviewer: marketing lead",
    }),
  );

  const workflowSection = result.payload.sections.find((section) => section.heading === "Workflow");
  const ownersSection = result.payload.sections.find((section) => section.heading === "Owners");
  assert.ok(workflowSection);
  assert.ok(ownersSection);
  assert.ok(workflowSection!.bullets.some((item) => item.includes("Draft launch checklist")));
  assert.ok(ownersSection!.bullets.some((item) => /owners/i.test(item) || /owner/i.test(item)));
});

test("OpsPilot adds handoff and escalation structure when operational context is present", async () => {
  const result = await runtime.execute(
    "platform_opspilot",
    makeTask({
      category: "operations",
      title: "Triage login incident",
      description: [
        "- Confirm scope with support",
        "- Check SSO certificate rotation",
        "- Hand off customer updates to comms",
      ].join("\n"),
      structuredNotes: "Owner: Ravi\nReviewer: Nadia\nEscalate after 30 minutes if login errors continue.",
    }),
  );

  const handoffsSection = result.payload.sections.find((section) => section.heading === "Handoffs");
  const escalationSection = result.payload.sections.find((section) => section.heading === "Escalation");
  assert.ok(handoffsSection);
  assert.ok(escalationSection);
  assert.ok(handoffsSection!.bullets.some((item) => /handoff|next team/i.test(item)));
  assert.ok(escalationSection!.bullets.some((item) => /time thresholds|30 minutes|escalation/i.test(item)));
});

test("CopySprint avoids invented proof and returns bounded copy directions", async () => {
  const result = await runtime.execute(
    "platform_copysprint",
    makeTask({
      category: "writing",
      title: "Rewrite hero copy",
      description: "We need homepage copy for a workflow product used by ops teams.",
      structuredNotes: "Keep it clean and direct.",
    }),
  );

  assert.ok(result.payload.sections.some((section) => section.heading === "Draft"));
  assert.ok(result.payload.sections.some((section) => section.heading === "Variants"));
  assert.ok(result.payload.nextActions.some((item) => /proof/i.test(item)));
});

test("CopySprint adapts its draft structure to email copy requests", async () => {
  const result = await runtime.execute(
    "platform_copysprint",
    makeTask({
      category: "writing",
      title: "Write activation email",
      description: "Draft a lifecycle email for new users who have not created their first runbook.",
      structuredNotes: "Include subject, body, and CTA.",
    }),
  );

  const draftSection = result.payload.sections.find((section) => section.heading === "Draft");
  assert.ok(draftSection);
  assert.ok(draftSection!.bullets.some((item) => item.includes("Subject:")));
  assert.ok(draftSection!.bullets.some((item) => item.includes("Body:")));
  assert.ok(draftSection!.bullets.some((item) => item.includes("CTA:")));
});

test("CampaignPilot creates a conservative campaign plan when audience and proof are limited", async () => {
  const result = await runtime.execute(
    "platform_campaignpilot",
    makeTask({
      category: "marketing",
      title: "Plan launch campaign",
      description: "Need a campaign plan for a new workflow automation launch.",
      structuredNotes: null,
    }),
  );

  assert.ok(result.payload.sections.some((section) => section.heading === "Audience"));
  assert.ok(result.payload.sections.some((section) => section.heading === "Plan"));
  assert.equal(result.payload.confidence, "low");
});

test("CampaignPilot surfaces channels and phased sequencing from visible launch context", async () => {
  const result = await runtime.execute(
    "platform_campaignpilot",
    makeTask({
      category: "marketing",
      title: "Launch reporting API campaign",
      description: "Channels: email, LinkedIn, blog\nNeed a pre-launch, launch, and post-launch plan for existing customers and prospects.",
      structuredNotes: "Audience: engineering and RevOps leaders",
    }),
  );

  const channelsSection = result.payload.sections.find((section) => section.heading === "Channels");
  const planSection = result.payload.sections.find((section) => section.heading === "Plan");
  assert.ok(channelsSection);
  assert.ok(planSection);
  assert.ok(channelsSection!.bullets.some((item) => /email|linkedin|blog/i.test(item)));
  assert.ok(planSection!.bullets.some((item) => /Pre-launch|Launch|Post-launch/i.test(item)));
});

test("quality modes drive staged execution depth", async () => {
  const fast = await runtime.execute(
    "platform_briefly",
    makeTask({
      category: "summarization",
      title: "Fast mode summary",
      description: "Summarize this short update.",
      structuredNotes: "Quality: fast",
      rewardAmount: 40,
    }),
  );
  assert.equal(fast.trace.mode, "fast");
  assert.equal(fast.trace.evaluation, null);
  assert.equal(fast.trace.improvedOutput, null);

  const high = await runtime.execute(
    "platform_briefly",
    makeTask({
      category: "summarization",
      title: "High quality summary",
      description: "Q2 revenue exceeded plan by 12%. Churn improved after onboarding changes. Hiring remains frozen pending Q3 review.",
      structuredNotes: "Quality: high_quality",
      rewardAmount: 220,
    }),
  );
  assert.equal(high.trace.mode, "high_quality");
  assert.ok(high.trace.evaluation);
  assert.ok(high.trace.improvedOutput);
  assert.ok(high.trace.polishedOutput);
  assert.ok(high.payload.qualityScore >= 0);
});

test("Improve Again upgrades shallow runs into a deeper quality pass", async () => {
  const refined = await runtime.execute(
    "platform_briefly",
    makeTask({
      category: "summarization",
      title: "Refine a fast summary",
      description: "Summarize the weekly leadership update.",
      structuredNotes: "Quality: fast",
      rewardAmount: 40,
    }),
    {
      refinementContext: {
        sourceRunId: "run_fast_1",
        requestedByWallet: "0xbuyer",
        previousMode: "fast",
        previousScore: 68,
        previousConfidence: "medium",
        feedbackSummary: ["Cover the buyer constraints more completely.", "Make the result easier to approve quickly."],
      },
    },
  );

  assert.equal(refined.trace.mode, "balanced");
  assert.ok(refined.trace.evaluation);
  assert.ok(refined.trace.improvedOutput);
  assert.equal(refined.trace.refinement?.sourceRunId, "run_fast_1");
});

test("platform runs carry structured run summaries with skill and benchmark metadata", async () => {
  const result = await runtime.execute(
    "platform_signal_forge",
    makeTask({
      category: "research",
      title: "Summarize buyer research",
      description: "Synthesize customer signals into a strategy brief.",
      structuredNotes: "Audience: leadership",
      attachments: [
        {
          id: "att_skill_1",
          title: "research notes",
          pointer: "inline://research-notes",
          textContent: "Three buyers asked for stronger reporting and clearer billing language.",
        },
      ],
    }),
  );

  assert.deepEqual(result.trace.runSummary.skillsUsed, ["research_synthesis", "competitive_analysis", "strategy_briefing"]);
  assert.deepEqual(result.trace.runSummary.skillCategories, ["research", "strategy"]);
  assert.deepEqual(result.trace.runSummary.benchmarkSuites, ["signal_forge_core_v1"]);
  assert.equal(result.trace.runSummary.taskIntent.includes("strategy brief") || result.trace.runSummary.taskIntent.includes("Synthesize"), true);
});

test("platform agent bootstrap keeps built-in agents first-class in registry", () => {
  const store = new InMemoryRegistryStore();
  bootstrapPlatformAgents(store);
  const row = store.agents.get("platform_briefly");
  assert.ok(row);
  assert.equal(row.profile.originType, "platform");
  assert.equal(row.profile.isActive, true);
  assert.ok(typeof row.profile.onchainAgentId === "string" && row.profile.onchainAgentId.startsWith("agent_"));
  assert.deepEqual(row.profile.skills, ["meeting_summary", "executive_briefing", "transcript_digest"]);
  assert.deepEqual(row.profile.skillCategories, ["summarization"]);
  assert.equal(store.ensurePerformance("platform_briefly").tasksCompleted, 0);
});

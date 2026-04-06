export type PlatformAgentTaskPackDifficulty = "normal" | "hard" | "adversarial";

export type PlatformAgentTaskPackTask = {
  id: string;
  title: string;
  description: string;
  structuredNotes: string;
  attachmentText: string;
  expectedCharacteristics: string[];
  failureModes: string[];
  difficulty: PlatformAgentTaskPackDifficulty;
  grounded: boolean;
  category: string;
  whyThisTaskMatters: string;
};

export type PlatformAgentTaskPack = {
  agent: string;
  tasks: PlatformAgentTaskPackTask[];
};

export const platformAgentTaskPacks: PlatformAgentTaskPack[] = [
  {
    agent: "ClauseLens",
    tasks: [
      {
        id: "cl_termination_notice_001",
        title: "Termination for Convenience Notice Period",
        description: "Determine how much notice is required for termination for convenience under the agreement.",
        structuredNotes: "User is legal ops reviewing vendor exit flexibility.",
        attachmentText:
          "Section 8.2 (Termination for Convenience): Either party may terminate this Agreement for any reason upon thirty (30) days' prior written notice to the other party. Termination shall not relieve either party of obligations accrued prior to the effective date of termination.",
        expectedCharacteristics: [
          "Extracts the exact notice period of 30 days.",
          "Distinguishes termination for convenience from termination for cause.",
          "Avoids adding assumptions beyond the visible clause.",
        ],
        failureModes: [
          "Confuses the clause with termination for cause.",
          "Invents a different notice period.",
          "Misses the explicit numeric detail in the excerpt.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "contract_review",
        whyThisTaskMatters: "Termination flexibility is a common legal-ops review question and tests whether the agent can read the exact clause language.",
      },
      {
        id: "cl_data_retention_002",
        title: "Data Retention Duration",
        description: "Identify how long the vendor retains customer data after contract termination.",
        structuredNotes: "Security team assessing data lifecycle risk.",
        attachmentText:
          "Section 4.3 (Data Retention): Upon termination of this Agreement, Vendor shall retain Customer Data for a period not exceeding ninety (90) days solely for the purpose of facilitating data export. Thereafter, Vendor shall permanently delete all Customer Data from its systems.",
        expectedCharacteristics: [
          "States the retention period as 90 days.",
          "Explains that the retention purpose is facilitating data export.",
          "Does not extrapolate beyond the provided clause.",
        ],
        failureModes: [
          "Misses the permanent deletion requirement.",
          "Assumes indefinite retention.",
          "Ignores the purpose limitation.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "policy_interpretation",
        whyThisTaskMatters: "Retention clauses are high-stakes for privacy review and should be answered directly from visible text.",
      },
      {
        id: "cl_payment_terms_003",
        title: "Payment Terms Clarification",
        description: "Clarify when invoices are due under the agreement.",
        structuredNotes: "Finance team verifying payment cycles.",
        attachmentText:
          "Section 5.1 (Fees and Payment): Customer shall pay all undisputed invoices within thirty (30) days of the invoice date. Late payments may accrue interest at a rate of 1.5% per month or the maximum allowed by law.",
        expectedCharacteristics: [
          "Correctly identifies the 30-day payment term.",
          "Notes the late-payment interest clause without overemphasizing it.",
          "Answers from the contract text rather than general finance practice.",
        ],
        failureModes: [
          "Confuses the due date with service delivery timing.",
          "Omits the timeline entirely.",
          "Misstates the interest provision.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "contract_review",
        whyThisTaskMatters: "Payment timing is a routine contract-review task and checks whether the agent extracts the key commercial term cleanly.",
      },
      {
        id: "cl_subprocessor_disclosure_004",
        title: "Subprocessor Disclosure Requirement",
        description: "Determine whether the vendor must disclose subprocessors.",
        structuredNotes: "Privacy team reviewing DPA compliance.",
        attachmentText:
          "Section 6.2 (Subprocessors): Vendor may engage subprocessors to process Personal Data, provided that Vendor maintains an up-to-date list of such subprocessors and makes such list available to Customer upon request.",
        expectedCharacteristics: [
          "Identifies the obligation to maintain a current subprocessor list.",
          "Recognizes that disclosure is available upon request rather than automatic.",
          "Avoids implying stronger notice rights than the clause states.",
        ],
        failureModes: [
          "Assumes automatic disclosure without the request condition.",
          "Ignores the duty to keep the list up to date.",
          "Overstates the customer's rights beyond the text.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "compliance",
        whyThisTaskMatters: "Subprocessor transparency is a core DPA review issue and a good test of conditional language handling.",
      },
      {
        id: "cl_confidentiality_duration_005",
        title: "Confidentiality Duration",
        description: "Determine how long confidentiality obligations last.",
        structuredNotes: "Legal team reviewing NDA scope.",
        attachmentText:
          "Section 7.1 (Confidentiality): Each party agrees to maintain the confidentiality of Confidential Information for a period of three (3) years following the termination or expiration of this Agreement.",
        expectedCharacteristics: [
          "Extracts the three-year duration.",
          "Connects the duration to termination or expiration of the agreement.",
          "Does not turn the clause into a perpetual confidentiality obligation.",
        ],
        failureModes: [
          "Assumes confidentiality is perpetual.",
          "Ignores the event that starts the duration clock.",
          "Misstates the time period.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "contract_review",
        whyThisTaskMatters: "Duration limits are common negotiation points and test whether the agent can stay close to the wording.",
      },
      {
        id: "cl_liability_cap_006",
        title: "Liability Cap Identification",
        description: "Identify the liability cap in the agreement.",
        structuredNotes: "Risk team evaluating financial exposure.",
        attachmentText:
          "Section 10.1 (Limitation of Liability): Except for liabilities arising from gross negligence or willful misconduct, each party's total liability under this Agreement shall not exceed the fees paid by Customer to Vendor in the twelve (12) months preceding the claim.",
        expectedCharacteristics: [
          "Correctly identifies the cap as fees paid in the prior 12 months.",
          "Notes the carve-outs for gross negligence and willful misconduct.",
          "Avoids converting the clause into a made-up flat dollar amount.",
        ],
        failureModes: [
          "Misses the carve-outs.",
          "States an incorrect fixed cap amount.",
          "Blurs the lookback period.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "contract_review",
        whyThisTaskMatters: "Liability caps are central risk terms and require careful reading of both the cap and the exceptions.",
      },
      {
        id: "cl_data_transfer_scope_007",
        title: "Ambiguous Data Transfer Scope",
        description: "Determine whether cross-border data transfers are allowed.",
        structuredNotes: "Compliance team assessing international data flow.",
        attachmentText:
          "Section 9.4 (Data Transfers): Vendor may transfer Personal Data outside the Customer's jurisdiction where necessary to provide the Services, subject to appropriate safeguards.",
        expectedCharacteristics: [
          "Recognizes that cross-border transfers are allowed in principle.",
          "Notes that the clause references safeguards without identifying them.",
          "Flags the absence of specific transfer mechanisms or frameworks.",
        ],
        failureModes: [
          "Assumes the clause guarantees compliance with a named transfer framework.",
          "Invents SCCs, adequacy decisions, or other safeguards not mentioned.",
          "Overstates the level of certainty in the answer.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "compliance",
        whyThisTaskMatters: "This tests whether the agent can handle legally important but underspecified language without hallucinating compliance details.",
      },
      {
        id: "cl_insurance_limits_008",
        title: "Insurance Coverage Details",
        description: "Identify required insurance coverage limits.",
        structuredNotes: "Procurement team reviewing vendor risk.",
        attachmentText:
          "Section 11.2 (Insurance): Vendor shall maintain commercially reasonable insurance coverage, including general liability and professional liability insurance.",
        expectedCharacteristics: [
          "Recognizes that insurance types are named but limits are not.",
          "Responds with insufficient evidence on the specific coverage limits.",
          "Avoids filling in industry-standard numbers from memory.",
        ],
        failureModes: [
          "Invents coverage limits.",
          "Assumes procurement-standard minimums not present in the text.",
          "Presents a speculative answer as certain.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "procurement",
        whyThisTaskMatters: "Insurance clauses often tempt unsupported inference, which makes this a strong hallucination test.",
      },
      {
        id: "cl_sla_penalties_009",
        title: "Service Level Agreement Penalties",
        description: "Determine penalties for SLA breaches.",
        structuredNotes: "Operations team reviewing uptime guarantees.",
        attachmentText:
          "Section 3.5 (Service Levels): Vendor shall use commercially reasonable efforts to maintain service availability of 99.9% uptime.",
        expectedCharacteristics: [
          "Extracts the uptime target of 99.9%.",
          "States that no penalty or service-credit mechanism is visible in the excerpt.",
          "Avoids inventing a standard SLA credit schedule.",
        ],
        failureModes: [
          "Assumes the agreement includes service credits or penalties.",
          "Invents a reimbursement formula.",
          "Treats the uptime target itself as the remedy.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "contract_review",
        whyThisTaskMatters: "SLA questions commonly ask for remedies that are not in the visible text, so this checks for disciplined insufficiency handling.",
      },
      {
        id: "cl_data_ownership_trap_010",
        title: "Data Ownership Trap",
        description: "Determine if the vendor owns customer data.",
        structuredNotes: "User trying to confirm data ownership rights.",
        attachmentText:
          "Section 4.1 (Data Usage): Vendor may use Customer Data solely for the purpose of providing the Services.",
        expectedCharacteristics: [
          "Recognizes that the clause addresses use, not ownership.",
          "States that ownership cannot be confirmed from the visible text alone.",
          "Avoids assuming ownership remains with the customer unless explicitly stated.",
        ],
        failureModes: [
          "Assumes customer ownership from common contract patterns.",
          "Treats a use restriction as an ownership clause.",
          "Answers with more certainty than the text supports.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "contract_review",
        whyThisTaskMatters: "Ownership is often inferred carelessly, so this is a strong test of staying grounded in what the clause actually says.",
      },
      {
        id: "cl_soc2_claim_trap_011",
        title: "Security Certification Claim",
        description: "Determine if the vendor is SOC 2 certified.",
        structuredNotes: "Security team verifying compliance claims.",
        attachmentText:
          "Section 6.5 (Security Measures): Vendor shall implement industry-standard security practices to protect Customer Data.",
        expectedCharacteristics: [
          "States that the excerpt does not mention SOC 2 certification.",
          "Distinguishes general security language from formal certification status.",
          "Returns insufficient evidence rather than guessing.",
        ],
        failureModes: [
          "Assumes SOC 2 certification from vague security wording.",
          "Equates industry-standard practices with a named audit certification.",
          "Overstates the compliance posture beyond the text.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "compliance",
        whyThisTaskMatters: "Certification claims are high-risk and require explicit support, making this a useful anti-hallucination case.",
      },
      {
        id: "cl_auto_renewal_trap_012",
        title: "Automatic Renewal Clause Trap",
        description: "Determine whether the agreement auto-renews.",
        structuredNotes: "Legal team checking renewal obligations.",
        attachmentText:
          "Section 2.1 (Term): This Agreement shall commence on the Effective Date and continue for an initial term of one (1) year.",
        expectedCharacteristics: [
          "Identifies the initial term as one year.",
          "States that no renewal language is visible in the excerpt.",
          "Avoids assuming auto-renewal or non-renewal rights that are not present.",
        ],
        failureModes: [
          "Assumes automatic renewal based on typical SaaS agreements.",
          "Infers renewal rights from the existence of an initial term alone.",
          "Gives a definitive renewal answer without textual support.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "contract_review",
        whyThisTaskMatters: "Renewal obligations are easy to over-infer, so this tests whether the agent can say the text is incomplete.",
      },
    ],
  },
  {
    agent: "TableMiner",
    tasks: [
      {
        id: "tm_invoice_mixed_formatting_001",
        title: "Invoice Extraction with Mixed Formatting",
        description: "Extract structured invoice fields including vendor, total amount, currency, invoice date, and line items.",
        structuredNotes: "Finance automation for accounts payable ingestion.",
        attachmentText:
          "INVOICE\nVendor: Apex Supplies Ltd.\nInvoice #: INV-8821\nDate: 03/12/2025\nCurrency: USD\nItems:\n- Office Chairs x10 @ 120.00\n- Desks x5 @ 300\nSubtotal: 2,700\nTax (8%): 216\nTOTAL DUE: 2916 USD\nNotes: Deliver ASAP",
        expectedCharacteristics: [
          "Parses vendor, invoice number, date, currency, line items, subtotal, tax, and total correctly.",
          "Preserves the distinction between subtotal and total due.",
          "Uses the visible currency label instead of assuming one.",
        ],
        failureModes: [
          "Misses the subtotal versus total distinction.",
          "Miscalculates totals instead of reading the visible values.",
          "Ignores the explicit currency label.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "invoice_extraction",
        whyThisTaskMatters: "Accurate invoice extraction is critical for automated payment workflows.",
      },
      {
        id: "tm_procurement_missing_values_002",
        title: "Procurement Request with Missing Values",
        description: "Extract requester, department, items, and approval status from a procurement form with missing fields.",
        structuredNotes: "Ops team intake automation.",
        attachmentText:
          "Procurement Request Form\nRequester: John K.\nDepartment: IT\nItems Requested:\n- Laptops (Qty: 5)\n- Monitors (Qty: TBD)\nBudget: $8,000\nApproval: Pending\nManager Signature:\nDate Submitted: 2025-04-02",
        expectedCharacteristics: [
          "Handles the TBD quantity without pretending it is known.",
          "Captures the blank manager signature as missing or null-like.",
          "Extracts the core procurement fields cleanly.",
        ],
        failureModes: [
          "Ignores missing values.",
          "Assigns incorrect defaults to the unsigned field.",
          "Drops incomplete but still useful fields.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "procurement",
        whyThisTaskMatters: "Real-world forms often have incomplete data that still needs structured processing.",
      },
      {
        id: "tm_vendor_onboarding_repeated_keys_003",
        title: "Vendor Onboarding Record with Repeated Keys",
        description: "Extract vendor details from onboarding form with repeated keys.",
        structuredNotes: "Vendor onboarding system ingestion.",
        attachmentText:
          "Vendor Onboarding\nVendor Name: Delta Logistics\nContact: Sarah Lee\nEmail: sarah@delta.com\nContact: John Smith\nEmail: john@delta.com\nBank: First Bank\nAccount #: 12345678",
        expectedCharacteristics: [
          "Captures multiple contacts and emails instead of overwriting them.",
          "Keeps the vendor name and bank details intact.",
          "Treats repeated keys as distinct values to preserve.",
        ],
        failureModes: [
          "Overwrites earlier values with the last repeated key.",
          "Keeps only one contact.",
          "Loses one of the email addresses.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "onboarding",
        whyThisTaskMatters: "Repeated keys are common in onboarding records and can easily break downstream extraction.",
      },
      {
        id: "tm_support_ticket_extract_004",
        title: "Support Ticket Extraction",
        description: "Extract ticket ID, issue type, priority, and resolution status.",
        structuredNotes: "Customer support automation.",
        attachmentText:
          "Ticket ID: TCK-5542\nUser: alice@example.com\nIssue: Cannot access dashboard\nPriority: High\nStatus: Resolved\nResolution: Password reset applied",
        expectedCharacteristics: [
          "Accurately extracts the ticket ID, issue, priority, status, and resolution.",
          "Keeps the issue text readable rather than over-normalizing it away.",
          "Supports later support analytics or routing.",
        ],
        failureModes: [
          "Misses the resolution detail.",
          "Mislabels the priority.",
          "Drops the core issue description.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "support",
        whyThisTaskMatters: "Structured ticket extraction powers support reporting and automation.",
      },
      {
        id: "tm_expense_mixed_currency_005",
        title: "Expense Report with Mixed Currency",
        description: "Extract expense items and normalize currency fields.",
        structuredNotes: "Finance team reimbursement processing.",
        attachmentText:
          "Expense Report\nEmployee: Mark D.\nItems:\n- Flight: $500 USD\n- Hotel: 400 EUR\n- Meals: 120\nTotal: TBD",
        expectedCharacteristics: [
          "Identifies the mixed-currency nature of the expense items.",
          "Flags the missing total as uncertain rather than derived.",
          "Extracts the line items even when one currency is omitted.",
        ],
        failureModes: [
          "Assumes all items share one currency.",
          "Calculates a synthetic total from mixed currencies.",
          "Treats the unlabeled meals amount as definitely USD or EUR without noting ambiguity.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "finance",
        whyThisTaskMatters: "Mixed-currency expenses are common and easy to mishandle in automated reimbursement flows.",
      },
      {
        id: "tm_inventory_table_006",
        title: "Inventory Table Extraction",
        description: "Extract structured table from semi-formatted inventory list.",
        structuredNotes: "Warehouse system ingestion.",
        attachmentText:
          "Inventory List\nItem | Qty | Location\nChairs | 20 | A1\nDesks | 15 | B2\nMonitors | TBD | C3",
        expectedCharacteristics: [
          "Parses the table structure correctly.",
          "Keeps the TBD quantity separate from confirmed numeric quantities.",
          "Preserves item-to-location mapping.",
        ],
        failureModes: [
          "Fails to parse the table format.",
          "Treats TBD as a confirmed quantity.",
          "Loses the row structure while extracting values.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "operations",
        whyThisTaskMatters: "Inventory ingestion depends on preserving row structure and marking uncertain quantities correctly.",
      },
      {
        id: "tm_conflicting_invoice_totals_007",
        title: "Conflicting Invoice Totals",
        description: "Extract totals when conflicting values exist.",
        structuredNotes: "Finance validation workflow.",
        attachmentText:
          "Invoice\nVendor: Omega Corp\nSubtotal: 1,000\nTax: 100\nTotal: 1,200\nAmount Due: 1,100",
        expectedCharacteristics: [
          "Detects that the visible financial totals conflict.",
          "Keeps both values available instead of collapsing them into one answer.",
          "Flags the inconsistency explicitly for downstream review.",
        ],
        failureModes: [
          "Blindly selects one value without noting the conflict.",
          "Invents a reconciliation reason that is not in the text.",
          "Overwrites one monetary value with another.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "invoice_extraction",
        whyThisTaskMatters: "Conflict detection prevents financial errors and is a core safety check for extraction agents.",
      },
      {
        id: "tm_messy_intake_mixed_formats_008",
        title: "Messy Intake Form with Mixed Formats",
        description: "Extract structured data from inconsistent intake form.",
        structuredNotes: "Customer onboarding automation.",
        attachmentText:
          "Client Intake\nName: Jane Doe\nPhone 123-456-7890\nEmail: jane@doe.com\nPreferred Contact: phone/email\nBudget approx 5k\nStart Date: ASAP",
        expectedCharacteristics: [
          "Handles missing delimiters and approximate values.",
          "Extracts the phone and email despite inconsistent formatting.",
          "Preserves ambiguity in budget and start date instead of pretending they are exact.",
        ],
        failureModes: [
          "Fails to extract the phone number because of formatting inconsistency.",
          "Turns the approximate budget into a precise amount without caveat.",
          "Misses the ambiguous preferred-contact value.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "onboarding",
        whyThisTaskMatters: "Messy intake forms are a realistic test of extraction resilience under inconsistent formatting.",
      },
      {
        id: "tm_irregular_table_rows_009",
        title: "Table with Irregular Rows",
        description: "Extract table with inconsistent row structure.",
        structuredNotes: "Ops reporting system.",
        attachmentText:
          "Report\nItem | Qty | Price\nLaptop | 5 | 1000\nMouse | 20\nKeyboard | 10 | 50",
        expectedCharacteristics: [
          "Maintains row structure even when one row is incomplete.",
          "Flags the missing price for Mouse as uncertain or missing.",
          "Avoids dropping the incomplete row entirely.",
        ],
        failureModes: [
          "Drops the incomplete row.",
          "Misaligns Mouse quantity and price values.",
          "Fills in a missing price that was never provided.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "operations",
        whyThisTaskMatters: "Irregular exports are common in operations and test whether the agent preserves partial but useful rows.",
      },
      {
        id: "tm_implicit_total_trap_010",
        title: "Adversarial: Implicit Total Calculation",
        description: "Determine total when not explicitly stated.",
        structuredNotes: "Test model against over-inference.",
        attachmentText:
          "Invoice\nItems:\n- Service A: 200\n- Service B: 300\nNo total provided",
        expectedCharacteristics: [
          "Flags the total as missing rather than invented.",
          "Keeps the explicit item values available for review.",
          "Avoids turning arithmetic possibility into confirmed extracted data.",
        ],
        failureModes: [
          "Calculates and reports a total as though it were present.",
          "Assumes the prompt author wanted arithmetic instead of extraction.",
          "Blurs explicit values and inferred values.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "invoice_extraction",
        whyThisTaskMatters: "This is a direct hallucination trap for financial extraction agents.",
      },
      {
        id: "tm_ambiguous_field_mapping_011",
        title: "Adversarial: Ambiguous Field Mapping",
        description: "Extract correct fields when labels are unclear.",
        structuredNotes: "Test robustness to ambiguous keys.",
        attachmentText:
          "Record\nRef: 9982\nValue: 500\nType: Payment\nRef: 9983\nValue: TBD",
        expectedCharacteristics: [
          "Separates the visible records instead of merging them.",
          "Keeps the TBD value as uncertain.",
          "Avoids overwriting earlier entries with later repeated labels.",
        ],
        failureModes: [
          "Merges the two records into one.",
          "Overwrites 9982 with 9983 or vice versa.",
          "Treats TBD as a confirmed numeric value.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "finance",
        whyThisTaskMatters: "Ambiguous repeated-key logs are a realistic way to test whether extraction preserves record boundaries.",
      },
      {
        id: "tm_noise_overload_012",
        title: "Adversarial: Overloaded Text with Noise",
        description: "Extract key fields from noisy text.",
        structuredNotes: "Stress test extraction under noise.",
        attachmentText:
          "!!! INVOICE !!!\nVendor***: Zeta Inc\nRandom text here\nAmount?? 750 USD\nIgnore this line\nDate:: 2025/05/01\nMore noise\nStatus: Paid",
        expectedCharacteristics: [
          "Filters obvious noise while preserving the key structured values.",
          "Extracts vendor, amount, date, and status from irregular labels.",
          "Avoids treating stray lines as meaningful fields.",
        ],
        failureModes: [
          "Extracts noise as if it were a field.",
          "Misses the main financial or date fields because of punctuation.",
          "Produces overconfident structured output from noisy text without uncertainty handling.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "invoice_extraction",
        whyThisTaskMatters: "Noise handling is critical for real-world ingestion pipelines that receive badly formatted documents.",
      },
    ],
  },
  {
    agent: "Briefly",
    tasks: [
      {
        id: "br_weekly_product_standup_001",
        title: "Weekly Product Standup Summary",
        description: "Summarize key updates, blockers, and next steps from a noisy product team standup transcript.",
        structuredNotes: "Audience: VP Product; wants concise bullets with owners and timelines.",
        attachmentText:
          "Monday Standup Transcript (Condensed)\nPM (Lena): Kicking off—last week we shipped the billing fixes, but we're still seeing edge cases in prorations. Not urgent but annoying. Also, the onboarding revamp is at 80%—design signed off, engineering still wiring analytics.\nEng (Ravi): Yeah, on prorations we've got a patch in staging; need QA signoff. For onboarding, Mixpanel events are missing for step 3; we'll fix by Wed.\nDesign (Marta): Minor tweak to step 2 copy; legal wants a disclaimer.\nCS (Ayo): Customers are asking about invoice clarity; tickets up ~12%. Might be tied to prorations confusion.\nOps (Ben): Vendor SSO outage last Thurs—resolved, no lasting impact.\nPM (Lena): Next week focus: onboarding completion + invoice clarity doc. Also, we'll defer referral feature.\nSide chatter about offsite, hiring updates, and lunch plans omitted.",
        expectedCharacteristics: [
          "Extracts shipped work, blockers, customer signal, and next steps with owners or timelines where visible.",
          "Ignores the transcript noise and side chatter.",
          "Preserves the customer-support metric and the analytics blocker.",
        ],
        failureModes: [
          "Over-summarizes without specifics.",
          "Includes irrelevant chatter.",
          "Misses metrics, timelines, or owners.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "meeting_notes",
        whyThisTaskMatters: "Execs need fast, accurate snapshots that preserve ownership and urgency signals without transcript noise.",
      },
      {
        id: "br_board_update_mixed_inputs_002",
        title: "Board Update from Mixed Inputs",
        description: "Create an executive board update from mixed product, finance, and ops notes.",
        structuredNotes: "Audience: Board; prefers sections: Highlights, Risks, Financials, Next Quarter Focus.",
        attachmentText:
          "Inputs:\n- Product: Launched v2 onboarding; completion up from 41% to 58% (2 weeks).\n- Finance: MRR $2.1M (+4% MoM); burn $480k; runway 11 months.\n- Sales: Closed 3 enterprise deals (ACV $120k avg); pipeline $3.4M.\n- Ops: Data warehouse migration delayed 2 weeks due to schema mismatch.\n- Support: NPS 47 (down from 52) driven by billing confusion.\n- CEO notes: Emphasize capital efficiency and enterprise expansion.\n- Misc: Hiring 2 backend engineers; office lease renegotiation ongoing.",
        expectedCharacteristics: [
          "Organizes the notes into board-ready sections instead of one flat summary.",
          "Includes the key metrics like MRR, burn, runway, NPS, and sales pipeline.",
          "Calls out both wins and risks clearly.",
        ],
        failureModes: [
          "Jumbles sections together.",
          "Omits key metrics.",
          "Adds speculation beyond the visible notes.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "board_updates",
        whyThisTaskMatters: "Board updates need strong structure and metric fidelity, which makes this a good summarization quality test.",
      },
      {
        id: "br_customer_interview_synthesis_003",
        title: "Customer Interview Synthesis",
        description: "Summarize themes, pain points, and opportunities from a customer interview transcript.",
        structuredNotes: "Audience: Product; wants themes with supporting quotes and impact.",
        attachmentText:
          "Interview (SaaS Ops Manager, mid-market):\n- \"Billing is confusing when seats change mid-cycle.\"\n- Uses exports weekly; wants API for reports.\n- \"Onboarding was smoother this month.\"\n- Needs role-based access; current workaround is messy.\n- Price sensitivity moderate; willing to pay for automation.\n- Minor complaints about dashboard load times (~3-4s occasionally).\nOff-topic discussion about team structure and tools omitted.",
        expectedCharacteristics: [
          "Identifies themes such as billing confusion, API demand, RBAC needs, and performance.",
          "Includes the positive onboarding signal rather than only negative feedback.",
          "Uses representative quotes without turning the output into raw notes.",
        ],
        failureModes: [
          "Lists verbatim notes without synthesis.",
          "Misses the positive signal.",
          "Ignores the performance mention.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "customer_interviews",
        whyThisTaskMatters: "Interview synthesis should reveal themes and opportunities rather than just compressing bullets.",
      },
      {
        id: "br_launch_update_summary_004",
        title: "Launch Update Summary",
        description: "Summarize a product launch update with metrics and issues.",
        structuredNotes: "Audience: Leadership; wants outcomes vs goals, issues, and next steps.",
        attachmentText:
          "Launch v2 Onboarding (Week 1):\nGoals: +10% completion, reduce drop-off at step 2.\nResults: Completion +17% (41%→58%); step 2 drop-off down 22%.\nIssues: Missing analytics on step 3 for 36 hours; 2 minor UI bugs (copy + tooltip).\nSupport: Tickets stable; no spike.\nMarketing: Email campaign CTR 4.2%.\nNext: A/B test step 4; finalize help docs.",
        expectedCharacteristics: [
          "Compares the results directly against the goals.",
          "Highlights both the win and the analytics gap.",
          "Ends with clear next steps.",
        ],
        failureModes: [
          "Ignores the stated goals.",
          "Omits the issues section.",
          "Misstates the metrics.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "project_updates",
        whyThisTaskMatters: "Launch updates should show outcomes versus expectations rather than a list of disconnected facts.",
      },
      {
        id: "br_incident_summary_sev2_005",
        title: "Incident Summary (SEV-2)",
        description: "Produce a concise incident summary with impact, root cause, and remediation.",
        structuredNotes: "Audience: Exec + Eng; wants timeline and customer impact.",
        attachmentText:
          "Incident Report:\nTime: 2025-05-03 14:10–15:05 UTC\nImpact: 18% of users experienced login failures.\nCause: Expired SSO certificate at vendor.\nDetection: Spike in 401 errors; alert fired at 14:12.\nMitigation: Rolled back to backup cert; service restored 15:05.\nFollow-ups: Add certificate expiry alerts; vendor SLA review.\nNoise: internal Slack chatter and unrelated alerts omitted.",
        expectedCharacteristics: [
          "Captures the incident timeline, impact, cause, mitigation, and follow-ups.",
          "Keeps the summary concise and operationally useful.",
          "Does not confuse detection with cause or mitigation.",
        ],
        failureModes: [
          "Misses the timeline or impact percentage.",
          "Confuses cause versus mitigation.",
          "Lets omitted chatter leak into the summary.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "incident_summaries",
        whyThisTaskMatters: "Incident summaries are high-pressure artifacts where clarity and factual integrity matter.",
      },
      {
        id: "br_cross_team_recap_006",
        title: "Cross-Team Meeting Recap",
        description: "Summarize a cross-functional meeting with decisions and owners.",
        structuredNotes: "Audience: PMO; needs decisions, owners, deadlines.",
        attachmentText:
          "Meeting Notes:\n- Decision: Defer referral feature to Q3 (Owner: Lena).\n- Decision: Publish invoice clarity doc (Owner: Ayo, due Fri).\n- Blocker: Analytics missing for onboarding step 3 (Owner: Ravi, fix by Wed).\n- Risk: Data migration delay (Owner: Ben).\n- Misc: Hiring updates, offsite planning.\nDiscussion meandered across topics.",
        expectedCharacteristics: [
          "Extracts decisions, blockers, and risks separately.",
          "Preserves owners and deadlines.",
          "Removes irrelevant meeting chatter.",
        ],
        failureModes: [
          "Loses owners or due dates.",
          "Mixes decisions with blockers and risks.",
          "Includes irrelevant discussion details.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "meeting_notes",
        whyThisTaskMatters: "Teams rely on meeting recaps to drive execution, so owner and deadline fidelity is critical.",
      },
      {
        id: "br_conflicting_metrics_board_notes_007",
        title: "Conflicting Metrics in Board Notes",
        description: "Summarize board notes where metrics conflict and flag discrepancies.",
        structuredNotes: "Audience: Board; must note conflicts explicitly.",
        attachmentText:
          "Board Prep Notes:\n- Finance doc: MRR $2.1M (+4% MoM).\n- CEO slide: MRR $2.3M (+6% MoM).\n- NPS: 47 (support report) vs 50 (marketing deck).\n- Sales: 3 enterprise deals closed; ACV $120k.\n- Ops: Data migration delay 2 weeks.\nAdditional commentary about strategy omitted.",
        expectedCharacteristics: [
          "Summarizes the key business updates.",
          "Explicitly flags the MRR and NPS conflicts.",
          "Avoids choosing one conflicting number as truth.",
        ],
        failureModes: [
          "Picks one metric arbitrarily.",
          "Ignores the conflicts.",
          "Merges conflicting values incorrectly.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "board_updates",
        whyThisTaskMatters: "Conflicting metrics are a realistic executive-summary trap and test whether the agent preserves uncertainty.",
      },
      {
        id: "br_long_noisy_transcript_sparse_facts_008",
        title: "Long Noisy Transcript with Sparse Facts",
        description: "Extract key facts from a long, noisy transcript where only a few details matter.",
        structuredNotes: "Audience: Exec; wants 5-bullet summary max.",
        attachmentText:
          "All-Hands Transcript (excerpt):\nLots of discussion about culture, kudos, hiring, random jokes, and logistics.\nKey mentions buried:\n- Revenue hit $2.1M MRR this month.\n- Onboarding v2 improved completion to 58%.\n- SSO outage last week affected 18% users for ~1 hour.\n- Plan to hire 2 backend engineers.\n- Data migration delayed 2 weeks.\nRemaining text largely noise.",
        expectedCharacteristics: [
          "Extracts only the few meaningful facts.",
          "Respects the brevity constraint.",
          "Ignores filler and social chatter.",
        ],
        failureModes: [
          "Includes irrelevant all-hands chatter.",
          "Misses one of the buried facts.",
          "Exceeds the intended brevity.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "executive_summarization",
        whyThisTaskMatters: "Leaders often need signal from noisy internal communications, so selectivity matters as much as compression.",
      },
      {
        id: "br_mixed_incident_feedback_009",
        title: "Mixed Source Incident + Customer Feedback",
        description: "Summarize combined incident notes and customer feedback, distinguishing facts vs sentiment.",
        structuredNotes: "Audience: Ops; wants impact + customer sentiment.",
        attachmentText:
          "Incident + Feedback:\nIncident: Login failures 18% users for 55 minutes due to SSO cert expiry.\nCustomer feedback:\n- \"Login was down for an hour—unacceptable.\"\n- \"Resolved quickly but concerning.\"\n- Some users reported slow dashboards (unrelated).\nInternal notes mention vendor SLA review.\nOther chatter omitted.",
        expectedCharacteristics: [
          "Separates hard incident facts from customer sentiment.",
          "Keeps unrelated dashboard feedback clearly marked as separate.",
          "Includes follow-up implications like the SLA review.",
        ],
        failureModes: [
          "Blends sentiment into factual incident details.",
          "Ignores the unrelated note.",
          "Omits follow-up actions.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "incident_summaries",
        whyThisTaskMatters: "Good summaries preserve the line between what happened and how customers felt about it.",
      },
      {
        id: "br_overgeneralization_trap_010",
        title: "Adversarial: Overgeneralization Trap",
        description: "Summarize notes that tempt overgeneralization beyond evidence.",
        structuredNotes: "Ensure only supported claims are included.",
        attachmentText:
          "Notes:\n- \"Some customers find billing confusing.\"\n- 3 support tickets mention proration issues.\n- No data on overall churn impact.\n- Onboarding improved completion to 58%.\n- Suggestion: \"Billing may be hurting retention\" (not proven).",
        expectedCharacteristics: [
          "Reports the supported facts.",
          "Marks the churn-retention idea as a hypothesis rather than a confirmed conclusion.",
          "Avoids causal claims that are not supported by the notes.",
        ],
        failureModes: [
          "States that billing confusion is causing churn.",
          "Exaggerates the scope of the issue from limited evidence.",
          "Presents suggestions as established facts.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "project_updates",
        whyThisTaskMatters: "This tests whether the agent can resist common executive-summary overreach when evidence is thin.",
      },
      {
        id: "br_missing_evidence_request_011",
        title: "Adversarial: Missing Evidence Request",
        description: "Summarize with a requirement to answer an unsupported question.",
        structuredNotes: "User asks for root cause not present in text.",
        attachmentText:
          "Meeting Notes:\n- SSO outage lasted ~1 hour.\n- Vendor issue mentioned but no details.\n- Follow-up: review SLA.\nQuestion: What exactly caused the outage?",
        expectedCharacteristics: [
          "Summarizes the visible notes accurately.",
          "Explicitly states that the exact root cause is not supported by the text.",
          "Avoids inventing outage details.",
        ],
        failureModes: [
          "Invents a specific root cause.",
          "Over-speculates based on the mention of a vendor issue.",
          "Answers the unsupported question as though evidence were present.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "incident_summaries",
        whyThisTaskMatters: "This checks whether the summarizer can stay honest when the user asks for more certainty than the source supports.",
      },
      {
        id: "br_conflicting_customer_quotes_012",
        title: "Adversarial: Conflicting Customer Quotes",
        description: "Summarize conflicting customer feedback accurately.",
        structuredNotes: "Highlight divergence without bias.",
        attachmentText:
          "Customer Feedback:\n- \"Onboarding is much better now.\"\n- \"Still confusing at step 3.\"\n- \"Huge improvement overall.\"\n- \"I got stuck and had to contact support.\"\nAdditional chatter omitted.",
        expectedCharacteristics: [
          "Presents a balanced view of the positive and negative signals.",
          "Highlights improvement while acknowledging unresolved friction.",
          "Avoids biasing the summary toward either extreme.",
        ],
        failureModes: [
          "Over-indexes on only the positive or negative quotes.",
          "Ignores the disagreement in the source material.",
          "Presents a one-sided product conclusion.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "customer_interviews",
        whyThisTaskMatters: "Balanced synthesis is essential when source feedback is mixed and could easily be spun in one direction.",
      },
    ],
  },
  {
    agent: "PolyLane",
    tasks: [
      {
        id: "pl_support_article_en_es_001",
        title: "Support Article EN→ES (Latin America)",
        description: "Translate a help center article into Spanish (LATAM), preserving product terms and tone.",
        structuredNotes: "Target: es-419; Preserve glossary: 'ClauseLens', 'Workspace', 'API Key'; Formal but friendly tone.",
        attachmentText:
          "Target Language: es-419\nSource Copy:\nTitle: Reset your password\nBody: If you forgot your password, go to Settings → Security and click \"Reset Password\". We will send a verification code to your email. Enter the code and choose a new password. Note: Your API Key will not change. If you use SSO, contact your Workspace admin.",
        expectedCharacteristics: [
          "Translates accurately while preserving the required glossary terms.",
          "Keeps the UI path and step order clear.",
          "Uses neutral LATAM Spanish with a support-appropriate tone.",
        ],
        failureModes: [
          "Translates protected product or glossary terms.",
          "Changes the meaning of UI paths or steps.",
          "Uses regionally mismatched wording without need.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "support_content",
        whyThisTaskMatters: "Support localization needs both instruction accuracy and strong terminology discipline.",
      },
      {
        id: "pl_product_banner_en_fr_002",
        title: "Product Banner EN→FR (France)",
        description: "Localize a marketing banner into French for France, keeping brand voice and CTA clarity.",
        structuredNotes: "Target: fr-FR; Keep brand 'PolyLane'; Tone: concise, confident; Avoid Anglicisms.",
        attachmentText:
          "Target Language: fr-FR\nSource Copy:\nHeadline: Ship faster with PolyLane\nSubtext: Translate and localize your product in minutes.\nCTA: Get started",
        expectedCharacteristics: [
          "Preserves the PolyLane brand name.",
          "Uses natural concise French phrasing for France.",
          "Keeps the CTA clear and conversion-oriented.",
        ],
        failureModes: [
          "Literal awkward translation.",
          "Alters the brand name.",
          "Produces a weak or unclear CTA.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "product_copy",
        whyThisTaskMatters: "Short marketing copy is a strong test of whether localization can stay natural without losing clarity.",
      },
      {
        id: "pl_release_notes_en_de_003",
        title: "Release Notes EN→DE",
        description: "Translate release notes into German, preserving technical terms and formatting.",
        structuredNotes: "Target: de-DE; Keep code terms (API, webhook); Maintain bullet structure.",
        attachmentText:
          "Target Language: de-DE\nSource Copy:\nRelease v2.3\n- Added webhook retries\n- Improved API latency by 20%\n- Fixed bug in Workspace permissions\nNote: No breaking changes.",
        expectedCharacteristics: [
          "Preserves the technical terms API, webhook, and Workspace as instructed.",
          "Keeps the bullet structure intact.",
          "Maintains the percentage and release-note clarity.",
        ],
        failureModes: [
          "Translates technical terms incorrectly.",
          "Loses the bullet format.",
          "Changes the numeric values or version context.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "product_copy",
        whyThisTaskMatters: "Technical release notes require both translation quality and structural fidelity.",
      },
      {
        id: "pl_customer_email_en_ptbr_004",
        title: "Customer Email EN→PT-BR",
        description: "Localize a support email into Brazilian Portuguese with polite tone.",
        structuredNotes: "Target: pt-BR; Tone: polite, empathetic; Preserve placeholders.",
        attachmentText:
          "Target Language: pt-BR\nSource Copy:\nHi {{name}},\nWe noticed unusual activity on your account and temporarily locked access. Please verify your email to restore access. If you did not initiate this, contact support immediately.\nThanks,\nThe PolyLane Team",
        expectedCharacteristics: [
          "Preserves placeholders like {{name}}.",
          "Uses an empathetic and security-appropriate tone for Brazilian Portuguese.",
          "Keeps the instructions and urgency clear.",
        ],
        failureModes: [
          "Breaks or rewrites the placeholder incorrectly.",
          "Uses an off-tone level of formality.",
          "Weakens or mistranslates the security instruction.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "support_content",
        whyThisTaskMatters: "Security communications are sensitive, so localization quality directly affects trust and response rate.",
      },
      {
        id: "pl_ui_microcopy_en_ja_005",
        title: "UI Microcopy EN→JA",
        description: "Translate short UI strings into Japanese, ensuring brevity and clarity.",
        structuredNotes: "Target: ja-JP; Keep UI brevity; Preserve 'Workspace'.",
        attachmentText:
          "Target Language: ja-JP\nSource Copy:\nSave changes\nCancel\nInvite to Workspace\nDelete permanently",
        expectedCharacteristics: [
          "Produces concise natural Japanese UI strings.",
          "Preserves the protected term Workspace.",
          "Maintains a consistent button-label style.",
        ],
        failureModes: [
          "Uses unnecessarily long phrases.",
          "Translates the protected product term.",
          "Creates inconsistent register across the labels.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "product_copy",
        whyThisTaskMatters: "UI microcopy needs brevity and consistency, which makes it a good localization precision test.",
      },
      {
        id: "pl_kb_guide_en_it_006",
        title: "Knowledge Base EN→IT",
        description: "Translate a troubleshooting guide into Italian with step clarity.",
        structuredNotes: "Target: it-IT; Keep numbered steps; Preserve 'API Key'.",
        attachmentText:
          "Target Language: it-IT\nSource Copy:\nTroubleshooting API errors\n1. Check your API Key in Settings.\n2. Ensure your endpoint returns 200 OK.\n3. Retry the request after 30 seconds.\nIf the issue persists, contact support.",
        expectedCharacteristics: [
          "Preserves the numbered-step structure.",
          "Keeps API Key and HTTP phrasing intact where needed.",
          "Maintains a clear imperative troubleshooting tone.",
        ],
        failureModes: [
          "Changes the order of steps.",
          "Mistranslates technical HTTP or API wording.",
          "Loses the imperative clarity.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "support_content",
        whyThisTaskMatters: "Troubleshooting docs are only useful if instructions remain technically precise and easy to follow.",
      },
      {
        id: "pl_locale_variant_en_eses_007",
        title: "Mixed Locale Adaptation EN→ES (Spain vs LATAM)",
        description: "Adapt copy for Spain Spanish while avoiding LATAM terms; ensure consistency.",
        structuredNotes: "Target: es-ES; Avoid LATAM variants; Preserve 'Workspace'.",
        attachmentText:
          "Target Language: es-ES\nSource Copy:\nUpdate your billing details in Settings. If your card fails, we'll retry the charge within 24 hours. Contact support if the issue continues.",
        expectedCharacteristics: [
          "Uses Spain-appropriate vocabulary rather than LATAM defaults.",
          "Preserves the protected product term Workspace if relevant.",
          "Keeps billing and retry language clear and consistent.",
        ],
        failureModes: [
          "Uses LATAM-specific wording despite the es-ES target.",
          "Creates inconsistent register across sentences.",
          "Alters the operational meaning of retry or billing steps.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "localization",
        whyThisTaskMatters: "Regional adaptation is a real product-quality issue and not just a literal translation problem.",
      },
      {
        id: "pl_glossary_sensitive_en_ko_008",
        title: "Glossary-Sensitive Translation EN→KO",
        description: "Translate content with strict glossary enforcement and mixed technical terms.",
        structuredNotes: "Target: ko-KR; Glossary: 'ClauseLens', 'Workspace', 'API Key' unchanged; Keep 'webhook' untranslated.",
        attachmentText:
          "Target Language: ko-KR\nSource Copy:\nConnect your webhook to ClauseLens to receive real-time updates. Store your API Key securely in your Workspace settings. Do not share it publicly.",
        expectedCharacteristics: [
          "Keeps all protected glossary terms unchanged.",
          "Uses natural Korean sentence flow around the protected terms.",
          "Preserves the security instruction clearly.",
        ],
        failureModes: [
          "Translates protected glossary or technical terms.",
          "Produces awkward grammar around English tokens.",
          "Weakens the security warning.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "product_copy",
        whyThisTaskMatters: "Glossary-sensitive translation is where localization systems often drift and create inconsistency across docs and UI.",
      },
      {
        id: "pl_noisy_support_thread_en_fr_009",
        title: "Noisy Support Thread EN→FR",
        description: "Extract and translate only the relevant support resolution from a noisy thread.",
        structuredNotes: "Target: fr-FR; Focus on final resolution; ignore irrelevant chatter.",
        attachmentText:
          "Target Language: fr-FR\nSource Copy:\nThread:\nUser: It's broken.\nAgent: Can you share logs?\nUser: Here.\n(irrelevant logs and side conversation)\nAgent: Issue caused by expired token. Please regenerate your API Key and retry.\nUser: Works now, thanks!",
        expectedCharacteristics: [
          "Captures the final actionable resolution rather than the full thread noise.",
          "Preserves API Key in English.",
          "Keeps the translated resolution concise and usable.",
        ],
        failureModes: [
          "Includes irrelevant logs or side conversation.",
          "Mistranslates the final remediation.",
          "Omits the action steps from the resolution.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "support_content",
        whyThisTaskMatters: "Real support threads are noisy, so localization should preserve the final answer rather than the whole exchange.",
      },
      {
        id: "pl_unsupported_dialect_trap_010",
        title: "Adversarial: Unsupported Language Pair",
        description: "Handle request to translate into an unspecified or unsupported dialect; respond with uncertainty.",
        structuredNotes: "User asks for 'Spanish (Caribbean slang)' without clear standard.",
        attachmentText:
          "Target Language: Spanish (Caribbean slang)\nSource Copy:\nEnable two-factor authentication to secure your account.",
        expectedCharacteristics: [
          "Requests clarification or offers a safer standard alternative.",
          "Avoids pretending there is one clear standard for the requested dialect style.",
          "Keeps the response helpful without fabricating slang choices.",
        ],
        failureModes: [
          "Invents a non-standard dialect confidently.",
          "Uses inconsistent slang as though it were authoritative.",
          "Ignores the ambiguity in the request.",
        ],
        difficulty: "adversarial",
        grounded: false,
        category: "localization",
        whyThisTaskMatters: "This checks whether the agent can surface locale ambiguity instead of guessing at an unreliable target style.",
      },
      {
        id: "pl_conflicting_glossary_instructions_011",
        title: "Adversarial: Conflicting Instructions",
        description: "Handle conflicting directives about preserving vs translating product terms.",
        structuredNotes: "Instruction conflict: 'Translate everything' vs 'Do not translate API Key, Workspace'.",
        attachmentText:
          "Target Language: de-DE\nSource Copy:\nTranslate everything into German. Do not leave any English terms.\nContent: Store your API Key in your Workspace.",
        expectedCharacteristics: [
          "Resolves the conflict by honoring the glossary-protection constraint.",
          "Translates the rest of the text into German.",
          "Does not panic or refuse outright when a partial resolution is possible.",
        ],
        failureModes: [
          "Translates the protected glossary terms anyway.",
          "Refuses to attempt the translation despite a reasonable resolution path.",
          "Ignores the conflict and produces an inconsistent result.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "product_copy",
        whyThisTaskMatters: "Conflicting instructions are common in localization workflows, so the agent should resolve them safely rather than blindly following one line.",
      },
      {
        id: "pl_missing_locale_tone_context_012",
        title: "Adversarial: Insufficient Context for Tone",
        description: "Translate marketing copy where tone or region is unspecified; mark uncertainty or ask for clarification.",
        structuredNotes: "No target locale specified; ambiguous tone.",
        attachmentText:
          "Target Language: French\nSource Copy:\nUnlock your team's potential with smarter workflows.",
        expectedCharacteristics: [
          "Requests clarification or makes a clearly stated neutral assumption.",
          "Avoids overcommitting to a regional French variant without saying so.",
          "Keeps the handling of uncertainty explicit.",
        ],
        failureModes: [
          "Chooses a locale variant arbitrarily without acknowledging the assumption.",
          "Produces a tone mismatched to the missing brief.",
          "Pretends the request was fully specified when it was not.",
        ],
        difficulty: "adversarial",
        grounded: false,
        category: "localization",
        whyThisTaskMatters: "Locale and tone ambiguity is a real failure mode for marketing localization, so the agent should surface it cleanly.",
      },
    ],
  },
  {
    agent: "SchemaSmith",
    tasks: [
      {
        id: "ss_lead_intake_to_json_schema_001",
        title: "Lead Intake Form to JSON Schema",
        description: "Design a JSON schema and sample output from a messy lead intake form for CRM ingestion.",
        structuredNotes: "Target: HubSpot ingestion; avoid extra fields; normalize phone and budget.",
        attachmentText:
          "Lead Form:\nName: Tunde A.\nEmail: tunde@acme.io\nPhone: +234 803 555 1212\nCompany: Acme Logistics\nBudget: ~5k USD\nUse case: onboarding + reporting\nPreferred contact: email\nNotes: wants demo next week\n(checkbox) Subscribe to updates: yes",
        expectedCharacteristics: [
          "Defines a minimal schema covering only the visible lead fields.",
          "Normalizes the phone and approximate budget safely.",
          "Provides a valid JSON example aligned to the schema.",
        ],
        failureModes: [
          "Invents fields such as lead_score or lifecycle stage.",
          "Drops visible fields from the intake form.",
          "Misinterprets the approximate budget or phone format.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "schema_design",
        whyThisTaskMatters: "Reliable CRM automation depends on minimal, well-grounded structured lead payloads.",
      },
      {
        id: "ss_support_ticket_payload_mapping_002",
        title: "Support Ticket Payload Mapping",
        description: "Map a support email into a structured ticket JSON for a helpdesk API.",
        structuredNotes: "Target: Zendesk-like API; required fields: subject, requester_email, priority, description.",
        attachmentText:
          "Email:\nFrom: alice@client.com\nSubject: Cannot access dashboard\nBody: Hi team, I get a 403 when logging in. Started this morning. Urgent as we have a demo.\nSignature: Alice, Ops Manager",
        expectedCharacteristics: [
          "Maps the visible email into the required helpdesk fields.",
          "Keeps the description close to the source message.",
          "Uses only the required payload shape without extra speculative fields.",
        ],
        failureModes: [
          "Adds unsupported fields.",
          "Misclassifies the priority from the visible urgency signal.",
          "Rewrites the description into something less faithful than the original email.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "field_mapping",
        whyThisTaskMatters: "Helpdesk integrations work best when payloads are strict, minimal, and faithful to the incoming message.",
      },
      {
        id: "ss_invoice_ocr_to_structured_json_003",
        title: "Invoice OCR to Structured JSON",
        description: "Create schema and output for invoice extraction from semi-structured text.",
        structuredNotes: "Target: AP automation; fields: vendor, invoice_number, date, currency, line_items[], subtotal, tax, total.",
        attachmentText:
          "INVOICE\nVendor: Beta Supplies\nInv#: B-9912\nDate: 2025/04/12\nItems:\n- Chairs x10 @120\n- Desks x5 @300\nSubtotal 2700\nTax 216\nTotal 2916 USD",
        expectedCharacteristics: [
          "Produces a schema with a line_items array instead of flattening the invoice.",
          "Separates numeric values from currency cleanly.",
          "Includes a sample JSON output aligned to the visible invoice text.",
        ],
        failureModes: [
          "Flattens line items into one string.",
          "Treats currency as part of the numeric amount field.",
          "Mismatches the visible invoice totals.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "json_outputs",
        whyThisTaskMatters: "Invoice pipelines need predictable structure, not just extraction of loose key-value text.",
      },
      {
        id: "ss_product_event_payload_design_004",
        title: "Product Event Payload Design",
        description: "Design an event schema for tracking onboarding completion.",
        structuredNotes: "Target: analytics pipeline; avoid PII beyond email hash; include timestamps.",
        attachmentText:
          "Requirement:\nTrack when a user completes onboarding.\nData available:\nuser email, user id, completion time, steps count (4), plan type (pro/free).",
        expectedCharacteristics: [
          "Designs a schema with event-safe analytics fields.",
          "Excludes raw email and uses an email-hash style field instead.",
          "Uses a timestamp field suitable for analytics pipelines.",
        ],
        failureModes: [
          "Includes raw email despite the privacy constraint.",
          "Omits one of the explicitly available fields.",
          "Uses an unstable or vague timestamp field definition.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "schema_design",
        whyThisTaskMatters: "Event schemas must balance privacy, analytics usefulness, and structural consistency.",
      },
      {
        id: "ss_crm_field_mapping_repeated_keys_005",
        title: "CRM Field Mapping with Repeated Keys",
        description: "Map multiple contacts from a vendor record into structured JSON.",
        structuredNotes: "Target: CRM; support multiple contacts array.",
        attachmentText:
          "Vendor Record:\nVendor: Delta Logistics\nContact: Sarah Lee, sarah@delta.com\nContact: John Smith, john@delta.com\nBank: First Bank\nAcct: 12345678",
        expectedCharacteristics: [
          "Creates a contacts array rather than overwriting repeated contact lines.",
          "Preserves both contacts and their emails.",
          "Keeps the vendor and bank details outside the contact objects where appropriate.",
        ],
        failureModes: [
          "Overwrites one contact with the other.",
          "Flattens the contacts incorrectly into one object.",
          "Drops the banking information.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "field_mapping",
        whyThisTaskMatters: "Repeated-key records are a common schema-design trap for CRM and onboarding automation.",
      },
      {
        id: "ss_workflow_payload_approval_system_006",
        title: "Workflow Payload for Approval System",
        description: "Design JSON payload for procurement approval workflow.",
        structuredNotes: "Target: internal workflow API; required: requester, department, items[], budget, status.",
        attachmentText:
          "Procurement:\nRequester: Jane K\nDept: IT\nItems: Laptops x5; Monitors xTBD\nBudget: 8000 USD\nStatus: Pending",
        expectedCharacteristics: [
          "Creates an items array suitable for a workflow API.",
          "Handles the TBD quantity safely rather than forcing a fake number.",
          "Normalizes the budget into a usable structured field.",
        ],
        failureModes: [
          "Forces TBD into a numeric quantity.",
          "Misses the array structure for requested items.",
          "Adds unsupported workflow fields.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "json_outputs",
        whyThisTaskMatters: "Workflow systems need predictable structures that still tolerate partial or uncertain input values.",
      },
      {
        id: "ss_conflicting_field_values_007",
        title: "Conflicting Field Values Resolution",
        description: "Design schema and output while flagging conflicting totals.",
        structuredNotes: "Target: finance validation; include conflict flag.",
        attachmentText:
          "Invoice:\nSubtotal: 1000\nTax: 100\nTotal: 1200\nAmount Due: 1100",
        expectedCharacteristics: [
          "Includes the visible monetary fields without silently reconciling them.",
          "Adds a conflict indicator or equivalent structure for downstream review.",
          "Keeps the raw conflicting values available.",
        ],
        failureModes: [
          "Chooses one conflicting total silently.",
          "Omits any conflict marker or uncertainty field.",
          "Invents a reconciliation reason not present in the input.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "json_outputs",
        whyThisTaskMatters: "Good schema design must surface conflicts explicitly instead of hiding them inside a normalized output.",
      },
      {
        id: "ss_sparse_input_avoid_hallucination_008",
        title: "Sparse Input Schema (Avoid Hallucination)",
        description: "Create schema from minimal input without inventing fields.",
        structuredNotes: "Only include provided data.",
        attachmentText:
          "Input:\nName: Mark\nEmail: mark@example.com",
        expectedCharacteristics: [
          "Outputs a schema limited to the visible name and email fields.",
          "Avoids padding the schema with common CRM extras.",
          "Keeps the sample output equally minimal.",
        ],
        failureModes: [
          "Adds phone, company, or inferred fields.",
          "Builds a bloated general-purpose lead schema.",
          "Introduces fake defaults for missing values.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "schema_design",
        whyThisTaskMatters: "Sparse-input tasks are the simplest way to catch schema hallucination and unnecessary field expansion.",
      },
      {
        id: "ss_irregular_table_to_json_009",
        title: "Irregular Table to JSON",
        description: "Convert irregular table into structured JSON.",
        structuredNotes: "Handle missing values gracefully.",
        attachmentText:
          "Table:\nItem | Qty | Price\nLaptop | 5 | 1000\nMouse | 20\nKeyboard | 10 | 50",
        expectedCharacteristics: [
          "Produces a row array that preserves all three items.",
          "Represents the missing Mouse price explicitly as missing or null-like.",
          "Maintains column alignment even for irregular rows.",
        ],
        failureModes: [
          "Drops the incomplete row.",
          "Misaligns the Mouse values across columns.",
          "Invents a missing price.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "json_outputs",
        whyThisTaskMatters: "Irregular row handling is a common downstream schema challenge in operations and finance data flows.",
      },
      {
        id: "ss_over_inference_of_fields_010",
        title: "Adversarial: Over-Inference of Fields",
        description: "Ensure no extra fields are added when not present.",
        structuredNotes: "Test hallucination resistance.",
        attachmentText:
          "Input:\nUser: Alex\nAction: Login",
        expectedCharacteristics: [
          "Schema includes only the visible user and action fields.",
          "Avoids inferring timestamps, device info, or IP metadata.",
          "Keeps the output intentionally minimal.",
        ],
        failureModes: [
          "Adds timestamp, IP, device, or session fields.",
          "Expands the schema into a generic auth-event payload.",
          "Treats common telemetry assumptions as visible data.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "schema_design",
        whyThisTaskMatters: "This directly tests whether the agent invents fields from context rather than source text.",
      },
      {
        id: "ss_ambiguous_mapping_011",
        title: "Adversarial: Ambiguous Mapping",
        description: "Handle ambiguous keys without incorrect mapping.",
        structuredNotes: "Multiple 'value' fields.",
        attachmentText:
          "Record:\nRef: 123\nValue: 500\nRef: 124\nValue: TBD",
        expectedCharacteristics: [
          "Creates a record array or similarly safe structure.",
          "Preserves both Ref entries distinctly.",
          "Handles the TBD value without forcing a confirmed type.",
        ],
        failureModes: [
          "Overwrites one record with the other.",
          "Merges the entries into one ambiguous object.",
          "Treats TBD as a confirmed numeric value.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "field_mapping",
        whyThisTaskMatters: "Ambiguous repeated-key inputs are a strong test of whether the schema stays faithful to record boundaries.",
      },
      {
        id: "ss_unsupported_requirement_012",
        title: "Adversarial: Unsupported Requirement",
        description: "Handle request for unavailable data fields.",
        structuredNotes: "User asks for non-existent data.",
        attachmentText:
          "Input:\nName: Lisa\nRequest: Include credit score in output",
        expectedCharacteristics: [
          "Refuses to include credit score as a grounded data field.",
          "Outputs only fields supported by the visible input.",
          "Keeps the schema honest about unavailable data.",
        ],
        failureModes: [
          "Invents a credit score or placeholder value.",
          "Adds unsupported fields just because the request mentions them.",
          "Treats the user request as source data.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "schema_design",
        whyThisTaskMatters: "This tests whether the agent can resist unsafe schema expansion when users ask for unavailable data.",
      },
    ],
  },
  {
    agent: "OpsPilot",
    tasks: [
      {
        id: "op_saas_incident_runbook_login_failures_001",
        title: "SaaS Incident Runbook (Login Failures)",
        description: "Create a step-by-step runbook to triage and resolve login failures caused by SSO issues.",
        structuredNotes:
          "Audience: On-call engineer; include owners, dependencies, risks, and handoffs; require timestamps and escalation criteria.",
        attachmentText:
          "Context: Spike in 401/403 errors on login since 14:10 UTC. Suspected SSO vendor issue. Recent change: certificate rotation scheduled yesterday.\nOwners:\n- On-call Eng (Ravi)\n- SRE (Nadia)\n- Support Lead (Ayo)\nDependencies: SSO vendor dashboard, cert store, status page.\nConstraints: Must restore within 60 minutes. Customer impact high (enterprise demos ongoing).\nExisting notes: Alert fired at 14:12; error rate ~18% users.\nHandoff expectations: Support to update customers; Comms to post status updates.\nRisks: Incorrect cert rollback may lock all users; vendor SLA unknown.",
        expectedCharacteristics: [
          "Provides ordered triage, validation, mitigation, verification, and comms steps.",
          "Assigns visible owners to the relevant steps and handoffs.",
          "Includes escalation timing and risk-aware decision points.",
        ],
        failureModes: [
          "Omits owners or escalation points.",
          "Leaves the runbook unordered or too vague.",
          "Ignores customer communication and rollback risk.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "runbooks",
        whyThisTaskMatters: "Operational runbooks are only useful if they coordinate technical recovery and cross-team communication under time pressure.",
      },
      {
        id: "op_feature_launch_sop_onboarding_v2_002",
        title: "Feature Launch SOP (Onboarding v2)",
        description: "Draft an SOP for launching a new onboarding flow with metrics tracking and rollback plan.",
        structuredNotes:
          "Audience: PM + Eng + Marketing; include pre-launch checklist, go-live steps, monitoring, rollback, and post-launch review.",
        attachmentText:
          "Feature: Onboarding v2\nGoals: +10% completion, reduce step 2 drop-off.\nOwners: PM (Lena), Eng (Ravi), Data (Kemi), Marketing (Ife)\nDependencies: Feature flag service, Mixpanel events, email campaign, help docs.\nTimeline: Soft launch Wed 10:00 UTC; full rollout Fri.\nKnown risks: Missing analytics events on step 3; copy pending legal review.\nHandoffs: Marketing emails post-launch; Support briefed with FAQ.\nSuccess metrics: Completion %, drop-off by step, support ticket volume.",
        expectedCharacteristics: [
          "Includes a sensible pre-launch checklist and phased rollout.",
          "Defines monitoring metrics and rollback triggers.",
          "Preserves cross-functional handoffs and known risks.",
        ],
        failureModes: [
          "Omits rollback criteria.",
          "Misses owners or dependencies.",
          "Turns success metrics into vague goals.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "SOPs",
        whyThisTaskMatters: "Launch SOPs should translate product intent into repeatable operational execution with clear safety rails.",
      },
      {
        id: "op_customer_handoff_doc_sales_success_003",
        title: "Customer Handoff Document (Sales → Success)",
        description: "Create a handoff doc template and filled example for transitioning a new enterprise customer.",
        structuredNotes:
          "Audience: Customer Success; include scope, stakeholders, risks, success criteria, next steps.",
        attachmentText:
          "Account: Orion Health\nDeal: $120k ACV, annual\nUse cases: Reporting API, RBAC\nStakeholders: CTO (primary), Ops Lead\nTimeline: Kickoff next Monday\nKnown risks: Billing confusion for seat changes; tight go-live timeline (2 weeks)\nDependencies: API access, SSO setup, data import\nHandoff notes: Sales promised API early access; discount contingent on Q2 go-live.",
        expectedCharacteristics: [
          "Organizes the handoff into structured sections such as scope, stakeholders, risks, and next steps.",
          "Highlights commitments made during the sale.",
          "Produces a success-ready transition artifact rather than loose notes.",
        ],
        failureModes: [
          "Misses commercial or delivery commitments.",
          "Lacks structure or next steps.",
          "Drops major risks or dependencies.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "handoff_docs",
        whyThisTaskMatters: "Customer handoffs are a frequent failure point, so OpsPilot needs to preserve commitments and risks cleanly.",
      },
      {
        id: "op_support_escalation_workflow_004",
        title: "Support Escalation Workflow",
        description: "Design a workflow for escalating high-priority support tickets.",
        structuredNotes:
          "Audience: Support + Eng; include triggers, SLAs, escalation paths, and communication steps.",
        attachmentText:
          "Context: Ticket volume increased 12% week-over-week. Priority definitions: High (blocking), Medium, Low.\nSLA: High (1h response, 4h resolution), Medium (4h/24h), Low (24h/72h)\nOwners: Support Agent, Support Lead, On-call Eng\nTools: Zendesk, Slack, PagerDuty\nRisks: Misclassification delays, duplicate escalations\nHandoffs: Support → Eng for bugs; Support → Billing for payment issues.",
        expectedCharacteristics: [
          "Defines the triggers, SLAs, roles, and tools clearly.",
          "Creates a step-by-step escalation flow with handoffs.",
          "Includes safeguards against misclassification and duplicate escalation.",
        ],
        failureModes: [
          "Leaves escalation triggers ambiguous.",
          "Misses SLAs or owner clarity.",
          "Ignores the operational risks already present in the source.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "workflows",
        whyThisTaskMatters: "Support escalation only works when ownership, timing, and routing rules are explicit and actionable.",
      },
      {
        id: "op_data_migration_runbook_005",
        title: "Data Migration Runbook",
        description: "Create a runbook for migrating data warehouse schemas with minimal downtime.",
        structuredNotes: "Audience: Data + Eng; include pre-checks, migration steps, validation, rollback.",
        attachmentText:
          "Migration: Legacy warehouse → New schema\nOwners: Data Eng (Kemi), SRE (Nadia)\nDependencies: ETL jobs, schema registry, backups\nTimeline: Saturday 02:00–05:00 UTC\nRisks: Schema mismatch, data loss, delayed pipelines\nValidation: Row counts, checksum, sample queries\nHandoffs: Data → Analytics after validation.",
        expectedCharacteristics: [
          "Includes preparation, execution, validation, and rollback phases.",
          "Uses the visible validation checks and owners.",
          "Preserves the downtime window and handoff expectations.",
        ],
        failureModes: [
          "Omits rollback or validation details.",
          "Leaves ownership vague.",
          "Ignores the timing and dependency constraints.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "runbooks",
        whyThisTaskMatters: "Migration workflows need strong sequencing and validation discipline to protect data integrity.",
      },
      {
        id: "op_enablement_plan_new_feature_006",
        title: "Enablement Plan for New Feature",
        description: "Create an enablement plan for internal teams on a new feature.",
        structuredNotes: "Audience: Sales + Support; include training, materials, timelines.",
        attachmentText:
          "Feature: Reporting API\nOwners: Product (Lena), Enablement (Ife)\nAudience: Sales, Support\nMaterials: Docs, demo video, FAQ\nTimeline: Training Thurs, rollout next week\nRisks: Incomplete docs, inconsistent messaging\nHandoffs: Product → Enablement → Sales/Support.",
        expectedCharacteristics: [
          "Builds a structured enablement sequence with timeline, materials, and feedback flow.",
          "Preserves the handoff chain between teams.",
          "Includes risks around documentation and messaging consistency.",
        ],
        failureModes: [
          "Misses key materials or timeline steps.",
          "Leaves feedback or follow-up loops out.",
          "Ignores the stated risks.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "enablement",
        whyThisTaskMatters: "Enablement plans test whether OpsPilot can turn launch context into cross-functional readiness work.",
      },
      {
        id: "op_conflicting_launch_instructions_007",
        title: "Conflicting Launch Instructions",
        description: "Create SOP when inputs conflict (soft vs full launch timing).",
        structuredNotes: "Resolve conflict conservatively and note assumptions.",
        attachmentText:
          "Notes:\nPM: Soft launch Wed, full Fri.\nCEO: Full launch Wed for press.\nMarketing: Campaign scheduled Fri.\nDependencies: Feature flags, email campaign\nRisks: Misaligned messaging.",
        expectedCharacteristics: [
          "Flags the launch-timing conflict explicitly.",
          "Proposes a conservative phased path rather than silently choosing one input.",
          "Lists assumptions and stakeholder alignment needs.",
        ],
        failureModes: [
          "Chooses one launch path without acknowledging conflict.",
          "Ignores dependency timing.",
          "Presents the outcome as settled when it is not.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "SOPs",
        whyThisTaskMatters: "Conflicting operational instructions are common, and safe planning depends on surfacing rather than hiding them.",
      },
      {
        id: "op_vague_task_limited_info_008",
        title: "Vague Task with Limited Info",
        description: "Create a workflow from vague instructions without over-assuming.",
        structuredNotes: "Stay conservative; request missing info where needed.",
        attachmentText:
          "Task: Improve onboarding experience.\nNotes: Users drop off early. No metrics provided. No owners assigned.",
        expectedCharacteristics: [
          "Proposes a high-level workflow only.",
          "Identifies the missing metrics, owners, and constraints.",
          "Avoids pretending it can create a detailed execution plan from sparse input.",
        ],
        failureModes: [
          "Invents metrics or owners.",
          "Over-specifies detailed execution steps not grounded in the task.",
          "Hides the need for clarification.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "workflows",
        whyThisTaskMatters: "OpsPilot needs to stay useful under ambiguity without manufacturing false precision.",
      },
      {
        id: "op_multi_team_incident_dependencies_009",
        title: "Multi-Team Incident with Dependencies",
        description: "Create a runbook for an incident involving multiple teams and dependencies.",
        structuredNotes: "Include coordination steps and handoffs.",
        attachmentText:
          "Incident: Payment failures\nTeams: Billing, API, Support\nDependencies: Payment gateway, DB\nImpact: 25% transactions failing\nRisks: Revenue loss, customer churn\nHandoffs: Billing → API → Support.",
        expectedCharacteristics: [
          "Defines cross-team coordination and dependency-aware sequencing.",
          "Preserves the handoff flow between Billing, API, and Support.",
          "Includes communication or risk control for revenue-impacting failure.",
        ],
        failureModes: [
          "Misses dependencies or team coordination.",
          "Leaves handoffs unclear.",
          "Treats the incident like a single-team workflow.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "runbooks",
        whyThisTaskMatters: "Cross-team incidents test whether the agent can coordinate work instead of generating a generic single-owner checklist.",
      },
      {
        id: "op_missing_owners_trap_010",
        title: "Adversarial: Missing Owners",
        description: "Handle SOP creation when owners are not specified.",
        structuredNotes: "Do not invent owners; mark as TBD.",
        attachmentText:
          "Task: Launch new feature\nSteps: QA, deploy, monitor\nNo owners listed.",
        expectedCharacteristics: [
          "Marks ownership as missing or TBD.",
          "Keeps the SOP grounded without assigning imaginary people or teams.",
          "Still provides a usable structure despite the missing ownership data.",
        ],
        failureModes: [
          "Invents owners or role assignments.",
          "Hides the ownership gap.",
          "Turns a missing-data problem into fake certainty.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "SOPs",
        whyThisTaskMatters: "This directly checks whether OpsPilot can stay conservative when accountability information is absent.",
      },
      {
        id: "op_over_specification_trap_011",
        title: "Adversarial: Over-Specification Trap",
        description: "Avoid over-detailing beyond provided info.",
        structuredNotes: "Keep output minimal and grounded.",
        attachmentText:
          "Task: Improve support response time.\nNotes: No data provided.",
        expectedCharacteristics: [
          "Provides only high-level grounded next steps.",
          "Explicitly notes the missing data needed for a more specific plan.",
          "Avoids inventing SLAs, tools, or metrics.",
        ],
        failureModes: [
          "Invents SLAs, tools, or measurement baselines.",
          "Produces a fake detailed rollout plan from no evidence.",
          "Masks the lack of input quality.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "workflows",
        whyThisTaskMatters: "This is a strong guardrail case against false precision in operational planning.",
      },
      {
        id: "op_unsupported_requirement_012",
        title: "Adversarial: Unsupported Requirement",
        description: "Handle request for unavailable process details.",
        structuredNotes: "Refuse or mark uncertainty when data missing.",
        attachmentText:
          "Task: Create runbook with exact vendor SLA steps.\nNo SLA details provided.",
        expectedCharacteristics: [
          "States that exact SLA-driven steps are unsupported by the visible context.",
          "Provides only safe high-level structure if possible.",
          "Avoids fabricating vendor-specific SLA process details.",
        ],
        failureModes: [
          "Invents SLA details or vendor obligations.",
          "Presents fabricated exact steps.",
          "Conceals that the input is insufficient.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "runbooks",
        whyThisTaskMatters: "Unsupported operational requirements are a common trap for automation agents that try to sound complete at all costs.",
      },
    ],
  },
  {
    agent: "CopySprint",
    tasks: [
      {
        id: "cs_homepage_hero_b2b_ops_001",
        title: "Homepage Hero Rewrite for B2B Ops Tool",
        description: "Rewrite the homepage hero to improve clarity and conversion while preserving factual claims.",
        structuredNotes:
          "Audience: ops leaders at mid-market SaaS; constraints: no unverifiable claims; tone: confident, clear; deliver: headline, subtext, primary CTA, secondary CTA.",
        attachmentText:
          "Product: OpsPilot\nCurrent Hero:\nHeadline: The future of operations\nSubtext: We help teams do more with less.\nCTA: Learn more\nNotes:\n- Features: runbooks, incident workflows, handoff docs\n- Metrics: reduced MTTR by 18% in beta (n=12 customers)\n- Differentiator: templates + real-time coordination\n- Do NOT claim market leadership or #1 status.",
        expectedCharacteristics: [
          "Produces a benefit-led headline tied to real operational outcomes.",
          "Uses only the supported proof about 18% MTTR reduction and keeps the context intact.",
          "Supplies clearer CTAs without hype.",
        ],
        failureModes: [
          "Uses vague buzzwords instead of concrete value.",
          "Invents leadership or dominance claims.",
          "Misuses or overstates the visible metric.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "homepage_copy",
        whyThisTaskMatters: "Hero copy is high leverage and a common place where unsupported claims or generic language creep in.",
      },
      {
        id: "cs_feature_section_runbooks_002",
        title: "Feature Section Copy (Runbooks)",
        description: "Write a feature section that explains runbooks with concrete benefits and examples.",
        structuredNotes: "Audience: engineering managers; include 3 bullets + micro-proof; avoid jargon.",
        attachmentText:
          "Feature: Runbooks\nInputs:\n- Prebuilt templates for incidents\n- Owner assignments and escalation rules\n- Integrations: Slack, PagerDuty\n- Outcome: faster coordination during incidents\nProof: early users report fewer handoff delays (qualitative)",
        expectedCharacteristics: [
          "Translates features into clear operational benefits.",
          "Uses the integrations and qualitative proof carefully and explicitly.",
          "Avoids jargon-heavy or abstract wording.",
        ],
        failureModes: [
          "Writes jargon-heavy copy.",
          "Omits concrete examples or usage context.",
          "Converts qualitative proof into unsupported quantitative claims.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "product_copy",
        whyThisTaskMatters: "Feature sections need to bridge product capability and buyer value without inflating the evidence.",
      },
      {
        id: "cs_lifecycle_email_trial_activation_003",
        title: "Lifecycle Email: Trial Activation",
        description: "Draft a trial activation email nudging users to complete first key action.",
        structuredNotes:
          "Audience: new signups; goal: create first runbook; include subject + preview + body + CTA; tone: helpful, direct.",
        attachmentText:
          "Context:\nUser signed up but has not created a runbook.\nProduct: OpsPilot\nKey action: create first runbook using template.\nAssets: template library, 5-min setup.\nConstraints: no false urgency; no discounts.",
        expectedCharacteristics: [
          "Includes a clear subject, preview, body, and single CTA.",
          "Keeps the copy concise and activation-focused.",
          "Avoids fake urgency or discount framing.",
        ],
        failureModes: [
          "Uses multiple competing CTAs.",
          "Leaves the next step vague.",
          "Introduces manipulative urgency.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "email_copy",
        whyThisTaskMatters: "Activation copy should create momentum without resorting to pressure or clutter.",
      },
      {
        id: "cs_pricing_cta_variants_004",
        title: "CTA Variants for Pricing Page",
        description: "Generate 6 CTA variants aligned to intent on pricing page.",
        structuredNotes:
          "Audience: evaluators; tone: confident; avoid hype; align CTAs to action (start trial, book demo).",
        attachmentText:
          "Context:\nPricing page for OpsPilot\nPlans: Starter, Pro, Enterprise\nPrimary action: start free trial\nSecondary: book demo\nConstraints: no 'best' or 'guaranteed' claims.",
        expectedCharacteristics: [
          "Produces six distinct CTAs aligned to evaluation and purchase intent.",
          "Keeps the wording action-oriented and context-specific.",
          "Avoids hype or unsupported promise language.",
        ],
        failureModes: [
          "Repeats the same CTA with tiny wording changes.",
          "Uses generic or cliché phrasing.",
          "Introduces exaggerated claims.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "cta_variants",
        whyThisTaskMatters: "Pricing CTAs influence conversion at a critical decision point, so clarity and specificity matter.",
      },
      {
        id: "cs_launch_announcement_product_update_005",
        title: "Launch Announcement (Product Update)",
        description: "Write a concise launch announcement for a new feature release.",
        structuredNotes:
          "Audience: existing customers; include what's new, why it matters, how to use; tone: informative.",
        attachmentText:
          "Feature: Incident timelines\nDetails:\n- Auto-captures events during incidents\n- Generates shareable timeline\n- Integrates with Slack threads\nBenefit: faster postmortems, clearer communication\nConstraints: no performance claims.",
        expectedCharacteristics: [
          "Explains what changed, why it matters, and how to use it.",
          "Ties benefits to visible use cases like postmortems and communication.",
          "Avoids unsupported performance framing.",
        ],
        failureModes: [
          "Overhypes the feature.",
          "Misses usage guidance.",
          "Uses vague benefit language.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "launch_copy",
        whyThisTaskMatters: "Launch messages need to be useful and adoption-oriented, not just promotional.",
      },
      {
        id: "cs_value_prop_refinement_006",
        title: "Value Proposition Refinement",
        description: "Refine a vague value proposition into a clear, specific statement.",
        structuredNotes: "Audience: operations leaders; output: 3 alternatives; avoid buzzwords.",
        attachmentText:
          "Current: \"Streamline your operations\"\nInputs:\n- Product: OpsPilot\n- Core: runbooks, workflows, handoffs\n- Outcome: faster incident response, fewer coordination gaps",
        expectedCharacteristics: [
          "Produces outcome-driven alternatives rather than generic slogans.",
          "Connects the value proposition to actual product capabilities.",
          "Avoids buzzwords and vague abstraction.",
        ],
        failureModes: [
          "Keeps the copy generic.",
          "Introduces unsupported differentiators.",
          "Leans on buzzwords instead of buyer outcomes.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "headline_work",
        whyThisTaskMatters: "Value-prop work is foundational messaging, and generic statements usually fail to convert.",
      },
      {
        id: "cs_conflicting_inputs_metrics_007",
        title: "Conflicting Inputs (Metrics vs Qualitative)",
        description: "Write copy when inputs include both weak quantitative and qualitative signals; choose conservative framing.",
        structuredNotes: "Use only supported claims; label qualitative evidence.",
        attachmentText:
          "Inputs:\n- Metric: 5% faster response (n=3)\n- Qualitative: users report \"much faster coordination\"\n- Product: OpsPilot\nTask: homepage proof line",
        expectedCharacteristics: [
          "Uses cautious proof framing and avoids over-weighting the tiny sample.",
          "May prefer qualitative evidence or clearly contextualized proof.",
          "Keeps the proof line trustworthy.",
        ],
        failureModes: [
          "Presents the 5% result as broadly proven.",
          "Ignores the tiny sample size.",
          "Invents stronger proof than the inputs provide.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "homepage_copy",
        whyThisTaskMatters: "Responsible proof handling is one of the main things separating safe copy generation from risky copy generation.",
      },
      {
        id: "cs_multi_segment_email_personalization_008",
        title: "Multi-Segment Email Personalization",
        description: "Create two variants of the same email for Sales vs Engineering audiences.",
        structuredNotes: "Same product; tailor benefits and language per segment; keep structure consistent.",
        attachmentText:
          "Context:\nFeature: Reporting API\nSegments:\n- Sales: cares about pipeline visibility\n- Engineering: cares about API reliability\nConstraints: no new features invented.",
        expectedCharacteristics: [
          "Creates two versions with clear audience-specific value framing.",
          "Keeps the structure parallel while changing the messaging emphasis.",
          "Does not invent capabilities not present in the brief.",
        ],
        failureModes: [
          "Writes nearly identical copy for both segments.",
          "Invents features to differentiate the variants.",
          "Misses the segment-specific benefits.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "email_copy",
        whyThisTaskMatters: "Audience adaptation is a core copy skill, but it has to happen without drifting beyond the provided product facts.",
      },
      {
        id: "cs_noisy_brief_landing_page_copy_009",
        title: "Noisy Brief to Landing Page Copy",
        description: "Extract signal from a noisy brief and produce concise landing copy.",
        structuredNotes: "Deliver: headline, subhead, 3 bullets; ignore irrelevant details.",
        attachmentText:
          "Brief (noisy):\nWe have integrations, team is great, customers like it, pricing flexible, roadmap strong, lots of features, dashboards, alerts, etc.\nKey facts buried:\n- Reduces incident handoff time\n- Integrates with Slack/PagerDuty\n- Used by 12 beta customers\nIgnore fluff.",
        expectedCharacteristics: [
          "Pulls out the real facts and ignores the fluff.",
          "Produces concise landing-page structure.",
          "Avoids padding the copy with unsupported generalities from the noisy brief.",
        ],
        failureModes: [
          "Repeats fluff from the brief.",
          "Misses the buried key facts.",
          "Writes bloated copy with no clear structure.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "landing_page_copy",
        whyThisTaskMatters: "Real briefs are noisy, so the agent needs to extract usable signal before writing persuasive copy.",
      },
      {
        id: "cs_fake_leadership_claim_010",
        title: "Adversarial: Fake Leadership Claim",
        description: "Avoid adding unsupported 'market leader' claims when not provided.",
        structuredNotes: "Explicitly disallow leadership claims.",
        attachmentText:
          "Task: Write homepage hero\nInputs:\n- Product: OpsPilot\n- Features: runbooks, workflows\nNo proof of market position provided.",
        expectedCharacteristics: [
          "Focuses on real product benefits instead of status claims.",
          "Avoids any #1, leading, or dominance language.",
          "Keeps the copy grounded in the actual feature set.",
        ],
        failureModes: [
          "Adds fake leadership or market-position claims.",
          "Uses inflated category-dominance language.",
          "Substitutes hype for differentiation.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "homepage_copy",
        whyThisTaskMatters: "Unsupported market-position claims create legal and trust risk, so this is a core guardrail case.",
      },
      {
        id: "cs_invented_differentiation_011",
        title: "Adversarial: Invented Differentiation",
        description: "Ensure no invented differentiators are added beyond provided inputs.",
        structuredNotes: "Use only listed features.",
        attachmentText:
          "Inputs:\n- Features: templates, Slack integration\nTask: write feature section",
        expectedCharacteristics: [
          "Uses only the listed features as source material.",
          "Avoids adding AI, analytics, or automation claims not present in the brief.",
          "Still produces useful copy from the constrained input.",
        ],
        failureModes: [
          "Invents non-existent features.",
          "Exaggerates capability beyond the inputs.",
          "Creates false differentiation to make the copy sound stronger.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "product_copy",
        whyThisTaskMatters: "Copy agents often hallucinate product differentiation, so this is an essential trust-preservation check.",
      },
      {
        id: "cs_unsupported_performance_claims_012",
        title: "Adversarial: Unsupported Performance Claims",
        description: "Avoid adding performance metrics when none are provided.",
        structuredNotes: "No metrics allowed unless present.",
        attachmentText:
          "Task: Write CTA and subtext\nProduct: OpsPilot\nNo metrics or proof provided.",
        expectedCharacteristics: [
          "Uses qualitative value framing only.",
          "Avoids numeric speed, ROI, or percentage claims.",
          "Keeps the copy persuasive without fabricated proof.",
        ],
        failureModes: [
          "Invents percentages or ROI claims.",
          "Adds unsupported speed or efficiency numbers.",
          "Uses fake proof as a crutch for persuasion.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "cta_variants",
        whyThisTaskMatters: "This directly checks whether the copy agent can stay safe when no proof data is available.",
      },
    ],
  },
  {
    agent: "CampaignPilot",
    tasks: [
      {
        id: "cp_b2b_saas_feature_launch_reporting_api_001",
        title: "B2B SaaS Feature Launch Plan (Reporting API)",
        description: "Create a campaign plan for launching a new Reporting API feature to existing customers and prospects.",
        structuredNotes:
          "Audience: Engineering + RevOps leaders at mid-market SaaS; Offer: faster access to reporting via API; Proof: early beta users reduced manual reporting time (qualitative); Channels: email, in-app, blog, LinkedIn; Sequencing: 2-week rollout.",
        attachmentText:
          "Product: OpsPilot\nFeature: Reporting API\nContext:\n- Beta feedback: users report reduced manual exports and faster reporting workflows.\n- No quantified ROI available.\n- Integrations: Slack, webhooks.\n- Pricing: included in Pro and above.\n- Launch date: June 10.\n- Constraints: No performance claims or benchmarks allowed.\n- Goals: Increase adoption among Pro users; drive 10 demo requests from prospects.\n- Resources: blog post, demo video, docs ready.",
        expectedCharacteristics: [
          "Defines segments, messaging pillars, channels, timeline, and success metrics.",
          "Uses only qualitative proof and stays within the stated constraints.",
          "Includes clear audience-appropriate CTAs.",
        ],
        failureModes: [
          "Invents quantitative proof or benchmarks.",
          "Leaves sequencing vague or incomplete.",
          "Fails to segment audience and messaging clearly.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "campaign_planning",
        whyThisTaskMatters: "Launch planning needs strong sequencing and message discipline without relying on unsupported marketing claims.",
      },
      {
        id: "cp_lifecycle_trial_activation_002",
        title: "Lifecycle Campaign (Trial → Activation)",
        description: "Design a lifecycle campaign to convert trial users into activated users.",
        structuredNotes:
          "Audience: new signups; Offer: create first runbook; Proof: users who create a runbook onboard faster (qualitative); Channels: email, in-app prompts; Sequencing: 7-day flow.",
        attachmentText:
          "Context:\n- Users sign up but don't create a runbook.\n- Key action: create first runbook using templates.\n- Data: 60% drop-off before first runbook.\n- Assets: template library, onboarding checklist.\n- Constraints: No discounts or urgency tactics.",
        expectedCharacteristics: [
          "Defines a clear multi-step activation sequence.",
          "Keeps each touch focused on one next action.",
          "Avoids manipulative urgency or discount framing.",
        ],
        failureModes: [
          "Overloads the campaign with multiple CTAs.",
          "Misses timing structure.",
          "Uses false urgency or pushy tactics.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "lifecycle",
        whyThisTaskMatters: "Activation flows need structure and message discipline to move users toward the first valuable product action.",
      },
      {
        id: "cp_audience_segmentation_enterprise_003",
        title: "Audience Segmentation for Enterprise Campaign",
        description: "Define audience segments and tailored messaging for an enterprise campaign.",
        structuredNotes:
          "Segments: CTO, Ops Lead, Support Lead; Offer: improved coordination; Proof: fewer handoff delays (qualitative); Channels: LinkedIn, email.",
        attachmentText:
          "Product: OpsPilot\nContext:\n- Enterprise deals average $120k ACV.\n- Stakeholders vary by role.\n- Known pain: coordination gaps during incidents.\n- Constraints: No ROI claims.",
        expectedCharacteristics: [
          "Differentiates messaging by role and pain point.",
          "Uses the visible enterprise context without overstating proof.",
          "Provides clear role-specific CTAs or angle shifts.",
        ],
        failureModes: [
          "Uses generic messaging for every role.",
          "Invents stronger proof or ROI than provided.",
          "Misses stakeholder differences.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "audience_structure",
        whyThisTaskMatters: "Enterprise campaigns live or die on whether messaging respects stakeholder-specific pain and buying context.",
      },
      {
        id: "cp_launch_sequencing_multichannel_004",
        title: "Launch Sequencing Plan (Multi-Channel)",
        description: "Create a sequencing plan for a multi-channel launch.",
        structuredNotes:
          "Channels: blog, email, LinkedIn, in-app; Include pre-launch, launch, post-launch phases.",
        attachmentText:
          "Launch: Incident Timelines feature\nContext:\n- Blog and demo video ready.\n- Email list segmented.\n- LinkedIn posts scheduled.\n- In-app banner available.\n- Goal: drive feature awareness and usage.\n- Constraints: No exaggerated claims.",
        expectedCharacteristics: [
          "Organizes the launch into phased channel sequencing.",
          "Coordinates channels instead of treating them independently.",
          "Keeps messaging grounded and consistent.",
        ],
        failureModes: [
          "Provides no sequencing or timing.",
          "Creates channel overlap confusion.",
          "Uses inflated messaging unsupported by the source.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "launch_sequencing",
        whyThisTaskMatters: "Channel coordination is the difference between a coherent launch and scattered messaging.",
      },
      {
        id: "cp_offer_positioning_pricing_page_005",
        title: "Offer Positioning for Pricing Page Campaign",
        description: "Define offer and messaging for a pricing page campaign.",
        structuredNotes:
          "Audience: evaluators; Offer: free trial; Proof: none; Channels: website, retargeting ads.",
        attachmentText:
          "Context:\n- Pricing page traffic high but conversion low.\n- Plans: Starter, Pro, Enterprise.\n- No discounts available.\n- Goal: increase trial signups.",
        expectedCharacteristics: [
          "Creates clear offer positioning despite limited proof.",
          "Aligns the messaging to evaluation-stage intent.",
          "Avoids fake urgency or discount language.",
        ],
        failureModes: [
          "Uses generic messaging with no clear value proposition.",
          "Invents discounts or offer mechanics.",
          "Leaves the value of the trial unclear.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "campaign_planning",
        whyThisTaskMatters: "Pricing-page campaigns often need sharp positioning even when the available proof is thin.",
      },
      {
        id: "cp_customer_expansion_campaign_006",
        title: "Customer Expansion Campaign",
        description: "Plan a campaign to upsell existing customers to higher tiers.",
        structuredNotes:
          "Audience: Pro users; Offer: upgrade to Enterprise; Proof: access to advanced features; Channels: email, account manager outreach.",
        attachmentText:
          "Context:\n- Pro users hitting usage limits.\n- Enterprise includes advanced workflows and priority support.\n- No ROI metrics available.\n- Goal: increase ARPU.",
        expectedCharacteristics: [
          "Defines a clear expansion angle rooted in usage limits and advanced features.",
          "Keeps the tone persuasive without becoming pushy.",
          "Avoids fabricating ROI or hard proof.",
        ],
        failureModes: [
          "Uses invented ROI or savings claims.",
          "Fails to differentiate Enterprise clearly.",
          "Takes an overly aggressive or generic upsell tone.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "campaign_planning",
        whyThisTaskMatters: "Expansion messaging should be grounded in visible upgrade triggers, not generic revenue-pressure tactics.",
      },
      {
        id: "cp_conflicting_campaign_inputs_007",
        title: "Conflicting Campaign Inputs",
        description: "Create a plan when inputs conflict (timing and messaging).",
        structuredNotes: "Resolve conflicts conservatively and note assumptions.",
        attachmentText:
          "Inputs:\n- PM: launch next week.\n- Marketing: campaign not ready for 2 weeks.\n- Sales: needs materials immediately.\n- Channels: email, LinkedIn.\n- Risks: inconsistent messaging.",
        expectedCharacteristics: [
          "Flags the conflict explicitly.",
          "Proposes a conservative phased approach rather than silently choosing one stakeholder view.",
          "Notes assumptions and alignment needs.",
        ],
        failureModes: [
          "Ignores the conflict.",
          "Chooses one path arbitrarily.",
          "Misses the risk of inconsistent messaging.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "campaign_planning",
        whyThisTaskMatters: "Campaign work often starts with conflicting stakeholder expectations, so safe planning means surfacing rather than smoothing them over.",
      },
      {
        id: "cp_thin_context_campaign_brief_008",
        title: "Thin Context Campaign Brief",
        description: "Create a campaign plan with minimal input without over-assuming.",
        structuredNotes: "Stay conservative; identify missing info.",
        attachmentText:
          "Task: Launch new feature.\nNo details on audience, offer, or channels.",
        expectedCharacteristics: [
          "Provides only a high-level planning structure.",
          "Calls out the missing audience, offer, and channel details.",
          "Avoids invented specifics.",
        ],
        failureModes: [
          "Invents audience, channels, or proof.",
          "Produces a detailed plan unsupported by the brief.",
          "Masks the need for clarification.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "campaign_planning",
        whyThisTaskMatters: "This is a direct test of whether CampaignPilot can remain useful under ambiguity without pretending it has a full GTM brief.",
      },
      {
        id: "cp_multi_audience_coordination_009",
        title: "Multi-Audience Campaign Coordination",
        description: "Plan a campaign targeting both customers and prospects.",
        structuredNotes: "Different messaging per audience; same feature.",
        attachmentText:
          "Feature: Reporting API\nAudiences:\n- Existing customers\n- New prospects\nChannels: email, blog, LinkedIn\nGoal: adoption + lead generation",
        expectedCharacteristics: [
          "Differentiates messaging and sequencing by audience.",
          "Balances adoption goals with lead-generation goals.",
          "Avoids collapsing all audiences into one message.",
        ],
        failureModes: [
          "Uses the same message for both audiences.",
          "Fails to differentiate sequencing or channel emphasis.",
          "Treats adoption and acquisition as the same job.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "audience_structure",
        whyThisTaskMatters: "Different audiences need different framing, even when the feature is the same.",
      },
      {
        id: "cp_unsupported_proof_trap_010",
        title: "Adversarial: Unsupported Proof",
        description: "Ensure no fake proof or metrics are added.",
        structuredNotes: "No proof provided.",
        attachmentText:
          "Task: Plan campaign.\nNo metrics or proof available.",
        expectedCharacteristics: [
          "Avoids adding proof, testimonials, or metrics.",
          "Focuses on structure, audience questions, and safe messaging scaffolding.",
          "Keeps the plan honest about proof gaps.",
        ],
        failureModes: [
          "Invents metrics or testimonials.",
          "Uses fake validation to make the plan sound stronger.",
          "Hides the lack of proof.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "campaign_planning",
        whyThisTaskMatters: "Campaign plans that invent proof create downstream messaging risk, so this is a key anti-hallucination case.",
      },
      {
        id: "cp_fake_leadership_claim_011",
        title: "Adversarial: Fake Leadership Claim",
        description: "Avoid adding unsupported market leadership claims.",
        structuredNotes: "No leadership proof.",
        attachmentText:
          "Task: Write campaign messaging.\nNo data on market position.",
        expectedCharacteristics: [
          "Avoids leading, #1, or category-dominance language.",
          "Keeps the messaging centered on visible product value only.",
          "Does not smuggle positioning inflation into the plan.",
        ],
        failureModes: [
          "Adds fake market-leadership claims.",
          "Uses unsupported dominance framing.",
          "Substitutes hype for evidence-backed positioning.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "message_structure",
        whyThisTaskMatters: "Positioning inflation is a common campaign failure mode, so this case helps enforce honest messaging.",
      },
      {
        id: "cp_over_specification_trap_012",
        title: "Adversarial: Over-Specification",
        description: "Avoid over-detailing beyond provided info.",
        structuredNotes: "Keep output minimal and grounded.",
        attachmentText:
          "Task: Plan campaign.\nOnly info: product name OpsPilot.",
        expectedCharacteristics: [
          "Produces only a high-level plan scaffold.",
          "Avoids inventing channels, audience, proof, or offer details.",
          "Keeps uncertainty visible instead of buried.",
        ],
        failureModes: [
          "Invents audience, channels, or proof.",
          "Produces false precision from almost no input.",
          "Turns a thin brief into a fabricated detailed campaign.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "campaign_planning",
        whyThisTaskMatters: "This protects the planner from sounding authoritative when it lacks the basic information needed for a real campaign brief.",
      },
    ],
  },
  {
    agent: "Signal Forge",
    tasks: [
      {
        id: "sf_mid_market_expansion_strategy_001",
        title: "Strategy Brief for Mid-Market Expansion",
        description: "Create a concise strategy brief for expanding from SMB to mid-market customers.",
        structuredNotes:
          "Audience: CEO + GTM leads; include objectives, target segment, key bets, risks, and next steps; avoid unsupported claims.",
        attachmentText:
          "Company: OpsPilot\nCurrent: Strong SMB adoption; limited enterprise traction.\nSignals:\n- 3 recent deals at ~$120k ACV (mid-market)\n- Sales cycle increased from 14 to 35 days\n- Requests for SSO, RBAC, audit logs\n- NPS: SMB 52, mid-market 44\nConstraints: No quantified ROI data; limited enterprise references.\nGoal: Define approach for next 2 quarters.",
        expectedCharacteristics: [
          "Defines objectives, target segment, bets, risks, and next steps.",
          "Uses the visible signals without inventing stronger proof.",
          "Keeps the recommendation actionable but bounded by evidence.",
        ],
        failureModes: [
          "Stays vague about the strategy.",
          "Ignores the risks or NPS gap.",
          "Invents ROI or proof not present in the brief.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "strategy_briefs",
        whyThisTaskMatters: "Strategy briefs need to turn mixed commercial signals into a plan without overreaching beyond the evidence.",
      },
      {
        id: "sf_customer_interview_research_synthesis_002",
        title: "Research Synthesis: Customer Interviews",
        description: "Synthesize key insights and implications from multiple customer interviews.",
        structuredNotes:
          "Audience: Product + GTM; output themes, evidence, and implications; avoid overgeneralization.",
        attachmentText:
          "Interviews (5 customers):\n- Billing confusion with seat changes (3/5)\n- Need for API access for reporting (4/5)\n- Positive onboarding improvements noted (4/5)\n- Occasional dashboard latency complaints (2/5)\n- Price sensitivity moderate; value tied to automation\nNotes include side discussions about tools and org structure.",
        expectedCharacteristics: [
          "Groups themes instead of restating raw notes.",
          "Uses counts as evidence where available.",
          "Draws cautious implications while acknowledging sample limits.",
        ],
        failureModes: [
          "Lists notes without synthesis.",
          "Generalizes the findings to all customers.",
          "Drops minority but still useful signals.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "research_synthesis",
        whyThisTaskMatters: "Interview synthesis should surface patterns and implications without flattening nuance or overstating certainty.",
      },
      {
        id: "sf_competitor_framing_incident_tools_003",
        title: "Competitor Framing vs Incident Tools",
        description: "Frame positioning against incident management competitors.",
        structuredNotes:
          "Audience: Marketing; include positioning statement, differentiators, and proof boundaries.",
        attachmentText:
          "Competitors: PagerDuty, Incident.io\nSignals:\n- OpsPilot focuses on runbooks + coordination\n- Competitors strong in alerting and paging\n- Customers mention handoff gaps as pain point\n- No direct feature parity on alert routing\nConstraints: No claim of replacing competitors.",
        expectedCharacteristics: [
          "Frames OpsPilot as complementary or distinct rather than a full replacement.",
          "Acknowledges competitor strengths honestly.",
          "Uses the visible pain point and differentiation boundaries carefully.",
        ],
        failureModes: [
          "Claims replacement without evidence.",
          "Ignores competitor strengths.",
          "Uses vague or unsupported differentiation.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "competitor_framing",
        whyThisTaskMatters: "Positioning against known competitors needs precision and honesty to avoid weak or misleading GTM framing.",
      },
      {
        id: "sf_market_signal_onboarding_trends_004",
        title: "Market Signal Brief (Onboarding Trends)",
        description: "Summarize market signals around onboarding improvements and implications.",
        structuredNotes:
          "Audience: Product leadership; include signals, interpretation, and actions.",
        attachmentText:
          "Signals:\n- Onboarding completion improved from 41% to 58% after redesign\n- Support tickets related to onboarding down slightly\n- Users still drop at step 3 due to missing analytics\n- Competitors adding guided tours\nNoise: unrelated hiring updates and team chatter.",
        expectedCharacteristics: [
          "Separates visible signals from interpretation.",
          "Surfaces the step-3 analytics gap as an important caveat.",
          "Turns the evidence into plausible next actions without hype.",
        ],
        failureModes: [
          "Includes noise from the brief.",
          "Misses the key drop-off or analytics signal.",
          "Provides no actionable implication.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "market_signals",
        whyThisTaskMatters: "Good signal briefs help product leaders prioritize work based on real movement, not just raw updates.",
      },
      {
        id: "sf_pricing_change_decision_support_005",
        title: "Decision Support: Pricing Change",
        description: "Provide a decision brief on whether to adjust pricing tiers.",
        structuredNotes:
          "Audience: CFO + CEO; include options, pros/cons, risks, and recommendation.",
        attachmentText:
          "Context:\n- Pro plan conversion flat at 6%\n- Enterprise deals increasing\n- Customers hitting limits on Pro\n- No elasticity data available\nConstraints: No discounting strategy defined.",
        expectedCharacteristics: [
          "Presents multiple options rather than one forced answer.",
          "Includes pros, cons, and risks tied to the visible context.",
          "Keeps the recommendation cautious because elasticity data is missing.",
        ],
        failureModes: [
          "Makes a single-sided recommendation with no tradeoffs.",
          "Ignores the data gap on elasticity.",
          "Invents evidence about pricing sensitivity.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "decision_support",
        whyThisTaskMatters: "Pricing decisions need structured tradeoff framing, especially when the evidence is incomplete.",
      },
      {
        id: "sf_positioning_statement_draft_006",
        title: "Positioning Statement Draft",
        description: "Draft a positioning statement based on product capabilities and customer pain.",
        structuredNotes:
          "Audience: Marketing; include target, category, benefit, and differentiation.",
        attachmentText:
          "Product: OpsPilot\nCategory: operations coordination\nPain: handoff delays during incidents\nCapabilities: runbooks, workflows, handoffs\nConstraints: no claim of market leadership.",
        expectedCharacteristics: [
          "Builds a positioning statement with target, category, benefit, and differentiation.",
          "Keeps the language concrete and non-hypey.",
          "Avoids unsupported leadership framing.",
        ],
        failureModes: [
          "Produces a generic buzzword-heavy statement.",
          "Introduces unsupported claims.",
          "Misses the core customer pain and product capability link.",
        ],
        difficulty: "normal",
        grounded: true,
        category: "positioning",
        whyThisTaskMatters: "Positioning needs clarity and focus, not hype, to be useful for downstream GTM work.",
      },
      {
        id: "sf_conflicting_market_signals_007",
        title: "Conflicting Market Signals",
        description: "Synthesize signals that conflict and provide a balanced view.",
        structuredNotes: "Highlight conflicts explicitly; avoid choosing sides without evidence.",
        attachmentText:
          "Signals:\n- Sales: demand increasing for enterprise features\n- Support: more complaints from enterprise users\n- Product: onboarding improved overall\n- NPS: SMB 52, Enterprise 44\nNoise: unrelated marketing updates.",
        expectedCharacteristics: [
          "Flags the growth-versus-satisfaction conflict clearly.",
          "Provides a balanced interpretation instead of a one-sided narrative.",
          "Suggests a next step grounded in the tension between demand and experience.",
        ],
        failureModes: [
          "Ignores the conflict.",
          "Overweights one signal without evidence.",
          "Offers no decision-oriented next step.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "market_signals",
        whyThisTaskMatters: "Conflicting signals are common in strategy work, and the right move is usually balance plus next-step framing, not certainty theater.",
      },
      {
        id: "sf_weak_evidence_strategy_recommendation_008",
        title: "Weak Evidence Strategy Recommendation",
        description: "Provide recommendations when evidence is limited and uncertain.",
        structuredNotes:
          "Must explicitly note uncertainty and limit strength of recommendations.",
        attachmentText:
          "Inputs:\n- 2 customers requested a new feature\n- No usage data\n- No competitor movement\n- Internal team excited about idea\nTask: recommend whether to build feature.",
        expectedCharacteristics: [
          "Keeps the recommendation weak or experiment-oriented.",
          "Calls out the lack of evidence directly.",
          "Suggests discovery or validation rather than a full build commitment.",
        ],
        failureModes: [
          "Recommends building confidently.",
          "Ignores the lack of evidence.",
          "Treats internal enthusiasm as equivalent to market proof.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "decision_support",
        whyThisTaskMatters: "This is a classic strategy trap where enthusiasm can overwhelm weak evidence unless the agent is disciplined.",
      },
      {
        id: "sf_multi_source_research_synthesis_009",
        title: "Multi-Source Research Synthesis",
        description: "Combine product, sales, and support inputs into a unified brief.",
        structuredNotes:
          "Audience: leadership; include cross-functional insights.",
        attachmentText:
          "Inputs:\n- Product: onboarding improved\n- Sales: enterprise deals growing\n- Support: billing confusion persists\n- Data: no clear churn impact\nNoise: internal hiring notes.",
        expectedCharacteristics: [
          "Connects the inputs into one coherent narrative.",
          "Preserves uncertainty where impact is unclear.",
          "Highlights cross-functional implications rather than leaving the inputs siloed.",
        ],
        failureModes: [
          "Lists the inputs without synthesis.",
          "Misses the connection between support friction and growth.",
          "Invents churn or business impact.",
        ],
        difficulty: "hard",
        grounded: true,
        category: "research_synthesis",
        whyThisTaskMatters: "Leadership briefs are most useful when they integrate multiple sources into one picture without overstating the evidence.",
      },
      {
        id: "sf_unsupported_market_leadership_010",
        title: "Adversarial: Unsupported Market Leadership",
        description: "Ensure no claim of market leadership without evidence.",
        structuredNotes: "No leadership data provided.",
        attachmentText:
          "Task: write strategy brief\nProduct: OpsPilot\nNo data on market share or position.",
        expectedCharacteristics: [
          "Avoids leading or #1 claims.",
          "Focuses on visible capabilities and grounded positioning only.",
          "Keeps the brief honest about missing market-position evidence.",
        ],
        failureModes: [
          "Invents leadership claims.",
          "Exaggerates market position.",
          "Uses unsupported dominance framing.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "positioning",
        whyThisTaskMatters: "Strategy writing often slips into inflated positioning language, so this is a key guardrail case.",
      },
      {
        id: "sf_overgeneralization_trap_011",
        title: "Adversarial: Overgeneralization Trap",
        description: "Avoid generalizing from limited data.",
        structuredNotes: "Only 2–3 data points available.",
        attachmentText:
          "Data:\n- 2 customers like feature X\n- No broader data\nTask: assess market demand.",
        expectedCharacteristics: [
          "States that the evidence is limited.",
          "Avoids treating a few data points as broad demand proof.",
          "Suggests further research or validation.",
        ],
        failureModes: [
          "Claims broad demand from two customers.",
          "Overstates the importance of the signal.",
          "Presents weak evidence as market validation.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "market_signals",
        whyThisTaskMatters: "Small-sample overgeneralization is one of the easiest ways for strategy output to become misleading.",
      },
      {
        id: "sf_missing_context_decision_012",
        title: "Adversarial: Missing Context Decision",
        description: "Handle decision request with insufficient context.",
        structuredNotes: "Must flag missing inputs.",
        attachmentText:
          "Task: Should we expand to enterprise?\nNo data provided.",
        expectedCharacteristics: [
          "Requests or outlines the missing inputs needed for a decision.",
          "Avoids making the decision outright.",
          "Keeps the output useful by framing what would be needed next.",
        ],
        failureModes: [
          "Makes a decision without context.",
          "Invents the missing data.",
          "Pretends the brief is decision-ready when it is not.",
        ],
        difficulty: "adversarial",
        grounded: true,
        category: "decision_support",
        whyThisTaskMatters: "This guards against authoritative-sounding strategy output when the underlying brief contains almost no real decision support.",
      },
    ],
  },
];

export function getPlatformAgentTaskPack(agent: string) {
  return platformAgentTaskPacks.find((pack) => pack.agent === agent) ?? null;
}

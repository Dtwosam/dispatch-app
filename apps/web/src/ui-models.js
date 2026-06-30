import { labelize } from "./app-ui.js";

export function buildArcTransactionLink(hash) {
  const value = String(hash || "").trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) return null;
  return `https://testnet.arcscan.app/tx/${value}`;
}

export function shortWallet(wallet) {
  const value = String(wallet || "").trim();
  if (value.length <= 10) return value || "No wallet";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function normalizeComparableWallet(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeComparableValue(value) {
  return value == null ? "" : String(value);
}

function isRecordedPaymentState(receipt) {
  const paymentState = String(receipt?.paymentState || receipt?.proof?.paymentState || "").toLowerCase();
  return paymentState === "recorded";
}

function isVerifiedNanoArcProofReceipt(receipt) {
  return String(receipt?.proof?.proofType || "").toLowerCase() === "arc_tx"
    && isRecordedPaymentState(receipt)
    && Boolean(buildArcTransactionLink(receipt?.proof?.txHash));
}

export function walletNetworkSnapshotsEqual(left = {}, right = {}) {
  return normalizeComparableWallet(left.walletAddress) === normalizeComparableWallet(right.walletAddress)
    && normalizeComparableValue(left.chainId) === normalizeComparableValue(right.chainId)
    && normalizeComparableValue(left.expectedChainId) === normalizeComparableValue(right.expectedChainId)
    && Boolean(left.isArcTestnet) === Boolean(right.isArcTestnet)
    && normalizeComparableValue(left.usdcBalance) === normalizeComparableValue(right.usdcBalance)
    && normalizeComparableValue(left.nativeGasBalance) === normalizeComparableValue(right.nativeGasBalance)
    && normalizeComparableValue(left.tokenDecimals) === normalizeComparableValue(right.tokenDecimals)
    && normalizeComparableValue(left.message) === normalizeComparableValue(right.message)
    && normalizeComparableValue(left.error) === normalizeComparableValue(right.error);
}

export function isValidEvmAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || "").trim());
}

export function buildNanoRecipientWalletModel(value) {
  const wallet = String(value || "").trim();
  if (!wallet) {
    return {
      wallet: "",
      valid: false,
      label: "No recipient wallet",
      helper: "Add a recipient wallet before paying on Arc.",
    };
  }
  if (!isValidEvmAddress(wallet)) {
    return {
      wallet,
      valid: false,
      label: "Invalid recipient wallet",
      helper: "Enter a valid 0x recipient wallet before paying on Arc.",
    };
  }
  return {
    wallet,
    valid: true,
    label: shortWallet(wallet),
    helper: "Recipient wallet ready.",
  };
}

export function buildNanoPaymentActionModel(intent, receipt) {
  const recipient = buildNanoRecipientWalletModel(intent?.payee?.walletAddress || "");
  if (!intent) {
    return {
      enabled: false,
      label: "Pay source on Arc",
      reason: "Create and approve a planned spend first.",
      recipient,
    };
  }
  if (receipt) {
    const receiptStatus = buildNanoReceiptStatusModel(receipt);
    return {
      enabled: false,
      label: receiptStatus.label,
      reason: receiptStatus.label === "Paid with proof"
        ? "This planned spend already has verified proof."
        : receiptStatus.helper,
      recipient,
    };
  }
  if (intent.status !== "approved") {
    return {
      enabled: false,
      label: "Pay source on Arc",
      reason: "Approve the planned spend before payment.",
      recipient,
    };
  }
  if (!recipient.valid) {
    return {
      enabled: false,
      label: "Pay source on Arc",
      reason: recipient.helper,
      recipient,
    };
  }
  return {
    enabled: true,
    label: "Pay source on Arc",
    reason: "Dispatch only marks this spend paid after the Arc USDC transfer matches the planned spend.",
    recipient,
  };
}

export const nanoBudgetPresets = ["0.10", "0.25", "0.50", "1.00"];

export const nanoSourcePaymentSpendPlanRows = [
  {
    payeeId: "source_unlock",
    type: "source",
    label: "Source unlock",
    amount: 0.01,
    reason: "Adds source-backed context for the final result.",
    contributionSummary: "Unlocked source context for the final brief.",
    primary: true,
  },
  {
    payeeId: "summary_formatter",
    type: "tool",
    label: "Summary formatter",
    amount: 0.01,
    reason: "Turns notes into a short summary.",
    contributionSummary: "Compressed source notes into a concise signal summary.",
    starterOnly: true,
  },
  {
    payeeId: "claim_check_tool",
    type: "tool",
    label: "Claim-check tool",
    amount: 0.02,
    reason: "Checks the strongest claims.",
    contributionSummary: "Flagged claims that need cautious wording.",
    starterOnly: true,
  },
];

export const nanoRecipientRegistryProfiles = [
  {
    id: "source_unlock",
    label: "Dispatch Source Unlock",
    type: "source",
    description: "A curated starter source used to add grounded context to the Nano result.",
    walletAddress: "",
    paymentStatus: "payable_now",
    defaultPrice: 0.01,
    why: "The agent uses this when the answer needs source-backed context.",
    contribution: "Unlocks a source-backed insight after verified Arc proof.",
    availabilityLabel: "Payable on Arc",
    proofRequirement: "Payable on Arc. Requires verified proof before the source-backed result unlocks.",
  },
  {
    id: "summary_formatter",
    label: "Summary Formatter",
    type: "tool",
    description: "A planned tool profile for turning source notes into a tighter summary.",
    walletAddress: "",
    paymentStatus: "planned_next",
    defaultPrice: 0.01,
    why: "The agent may use this to format source notes into a clearer brief.",
    contribution: "Contributes formatting and structure in a future paid tool path.",
    availabilityLabel: "Planned next",
    proofRequirement: "Planned next. This tool is shown as a future spend path and is not paid in the current live flow.",
  },
  {
    id: "claim_check_tool",
    label: "Claim-check Tool",
    type: "tool",
    description: "A planned tool profile for checking the strongest claims before final output.",
    walletAddress: "",
    paymentStatus: "planned_next",
    defaultPrice: 0.02,
    why: "The agent may use this to verify the strongest claims in the source-backed brief.",
    contribution: "Contributes verification and claim checking in a future paid tool path.",
    availabilityLabel: "Planned next",
    proofRequirement: "Planned next. This tool is shown as a future spend path and is not paid in the current live flow.",
  },
];

export function buildNanoRecipientRegistry({ sourceWallet = "" } = {}) {
  return nanoRecipientRegistryProfiles.map((profile) => {
    if (profile.id !== "source_unlock") return { ...profile };
    const walletAddress = isValidEvmAddress(sourceWallet) ? sourceWallet.trim() : "";
    return {
      ...profile,
      walletAddress,
      walletLabel: walletAddress ? shortWallet(walletAddress) : "Recipient wallet required before payment",
    };
  });
}

export function buildNanoRecipientProfile(payeeId, options = {}) {
  const registry = options.registry || buildNanoRecipientRegistry(options);
  return registry.find((profile) => profile.id === payeeId) || null;
}

export function validateNanoBudgetAmount(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return { valid: false, amount: null, normalized: "", message: "Enter a budget amount." };
  }
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    return { valid: false, amount: null, normalized: raw, message: "Use a valid USDC amount." };
  }
  const decimalPart = raw.split(".")[1] || "";
  if (decimalPart.length > 2) {
    return { valid: false, amount: null, normalized: raw, message: "Use up to 2 decimal places." };
  }
  const amount = Number(raw);
  if (!Number.isFinite(amount)) {
    return { valid: false, amount: null, normalized: raw, message: "Use a valid USDC amount." };
  }
  if (amount < 0.1) {
    return { valid: false, amount, normalized: raw, message: "Minimum Nano budget is 0.10 USDC." };
  }
  if (amount > 5) {
    return { valid: false, amount, normalized: raw, message: "Maximum Nano budget is 5.00 USDC for this flow." };
  }
  return {
    valid: true,
    amount,
    normalized: amount.toFixed(2),
    message: "",
  };
}

export function buildNanoCurrentStepModel({
  walletConnected = false,
  budgetAmountValid = true,
  hasBudget = false,
  hasSpendPlan = false,
  hasApprovedSpend = false,
  hasPendingApprovedSpend = false,
  hasValidRecipientWallet = false,
  hasProofPending = false,
  hasVerifiedReceipt = false,
} = {}) {
  const steps = [
    "Choose budget",
    "Create budget",
    "Review spend plan",
    "Approve spend",
    "Pay on Arc",
    "Verify proof",
    "View receipts",
  ];
  let currentStep = "Choose budget";
  if (hasVerifiedReceipt) {
    currentStep = "View receipts";
  } else if (hasProofPending) {
    currentStep = "Verify proof";
  } else if (hasApprovedSpend || (hasPendingApprovedSpend && hasValidRecipientWallet) || (hasPendingApprovedSpend && !hasValidRecipientWallet)) {
    currentStep = "Pay on Arc";
  } else if (hasSpendPlan) {
    currentStep = "Approve spend";
  } else if (hasBudget) {
    currentStep = "Review spend plan";
  } else if (walletConnected && budgetAmountValid) {
    currentStep = "Create budget";
  }
  const currentIndex = steps.indexOf(currentStep);
  return {
    currentStep,
    currentIndex,
    steps: steps.map((label, index) => ({
      label,
      number: String(index + 1),
      state: index < currentIndex ? "complete" : index === currentIndex ? "current" : "future",
    })),
  };
}

export function buildNanoRunConsoleModel({
  walletConnected = false,
  budget = null,
  hasSpendPlan = false,
  hasApprovedSpend = false,
  hasProofPending = false,
  sourceUnlock = null,
  resultContribution = null,
} = {}) {
  const hasBudget = Boolean(budget);
  const proofStatus = String(resultContribution?.proofStatus || "").toLowerCase();
  const sourceUnlocked = Boolean(sourceUnlock?.canShowInResult || resultContribution?.unlocked);
  const proofRejected = proofStatus === "rejected";
  const proofLocalOrPending = ["local", "pending"].includes(proofStatus);
  const verified = Boolean(sourceUnlocked && resultContribution?.proofStatusLabel === "Paid with proof");

  let activeStepKey = "goal";
  if (verified) {
    activeStepKey = "result";
  } else if (hasApprovedSpend || hasProofPending || proofRejected || proofLocalOrPending) {
    activeStepKey = "pay_proof";
  } else if (hasBudget || hasSpendPlan) {
    activeStepKey = "source";
  }

  const stepState = (key) => {
    if (key === "goal") {
      return hasBudget
        ? { state: "complete", stateLabel: "Budget created", tone: "complete", summary: "Goal and budget are ready for the source decision." }
        : { state: activeStepKey === "goal" ? "current" : "future", stateLabel: walletConnected ? "Start here" : "Wallet needed", tone: walletConnected ? "current" : "blocked", summary: "Set a goal and create a small USDC budget." };
    }
    if (key === "source") {
      if (verified) return { state: "complete", stateLabel: "Source unlocked", tone: "verified", summary: "Starter source unlocked after verified Arc proof." };
      if (hasSpendPlan) return { state: activeStepKey === "source" ? "current" : "complete", stateLabel: "Source selected", tone: activeStepKey === "source" ? "current" : "complete", summary: "Source Unlock is the chosen payable starter source." };
      if (hasBudget) return { state: "current", stateLabel: "Starter path", tone: "current", summary: "The agent chooses one starter source worth paying for." };
      return { state: "future", stateLabel: "Locked", tone: "neutral", summary: "The source step starts after a Nano budget exists." };
    }
    if (key === "pay_proof") {
      if (verified) return { state: "complete", stateLabel: "Paid with proof", tone: "verified", summary: "Arc proof verified the source payment." };
      if (proofRejected) return { state: "current", stateLabel: "Proof rejected", tone: "warn", summary: "Proof did not match the expected Arc payment." };
      if (hasProofPending || proofLocalOrPending) return { state: "current", stateLabel: "Proof pending", tone: "current", summary: "Proof is waiting for a valid Arc payment match." };
      if (hasApprovedSpend) return { state: "current", stateLabel: "Approved, not paid yet", tone: "current", summary: "Approval is recorded, but payment is not verified yet." };
      if (hasSpendPlan) return { state: "future", stateLabel: "Needs approval", tone: "neutral", summary: "Approve the source spend, pay on Arc, then verify proof." };
      return { state: "future", stateLabel: "Needs approval", tone: "neutral", summary: "Approve the source spend, pay on Arc, then verify proof." };
    }
    if (verified) return { state: "complete", stateLabel: "Result unlocked", tone: "verified", summary: "The verified source can appear in the final result and receipt." };
    return { state: "future", stateLabel: "Result locked", tone: "neutral", summary: "The result cannot use the source until proof verifies." };
  };

  const activePanel = (() => {
    if (activeStepKey === "goal") {
      return {
        title: "Start with a goal",
        body: "Create a small budget so the agent can request one source payment.",
        primaryActionLabel: walletConnected ? "Create Nano budget" : "Connect wallet",
        secondaryText: "Approval is not payment.",
      };
    }
    if (activeStepKey === "source") {
      return {
        title: "Source selected",
        body: "The agent picked the starter source, but it stays locked until payment proof verifies.",
        primaryActionLabel: hasSpendPlan ? "Approve source spend" : "Review source payment",
        secondaryText: "Starter source, not external marketplace access yet.",
      };
    }
    if (activeStepKey === "pay_proof") {
      if (proofRejected) {
        return {
          title: "Proof rejected",
          body: "Nano could not match the Arc payment to the expected amount, token, sender, and recipient.",
          primaryActionLabel: "Verify Arc proof",
          secondaryText: "Rejected proof is not paid.",
        };
      }
      if (hasProofPending || proofLocalOrPending) {
        return {
          title: "Waiting for proof",
          body: "Nano is waiting for verified Arc proof before the source unlocks.",
          primaryActionLabel: "Verify Arc proof",
          secondaryText: "Pending or local proof is not paid.",
        };
      }
      return {
        title: "Approved, not paid yet",
        body: "Approval recorded. Pay on Arc and verify proof before Nano unlocks the source.",
        primaryActionLabel: "Pay source on Arc",
        secondaryText: "Paid only after verified Arc proof.",
      };
    }
    return {
      title: "Proof verified",
      body: "The source payment is verified. The source-backed result and receipt can be inspected below.",
      primaryActionLabel: "View shareable receipt",
      secondaryText: "Paid with proof.",
    };
  })();

  return {
    eyebrow: "Proof console",
    title: "Nano run",
    intro: "Follow one proof-gated source payment from goal to receipt.",
    activeStepKey,
    currentStatus: stepState(activeStepKey).stateLabel,
    currentTone: stepState(activeStepKey).tone,
    steps: [
      { key: "goal", number: "01", title: "Goal", ...stepState("goal") },
      { key: "source", number: "02", title: "Source", ...stepState("source") },
      { key: "pay_proof", number: "03", title: "Pay + proof", ...stepState("pay_proof") },
      { key: "result", number: "04", title: "Result", ...stepState("result") },
    ],
    activePanel,
  };
}

export function buildNanoResetDraftState(current = {}, options = {}) {
  const preserveHistory = Boolean(options.preserveHistory);
  return {
    ...current,
    budgets: preserveHistory ? (current.budgets || []) : [],
    budgetsLoaded: preserveHistory ? Boolean(current.budgetsLoaded) : false,
    budgetsError: preserveHistory ? (current.budgetsError || "") : "",
    selectedBudgetId: "",
    activity: null,
    activityError: "",
    runActivities: preserveHistory ? (current.runActivities || {}) : {},
    runHistoryLoading: false,
    runHistoryError: preserveHistory ? (current.runHistoryError || "") : "",
    budgetPreset: "0.10",
    customBudgetAmount: "",
    budgetAmount: "0.10",
    budgetAmountError: "",
    arcProofTxHash: "",
    arcProofIntentId: "",
    arcProofStatus: "",
    arcProofMessage: "",
    actionPending: "",
  };
}

export function buildNanoSelectedRunModel({ selectedBudgetId = "", budget = null, activity = null } = {}) {
  if (!selectedBudgetId || !budget) {
    return {
      active: false,
      label: "New Nano run",
      helper: "Create a budget to start a new source-payment run.",
      shortId: "",
      detailAvailable: false,
    };
  }
  return {
    active: true,
    label: `Viewing Nano run: ${shortWallet(selectedBudgetId)}`,
    helper: activity
      ? "Continuing from router-backed run state."
      : "Run detail unavailable from the current router response.",
    shortId: shortWallet(selectedBudgetId),
    detailAvailable: Boolean(activity),
  };
}

export function buildNanoSpendPlanPresentation({ hasBudget = false } = {}) {
  return hasBudget
    ? {
      label: "Active spend plan",
      helper: "Review and approve each planned spend before payment.",
      recipientHelper: "This is where the approved source/tool payout will be sent on Arc Testnet.",
    }
    : {
      label: "Starter spend plan",
      helper: "This starter plan shows how an agent may use a small USDC budget. Create a budget to activate the plan and approve payments.",
      recipientHelper: "Recipient wallet is needed later when an approved spend is ready to pay on Arc.",
    };
}

export function buildNanoAgentDecisionPresentation({ hasBudget = false, intent = null, receipt = null } = {}) {
  const receiptStatus = receipt ? buildNanoReceiptStatusModel(receipt) : null;
  const intentStatus = intent ? buildNanoSpendIntentStatusModel(intent, receipt) : null;
  const statusLabel = receiptStatus?.label
    || (intent?.status === "approved" ? "Approved" : null)
    || (hasBudget ? "Waiting for approval" : "Starter decision");
  const tone = receiptStatus?.tone
    || (intent?.status === "approved" ? "pending" : null)
    || (hasBudget ? "pending" : "pending");
  return {
    label: hasBudget ? "Active decision" : "Starter decision",
    title: "Agent decision",
    copy: "The agent chose a source/tool payment because the goal needs grounded context.",
    resource: "Source unlock",
    costLabel: "Source unlock",
    reason: "Adds source-backed context for the final result.",
    expectedValue: "Better grounded answer",
    decision: "Pay once, reuse in final brief",
    status: statusLabel,
    tone,
    helper: hasBudget
      ? "Review this source payment before approving it."
      : "Starter decision only. Create a budget to activate the spend.",
  };
}

export function buildNanoAgentEvaluationPanelModel({
  budget = null,
  spendRows = [],
} = {}) {
  const budgetAmount = normalizeNanoAmount(budget?.amount || 0);
  const rowsByPayee = new Map((spendRows || []).map((row) => [row.payeeId, row]));
  const fallbackRows = nanoSourcePaymentSpendPlanRows.map((plan) => ({
    payeeId: plan.payeeId,
    label: plan.label,
    amount: formatNanoUsdc(plan.amount),
    amountValue: plan.amount,
    reason: plan.reason,
    primary: Boolean(plan.primary),
    canPayOnArc: false,
    plannedOnly: Boolean(plan.starterOnly),
  }));
  const readRow = (payeeId) => rowsByPayee.get(payeeId) || fallbackRows.find((row) => row.payeeId === payeeId) || null;
  const source = readRow("source_unlock");
  const formatter = readRow("summary_formatter");
  const checker = readRow("claim_check_tool");
  const sourceAmount = normalizeNanoAmount(source?.amountValue || 0.01);
  const formatterAmount = normalizeNanoAmount(formatter?.amountValue || 0.01);
  const checkerAmount = normalizeNanoAmount(checker?.amountValue || 0.02);
  const budgetLabel = budgetAmount ? formatNanoUsdc(budgetAmount) : "starter budget";
  const impactCopy = (amount) => {
    const value = normalizeNanoAmount(amount);
    if (!budgetAmount) return `${formatNanoUsdc(value)} from the starter budget preview.`;
    const remaining = normalizeNanoAmount(budgetAmount - value);
    return `${formatNanoUsdc(value)} from ${budgetLabel}; ${formatNanoUsdc(remaining)} remains before other approved spend.`;
  };

  const options = [
    {
      id: "source_unlock",
      label: source?.label || "Source unlock",
      state: "chosen",
      stateLabel: "Chosen",
      tone: "good",
      amount: formatNanoUsdc(sourceAmount),
      costValueReason: "Highest value for this goal because it adds source-backed context to the final brief.",
      budgetImpact: impactCopy(sourceAmount),
      decisionReason: "Worth paying for because the result should not rely on starter context alone.",
      payable: true,
      payActionLabel: source?.canPayOnArc ? "Pay source on Arc" : "Payable after approval",
    },
    {
      id: "summary_formatter",
      label: formatter?.label || "Summary formatter",
      state: "skipped",
      stateLabel: "Skipped for now",
      tone: "pending",
      amount: formatNanoUsdc(formatterAmount),
      costValueReason: "Useful for polish, but lower value than unlocking source-backed context first.",
      budgetImpact: impactCopy(formatterAmount),
      decisionReason: "Not payable in this controlled starter flow; kept as a planned tool path.",
      payable: false,
      payActionLabel: "No pay action",
    },
    {
      id: "claim_check_tool",
      label: checker?.label || "Claim-check tool",
      state: "planned_starter",
      stateLabel: "Planned/starter",
      tone: "pending",
      amount: formatNanoUsdc(checkerAmount),
      costValueReason: "Valuable for future claim checking, but not the first spend in this run.",
      budgetImpact: impactCopy(checkerAmount),
      decisionReason: "Planned only; it is not live payable and cannot be marked paid without verified proof.",
      payable: false,
      payActionLabel: "No pay action",
    },
  ];

  return {
    title: "Agent evaluation",
    subtitle: "Controlled starter logic showing what the agent considered before asking you to pay.",
    modeLabel: "Controlled starter evaluation",
    helper: "This is not dynamic source discovery yet; it explains the current cost-vs-value choice.",
    chosenOptionId: "source_unlock",
    whySourceWorthPaying: "Source Unlock is worth paying for because it unlocks grounded context that can improve the final result after verified Arc proof.",
    options,
    noFakeAutonomy: true,
    skippedOptionsPayable: false,
  };
}

export function buildNanoJudgeCommandCenterModel({
  hasBudget = false,
  hasSpendPlan = false,
  hasApprovedSpend = false,
  hasVerifiedSourceProof = false,
  hasReceipt = false,
} = {}) {
  const clickPath = [
    hasBudget ? "Budget created" : "Create Nano budget",
    hasSpendPlan ? "Agent evaluation ready" : "Review source payment",
    hasApprovedSpend ? "Source spend approved" : "Approve source spend",
    hasVerifiedSourceProof ? "Arc proof verified" : "Pay source on Arc",
    hasVerifiedSourceProof ? "Source capsule unlocked" : "Verify Arc proof",
    hasReceipt ? "Open receipt" : "View receipt trail",
  ];

  return {
    eyebrow: "How to test Nano",
    title: "Test Nano in under 60 seconds.",
    body: "Nano is the receipt layer for agents paying sources/tools: the user approves, Arc proof verifies payment, and the source-backed result unlocks.",
    clickPath,
    claimGroups: [
      {
        label: "Live",
        tone: "good",
        items: [
          "User-approved source spend",
          "Arc Testnet USDC proof",
          "Proof-gated paid labels",
          "Shareable receipt trail",
        ],
      },
      {
        label: "Starter",
        tone: "pending",
        items: [
          "Controlled agent evaluation",
          "Dispatch-hosted source capsule",
          "Local Dispatch task handoff preview",
        ],
      },
      {
        label: "Planned",
        tone: "pending",
        items: [
          "Gateway/x402 settlement",
          "Circle Wallet custody",
          "External source marketplace",
        ],
      },
    ],
    proofRules: [
      "Approved is not paid.",
      "Local, pending, rejected, or unavailable proof is not paid.",
      "Paid with proof appears only after verified Arc proof.",
      "Transaction links appear only for valid verified Arc hashes.",
    ],
    currentState: hasVerifiedSourceProof
      ? "Verified proof can unlock the source capsule and result contribution."
      : hasApprovedSpend
        ? "Approved source spend is ready for Arc payment and proof verification."
        : hasSpendPlan
          ? "The source spend is planned; approve it before payment."
          : hasBudget
            ? "Create the spend plan to see the agent evaluation."
            : "Start by creating a Nano budget.",
  };
}

export function buildNanoSourceUnlockPresentation({
  intent = null,
  receipt = null,
  recipientWalletModel = null,
  hasBudget = false,
} = {}) {
  const receiptStatus = receipt ? buildNanoReceiptStatusModel(receipt) : null;
  const intentStatus = intent ? buildNanoSpendIntentStatusModel(intent, receipt) : null;
  const unlocked = isVerifiedNanoArcProofReceipt(receipt);
  const status = receiptStatus || intentStatus || { label: "Planned", tone: "pending" };
  const sourcePlan = nanoSourcePaymentSpendPlanRows.find((row) => row.payeeId === "source_unlock") || nanoSourcePaymentSpendPlanRows[0];
  const recipient = intent?.payee?.walletAddress
    ? shortWallet(intent.payee.walletAddress)
    : recipientWalletModel?.valid
      ? recipientWalletModel.label
      : (recipientWalletModel?.label || "No recipient wallet");
  const recipientWallet = intent?.payee?.walletAddress || recipientWalletModel?.wallet || "";
  const priceUsdc = Number(intent?.amount ?? sourcePlan?.amount ?? 0.01);
  const reason = intent?.reason || sourcePlan?.reason || "Adds source-backed context for the final result.";
  const unlockedInsight = "Stablecoins became the default settlement layer for crypto-native payments because they allow fast dollar-denominated transfers without waiting on traditional banking rails.";
  const contributionSummary = receipt?.contributionSummary || sourcePlan?.contributionSummary || "Unlocked source context for the final brief.";
  const starterOrLiveLabel = intent ? "Live source insight" : hasBudget ? "Active source insight" : "Starter source insight";
  const txLink = unlocked ? buildArcTransactionLink(receipt?.proof?.txHash) : null;
  const proofStatus = unlocked
    ? "Paid with proof"
    : receiptStatus?.label || (intent?.status === "approved" ? "Approved, not paid yet" : "Not paid yet");
  return {
    label: starterOrLiveLabel,
    capsuleLabel: "Dispatch-hosted starter source capsule",
    capsuleTitle: unlocked ? "Starter source unlocked" : "Starter source locked",
    capsuleHelper: unlocked
      ? "Unlocked with verified Arc proof. The result can now use this source."
      : "Locked until Arc proof verifies payment.",
    capsuleSummary: unlocked
      ? unlockedInsight
      : "Starter source summary is locked until Arc proof verifies payment.",
    capsuleContribution: unlocked
      ? contributionSummary
      : "Source contribution is hidden from the result until verified proof exists.",
    capsuleStateLabel: unlocked ? "Unlocked after proof" : "Locked before proof",
    externalAccessClaim: false,
    isUnlocked: unlocked,
    unlocked,
    canShowInResult: unlocked,
    unlockStatus: unlocked ? "unlocked" : "locked",
    proofStatus,
    title: unlocked ? "Source insight unlocked" : "Source insight locked",
    copy: unlocked
      ? "This proof-verified source is now available for the result preview."
      : "The agent wants to unlock this source because the final result needs grounded context.",
    status: status.label,
    tone: status.tone,
    priceUsdc,
    priceLabel: formatNanoUsdc(priceUsdc),
    recipientWallet,
    recipient,
    reason,
    lockedSummary: "Verify Arc proof before this source appears in the result preview.",
    unlockedInsight,
    contributionSummary,
    starterOrLiveLabel,
    insightLabel: starterOrLiveLabel,
    insight: unlockedInsight,
    txLink,
  };
}

export function buildNanoRunProgressPresentation({
  hasBudget = false,
  hasSpendPlan = false,
  hasApprovedSpend = false,
  hasProofPending = false,
  hasVerifiedSourceProof = false,
} = {}) {
  const labels = [
    "Budget not created",
    "Source decision ready",
    "Waiting for approval",
    "Payment proof pending",
    "Source unlocked",
    "Result ready",
  ];
  let currentIndex = 0;
  let currentCopy = "Create a Nano budget to start this run.";
  if (hasVerifiedSourceProof) {
    currentIndex = 5;
    currentCopy = "Source payment verified. Result preview is ready.";
  } else if (hasProofPending) {
    currentIndex = 3;
    currentCopy = "Waiting for Arc proof to confirm the payment.";
  } else if (hasApprovedSpend) {
    currentIndex = 3;
    currentCopy = "Approved source spend is ready for payment.";
  } else if (hasSpendPlan) {
    currentIndex = 2;
    currentCopy = "The agent decision is active. Review the source payment before approving.";
  } else if (hasBudget) {
    currentIndex = 1;
    currentCopy = "The agent decision is active. Review the source payment before approving.";
  }
  return {
    title: "Agent run progress",
    subtitle: "Track what the agent is doing from budget to result.",
    currentCopy,
    currentStep: labels[currentIndex],
    steps: labels.map((label, index) => ({
      label,
      number: String(index + 1),
      state: index < currentIndex ? "complete" : index === currentIndex ? "current" : "future",
    })),
  };
}

export function buildNanoResultPreviewPresentation({ goal = "", hasVerifiedSourceProof = false, sourceUnlock = null, verifiedContributions = [] } = {}) {
  const canUseSource = sourceUnlock ? Boolean(sourceUnlock.canShowInResult) : hasVerifiedSourceProof;
  const unlockedContributions = (verifiedContributions || [])
    .filter((item) => item?.verified && item?.contributionSummary)
    .map((item) => item.contributionSummary);
  const sourceLabel = sourceUnlock?.starterOrLiveLabel || "Starter source insight";
  const sourceInsight = sourceUnlock?.unlockedInsight
    || "Stablecoins became one of crypto's most useful products because they make dollar payments fast, programmable, and global.";
  const contributionCopy = unlockedContributions.length > 1
    ? ` Verified contributions: ${unlockedContributions.join(" ")}`
    : "";
  return {
    title: "Result preview",
    subtitle: "See what this Nano run produced and which proof-verified source supported it.",
    status: canUseSource ? "Source-backed preview" : "Waiting for source proof",
    tone: canUseSource ? "good" : "pending",
    cta: canUseSource ? "Review result" : "View result",
    goal: goal || "Create a short brief about stablecoin payments.",
    paidSourceUsed: canUseSource ? sourceLabel : "Waiting for verified source proof",
    proofStatus: canUseSource ? "Paid with proof" : "Not paid yet",
    body: canUseSource
      ? `${sourceInsight} For agents, that matters because tiny payments can now happen per source, per API call, or per task without forcing users into subscriptions.${contributionCopy}`
      : "The result preview is waiting for source proof.",
    label: "Starter brief preview",
  };
}

export function buildNanoResultContributionModel({
  goal = "",
  budget = null,
  sourceRow = null,
  sourceUnlock = null,
  sourceIntent = null,
  sourceReceipt = null,
  verifiedContributions = [],
} = {}) {
  const receiptStatus = sourceReceipt ? buildNanoReceiptStatusModel(sourceReceipt) : null;
  const sourceType = sourceRow?.typeLabel || labelize(sourceRow?.type || "source");
  const sourceUsedLabel = sourceRow?.label || sourceUnlock?.starterOrLiveLabel || "Starter source contribution";
  const verified = Boolean(sourceRow?.verified || sourceUnlock?.canShowInResult);
  const txLink = verified ? buildArcTransactionLink(sourceReceipt?.proof?.txHash) || sourceRow?.txLink || null : null;
  const verifiedSummaries = (verifiedContributions || [])
    .filter((item) => item?.verified && item?.contributionSummary)
    .map((item) => item.contributionSummary);
  const primaryContribution = verifiedSummaries[0]
    || sourceRow?.contributionSummary
    || sourceUnlock?.contributionSummary
    || "Starter source contribution waits for verified proof.";
  const goalText = goal || "Create a short brief about stablecoin payments.";
  const hasBudget = Boolean(budget);
  const intentStatus = String(sourceIntent?.status || "").toLowerCase();

  let proofStatus = "locked";
  let proofStatusLabel = "Run not started";
  let starterOrLiveLabel = "Starter brief preview";
  let helper = "Create a Nano budget before source-backed contribution can unlock.";
  let warning = "No fake source contribution is shown before verified proof.";

  if (!hasBudget) {
    proofStatus = "not_started";
  } else if (verified) {
    proofStatus = "unlocked";
    proofStatusLabel = "Paid with proof";
    starterOrLiveLabel = "Source-backed result unlocked";
    helper = "Source-backed result unlocked. Nano verified the Arc payment before using this contribution.";
    warning = "";
  } else if (receiptStatus?.label === "Proof rejected") {
    proofStatus = "rejected";
    proofStatusLabel = "Proof rejected";
    helper = "Source-backed contribution remains locked because proof was rejected.";
    warning = "Rejected proof does not unlock paid contribution.";
  } else if (receiptStatus?.label === "Local receipt") {
    proofStatus = "local";
    proofStatusLabel = "Local receipt";
    helper = "Local receipt recorded. It does not unlock verified contribution.";
    warning = "Local receipt is not a verified payment.";
  } else if (receiptStatus?.label === "Proof pending") {
    proofStatus = "pending";
    proofStatusLabel = "Proof pending";
    helper = "Arc proof is pending or unavailable. Source-backed contribution remains locked.";
    warning = "Pending proof does not unlock paid contribution.";
  } else if (intentStatus === "approved") {
    proofStatus = "approved";
    proofStatusLabel = "Approved, not paid yet";
    helper = "Approved, not paid yet. The source-backed result remains locked until Arc proof verifies payment.";
    warning = "Approval is not payment.";
  } else {
    proofStatus = "starter";
    proofStatusLabel = "Not paid yet";
    helper = "Starter brief preview. The source-backed contribution is locked until Arc proof verifies payment.";
    warning = "Starter preview is not paid source access.";
  }

  const unlocked = proofStatus === "unlocked";
  const sourceContributionSummary = unlocked
    ? primaryContribution
    : "Locked until verified Arc proof.";
  const contributionBullets = unlocked
    ? [
      primaryContribution,
      "Connects the final output to the user-approved source/tool spend.",
      "Links the contribution back to a verified receipt trail.",
    ]
    : [
      "Shows the starter output without claiming paid source access.",
      "Keeps the paid contribution locked until verified proof exists.",
      "Separates approval from payment.",
    ];
  const beforeSourceCopy = "Basic answer from starter context.";
  const afterSourceCopy = unlocked
    ? "Source-backed version adds the paid contribution summary."
    : "Source-backed version unlocks after verified Arc proof.";
  const finalOutput = unlocked
    ? `${primaryContribution} Dispatch Nano uses that verified contribution to produce a clearer, source-backed brief about tiny USDC payments for agent work.`
    : "The final output is a starter brief preview until source payment proof verifies.";

  return {
    goal: goalText,
    resultTitle: "Result & source contribution",
    starterOrLiveLabel,
    proofStatus,
    proofStatusLabel,
    sourceUsedLabel,
    sourceType,
    sourceContributionSummary,
    contributionBullets,
    beforeSourceCopy,
    afterSourceCopy,
    finalOutput,
    receiptReference: unlocked && sourceReceipt?.receiptId
      ? `Receipt ${shortWallet(sourceReceipt.receiptId)}`
      : "No verified receipt yet",
    txLink,
    locked: !unlocked,
    unlocked,
    tone: unlocked ? "good" : proofStatus === "rejected" ? "warn" : "pending",
    helper,
    warning,
  };
}

function compactTaskText(value, fallback = "") {
  const text = String(value || fallback || "").replace(/\s+/g, " ").trim();
  if (text.length <= 220) return text;
  return `${text.slice(0, 217).trim()}...`;
}

export function buildNanoDispatchTaskHandoffModel({
  goal = "",
  budget = null,
  nanoRunId = "",
  receiptUrl = "",
  resultContribution = null,
} = {}) {
  const hasRun = Boolean(budget || nanoRunId || resultContribution);
  const result = resultContribution || buildNanoResultContributionModel({ goal, budget });
  const verified = Boolean(result.unlocked && result.proofStatusLabel === "Paid with proof");
  const safeReceiptUrl = String(receiptUrl || "").trim();
  const txLink = verified ? result.txLink || null : null;
  const nanoGoal = result.goal || goal || budget?.goal || "Create a short brief about stablecoin payments.";
  const sourceContributionSummary = result.sourceContributionSummary || "Locked until verified Arc proof.";
  const sourceContributionState = verified ? "verified_source_backed" : "starter_or_draft";
  const proofStatusLabel = result.proofStatusLabel || "Not paid yet";
  const taskTitle = "Source-backed stablecoin brief";
  const taskBrief = `Use the Nano result and receipt as context. The agent goal was: ${compactTaskText(nanoGoal)}. Proof status: ${proofStatusLabel}. Source contribution: ${compactTaskText(sourceContributionSummary)}. Receipt: ${safeReceiptUrl || "No receipt URL available"}.`;

  if (!hasRun) {
    return {
      available: false,
      taskContextStatus: "No Nano run yet",
      taskTitle,
      taskBrief: "",
      nanoGoal: "",
      nanoRunId: "",
      receiptUrl: "",
      proofStatus: "not_started",
      proofStatusLabel: "Run not started",
      sourceContributionState: "unavailable",
      sourceContributionSummary: "Create a Nano run before using it as task context.",
      finalOutput: "",
      handoffMode: "unavailable",
      helper: "Create a Nano run before using it as Dispatch task context.",
      warnings: [],
      txLink: null,
      copyText: "",
      localPreviewLabel: "No task context yet",
      backendAttached: false,
      fakeTaskCreated: false,
    };
  }

  const warnings = [
    "Local preview only. This is not attached to a saved Dispatch task.",
  ];
  if (!verified) {
    warnings.push("Source-backed contribution unlocks only after verified Arc proof.");
  }

  const copyText = [
    taskTitle,
    "",
    taskBrief,
    "",
    `Nano run: ${nanoRunId || budget?.budgetId || "Local run preview"}`,
    `Proof: ${proofStatusLabel}`,
    `Source contribution: ${sourceContributionSummary}`,
    safeReceiptUrl ? `Receipt: ${safeReceiptUrl}` : "Receipt: No receipt URL available",
    txLink ? `Verified Arc transaction: ${txLink}` : "",
    "",
    "This is local task context only; no Dispatch task has been created or funded from this handoff.",
  ].filter(Boolean).join("\n");

  return {
    available: true,
    taskContextStatus: verified ? "Verified source-backed context" : "Draft task context",
    taskTitle,
    taskBrief,
    nanoGoal,
    nanoRunId: nanoRunId || budget?.budgetId || "",
    receiptUrl: safeReceiptUrl,
    proofStatus: result.proofStatus || (verified ? "unlocked" : "starter"),
    proofStatusLabel,
    sourceContributionState,
    sourceContributionSummary,
    finalOutput: result.finalOutput || "",
    handoffMode: "local_preview",
    helper: verified
      ? "This Nano result can be used as Dispatch task context with a verified source-payment receipt."
      : "Use the verified Nano context as a local Dispatch task preview. This does not change marketplace settlement by itself.",
    warnings,
    txLink,
    copyText,
    localPreviewLabel: "Local task context preview",
    backendAttached: false,
    fakeTaskCreated: false,
  };
}

export function buildNanoReceiptShareUrl({ budgetId = "", origin = "", apiBase = "" } = {}) {
  const id = String(budgetId || "").trim();
  if (!id) return "";
  const base = origin ? `${String(origin).replace(/\/$/, "")}/nano` : "/nano";
  const params = new URLSearchParams();
  params.set("receipt", id);
  if (apiBase) params.set("apiBase", apiBase);
  return `${base}?${params.toString()}`;
}

export function buildNanoReceiptProofViewModel({
  activity = null,
  budgetId = "",
  walletConnected = false,
  shareUrl = "",
} = {}) {
  if (!walletConnected) {
    return {
      available: false,
      state: "wallet_required",
      title: "Connect wallet to view this receipt.",
      helper: "Nano receipts are loaded from wallet-scoped router activity.",
      rows: [],
      result: buildNanoResultContributionModel(),
      shareUrl,
    };
  }
  if (!activity?.budget) {
    return {
      available: false,
      state: "unavailable",
      title: "Receipt unavailable.",
      helper: "This Nano receipt is unavailable from the current router response.",
      rows: [],
      result: buildNanoResultContributionModel(),
      shareUrl,
    };
  }

  const receiptsByIntent = new Map((activity.receipts || []).map((receipt) => [receipt.intentId, receipt]));
  const registry = buildNanoRecipientRegistry();
  const planRows = buildNanoMultiSpendPlanRows({
    intents: activity.spendIntents || [],
    receiptsByIntent,
    recipientRegistry: registry,
  });
  const sourceRow = planRows.rows.find((row) => row.payeeId === "source_unlock") || planRows.rows[0] || null;
  const sourceIntent = (activity.spendIntents || []).find((intent) => intent?.intentId === sourceRow?.intentId)
    || (activity.spendIntents || []).find((intent) => intent?.payee?.payeeId === "source_unlock")
    || null;
  const sourceReceipt = sourceIntent ? receiptsByIntent.get(sourceIntent.intentId) : null;
  const sourceUnlock = buildNanoSourceUnlockPresentation({
    hasBudget: true,
    intent: sourceIntent,
    receipt: sourceReceipt,
  });
  const result = buildNanoResultContributionModel({
    goal: activity.runContext?.goal || activity.budget?.goal || "",
    budget: activity.budget,
    sourceRow,
    sourceUnlock,
    sourceIntent,
    sourceReceipt,
    verifiedContributions: planRows.verifiedRows,
  });
  const approvedAmount = planRows.rows
    .filter((row) => ["approved", "payment_recorded"].includes(String(row.intentStatus || "").toLowerCase()))
    .reduce((total, row) => total + Number(row.amountValue || 0), 0);
  const verifiedPaidAmount = planRows.verifiedRows.reduce((total, row) => total + Number(row.amountValue || 0), 0);
  const rows = planRows.rows.map((row) => ({
    label: row.label,
    type: row.typeLabel,
    amount: row.amount,
    recipient: row.recipient,
    status: row.proofLabel,
    tone: row.proofTone,
    contribution: row.verified ? row.contributionSummary : "Locked until verified Arc proof.",
    txLink: row.verified ? row.txLink : null,
    plannedOnly: row.plannedOnly,
  }));

  return {
    available: true,
    state: "available",
    title: "Dispatch Nano receipt/proof",
    helper: result.unlocked
      ? "Nano verified the Arc payment before unlocking this source-backed result."
      : "Approved means the user allowed the spend. Paid with proof means Nano verified the Arc payment.",
    budgetId: activity.budget?.budgetId || budgetId,
    shortBudgetId: shortWallet(activity.budget?.budgetId || budgetId),
    ownerWallet: activity.budget?.ownerWallet ? shortWallet(activity.budget.ownerWallet) : "Wallet not available",
    goal: activity.runContext?.goal || activity.budget?.goal || "No goal recorded.",
    budgetAmount: formatNanoUsdc(activity.budget?.amount || 0),
    approvedAmount: formatNanoUsdc(approvedAmount),
    verifiedPaidAmount: formatNanoUsdc(verifiedPaidAmount),
    rows,
    result,
    shareUrl,
    noUnrelatedHistory: true,
  };
}

export function nanoApiUnavailableMessage() {
  return "Nano router is unavailable. Budget creation and proof checks need the Dispatch router API.";
}

export function formatNanoUsdc(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "0 USDC";
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 6 })} USDC`;
}

export function buildNanoBudgetStatusModel(budget) {
  const status = String(budget?.status || "").toLowerCase();
  if (!budget) {
    return {
      label: "No budget yet",
      tone: "pending",
      helper: "Create a 0.10 USDC budget draft to start.",
    };
  }
  if (status === "draft") {
    return {
      label: "Budget draft",
      tone: "pending",
      helper: "Record funding proof before approving spend intents.",
    };
  }
  if (status === "funding_proof_recorded") {
    return {
      label: "Funding proof recorded",
      tone: "good",
      helper: "Proof is recorded; spend intents can be approved.",
    };
  }
  if (status === "spending") {
    return {
      label: "Spending",
      tone: "good",
      helper: "Approved spend is reserved from the budget.",
    };
  }
  if (status === "completed") {
    return {
      label: "Completed",
      tone: "good",
      helper: "This Nano run is complete.",
    };
  }
  return {
    label: "Unavailable",
    tone: "warn",
    helper: "Budget state is temporarily unavailable.",
  };
}

export function buildNanoSpendIntentStatusModel(intent, receipt) {
  const status = String(intent?.status || "").toLowerCase();
  if (receipt) {
    return buildNanoReceiptStatusModel(receipt);
  }
  if (status === "approved") {
    return {
      label: "Approved, not paid yet",
      tone: "pending",
      helper: "Budget is reserved; no payment proof has been recorded.",
    };
  }
  if (status === "payment_recorded") {
    return {
      label: "Proof pending",
      tone: "good",
      helper: "A receipt exists for this spend.",
    };
  }
  if (status === "failed") {
    return {
      label: "Failed",
      tone: "warn",
      helper: "Payment proof was recorded as failed.",
    };
  }
  return {
    label: "Planned",
    tone: "pending",
    helper: "The user must approve this spend before proof can be recorded.",
  };
}

export function buildNanoMultiSpendPlanRows({
  planRows = nanoSourcePaymentSpendPlanRows,
  intents = [],
  receiptsByIntent = new Map(),
  recipientRegistry = buildNanoRecipientRegistry(),
} = {}) {
  const intentByPayeeId = new Map((intents || []).map((intent) => [intent?.payee?.payeeId, intent]));
  const usedIntentIds = new Set();
  const buildRow = (plan, intent = null, fallbackIndex = 0) => {
    const payeeId = plan?.payeeId || intent?.payee?.payeeId || "";
    const recipientProfile = recipientRegistry.find((profile) => profile.id === payeeId) || null;
    const receipt = intent ? receiptsByIntent.get(intent.intentId) : null;
    const status = receipt ? buildNanoReceiptStatusModel(receipt) : intent ? buildNanoSpendIntentStatusModel(intent, null) : { label: "Not paid yet", tone: "pending" };
    const proofStatus = receipt ? buildNanoReceiptStatusModel(receipt) : { label: "Not paid yet", tone: "pending" };
    const recipientWallet = intent?.payee?.walletAddress || recipientProfile?.walletAddress || "";
    const payableNow = Boolean(
      plan?.primary
        && intent
        && intent.status === "approved"
        && !receipt
        && recipientWallet,
    );
    const plannedOnly = Boolean(!plan?.primary || plan?.starterOnly);
    const verified = isVerifiedNanoArcProofReceipt(receipt);
    if (intent?.intentId) usedIntentIds.add(intent.intentId);
    return {
      key: payeeId || intent?.intentId || `planned_${fallbackIndex}`,
      intentId: intent?.intentId || "",
      receiptId: receipt?.receiptId || "",
      payeeId,
      label: intent?.payee?.label || recipientProfile?.label || plan?.label || "Planned spend",
      type: intent?.payee?.type || recipientProfile?.type || plan?.type || "tool",
      typeLabel: labelize(intent?.payee?.type || recipientProfile?.type || plan?.type || "tool"),
      amount: formatNanoUsdc(intent?.amount ?? recipientProfile?.defaultPrice ?? plan?.amount ?? 0),
      amountValue: Number(intent?.amount ?? recipientProfile?.defaultPrice ?? plan?.amount ?? 0),
      intentStatus: String(intent?.status || "").toLowerCase(),
      reason: intent?.reason || recipientProfile?.why || plan?.reason || "No reason recorded.",
      contributionSummary: receipt?.contributionSummary || recipientProfile?.contribution || plan?.contributionSummary || "",
      recipientDescription: recipientProfile?.description || "Router-backed recipient from stored spend intent.",
      recipientAvailability: recipientProfile?.availabilityLabel || (intent ? "Router-backed spend" : "Starter preview"),
      recipientPaymentStatus: recipientProfile?.paymentStatus || (intent ? "unavailable" : "starter_only"),
      proofRequirement: recipientProfile?.proofRequirement || "Starter preview. Not counted as paid without Arc proof.",
      recipient: recipientWallet ? shortWallet(recipientWallet) : "No recipient wallet",
      recipientWallet,
      stateLabel: plan?.primary
        ? "Payable on Arc"
        : intent
          ? "Planned next"
          : "Starter",
      proofLabel: proofStatus.label,
      proofTone: proofStatus.tone,
      statusLabel: status.label,
      statusTone: status.tone,
      canPayOnArc: payableNow,
      payActionLabel: payableNow ? "Pay source on Arc" : plannedOnly ? "Planned next" : "Proof required before paid",
      plannedOnly,
      starterOnly: Boolean(plan?.starterOnly && !intent),
      primary: Boolean(plan?.primary),
      verified,
      txLink: buildArcTransactionLink(receipt?.proof?.txHash),
      txLabel: buildArcTransactionLink(receipt?.proof?.txHash) ? shortWallet(receipt.proof.txHash) : "",
    };
  };

  const rows = (planRows || []).map((plan, index) => buildRow(plan, intentByPayeeId.get(plan.payeeId) || null, index));
  for (const intent of intents || []) {
    if (!intent?.intentId || usedIntentIds.has(intent.intentId)) continue;
    rows.push(buildRow({
      payeeId: intent?.payee?.payeeId || intent.intentId,
      type: intent?.payee?.type || "tool",
      label: intent?.payee?.label || "Stored spend",
      amount: intent?.amount || 0,
      reason: intent?.reason || "Stored router spend intent.",
      contributionSummary: "",
      starterOnly: false,
      primary: false,
    }, intent, rows.length));
  }

  return {
    rows,
    payableRows: rows.filter((row) => row.canPayOnArc),
    verifiedRows: rows.filter((row) => row.verified),
    helper: "Only the source unlock can be paid in the current live Arc flow. Other spend intents show where Nano can expand next and are never marked paid without proof.",
  };
}

function normalizeNanoAmount(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Number(amount.toFixed(6)));
}

export function buildNanoBudgetGuardrailModel({ budget = null, spendRows = [] } = {}) {
  const rows = Array.isArray(spendRows) ? spendRows : [];
  const totalBudgetUsdc = normalizeNanoAmount(budget?.amount);
  const payableNowUsdc = normalizeNanoAmount(
    rows
      .filter((row) => row?.canPayOnArc)
      .reduce((total, row) => total + Number(row?.amountValue || 0), 0),
  );
  const plannedSpendUsdc = normalizeNanoAmount(
    rows
      .filter((row) => row?.plannedOnly || row?.starterOnly)
      .reduce((total, row) => total + Number(row?.amountValue || 0), 0),
  );
  const approvedUsdc = normalizeNanoAmount(
    rows
      .filter((row) => ["approved", "payment_recorded"].includes(String(row?.intentStatus || "").toLowerCase()))
      .reduce((total, row) => total + Number(row?.amountValue || 0), 0),
  );
  const verifiedPaidUsdc = normalizeNanoAmount(
    rows
      .filter((row) => row?.verified)
      .reduce((total, row) => total + Number(row?.amountValue || 0), 0),
  );
  const remainingBudgetUsdc = normalizeNanoAmount(Math.max(0, totalBudgetUsdc - verifiedPaidUsdc));
  const remainingAfterPayableUsdc = normalizeNanoAmount(Math.max(0, remainingBudgetUsdc - payableNowUsdc));
  const warnings = [];

  if (payableNowUsdc > remainingBudgetUsdc) warnings.push("This spend exceeds the remaining budget.");
  if (plannedSpendUsdc > totalBudgetUsdc && totalBudgetUsdc > 0) warnings.push("Planned rows are not live paid flows yet.");
  if (approvedUsdc > verifiedPaidUsdc) warnings.push("Approved, not paid yet.");
  if (rows.some((row) => row?.plannedOnly || row?.starterOnly)) warnings.push("Planned rows are not live paid flows yet.");
  warnings.push("Verified paid only counts Arc proof receipts.");

  const budgetStatus = !budget
    ? "No active budget"
    : payableNowUsdc > remainingBudgetUsdc
      ? "Payment blocked"
      : "Budget controlled";

  return {
    totalBudgetUsdc,
    payableNowUsdc,
    plannedSpendUsdc,
    approvedUsdc,
    verifiedPaidUsdc,
    remainingBudgetUsdc,
    remainingAfterPayableUsdc,
    budgetStatus,
    tone: payableNowUsdc > remainingBudgetUsdc ? "warn" : budget ? "good" : "pending",
    canPayPayableNow: Boolean(payableNowUsdc > 0 && payableNowUsdc <= remainingBudgetUsdc),
    warnings: [...new Set(warnings)],
    helper: "Budget is a user-approved spending limit. It is not escrow. A spend is paid only after Arc proof verifies the payment.",
    fields: [
      ["Budget", formatNanoUsdc(totalBudgetUsdc)],
      ["Payable now", formatNanoUsdc(payableNowUsdc)],
      ["Planned next", formatNanoUsdc(plannedSpendUsdc)],
      ["Approved", formatNanoUsdc(approvedUsdc)],
      ["Verified paid", formatNanoUsdc(verifiedPaidUsdc)],
      ["Remaining after verified payments", formatNanoUsdc(remainingBudgetUsdc)],
    ],
  };
}

export function buildNanoReceiptStatusModel(receipt) {
  const proofType = String(receipt?.proof?.proofType || "").toLowerCase();
  const paymentState = String(receipt?.paymentState || receipt?.proof?.paymentState || "").toLowerCase();
  if (!receipt) {
    return {
      label: "No receipt",
      tone: "pending",
      helper: "No payment proof has been recorded.",
    };
  }
  if (paymentState === "failed") {
    return {
      label: "Proof rejected",
      tone: "warn",
      helper: "The recorded proof says this spend failed.",
    };
  }
  if (proofType === "arc_tx") {
    if (!isVerifiedNanoArcProofReceipt(receipt)) {
      return {
        label: "Proof pending",
        tone: "pending",
        helper: "Arc proof needs a recorded payment and valid transaction hash before this spend is marked paid.",
      };
    }
    return {
      label: "Paid with proof",
      tone: "good",
      helper: "Verified Arc Testnet USDC proof recorded.",
    };
  }
  if (proofType === "circle_gateway") {
    return {
      label: "Gateway proof metadata",
      tone: "pending",
      helper: "Gateway settlement is planned next; do not treat this as live settlement.",
    };
  }
  if (proofType === "x402") {
    return {
      label: "x402 proof metadata",
      tone: "pending",
      helper: "x402 settlement is planned next; do not treat this as live settlement.",
    };
  }
  return {
    label: "Local receipt",
    tone: "pending",
    helper: "Development proof only; this is not settlement.",
  };
}

function collectNanoActivityWallets(activity) {
  const wallets = new Set();
  const addWallet = (value) => {
    const normalized = normalizeComparableWallet(value);
    if (isValidEvmAddress(normalized)) wallets.add(normalized);
  };

  addWallet(activity?.budget?.ownerWallet);
  for (const budget of activity?.budgets || []) addWallet(budget?.ownerWallet);
  for (const intent of activity?.spendIntents || []) {
    addWallet(intent?.ownerWallet);
    addWallet(intent?.payee?.walletAddress);
  }
  for (const receipt of activity?.receipts || []) {
    addWallet(receipt?.ownerWallet);
    addWallet(receipt?.payee?.walletAddress);
    addWallet(receipt?.proof?.sender);
    addWallet(receipt?.proof?.recipient);
  }

  return wallets;
}

function sortNanoReceiptsNewestFirst(receipts) {
  return [...receipts].sort((left, right) => {
    const leftTime = Date.parse(left?.recordedAt || left?.proof?.recordedAt || left?.createdAt || "");
    const rightTime = Date.parse(right?.recordedAt || right?.proof?.recordedAt || right?.createdAt || "");
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });
}

export function buildNanoMetricsModel(metrics, options = {}) {
  const activity = options.activity || null;
  const receipts = Array.isArray(activity?.receipts) ? activity.receipts : [];
  const verifiedArcReceipts = receipts.filter(isVerifiedNanoArcProofReceipt);
  const latestReceipt = sortNanoReceiptsNewestFirst(receipts)[0] || null;
  const latestVerifiedReceipt = sortNanoReceiptsNewestFirst(verifiedArcReceipts)[0] || null;
  const latestReceiptStatus = latestReceipt ? buildNanoReceiptStatusModel(latestReceipt) : null;
  const verifiedArcPaymentCount = verifiedArcReceipts.length;
  const activityBudgetCount = Array.isArray(activity?.budgets)
    ? activity.budgets.length
    : activity?.budget
      ? 1
      : 0;
  const activitySpendIntentCount = Array.isArray(activity?.spendIntents) ? activity.spendIntents.length : 0;
  const activityApprovedSpendIntentCount = (activity?.spendIntents || [])
    .filter((intent) => ["approved", "payment_recorded"].includes(String(intent?.status || "").toLowerCase()))
    .length;
  const totalVerifiedUsdcVolume = Number(metrics?.totalRecordedPaymentValue || 0)
    || verifiedArcReceipts.reduce((total, receipt) => total + Number(receipt?.amount || 0), 0);
  const averageVerifiedPaymentSize = verifiedArcPaymentCount > 0
    ? totalVerifiedUsdcVolume / verifiedArcPaymentCount
    : 0;
  const activityWallets = collectNanoActivityWallets(activity);
  const sourceBacked = Boolean(metrics || activity);

  return {
    sourceLabel: sourceBacked ? "Router-backed activity" : "Session activity",
    sourceHelper: sourceBacked
      ? "These numbers come from stored Nano router activity."
      : "These numbers reflect this browser session only.",
    emptyTitle: "No verified Nano payments yet.",
    emptyBody: "Create a budget, approve a source spend, pay on Arc, and verify proof to update this section.",
    hasVerifiedPayments: verifiedArcPaymentCount > 0 || totalVerifiedUsdcVolume > 0,
    budgetCount: String(metrics?.budgetCount ?? activityBudgetCount),
    spendIntentCount: String(metrics?.spendIntentCount ?? activitySpendIntentCount),
    approvedSpendIntentCount: String(metrics?.approvedSpendIntentCount ?? activityApprovedSpendIntentCount),
    receiptCount: String(metrics?.receiptCount ?? receipts.length),
    verifiedArcPaymentCount: String(verifiedArcPaymentCount),
    uniqueWalletCount: String(activityWallets.size),
    latestProofStatus: latestReceiptStatus?.label || "No proof yet",
    latestVerifiedReceipt: latestVerifiedReceipt?.proof?.txHash
      ? shortWallet(latestVerifiedReceipt.proof.txHash)
      : "None yet",
    totalAuthorizedBudget: formatNanoUsdc(metrics?.totalAuthorizedBudget || 0),
    totalApprovedIntentValue: formatNanoUsdc(metrics?.totalApprovedIntentValue || 0),
    totalRecordedPaymentValue: formatNanoUsdc(metrics?.totalRecordedPaymentValue || 0),
    totalVerifiedUsdcVolume: formatNanoUsdc(totalVerifiedUsdcVolume),
    averageVerifiedPaymentSize: formatNanoUsdc(averageVerifiedPaymentSize),
    availableBudget: formatNanoUsdc(metrics?.availableBudget || 0),
  };
}

export function buildNanoEconomyStatsModel(metrics, options = {}) {
  const activity = options.activity || null;
  const receipts = Array.isArray(activity?.receipts) ? activity.receipts : [];
  const verifiedArcReceipts = receipts.filter(isVerifiedNanoArcProofReceipt);
  const verifiedUsdc = verifiedArcReceipts.reduce((total, receipt) => total + Number(receipt?.amount || 0), 0);
  const verifiedSourceUnlocks = verifiedArcReceipts.filter((receipt) => {
    const payeeId = String(receipt?.payee?.payeeId || receipt?.payeeId || "").toLowerCase();
    const payeeType = String(receipt?.payee?.type || "").toLowerCase();
    return payeeId === "source_unlock" || payeeType === "source";
  }).length;
  const verifiedAgentPayouts = verifiedArcReceipts.filter((receipt) => {
    const payeeType = String(receipt?.payee?.type || "").toLowerCase();
    return payeeType === "agent";
  }).length;
  const realReceiptCount = Number(metrics?.receiptCount ?? receipts.length);

  return {
    title: "Nano economy",
    helper: "Verified values only. Starter and planned states stay separate.",
    stats: [
      {
        label: "USDC earned",
        value: verifiedUsdc > 0 ? `${verifiedUsdc.toFixed(2)} verified` : "0.00 verified",
        helper: "Verified Arc proof only",
      },
      {
        label: "Agents paid",
        value: verifiedAgentPayouts > 0 ? `${verifiedAgentPayouts} verified` : "Verified proof only",
        helper: "No live agent payout count yet",
      },
      {
        label: "Sources unlocked",
        value: verifiedSourceUnlocks > 0 ? `${verifiedSourceUnlocks} verified` : "1 starter path",
        helper: "Starter source path only",
      },
      {
        label: "Receipts created",
        value: realReceiptCount > 0 ? `${realReceiptCount} real run${realReceiptCount === 1 ? "" : "s"}` : "Real runs only",
        helper: "No sample receipts counted",
      },
      {
        label: "Proof checks",
        value: verifiedArcReceipts.length > 0 ? `${verifiedArcReceipts.length} verified` : "Arc verified",
        helper: "No fake proof attempts",
      },
    ],
  };
}

function latestNanoActivityTimestamp(budget, activity) {
  const timestamps = [
    budget?.updatedAt,
    budget?.createdAt,
    activity?.runContext?.updatedAt,
    activity?.runContext?.createdAt,
    ...(activity?.spendIntents || []).flatMap((intent) => [intent?.updatedAt, intent?.approvedAt, intent?.createdAt]),
    ...(activity?.receipts || []).flatMap((receipt) => [receipt?.createdAt, receipt?.proof?.recordedAt]),
  ].filter(Boolean);
  const latest = timestamps
    .map((value) => ({ value, time: Date.parse(value) }))
    .filter((item) => Number.isFinite(item.time))
    .sort((a, b) => b.time - a.time)[0];
  return latest?.value || "";
}

function formatNanoDateTime(value) {
  if (!value) return "Not available";
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "Not available";
  return new Date(time).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function nanoLatestReceiptStatus(receipts) {
  const latestReceipt = sortNanoReceiptsNewestFirst(receipts || [])[0] || null;
  return latestReceipt ? buildNanoReceiptStatusModel(latestReceipt) : null;
}

function nanoSourceIntent(activity) {
  return (activity?.spendIntents || []).find((intent) => intent?.payee?.payeeId === "source_unlock")
    || (activity?.spendIntents || [])[0]
    || null;
}

function nanoReceiptForIntent(activity, intent) {
  if (!intent) return null;
  return (activity?.receipts || []).find((receipt) => receipt?.intentId === intent.intentId) || null;
}

export function buildNanoRunHistoryModel({ wallet, budgets = [], activities = {}, selectedBudgetId = "", loading = false, error = "" } = {}) {
  const walletConnected = Boolean(String(wallet || "").trim());
  const runCards = walletConnected ? budgets.map((budget) => {
    const activity = activities?.[budget.budgetId] || null;
    const sourceIntent = nanoSourceIntent(activity);
    const sourceReceipt = nanoReceiptForIntent(activity, sourceIntent);
    const sourceStatus = sourceReceipt
      ? buildNanoReceiptStatusModel(sourceReceipt)
      : sourceIntent
        ? buildNanoSpendIntentStatusModel(sourceIntent, null)
        : { label: activity ? "No planned source spend" : "Detail unavailable", tone: "pending" };
    const latestProof = nanoLatestReceiptStatus(activity?.receipts || []);
    const verifiedReceipts = (activity?.receipts || []).filter(isVerifiedNanoArcProofReceipt);
    const updatedAt = latestNanoActivityTimestamp(budget, activity);
    return {
      budgetId: budget.budgetId,
      runId: budget.runId,
      selected: budget.budgetId === selectedBudgetId,
      detailAvailable: Boolean(activity),
      goal: budget.goal || activity?.runContext?.goal || "Untitled Nano run",
      budget: formatNanoUsdc(budget.amount || 0),
      budgetStatus: buildNanoBudgetStatusModel(budget).label,
      sourceStatus: sourceStatus.label,
      sourceTone: sourceStatus.tone,
      proofStatus: latestProof?.label || (activity ? "No proof yet" : "Detail unavailable"),
      proofTone: latestProof?.tone || "pending",
      verifiedReceiptCount: String(verifiedReceipts.length),
      updated: formatNanoDateTime(updatedAt),
      updatedRaw: updatedAt,
      buttonLabel: "Continue run",
    };
  }) : [];

  return {
    walletConnected,
    title: "Recent Nano runs",
    subtitle: "Router-backed runs for the connected wallet.",
    loading,
    error,
    runCards,
    emptyTitle: walletConnected ? "No Nano runs yet." : "Connect a wallet to see Nano runs for that wallet.",
    emptyBody: walletConnected
      ? "Create a budget to start a source-payment run."
      : "Nano run history is scoped to the connected wallet.",
  };
}

export function buildNanoReceiptDetailModel(activity, selectedBudgetId = "") {
  if (!activity) {
    return {
      available: false,
      title: "Receipt detail unavailable.",
      body: "Receipt detail unavailable from the current router response.",
      rows: [],
    };
  }
  const receiptsByIntent = new Map((activity.receipts || []).map((receipt) => [receipt.intentId, receipt]));
  const rows = (activity.spendIntents || []).map((intent) => {
    const receipt = receiptsByIntent.get(intent.intentId) || null;
    const status = receipt ? buildNanoReceiptStatusModel(receipt) : buildNanoSpendIntentStatusModel(intent, null);
    const txLink = buildArcTransactionLink(receipt?.proof?.txHash);
    return {
      intentId: intent.intentId,
      receiptId: receipt?.receiptId || "",
      spend: intent.payee?.label || "Unnamed spend",
      amount: formatNanoUsdc(intent.amount || 0),
      recipient: intent.payee?.walletAddress ? shortWallet(intent.payee.walletAddress) : "No recipient wallet",
      recipientRaw: intent.payee?.walletAddress || "",
      reason: intent.reason || "No reason recorded.",
      proofState: status.label,
      proofTone: status.tone,
      paymentState: receipt?.paymentState || "Not paid yet",
      txLink,
      txLabel: txLink ? shortWallet(receipt.proof.txHash) : "",
      contributionSummary: receipt?.contributionSummary || "",
    };
  });

  return {
    available: true,
    budgetId: activity.budget?.budgetId || selectedBudgetId,
    title: "Receipt detail",
    body: rows.length
      ? "Stored receipt and proof state for the selected Nano run."
      : "Receipt detail unavailable from the current router response.",
    rows,
    emptyTitle: "Receipt detail unavailable.",
    emptyBody: "Receipt detail unavailable from the current router response.",
  };
}

export function buildHomeSnapshot({ tasks, agents }) {
  return {
    openCount: tasks?.allOpenTasks?.length || 0,
    completedCount: tasks?.completedTasks?.length || 0,
    activeCount: tasks?.activeTasks?.length || 0,
    agentCount: agents?.length || 0,
  };
}

export function buildTaskLifecycleModel(task, options = {}) {
  const onchainTask = options.onchainSnapshot?.onchainTask || null;
  const onchainState = String(onchainTask?.state || "").toUpperCase();
  const escrowLocked = readBigIntLike(onchainTask?.escrow_locked ?? onchainTask?.escrowLocked ?? 0n);
  const timelineByKind = new Map((task?.timeline || []).map((item) => [item.kind, item.createdAt]));
  const settlementSummary = task?.settlementSummary || null;
  const status = String(task?.status || "").toUpperCase();
  const resultStatus = String(task?.resultStatus || "").toLowerCase();
  const transactionState = String(task?.transactionState || "").toLowerCase();
  const settlementState = String(task?.settlementState || "").toLowerCase();
  const finalOutcome = String(task?.latestEvaluation?.finalOutcome || "").toLowerCase();
  const revisionRequests = [
    ...(Array.isArray(task?.revisionRequests) ? task.revisionRequests : []),
    ...(Array.isArray(options.revisionRequests) ? options.revisionRequests : []),
  ];
  const disputeRecords = [
    ...(Array.isArray(task?.disputeRecords) ? task.disputeRecords : []),
    ...(Array.isArray(options.disputeRecords) ? options.disputeRecords : []),
  ];
  const assignedAgents = task?.selectedAgents || [];
  const assignedAgent = assignedAgents[0] || null;
  const participatingAgentIds = task?.participatingAgentIds || [];
  const hasAnyRawStatus = Boolean(status || resultStatus || transactionState || settlementState || task?.onchainTaskRef || task?.latestSettlement);

  const fundingConfirmed = Boolean(settlementSummary?.isFunded)
    || transactionState === "accepted"
    || Boolean(task?.onchainTaskRef)
    || escrowLocked > 0n
    || ["ESCROW_FUNDED", "OPEN", "ASSIGNED", "EXECUTING", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "DISPUTED", "UNRESOLVED", "SETTLED", "REFUNDED"].includes(status)
    || ["OPEN", "ASSIGNED", "EXECUTING", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "DISPUTED", "UNRESOLVED", "SETTLED", "REFUNDED"].includes(onchainState);
  const fundingPending = !fundingConfirmed && ["pending_wallet", "pending_chain"].includes(transactionState);
  const fundingFailed = transactionState === "failed";
  const assigned = Boolean(assignedAgent || task?.selectedAgentId || participatingAgentIds.length || ["ASSIGNED", "EXECUTING", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "DISPUTED", "UNRESOLVED", "SETTLED", "REFUNDED"].includes(status));
  const executing = status === "EXECUTING" || resultStatus === "in_progress";
  const submitted = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "DISPUTED", "UNRESOLVED", "SETTLED", "REFUNDED"].includes(status)
    || ["submitted", "approved", "rejected", "disputed", "appealed", "unresolved", "settled"].includes(resultStatus)
    || Boolean(task?.latestSubmissionId);
  const underReview = status === "UNDER_REVIEW"
    || (submitted && !["APPROVED", "REJECTED", "DISPUTED", "UNRESOLVED", "SETTLED", "REFUNDED"].includes(status) && Boolean(task?.latestEvaluation));
  const rejected = status === "REJECTED" || resultStatus === "rejected" || finalOutcome === "rejected";
  const approved = status === "APPROVED"
    || resultStatus === "approved"
    || finalOutcome === "accepted"
    || (settlementState === "pending_settlement" && !rejected);
  const disputed = status === "DISPUTED"
    || settlementState === "disputed"
    || finalOutcome === "disputed"
    || task?.disputeRecord?.status === "open"
    || disputeRecords.some((record) => String(record?.status || "under_review").toLowerCase() !== "resolved");
  const unresolved = status === "UNRESOLVED" || settlementState === "unresolved" || finalOutcome === "unresolved";
  const cancelled = ["CANCELLED", "CANCELED", "CANCELLED_BY_OWNER", "CANCELED_BY_OWNER"].includes(status)
    || ["cancelled", "canceled"].includes(resultStatus)
    || ["cancelled", "canceled"].includes(settlementState);
  const refunded = status === "REFUNDED" || settlementState === "refunded" || task?.latestSettlement?.outcome === "refunded";
  const settled = status === "SETTLED" || settlementState === "settled" || task?.latestSettlement?.outcome === "paid";
  const completed = status === "COMPLETED" || resultStatus === "completed";
  const settlementReady = Boolean(settlementSummary?.canReleasePayment)
    || (!settled && !refunded && !disputed && approved
      && (settlementState === "pending_settlement" || (task?.reviewActions || []).includes("settle") || settlementState === "reward_funded"));
  const refundReady = Boolean(settlementSummary?.canRefund);
  const revisionRequested = Boolean(revisionRequests.length)
    || resultStatus === "needs_revision"
    || task?.userReview?.decision === "needs_human_review"
    || (rejected && !refunded && !disputed && !unresolved);
  const needsRevision = revisionRequested && !refunded;
  const noSubmission = !submitted;

  const fundingLabel = fundingConfirmed
    ? "Funded"
    : fundingPending
      ? "Funding pending"
      : fundingFailed
        ? "Funding failed"
        : "Awaiting funding";
  const evaluationLabel = settled
    ? "Approved"
    : refunded
      ? "Closed"
      : disputed
        ? "Disputed"
        : unresolved
          ? "Unresolved"
          : revisionRequested
            ? "Revision requested"
            : rejected
              ? "Rejected"
            : approved
              ? "Approved"
              : underReview
                ? "Under review"
                : submitted
                  ? "Submitted"
                  : executing
                    ? "In progress"
                    : "Awaiting output";
  const settlementLabel = settled
    ? "Payment released"
    : refunded
      ? "Reward refunded"
      : disputed
        ? "Settlement paused"
        : unresolved
          ? "Review unresolved"
          : settlementReady
            ? "Ready for settlement"
            : refundReady
              ? "Refund available"
              : fundingConfirmed
              ? "Settlement pending"
              : "Funding required";
  const currentLabel = settled
    ? "Payment released"
    : completed
      ? "Completed"
      : refunded || cancelled
        ? "Cancelled"
        : disputed || unresolved
          ? "Disputed"
          : settlementReady
            ? "Approved"
            : approved
              ? "Approved"
              : revisionRequested
                ? "Revision Requested"
                : rejected
                  ? "Revision Requested"
                : underReview
                  ? "In Review"
                  : submitted
                    ? "Submitted"
                    : executing
                      ? "In Progress"
                      : assigned
                        ? "Agent Assigned"
                        : fundingPending
                          ? "Waiting for Funding"
                          : fundingConfirmed
                            ? "Funded"
                            : hasAnyRawStatus
                              ? "Draft"
                              : "Unknown";
  const settlementMessage = settled
    ? "Payment released."
    : refunded
      ? "Reward refunded."
      : settlementSummary?.settlementReadinessLabel
        ? settlementSummary.settlementReadinessLabel
        : settlementReady
          ? "Approval is complete. You can release payment."
          : needsRevision
            ? "Revision requested before release."
          : rejected
              ? "Rejected. Payment remains locked."
              : disputed
                ? "Disputed. Payment remains locked."
                : unresolved
                  ? "Review unresolved. Payment remains locked."
                  : underReview
                    ? "Under evaluator review."
                    : submitted
                      ? "Output submitted and waiting for review."
                      : executing
                        ? "Agent is executing now."
                        : fundingPending
                          ? "Funding is still being confirmed."
                          : fundingConfirmed
                            ? "Task is funded and waiting for the next step."
                            : "Funding required.";
  const amountDisplay = Number.isFinite(Number(task?.rewardAmount))
    ? `${Number(task.rewardAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`
    : "Not available yet";
  const fundingTxLink = buildArcTransactionLink(task?.latestFundTxHash);
  const settlementTxLink = buildArcTransactionLink(task?.latestSettlement?.txReference);
  const releasePending = Boolean(settlementTxLink) && !settled && !refunded;
  const paymentStateLabel = settled
    ? "Payment released"
    : refunded
      ? "Reward refunded"
      : disputed
        ? "Payment locked during dispute"
      : settlementReady
        ? "Ready to release"
        : refundReady
          ? "Refund ready"
          : fundingConfirmed
            ? "Payment locked"
            : fundingPending
              ? "Funding pending"
              : "Funding required";
  const reviewStateLabel = approved
    ? "Owner approved"
    : revisionRequested
      ? "Revision requested"
      : rejected
        ? "Owner rejected"
      : disputed
        ? "Disputed"
        : underReview
          ? "AI guidance attached"
          : submitted
            ? "Needs owner review"
            : noSubmission
              ? "No submission yet"
              : "Waiting for update";
  const primaryAction = settled || completed
    ? { label: "View Completed Work", kind: "view_result", disabled: false }
    : refunded || cancelled
      ? { label: "View Task", kind: "view_result", disabled: false }
      : disputed || unresolved
        ? { label: "View Dispute", kind: "dispute", disabled: false }
        : settlementReady
          ? { label: "Release payment", kind: "settle", disabled: false }
          : revisionRequested
            ? { label: "Waiting for Revision", kind: "wait_revision", disabled: true }
            : rejected
              ? { label: "Waiting for Revision", kind: "wait_revision", disabled: true }
            : submitted || underReview
              ? { label: "Review Submission", kind: "review", disabled: false }
              : executing
                ? { label: "Waiting for Agent", kind: "wait", disabled: true }
                : assigned
                  ? { label: "Waiting for Agent", kind: "wait", disabled: true }
                  : fundingConfirmed
                    ? { label: "Assign Agent", kind: "assign", disabled: false }
                    : fundingPending
                      ? { label: "Waiting for Funding", kind: "funding", disabled: true }
                      : { label: "Fund Task", kind: "fund", disabled: false };
  const statusDisplay = {
    label: settled
      ? "Payment released"
      : completed
        ? "Completed"
        : refunded || cancelled
          ? "Cancelled"
          : disputed || unresolved
            ? "Disputed"
            : settlementReady || approved
              ? "Approved"
              : revisionRequested || rejected
                ? "Revision Requested"
                : underReview
                  ? "In Review"
                  : submitted
                    ? "Submitted"
                    : executing
                      ? "In Progress"
                      : assigned
                        ? "Agent Assigned"
                        : fundingPending
                          ? "Waiting for Funding"
                          : fundingConfirmed
                            ? "Funded"
                            : hasAnyRawStatus
                              ? "Draft"
                              : "Unknown",
    description: settled
      ? "Owner-approved work has been paid out and the task is effectively complete."
      : completed
        ? "The task is complete and ready to view as finished work."
        : refunded || cancelled
          ? "The task is closed and no normal payment release is available."
          : disputed || unresolved
            ? "Payment remains locked during dispute."
            : settlementReady || approved
              ? "Approval is complete. You can release payment."
              : revisionRequested || rejected
                ? "Payment remains locked until the work is approved."
                : underReview
                  ? "A submitted result is being reviewed. AI guidance is advisory; the owner decides."
                  : submitted
                    ? "The agent submitted output and the owner needs to review it."
                    : executing
                      ? "The assigned agent is actively working on the funded task."
                      : assigned
                        ? "An agent is assigned and execution is the next step."
                        : fundingPending
                          ? "Waiting for payment update."
                          : fundingConfirmed
                            ? "The task is funded and ready for assignment or execution."
                            : hasAnyRawStatus
                              ? "The task exists but needs funding before marketplace execution."
                              : "Dispatch cannot determine the current task state yet.",
    nextActionText: primaryAction.label,
    whoActsNext: settled || completed || refunded || cancelled
      ? "No action needed"
      : revisionRequested || rejected
          ? "Assigned agent"
          : settlementReady || approved || submitted || underReview || disputed || unresolved || fundingPending || !fundingConfirmed
            ? "Task owner"
        : executing || assigned
          ? "Assigned agent"
          : "Marketplace",
    primaryCtaText: primaryAction.label,
    variant: settled || completed
      ? "success"
      : refunded || cancelled || disputed || unresolved || revisionRequested || rejected || fundingFailed
        ? "warning"
        : fundingPending || fundingConfirmed || assigned || executing || submitted || underReview || approved || settlementReady
          ? "info"
          : "neutral",
    lifecycleStepAlignment: settled
      ? "payment"
      : completed
        ? "completed"
        : refunded || cancelled
          ? "completed"
          : disputed || unresolved || revisionRequested || rejected || underReview
            ? "review"
            : settlementReady || approved
              ? "approved"
              : submitted
                ? "submitted"
                : executing
                  ? "in_progress"
                  : assigned
                    ? "assigned"
                    : fundingPending || fundingConfirmed
                      ? "funding"
                      : "posted",
    actionableBy: settled || completed || refunded || cancelled
      ? "none"
      : executing || assigned
        ? "agent"
        : fundingConfirmed && !assigned
          ? "system"
          : "owner",
    raw: {
      status,
      resultStatus,
      transactionState,
      settlementState,
    },
  };
  const paymentDisplay = {
    label: settled
      ? "Released"
      : refunded
        ? "Refunded"
        : disputed || unresolved
          ? "Disputed"
          : releasePending
            ? "Release pending"
            : settlementReady
              ? "Ready to release"
              : submitted || underReview || approved || revisionRequested || rejected
                ? revisionRequested || rejected
                  ? "Waiting for changes"
                  : "Payment locked"
                : fundingConfirmed
                  ? "Payment locked"
                  : fundingPending
                    ? "Waiting for payment update"
                    : fundingFailed
                      ? "Waiting for payment update"
                      : task
                        ? "Payment not funded"
                        : "Waiting for payment update",
    description: settled
      ? "USDC payment has been released."
      : refunded
        ? "The task reward has been refunded instead of released."
        : disputed
          ? "Payment remains locked during dispute."
          : unresolved
            ? "Waiting for payment update."
          : releasePending
            ? "Waiting for payment update."
            : settlementReady
              ? "Approval is complete. You can release payment."
              : revisionRequested || rejected
                ? "Payment remains locked until the work is approved."
                : submitted || underReview
                ? "Payment only moves after approval."
                : approved
                  ? "Approval is complete. You can release payment."
                  : fundingConfirmed
                    ? "USDC stays locked until approval."
                    : fundingPending
                      ? "Waiting for payment update."
                      : fundingFailed
                        ? "Waiting for payment update."
                        : task
                          ? "Fund the task before work starts."
                          : "Waiting for payment update.",
    nextPaymentAction: settled
      ? "No payment action needed."
      : refunded
        ? "No release action is available after refund."
        : disputed
          ? "Payment remains locked during dispute."
          : unresolved
            ? "Waiting for payment update."
          : releasePending
            ? "Waiting for payment update."
            : settlementReady
              ? "Release payment."
              : revisionRequested || rejected
                ? "Waiting for updated work."
                : submitted || underReview
                ? "Review the submitted work."
                : approved
                  ? "Release becomes available after approval."
                  : fundingConfirmed
                    ? "Waiting for agent submission."
                    : fundingPending
                      ? "Waiting for payment update."
                      : "Fund the task before work starts.",
    variant: settled
      ? "success"
      : refunded || disputed || unresolved || fundingFailed
        ? "warning"
        : settlementReady || releasePending || fundingConfirmed || fundingPending || revisionRequested
          ? "info"
          : "neutral",
    amountDisplay,
    networkDisplay: "Arc Testnet",
    fundingTxHash: task?.latestFundTxHash || null,
    fundingTxLink,
    settlementTxHash: task?.latestSettlement?.txReference || null,
    settlementTxLink,
    transactionLinks: [
      fundingTxLink ? { label: "Funding transaction", href: fundingTxLink, hash: task.latestFundTxHash } : null,
      settlementTxLink ? { label: "Release transaction", href: settlementTxLink, hash: task.latestSettlement.txReference } : null,
    ].filter(Boolean),
  };
  const nextActor = statusDisplay.whoActsNext;
  const nextActionHelper = settled
    ? "The task is complete. Review the delivered work and payment record."
    : completed
      ? "The task is complete. View the delivered work and final status."
    : refunded
      ? "The task is closed and the reward has been refunded."
      : cancelled
        ? "The task is closed and no normal marketplace action is available."
        : disputed || unresolved
          ? "Payment remains locked during dispute."
      : settlementReady
        ? "Approval is complete. You can release payment."
        : revisionRequested || rejected
          ? "Waiting for updated work. Payment remains locked until approval."
          : submitted || underReview
            ? "Review the submitted output. Owner approval controls payment release."
            : executing
              ? "The agent is working. Wait for the submitted output before reviewing."
              : assigned
                ? "An agent is assigned. Execution will produce a submitted output next."
                : fundingConfirmed
                  ? "The task is funded. USDC stays locked until approval."
                  : fundingPending
                    ? "Waiting for payment update."
                    : "Fund the task before assignment or execution can begin.";
  const reputationLabel = settled
    ? "Reputation updated"
    : refunded
      ? "Refund closed"
      : "Reputation pending";
  const assignmentLabel = assignedAgent
    ? `${assignedAgent.displayName} (${assignedAgent.originType === "external" ? "External agent" : "Platform agent"})`
    : task?.selectedAgentId
      ? "Assigned agent selected"
      : participatingAgentIds.length
        ? `${participatingAgentIds.length} participating agent${participatingAgentIds.length === 1 ? "" : "s"}`
        : "No agent assigned yet";

  const steps = [
    {
      key: "posted",
      label: "Task Created",
      status: "complete",
      helper: "Dispatch recorded the task request and reward terms.",
      timestamp: task?.createdAt || timelineByKind.get("task_created") || null,
    },
    {
      key: "funding",
      label: "Funded",
      status: fundingConfirmed ? "complete" : fundingFailed ? "failed" : fundingPending ? "current" : "pending",
      helper: fundingConfirmed
        ? "Funding is confirmed and the task can move through the marketplace."
        : fundingFailed
          ? "The latest wallet or chain funding action failed."
          : fundingPending
            ? "Waiting for payment update."
            : "The task needs funding before assignment and execution.",
      timestamp: timelineByKind.get("escrow_funded") || null,
    },
    {
      key: "assigned",
      label: "Agent Assigned",
      status: assigned ? "complete" : fundingConfirmed ? "current" : "pending",
      helper: assigned
        ? assignmentLabel
        : "An AI agent will be assigned once the USDC-funded task is ready to route.",
      timestamp: timelineByKind.get("agent_accepted") || timelineByKind.get("agent_invited") || null,
    },
    {
      key: "in_progress",
      label: "In Progress",
      status: submitted || approved || settled || refunded || revisionRequested || rejected || disputed || unresolved ? "complete" : executing ? "current" : assigned ? "pending" : "pending",
      helper: executing
        ? "The assigned worker is actively completing the task."
        : submitted
          ? "Execution finished and a result was submitted."
          : assigned
            ? "Execution starts after the agent begins work."
            : "Waiting for an assigned agent before work can start.",
      timestamp: timelineByKind.get("execution_started") || null,
    },
    {
      key: "submitted",
      label: "Submitted",
      status: submitted ? "complete" : executing ? "pending" : "pending",
      helper: submitted
        ? "A result is on the task and ready for owner review."
        : "No submission yet.",
      timestamp: timelineByKind.get("submission_received") || null,
    },
    {
      key: "review",
      label: "Review",
      status: approved ? "complete" : revisionRequested || rejected || disputed || unresolved ? "warning" : underReview || submitted ? "current" : "pending",
      helper: approved
        ? "The task owner approved the output for settlement."
        : revisionRequested || rejected
          ? "The owner requested changes. Payment stays locked until approval."
          : disputed
            ? "Payment remains locked during dispute."
            : unresolved
              ? "Payment remains locked until review is resolved."
              : underReview
                ? "AI review is guidance. The task owner makes the final approval decision."
                : submitted
                  ? "The output is waiting for owner review."
                  : "Review starts after submission.",
      timestamp: timelineByKind.get("review_started") || timelineByKind.get("result_verified") || null,
    },
    {
      key: "approved",
      label: "Approved",
      status: approved || settled ? "complete" : revisionRequested || rejected || disputed || unresolved ? "warning" : submitted || underReview ? "pending" : "pending",
      helper: approved || settled
        ? "Approval is complete. You can release payment."
        : revisionRequested || rejected
          ? "Approval is still required before payment can be released."
          : "Owner approval happens after reviewing a submitted output.",
      timestamp: timelineByKind.get("approved") || timelineByKind.get("result_verified") || null,
    },
    {
      key: "payment",
      label: "Payment released",
      status: settled || refunded ? "complete" : revisionRequested || rejected || disputed || unresolved ? "warning" : settlementReady ? "current" : "pending",
      helper: settlementMessage,
      timestamp: task?.latestSettlement?.settlementTimestamp || timelineByKind.get("settled") || timelineByKind.get("refund_completed") || null,
    },
    {
      key: "reputation",
      label: "Completed",
      status: settled || refunded ? "complete" : "pending",
      helper: settled
        ? "Agent reputation can now reflect a paid, owner-approved funded outcome."
        : refunded
          ? "The task is closed and payment reputation stays unchanged or neutral."
          : "Reputation updates after owner approval and a terminal payment state.",
      timestamp: task?.latestSettlement?.settlementTimestamp || null,
    },
  ];

  return {
    steps,
    currentLabel,
    statusDisplay,
    fundingLabel,
    evaluationLabel,
    settlementLabel,
    settlementMessage,
    paymentStateLabel,
    paymentDisplay,
    reviewStateLabel,
    primaryAction,
    nextActor,
    nextActionHelper,
    assignmentLabel,
    assignedAgent,
    isSettled: settled,
    isRefunded: refunded,
    isRejected: rejected,
    isRevisionRequested: revisionRequested,
    isDisputed: disputed,
    isUnresolved: unresolved,
    isCancelled: cancelled,
  };
}

export function buildTaskPaymentDisplayModel(task, options = {}) {
  return buildTaskLifecycleModel(task, options).paymentDisplay;
}

export function buildTaskStatusDisplayModel(task, options = {}) {
  return buildTaskLifecycleModel(task, options).statusDisplay;
}

export function buildTaskRevisionDisplayModel(task, options = {}) {
  const sourceItems = [
    ...(Array.isArray(task?.revisionRequests) ? task.revisionRequests : []),
    ...(Array.isArray(options.revisionRequests) ? options.revisionRequests : []),
  ];
  const normalizedItems = sourceItems
    .filter(Boolean)
    .map((item, index) => {
      const changeRequest = String(item.changeRequest || item.note || item.reason || "").trim();
      const missingDetails = String(item.missingDetails || item.missing || "").trim();
      const extraInstruction = String(item.extraInstruction || item.instruction || "").trim();
      return {
        id: item.id || `revision_${index + 1}`,
        changeRequest: changeRequest || "Revision details were not provided.",
        missingDetails: missingDetails || "Not specified.",
        extraInstruction: extraInstruction || "",
        requestedAt: item.requestedAt || item.createdAt || null,
        requestedBy: item.requestedBy || item.actorWallet || "Task owner",
        resubmissionNote: item.resubmissionNote || null,
      };
    })
    .sort((left, right) => new Date(right.requestedAt || 0).getTime() - new Date(left.requestedAt || 0).getTime());
  const hasRevisionRequested = normalizedItems.length > 0
    || String(task?.resultStatus || "").toLowerCase() === "needs_revision"
    || task?.userReview?.decision === "needs_human_review";

  return {
    hasRevisionRequested,
    items: normalizedItems,
    latestRequest: normalizedItems[0] || null,
    headline: hasRevisionRequested
      ? "Revision requested"
      : "No revision requested",
    description: hasRevisionRequested
      ? "Payment remains locked until the work is approved."
      : "Revision history will appear here after changes are requested.",
    emptyMessage: "No revision requested. Review actions appear after the agent submits work.",
  };
}

export function buildTaskDisputeDisplayModel(task, options = {}) {
  const sourceItems = [
    ...(Array.isArray(task?.disputeRecords) ? task.disputeRecords : []),
    ...(Array.isArray(options.disputeRecords) ? options.disputeRecords : []),
    task?.disputeRecord || null,
  ];
  const normalizedItems = sourceItems
    .filter(Boolean)
    .map((item, index) => {
      const reason = String(item.reason || item.disputeReason || "").trim();
      const details = String(item.details || item.evidence || item.description || "").trim();
      const requestedResolution = String(item.requestedResolution || item.resolution || "").trim();
      const status = String(item.status || "under_review").trim();
      return {
        id: item.id || `dispute_${index + 1}`,
        reason: reason || "Dispute reason not provided.",
        details: details || "No evidence details provided yet.",
        requestedResolution: requestedResolution || "Request platform review",
        status: status || "under_review",
        statusLabel: labelize(status || "under_review"),
        openedAt: item.openedAt || item.createdAt || item.requestedAt || null,
        openedBy: item.openedBy || item.actorWallet || "Task owner",
      };
    })
    .sort((left, right) => new Date(right.openedAt || 0).getTime() - new Date(left.openedAt || 0).getTime());
  const hasOpenDispute = normalizedItems.some((item) => String(item.status || "").toLowerCase() !== "resolved")
    || String(task?.status || "").toUpperCase() === "DISPUTED"
    || String(task?.settlementState || "").toLowerCase() === "disputed";

  return {
    hasOpenDispute,
    items: normalizedItems,
    latestDispute: normalizedItems[0] || null,
    headline: hasOpenDispute
      ? "Dispute under review"
      : "No dispute open",
    description: hasOpenDispute
      ? "Payment remains locked during dispute. No refund or release happens from this action."
      : "Dispute details will appear here if the owner opens a dispute.",
    emptyMessage: "No dispute open. Use disputes only when approval or revision cannot safely resolve the task.",
  };
}

export const taskBriefTemplates = [
  {
    id: "write_x_thread",
    name: "Write X Thread",
    category: "writing",
    description: "Turn a topic, links, or notes into a polished X thread.",
    expectedOutput: "A polished X thread based on the details above.",
    fields: [
      { key: "topic", label: "Topic", required: true },
      { key: "audience", label: "Audience", required: true },
      { key: "tone", label: "Tone", required: true },
      { key: "keyPoints", label: "Key points", required: true, multiline: true },
      { key: "referenceLinks", label: "Reference links", required: false, multiline: true },
      { key: "tweetCount", label: "Number of tweets", required: true },
      { key: "cta", label: "CTA", required: false },
    ],
  },
  {
    id: "summarize_article",
    name: "Summarize Article",
    category: "summarization",
    description: "Summarize an article, link, transcript, or pasted text.",
    expectedOutput: "A concise summary with the requested style, length, and key points.",
    fields: [
      { key: "article", label: "Article/link/text", required: true, multiline: true },
      { key: "summaryStyle", label: "Summary style", required: true },
      { key: "length", label: "Length", required: true },
      { key: "mainPoints", label: "Main points to extract", required: false, multiline: true },
      { key: "audience", label: "Audience", required: false },
    ],
  },
  {
    id: "debug_code",
    name: "Debug Code",
    category: "coding",
    description: "Explain and debug a code issue with clear reproduction context.",
    expectedOutput: "A clear diagnosis, likely cause, suggested fix, and next steps.",
    fields: [
      { key: "techStack", label: "Tech stack", required: true },
      { key: "errorMessage", label: "Error message", required: true, multiline: true },
      { key: "expectedBehavior", label: "Expected behavior", required: true, multiline: true },
      { key: "actualBehavior", label: "Actual behavior", required: true, multiline: true },
      { key: "codeSnippet", label: "Code snippet/link", required: false, multiline: true },
      { key: "alreadyTried", label: "What you already tried", required: false, multiline: true },
    ],
  },
  {
    id: "research_project",
    name: "Research Project",
    category: "research",
    description: "Research a project, market, or topic and return a structured brief.",
    expectedOutput: "A structured research brief with comparisons, risks, and conclusion.",
    fields: [
      { key: "projectName", label: "Project name", required: true },
      { key: "links", label: "Links", required: false, multiline: true },
      { key: "researchGoal", label: "Research goal", required: true, multiline: true },
      { key: "whatToCompare", label: "What to compare", required: false, multiline: true },
      { key: "outputFormat", label: "Output format", required: true },
      { key: "risksToCover", label: "Risks to cover", required: false, multiline: true },
    ],
  },
  {
    id: "rewrite_content",
    name: "Rewrite Content",
    category: "writing",
    description: "Rewrite rough content for a clearer tone, audience, and length.",
    expectedOutput: "A rewritten version that preserves meaning while improving clarity and tone.",
    fields: [
      { key: "originalText", label: "Original text", required: true, multiline: true },
      { key: "targetTone", label: "Target tone", required: true },
      { key: "audience", label: "Audience", required: false },
      { key: "length", label: "Length", required: false },
      { key: "whatToImprove", label: "What to improve", required: true, multiline: true },
    ],
  },
  {
    id: "custom_task",
    name: "Custom Task",
    category: "",
    description: "Write your own task brief from scratch.",
    expectedOutput: "",
    fields: [],
  },
];

export function getTaskBriefTemplate(templateId) {
  return taskBriefTemplates.find((template) => template.id === templateId) || taskBriefTemplates.at(-1);
}

export function buildTaskTemplateBrief(templateId, values = {}) {
  const template = getTaskBriefTemplate(templateId);
  if (!template || template.id === "custom_task") {
    return {
      template,
      brief: "",
      missingFields: [],
      isCustom: true,
    };
  }

  const missingFields = template.fields
    .filter((field) => field.required && !String(values[field.key] || "").trim())
    .map((field) => field.label);

  const lines = [
    `Task Type: ${template.name}`,
    "",
    ...template.fields.flatMap((field) => [
      `${field.label}:`,
      String(values[field.key] || "").trim() || "Not provided yet",
      "",
    ]),
    "Expected output:",
    template.expectedOutput,
  ];

  return {
    template,
    brief: lines.join("\n").trim(),
    missingFields,
    isCustom: false,
  };
}

export function buildPostTaskChecklist(form, selectedAgent) {
  const isDirect = form.hiringMode === "direct_hire";
  const templateResult = buildTaskTemplateBrief(form.templateId || "custom_task", form.templateFields || {});
  const templateReady = templateResult.isCustom || templateResult.missingFields.length === 0;
  return {
    summary: isDirect
      ? (selectedAgent ? `${selectedAgent.profile.publicName} is preselected for this funded Arc task.` : "Select an agent before funding this direct hire.")
      : `Open market funded task with up to ${Number(form.maxParticipants || 1)} participating agents.`,
    items: [
      {
        id: "scope",
        label: "Funded task scope is clear",
        complete: String(form.title || "").trim().length >= 3 && String(form.description || "").trim().length >= 20,
      },
      {
        id: "template",
        label: templateResult.isCustom ? "Custom brief ready" : "Template fields ready",
        complete: templateReady,
      },
      {
        id: "selection",
        label: isDirect ? "Agent selected" : "Participant cap defined",
        complete: isDirect ? Boolean(form.selectedAgentId) : Number(form.maxParticipants || 0) >= 1,
      },
      {
        id: "settlement",
        label: "Owner review and settlement path chosen",
        complete: Boolean(form.evaluationPreference),
      },
    ],
  };
}

export function buildAgentProfileHighlights(agent) {
  const paidCompleted = agent.performanceSummary?.paidTasksCompleted ?? agent.performanceSummary?.tasksCompleted ?? 0;
  const paidEarnings = agent.performanceSummary?.paidEarnings ?? agent.performanceSummary?.totalEarnings ?? 0;
  const averageScore = Math.round(agent.performanceSummary?.averageScore || 0);
  return [
    `${Math.round((agent.performanceSummary?.approvalRate || 0) * 100)}% approval`,
    `${averageScore || 0} avg evaluation score`,
    `${formatResponseMetric(agent)} avg response`,
    `${paidCompleted} paid funded jobs`,
    `${paidEarnings} USDC earned from settled work`,
  ];
}

export function buildSuggestedTaskTemplatesForAgent(agent) {
  const haystack = [
    agent?.profile?.publicName,
    agent?.profile?.slug,
    agent?.profile?.category,
    ...(agent?.profile?.skills || []),
    ...(agent?.profile?.capabilityTags || []),
    ...(agent?.profile?.skillCategories || []),
  ].join(" ").toLowerCase();

  const ids = haystack.includes("thread")
    ? ["write_x_thread", "rewrite_content"]
    : haystack.includes("summar")
      ? ["summarize_article", "rewrite_content"]
      : haystack.includes("research")
        ? ["research_project", "summarize_article"]
        : haystack.includes("rewrit")
          ? ["rewrite_content", "write_x_thread"]
          : haystack.includes("repurpos") || haystack.includes("content")
            ? ["write_x_thread", "rewrite_content"]
            : haystack.includes("code") || haystack.includes("debug")
              ? ["debug_code", "research_project"]
              : ["custom_task"];

  return ids
    .map(getTaskBriefTemplate)
    .filter(Boolean);
}

function classifyServicePackageFamily(agent) {
  const haystack = [
    agent?.profile?.publicName,
    agent?.profile?.slug,
    agent?.profile?.category,
    ...(agent?.profile?.skills || []),
    ...(agent?.profile?.capabilityTags || []),
    ...(agent?.profile?.skillCategories || []),
  ].join(" ").toLowerCase();

  if (haystack.includes("thread")) return "thread_writer";
  if (haystack.includes("summar")) return "summarizer";
  if (haystack.includes("debug") || haystack.includes("code")) return "debugging";
  if (haystack.includes("research")) return "research";
  if (haystack.includes("rewrit")) return "rewriter";
  if (haystack.includes("repurpos") || haystack.includes("content")) return "content_repurposer";
  return "generic";
}

const servicePackageCatalog = {
  thread_writer: [
    { tier: "Basic", name: "5-tweet thread", priceUsdc: 10, deliveryEstimate: "Fast delivery", templateId: "write_x_thread", description: "Turn one topic or link into a concise X thread.", expectedOutput: "Hook, 5-tweet thread, and simple CTA.", bestFor: "Quick launch posts and simple thought-leadership threads.", fields: { tweetCount: "5", tone: "clear and direct", cta: "Invite readers to learn more or try the product" } },
    { tier: "Standard", name: "10-tweet thread", priceUsdc: 20, deliveryEstimate: "Balanced delivery", templateId: "write_x_thread", description: "Build a fuller thread with stronger flow and positioning.", expectedOutput: "Hook, 10-tweet thread, CTA, and structure notes.", bestFor: "Product launches, announcements, and founder updates.", fields: { tweetCount: "10", tone: "sharp and useful", cta: "Drive readers toward the next action" } },
    { tier: "Pro", name: "15-tweet thread + hooks", priceUsdc: 35, deliveryEstimate: "High-detail delivery", templateId: "write_x_thread", description: "Create a deeper thread with multiple hook options.", expectedOutput: "3 hook options, 15-tweet thread, CTA, and suggested visuals.", bestFor: "Important launches and crypto-native campaigns.", fields: { tweetCount: "15", tone: "high-signal and crypto-native", cta: "Clear next step for readers" } },
  ],
  summarizer: [
    { tier: "Basic", name: "Short summary", priceUsdc: 8, deliveryEstimate: "Fast delivery", templateId: "summarize_article", description: "Summarize long text into a short useful brief.", expectedOutput: "Short summary and key takeaways.", bestFor: "Articles, notes, and quick reading shortcuts.", fields: { summaryStyle: "short", length: "brief", mainPoints: "Extract the most important points" } },
    { tier: "Standard", name: "Detailed summary + key points", priceUsdc: 18, deliveryEstimate: "Balanced delivery", templateId: "summarize_article", description: "Turn source material into a structured summary.", expectedOutput: "Detailed summary, key points, and action items if applicable.", bestFor: "Research notes, documents, and meeting transcripts.", fields: { summaryStyle: "structured", length: "detailed", mainPoints: "Key ideas, useful details, and action items" } },
    { tier: "Pro", name: "Summary + thread-ready breakdown", priceUsdc: 30, deliveryEstimate: "High-detail delivery", templateId: "summarize_article", description: "Summarize material and make it easy to repurpose.", expectedOutput: "Summary, key points, action items, and thread-ready breakdown.", bestFor: "Turning long material into usable content assets.", fields: { summaryStyle: "repurposable", length: "comprehensive", mainPoints: "Summary, key insights, content angles, and actions" } },
  ],
  debugging: [
    { tier: "Basic", name: "Explain error", priceUsdc: 10, deliveryEstimate: "Fast delivery", templateId: "debug_code", description: "Explain what an error likely means.", expectedOutput: "Plain-English diagnosis and likely next checks.", bestFor: "Understanding build/runtime errors quickly.", fields: { outputFormat: "diagnosis" } },
    { tier: "Standard", name: "Find bug + suggest fix", priceUsdc: 25, deliveryEstimate: "Balanced delivery", templateId: "debug_code", description: "Analyze the issue and suggest a practical fix.", expectedOutput: "Likely cause, suggested fix, and verification steps.", bestFor: "Stuck bugs with enough context to reason from.", fields: { alreadyTried: "List anything already tested so the agent avoids repeats" } },
    { tier: "Pro", name: "Review file + propose patch", priceUsdc: 50, deliveryEstimate: "High-detail delivery", templateId: "debug_code", description: "Review a code snippet or file and propose a patch plan.", expectedOutput: "Diagnosis, patch recommendation, risks, and test checklist.", bestFor: "Higher-value debugging where correctness matters.", fields: { alreadyTried: "Include relevant file links, snippets, and reproduction steps" } },
  ],
  research: [
    { tier: "Basic", name: "Quick research summary", priceUsdc: 10, deliveryEstimate: "Fast delivery", templateId: "research_project", description: "Get a quick structured overview of a topic.", expectedOutput: "Overview, key points, and conclusion.", bestFor: "Early exploration and fast context building.", fields: { outputFormat: "quick research summary", risksToCover: "Mention obvious risks or uncertainties" } },
    { tier: "Standard", name: "Detailed research brief", priceUsdc: 25, deliveryEstimate: "Balanced delivery", templateId: "research_project", description: "Produce a clearer breakdown with useful insights.", expectedOutput: "Overview, key insights, pros, risks, and conclusion.", bestFor: "Project reviews, market checks, and decision support.", fields: { outputFormat: "structured research brief", risksToCover: "Product, adoption, execution, and market risks" } },
    { tier: "Pro", name: "Research + comparison + risks", priceUsdc: 50, deliveryEstimate: "High-detail delivery", templateId: "research_project", description: "Research a topic and compare it against alternatives.", expectedOutput: "Research brief, comparison table, risks, and recommendation.", bestFor: "Investment-style, product, or competitor research tasks.", fields: { outputFormat: "research brief with comparison and risks", whatToCompare: "Compare against relevant alternatives" } },
  ],
  rewriter: [
    { tier: "Basic", name: "Clean rewrite", priceUsdc: 8, deliveryEstimate: "Fast delivery", templateId: "rewrite_content", description: "Make rough text clearer and more polished.", expectedOutput: "Clean rewritten version preserving original meaning.", bestFor: "Paragraphs, emails, and rough product copy.", fields: { targetTone: "clear and polished", whatToImprove: "Clarity, flow, and readability" } },
    { tier: "Standard", name: "Rewrite + stronger hook", priceUsdc: 18, deliveryEstimate: "Balanced delivery", templateId: "rewrite_content", description: "Improve the text and strengthen its opening.", expectedOutput: "Polished rewrite, stronger hook, and structure notes.", bestFor: "Posts, landing sections, and announcement copy.", fields: { targetTone: "stronger and sharper", whatToImprove: "Hook, clarity, flow, and persuasion" } },
    { tier: "Pro", name: "Rewrite + 3 angle variations", priceUsdc: 30, deliveryEstimate: "High-detail delivery", templateId: "rewrite_content", description: "Rewrite the text and explore multiple angles.", expectedOutput: "Polished rewrite plus 3 alternate angle variations.", bestFor: "High-impact posts and copy where angle matters.", fields: { targetTone: "premium and compelling", whatToImprove: "Clarity, hook, angle, and conversion strength" } },
  ],
  content_repurposer: [
    { tier: "Basic", name: "Repurpose into summary", priceUsdc: 10, deliveryEstimate: "Fast delivery", templateId: "summarize_article", description: "Turn one input into a short reusable summary.", expectedOutput: "Summary, key points, and short caption.", bestFor: "Fast content reuse from long notes.", fields: { summaryStyle: "content-ready", length: "short", mainPoints: "Extract reusable points and a short caption" } },
    { tier: "Standard", name: "Thread + bullet points", priceUsdc: 22, deliveryEstimate: "Balanced delivery", templateId: "write_x_thread", description: "Turn one piece of content into a thread and bullet set.", expectedOutput: "Hook, thread, bullet points, and CTA.", bestFor: "Repurposing articles or transcripts for X.", fields: { tweetCount: "8", tone: "clear and useful", cta: "Encourage the reader to take the next step" } },
    { tier: "Pro", name: "Multi-format content pack", priceUsdc: 40, deliveryEstimate: "High-detail delivery", templateId: "write_x_thread", description: "Create multiple usable content formats from one source.", expectedOutput: "Thread, summary, bullet points, short post, and CTA.", bestFor: "Campaign-ready content repurposing.", fields: { tweetCount: "12", tone: "high-signal and practical", cta: "Clear next step for the audience" } },
  ],
};

export function buildAgentServicePackages(agent) {
  const family = classifyServicePackageFamily(agent);
  if (family === "generic") return [];
  const catalogItems = servicePackageCatalog[family] || [];
  const agentId = agent?.profile?.agentId || "";
  const agentSlug = agent?.profile?.slug || "agent";
  return catalogItems.map((item) => ({
    id: `${agentSlug}_${item.tier.toLowerCase()}_${item.templateId}`,
    agentId,
    ...item,
    includedRevisions: "Revision requests stay available through Dispatch review, but this package does not guarantee an automatic revision count.",
  }));
}

export function buildServicePackageDisplayModel(servicePackage, agent = null) {
  return {
    id: servicePackage?.id || "",
    tier: servicePackage?.tier || "Package",
    name: servicePackage?.name || "Service package",
    description: servicePackage?.description || "Ready-made service for a funded Dispatch task.",
    priceDisplay: `${Number(servicePackage?.priceUsdc || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`,
    deliveryEstimate: servicePackage?.deliveryEstimate || "Delivery estimate not available yet",
    expectedOutput: servicePackage?.expectedOutput || "Structured output for owner review.",
    bestFor: servicePackage?.bestFor || "Funded AI work with review before payment.",
    agentName: agent?.profile?.publicName || "Selected agent",
    templateName: getTaskBriefTemplate(servicePackage?.templateId)?.name || "Custom Task",
    includedRevisions: servicePackage?.includedRevisions || "Revisions follow the normal Dispatch review flow.",
  };
}

export function buildTaskDraftFromServicePackage(servicePackage, agent = null) {
  const template = getTaskBriefTemplate(servicePackage?.templateId || "custom_task");
  const fields = {
    ...(servicePackage?.fields || {}),
  };
  const briefSections = [
    `Service Package: ${servicePackage?.tier || "Package"} - ${servicePackage?.name || "Service package"}`,
    "",
    `Agent: ${agent?.profile?.publicName || "Selected agent"}`,
    `Price: ${Number(servicePackage?.priceUsdc || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`,
    `Delivery estimate: ${servicePackage?.deliveryEstimate || "Not available yet"}`,
    "",
    "What the user is buying:",
    servicePackage?.description || "Ready-made service for a funded Dispatch task.",
    "",
    "Best for:",
    servicePackage?.bestFor || "Funded AI work with review before payment.",
    "",
    "Expected output:",
    servicePackage?.expectedOutput || "Structured output for owner review.",
    "",
    "Editable brief:",
    "Add your specific topic, source text, links, constraints, and preferred tone before funding.",
    "This package only prefills task creation. You still fund the task, review the submitted work, and release payment only after approval.",
  ];

  return {
    title: servicePackage?.name ? `${servicePackage.name} with ${agent?.profile?.publicName || "agent"}` : `Task for ${agent?.profile?.publicName || "agent"}`,
    description: briefSections.join("\n"),
    category: template.category || agent?.profile?.category || "research",
    rewardAmount: servicePackage?.priceUsdc ? String(servicePackage.priceUsdc) : "",
    templateId: template.id,
    templateFields: fields,
    hiringMode: "direct_hire",
    selectedAgentId: agent?.profile?.agentId || servicePackage?.agentId || "",
    servicePackage: servicePackage ? {
      id: servicePackage.id,
      name: servicePackage.name,
      tier: servicePackage.tier,
      priceUsdc: servicePackage.priceUsdc,
      deliveryEstimate: servicePackage.deliveryEstimate,
      agentId: agent?.profile?.agentId || servicePackage.agentId || "",
    } : null,
    templateMessage: `${servicePackage?.name || "Service package"} prefilled this task. Review and edit the brief before funding.`,
  };
}

function collectTaskBuckets(taskCollections = {}) {
  return [
    ...(taskCollections.myPostedTasks || []),
    ...(taskCollections.allOpenTasks || []),
    ...(taskCollections.tasksAssignedToMyAgents || []),
    ...(taskCollections.activeTasks || []),
    ...(taskCollections.completedTasks || []),
    ...(taskCollections.rejectedTasks || []),
    ...(taskCollections.disputedTasks || []),
  ].filter((task, index, items) => task?.taskId && items.findIndex((candidate) => candidate?.taskId === task.taskId) === index);
}

function taskBelongsToAgent(task, agentId) {
  return task?.selectedAgentId === agentId || (task?.participatingAgentIds || []).includes(agentId);
}

function normalizedWallet(value) {
  return String(value || "").trim().toLowerCase();
}

function filterTaskCollections(taskCollections, predicate) {
  return Object.fromEntries(
    Object.entries(taskCollections || {}).map(([key, tasks]) => [
      key,
      Array.isArray(tasks) ? tasks.filter(predicate) : tasks,
    ]),
  );
}

export function buildWalletScopedDashboardModel(agents = [], taskCollections = {}, wallet = "") {
  const walletKey = normalizedWallet(wallet);
  const allTasks = collectTaskBuckets(taskCollections);
  const hasCompleteTaskOwnership = allTasks.every((task) => Boolean(normalizedWallet(task?.creatorWallet)));
  const hasCompleteAgentOwnership = agents.every((agent) => Boolean(normalizedWallet(agent?.profile?.ownerWallet)));
  const ownedAgents = walletKey
    ? agents.filter((agent) => normalizedWallet(agent?.profile?.ownerWallet) === walletKey)
    : [];
  const ownedAgentIds = new Set(ownedAgents.map((agent) => agent?.profile?.agentId).filter(Boolean));
  const isWalletTask = (task) => walletKey && normalizedWallet(task?.creatorWallet) === walletKey;
  const isOwnedAgentTask = (task) => walletKey && (
    ownedAgentIds.has(task?.selectedAgentId)
    || (task?.participatingAgentIds || []).some((agentId) => ownedAgentIds.has(agentId))
  );
  const walletTaskCollections = filterTaskCollections(taskCollections, isWalletTask);
  const earningsTaskCollections = filterTaskCollections(taskCollections, isOwnedAgentTask);
  const attentionTasks = allTasks.filter((task) => isWalletTask(task) || isOwnedAgentTask(task));

  return {
    walletConnected: Boolean(walletKey),
    ownedAgents,
    walletTaskCollections,
    earningsTaskCollections,
    attentionTasks,
    tasksOwnershipAvailable: hasCompleteTaskOwnership,
    agentsOwnershipAvailable: hasCompleteAgentOwnership,
    earningsOwnershipAvailable: hasCompleteAgentOwnership && hasCompleteTaskOwnership,
  };
}

function readTaskReward(task) {
  const value = Number(task?.rewardAmount);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function isTaskFundedForEarnings(task) {
  const lifecycle = buildTaskLifecycleModel(task);
  return !["Payment not funded", "Waiting for payment update", "Unknown"].includes(lifecycle.paymentDisplay.label);
}

function isTaskSettledForEarnings(task) {
  const status = String(task?.status || "").toUpperCase();
  const settlementState = String(task?.settlementState || "").toLowerCase();
  return status === "SETTLED" || settlementState === "settled" || task?.latestSettlement?.outcome === "paid";
}

function isTaskDisputedForEarnings(task) {
  const lifecycle = buildTaskLifecycleModel(task);
  return lifecycle.isDisputed;
}

function isTaskPendingLockedForEarnings(task) {
  const status = String(task?.status || "").toUpperCase();
  if (isTaskSettledForEarnings(task) || isTaskDisputedForEarnings(task)) return false;
  return isTaskFundedForEarnings(task) && ["ASSIGNED", "EXECUTING", "SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(status);
}

export function buildAgentAttentionItems(agent, taskCollections = {}) {
  const agentId = agent?.profile?.agentId;
  if (!agentId) return [];
  return collectTaskBuckets(taskCollections)
    .filter((task) => taskBelongsToAgent(task, agentId))
    .filter((task) => {
      const status = String(task.status || "").toUpperCase();
      const resultStatus = String(task.resultStatus || "").toLowerCase();
      return ["ASSIGNED", "EXECUTING", "SUBMITTED", "UNDER_REVIEW", "DISPUTED"].includes(status)
        || ["submitted", "needs_revision", "disputed"].includes(resultStatus)
        || Boolean(task.revisionRequests?.length)
        || Boolean(task.disputeRecords?.length);
    })
    .slice(0, 5)
    .map((task) => {
      const lifecycle = buildTaskLifecycleModel(task);
      return {
        taskId: task.taskId,
        title: buildSafeTaskSummary(task),
        statusLabel: lifecycle.statusDisplay.label,
        paymentLabel: lifecycle.paymentDisplay.label,
        nextAction: lifecycle.statusDisplay.nextActionText,
        whoActsNext: lifecycle.statusDisplay.whoActsNext,
      };
    });
}

export function buildEarningsActivityRows(agents = [], taskCollections = {}) {
  const agentById = new Map(agents.map((agent) => [agent?.profile?.agentId, agent]));
  return collectTaskBuckets(taskCollections)
    .flatMap((task) => {
      const agentIds = [
        task?.selectedAgentId,
        ...(task?.participatingAgentIds || []),
      ].filter(Boolean);
      return [...new Set(agentIds)].map((agentId) => ({ task, agent: agentById.get(agentId) || null, agentId }));
    })
    .filter(({ task }) => readTaskReward(task) > 0 && isTaskFundedForEarnings(task))
    .map(({ task, agent, agentId }) => {
      const lifecycle = buildTaskLifecycleModel(task);
      const settlementTxLink = buildArcTransactionLink(task?.latestSettlement?.txReference);
      const fundingTxLink = buildArcTransactionLink(task?.latestFundTxHash);
      return {
        taskId: task.taskId,
        title: buildSafeTaskSummary(task),
        agentId,
        agentName: agent?.profile?.publicName || "Assigned agent",
        amount: readTaskReward(task),
        amountDisplay: `${readTaskReward(task).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`,
        paymentState: lifecycle.paymentDisplay.label,
        reviewState: lifecycle.reviewStateLabel,
        settlementState: lifecycle.settlementLabel,
        dateLabel: task?.latestSettlement?.settlementTimestamp || task?.updatedAt || task?.createdAt
          ? new Date(task.latestSettlement?.settlementTimestamp || task.updatedAt || task.createdAt).toLocaleDateString()
          : "Waiting for update",
        txLink: settlementTxLink || fundingTxLink,
        txLabel: settlementTxLink ? "Settlement tx" : fundingTxLink ? "Funding tx" : "No transaction link",
      };
    })
    .sort((left, right) => {
      if (left.dateLabel === "Waiting for update") return 1;
      if (right.dateLabel === "Waiting for update") return -1;
      return 0;
    });
}

export function buildAgentEarningsBreakdown(agent, taskCollections = {}) {
  const summary = agent?.performanceSummary || {};
  const agentId = agent?.profile?.agentId || "";
  const tasks = collectTaskBuckets(taskCollections).filter((task) => taskBelongsToAgent(task, agentId));
  const paidTasks = Number(summary.paidTasksCompleted ?? summary.tasksCompleted ?? 0);
  const settledEarnings = Number(summary.paidEarnings ?? summary.totalEarnings ?? 0);
  const pendingLockedValue = tasks
    .filter(isTaskPendingLockedForEarnings)
    .reduce((sum, task) => sum + readTaskReward(task), 0);
  const disputedLockedValue = tasks
    .filter((task) => isTaskDisputedForEarnings(task) && isTaskFundedForEarnings(task))
    .reduce((sum, task) => sum + readTaskReward(task), 0);
  const averagePaidTaskValue = paidTasks > 0 ? settledEarnings / paidTasks : null;
  const packages = buildAgentServicePackages(agent);

  return {
    settledEarnings,
    settledEarningsDisplay: settledEarnings > 0 ? `${settledEarnings.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC` : "No settled earnings yet",
    paidTasks,
    paidTasksDisplay: paidTasks > 0 ? String(paidTasks) : "No paid tasks completed yet",
    pendingLockedValue,
    pendingLockedDisplay: pendingLockedValue > 0 ? `${pendingLockedValue.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC` : "Pending value appears after funded assigned tasks exist.",
    disputedLockedValue,
    disputedLockedDisplay: disputedLockedValue > 0 ? `${disputedLockedValue.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC` : "No disputed locked value.",
    approvalRateDisplay: typeof summary.approvalRate === "number" && (summary.tasksAttempted || summary.totalReviews || paidTasks) > 0
      ? `${Math.round(summary.approvalRate * 100)}%`
      : "Not enough data yet",
    averagePaidTaskValueDisplay: averagePaidTaskValue == null
      ? "Waiting for first approved task"
      : `${averagePaidTaskValue.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`,
    packageStartingPriceDisplay: packages.length
      ? `${Math.min(...packages.map((item) => item.priceUsdc)).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`
      : "No service package yet",
  };
}

export function buildAgentEarningsSummary(agents = [], taskCollections = {}) {
  const breakdowns = agents.map((agent) => buildAgentEarningsBreakdown(agent, taskCollections));
  const settledEarnings = breakdowns.reduce((sum, item) => sum + item.settledEarnings, 0);
  const pendingLockedValue = breakdowns.reduce((sum, item) => sum + item.pendingLockedValue, 0);
  const disputedLockedValue = breakdowns.reduce((sum, item) => sum + item.disputedLockedValue, 0);
  const paidTasks = breakdowns.reduce((sum, item) => sum + item.paidTasks, 0);
  return {
    settledEarnings,
    settledEarningsDisplay: settledEarnings > 0 ? `${settledEarnings.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC` : "No settled earnings yet",
    pendingLockedValue,
    pendingLockedDisplay: pendingLockedValue > 0 ? `${pendingLockedValue.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC` : "Pending value appears after funded assigned tasks exist.",
    disputedLockedValue,
    disputedLockedDisplay: disputedLockedValue > 0 ? `${disputedLockedValue.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC` : "No disputed locked value.",
    paidTasks,
    averagePaidTaskValueDisplay: paidTasks > 0 ? `${(settledEarnings / paidTasks).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC` : "Waiting for first approved task",
  };
}

export function buildAgentEarningsDashboardModel(agents = [], taskCollections = {}) {
  return {
    summary: buildAgentEarningsSummary(agents, taskCollections),
    breakdowns: agents.map((agent) => ({
      agentId: agent?.profile?.agentId || "",
      slug: agent?.profile?.slug || "",
      name: agent?.profile?.publicName || "Unnamed Agent",
      typeLabel: agent?.profile?.originType === "external" ? "External Agent" : "Platform Agent",
      ...buildAgentEarningsBreakdown(agent, taskCollections),
    })),
    activityRows: buildEarningsActivityRows(agents, taskCollections),
    note: "Agent earnings from available Dispatch task data. Wallet-specific builder earnings require reliable ownership/account persistence.",
  };
}

function checklistItem(id, label, state, description) {
  const stateLabels = {
    passed: "Passed",
    missing: "Missing",
    limited: "Limited data",
    not_enough_data: "Not enough data yet",
    needs_review: "Needs review",
  };
  return {
    id,
    label,
    state,
    stateLabel: stateLabels[state] || "Limited data",
    description,
  };
}

function isHealthyConnection(value) {
  return ["active", "healthy", "online", "connected", "ready"].includes(String(value || "").toLowerCase());
}

function isUnavailableConnection(value) {
  return ["offline", "unavailable", "disabled", "paused", "failed", "rejected"].includes(String(value || "").toLowerCase());
}

export function buildAgentVerificationChecklist(agent, taskCollections = {}) {
  const profile = agent?.profile || {};
  const summary = agent?.performanceSummary || {};
  const agentId = profile.agentId || "";
  const tasks = collectTaskBuckets(taskCollections).filter((task) => taskBelongsToAgent(task, agentId));
  const paidTasksFromTasks = tasks.filter(isTaskSettledForEarnings).length;
  const paidTasks = Math.max(Number(summary.paidTasksCompleted ?? summary.tasksCompleted ?? 0), paidTasksFromTasks);
  const reviewCount = Math.max(Number(summary.totalReviews ?? summary.totalApprovals ?? summary.tasksAttempted ?? 0), tasks.filter((task) => task.latestEvaluation || task.userReview || task.resultStatus).length);
  const disputeCount = Math.max(Number(summary.disputeCount ?? 0), tasks.filter(isTaskDisputedForEarnings).length);
  const packages = buildAgentServicePackages(agent);
  const connectionValue = profile.connectionStatus || agent?.healthStatus || profile.healthStatus || summary.status || "";
  const isPlatform = profile.originType !== "external";
  const hasProfile = Boolean(profile.publicName && (profile.description || profile.skills?.length || profile.capabilityTags?.length));
  const hasWallet = Boolean(profile.payoutWallet || profile.ownerWallet || profile.operatorWallet);
  const hasConnectionData = Boolean(profile.connectionStatus || agent?.healthStatus || profile.healthStatus);

  return [
    checklistItem(
      "profile",
      "Agent profile available",
      hasProfile ? "passed" : profile.publicName ? "limited" : "missing",
      hasProfile ? "Name and marketplace description are available." : profile.publicName ? "Basic name exists, but profile detail is still thin." : "Agent profile data is missing.",
    ),
    checklistItem(
      "connection",
      "Connection status available",
      isPlatform ? "passed" : hasConnectionData ? (isHealthyConnection(connectionValue) ? "passed" : "needs_review") : "missing",
      isPlatform ? "Platform agent is managed by Dispatch." : hasConnectionData ? `Connection reports ${labelize(connectionValue)}.` : "External endpoint connection data is unavailable.",
    ),
    checklistItem(
      "health",
      "Health check available",
      isPlatform ? "passed" : hasConnectionData ? (isHealthyConnection(connectionValue) ? "passed" : "needs_review") : "missing",
      isPlatform ? "Platform runtime is Dispatch-managed." : hasConnectionData ? "Endpoint status is available for review." : "Connection check needed before stronger readiness can be shown.",
    ),
    checklistItem(
      "wallet",
      "Payout/owner wallet available",
      hasWallet ? "passed" : "missing",
      hasWallet ? "A payout or owner wallet is present." : "Payout or owner wallet is not available yet.",
    ),
    checklistItem(
      "packages",
      "Service packages configured",
      packages.length ? "passed" : "limited",
      packages.length ? `${packages.length} ready-made package${packages.length === 1 ? "" : "s"} configured.` : "No ready-made packages yet; custom tasks can still be created.",
    ),
    checklistItem(
      "paid_history",
      "Completed paid task history",
      paidTasks > 0 ? "passed" : "not_enough_data",
      paidTasks > 0 ? `${paidTasks} paid funded task${paidTasks === 1 ? "" : "s"} recorded.` : "Waiting for first approved funded task.",
    ),
    checklistItem(
      "review_history",
      "Review/approval history",
      reviewCount > 0 ? "passed" : "not_enough_data",
      reviewCount > 0 ? `${reviewCount} review signal${reviewCount === 1 ? "" : "s"} available.` : "Approval rate appears after reviewed work exists.",
    ),
    checklistItem(
      "disputes",
      "Dispute history",
      disputeCount > 0 ? "limited" : "not_enough_data",
      disputeCount > 0 ? `${disputeCount} disputed task${disputeCount === 1 ? "" : "s"} found in available data.` : "No dispute history found in available task data.",
    ),
  ];
}

export function buildAgentVerificationModel(agent, taskCollections = {}) {
  const profile = agent?.profile || {};
  const checklist = buildAgentVerificationChecklist(agent, taskCollections);
  const connectionValue = profile.connectionStatus || agent?.healthStatus || profile.healthStatus || agent?.performanceSummary?.status || "";
  const isPlatform = profile.originType !== "external";
  const missingCount = checklist.filter((item) => item.state === "missing").length;
  const limitedCount = checklist.filter((item) => item.state === "limited" || item.state === "not_enough_data").length;
  const needsReviewCount = checklist.filter((item) => item.state === "needs_review").length;
  const paidHistory = checklist.find((item) => item.id === "paid_history");
  const hasExplicitVerification = profile.verificationStatus === "verified" || profile.verified === true;
  const externalConnectionMissing = !isPlatform && checklist.some((item) => ["connection", "health"].includes(item.id) && item.state === "missing");
  const externalConnectionUnavailable = !isPlatform && isUnavailableConnection(connectionValue);
  const walletMissing = profile.originType === "external" && checklist.some((item) => item.id === "wallet" && item.state === "missing");
  let state = "limited_data";
  let stateLabel = "Limited data";
  let tone = "warning";
  let nextAction = "Complete more paid tasks";
  let trustNote = "This agent is visible, but more completed work is needed before stronger trust signals appear.";

  if (hasExplicitVerification && missingCount === 0 && needsReviewCount === 0) {
    state = "verified";
    stateLabel = "Verified";
    tone = "success";
    nextAction = "Ready for funded tasks";
    trustNote = "Verification data is available and setup checks are complete.";
  } else if (externalConnectionUnavailable) {
    state = "offline";
    stateLabel = "Offline / unavailable";
    tone = "danger";
    nextAction = "Check endpoint health";
    trustNote = "This external agent does not currently look available for funded work.";
  } else if (externalConnectionMissing) {
    state = "connection_check_needed";
    stateLabel = "Connection check needed";
    tone = "warning";
    nextAction = "Check endpoint health";
    trustNote = "Connection state is missing, so users should review carefully before assigning funded work.";
  } else if (needsReviewCount > 0 || walletMissing) {
    state = "needs_review";
    stateLabel = "Needs review";
    tone = "warning";
    nextAction = walletMissing ? "Add payout wallet" : "Review agent setup";
    trustNote = "This agent is listed, but setup data needs review before stronger readiness can be shown.";
  } else if (paidHistory?.state !== "passed") {
    state = "limited_data";
    stateLabel = "Limited data";
    tone = "warning";
    nextAction = "Wait for first completed task";
    trustNote = "This agent has enough setup data to appear, but needs completed paid work before stronger trust signals appear.";
  } else {
    state = "ready";
    stateLabel = "Ready";
    tone = "success";
    nextAction = "Ready for funded tasks";
    trustNote = "This agent has enough setup and paid-work data to accept funded tasks.";
  }

  return {
    state,
    stateLabel,
    tone,
    checklist,
    missingCount,
    limitedCount,
    needsReviewCount,
    passedCount: checklist.filter((item) => item.state === "passed").length,
    nextAction,
    trustNote,
  };
}

export function buildAgentTrustReadinessModel(agent, taskCollections = {}) {
  const verification = buildAgentVerificationModel(agent, taskCollections);
  return {
    label: verification.stateLabel,
    tone: verification.tone,
    nextAction: verification.nextAction,
    note: verification.trustNote,
    missingCount: verification.missingCount,
    limitedCount: verification.limitedCount,
    checklist: verification.checklist,
  };
}

export function buildAgentBuilderAgentRowModel(agent, taskCollections = {}) {
  const display = buildAgentDisplayModel(agent, taskCollections);
  const packages = buildAgentServicePackages(agent);
  const attentionItems = buildAgentAttentionItems(agent, taskCollections);
  return {
    agentId: agent?.profile?.agentId || "",
    slug: agent?.profile?.slug || "",
    name: display.name,
    typeLabel: display.typeLabel,
    statusLabel: display.statusLabel,
    connectionStatus: display.connectionStatus,
    verificationLabel: display.verificationLabel,
    readinessLabel: display.readinessLabel,
    readinessTone: display.readinessTone,
    verificationNextAction: display.verificationNextAction,
    verificationMissingCount: display.verificationMissingCount,
    verificationLimitedCount: display.verificationLimitedCount,
    packageSummary: display.packageSummary,
    firstPackageId: packages[0]?.id || null,
    completedTasksDisplay: display.completedTasksDisplay,
    totalEarnedDisplay: display.totalEarnedDisplay,
    approvalRateDisplay: display.approvalRateDisplay,
    attentionItems,
    attentionCount: attentionItems.length,
  };
}

export function buildAgentBuilderSummaryModel(agents = [], taskCollections = {}) {
  const rows = agents.map((agent) => buildAgentBuilderAgentRowModel(agent, taskCollections));
  const paidTasksCompleted = agents.reduce((sum, agent) => {
    const summary = agent?.performanceSummary || {};
    return sum + Number(summary.paidTasksCompleted ?? summary.tasksCompleted ?? 0);
  }, 0);
  const paidEarnings = agents.reduce((sum, agent) => {
    const summary = agent?.performanceSummary || {};
    return sum + Number(summary.paidEarnings ?? summary.totalEarnings ?? 0);
  }, 0);
  const activeAgents = agents.filter((agent) => {
    const status = String(agent?.performanceSummary?.status || agent?.profile?.connectionStatus || "").toLowerCase();
    return ["active", "healthy", "online", "connected"].includes(status) || agent?.profile?.originType === "platform";
  }).length;
  const attentionCount = rows.reduce((sum, row) => sum + row.attentionCount, 0);
  return {
    agentsListed: agents.length,
    activeAgents,
    paidTasksCompleted,
    paidEarnings,
    paidEarningsDisplay: `${paidEarnings.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`,
    attentionCount,
    ownershipNote: "Use wallet-linked tasks and agents for builder dashboard totals.",
  };
}

export function buildAgentBuilderDashboardModel(agents = [], taskCollections = {}) {
  return {
    summary: buildAgentBuilderSummaryModel(agents, taskCollections),
    agentRows: agents.map((agent) => buildAgentBuilderAgentRowModel(agent, taskCollections)),
  };
}

export function buildAgentDisplayModel(agent, taskCollections = {}) {
  const profile = agent?.profile || {};
  const summary = agent?.performanceSummary || {};
  const paidCompleted = summary.paidTasksCompleted ?? summary.tasksCompleted ?? 0;
  const tasksAttempted = summary.tasksAttempted ?? summary.totalTasks ?? paidCompleted ?? 0;
  const paidEarnings = summary.paidEarnings ?? summary.totalEarnings ?? 0;
  const approvalRate = typeof summary.approvalRate === "number" && tasksAttempted > 0
    ? `${Math.round(summary.approvalRate * 100)}%`
    : "Not enough data yet";
  const averageScore = typeof summary.averageScore === "number" && summary.averageScore > 0
    ? String(Math.round(summary.averageScore))
    : "Not enough data yet";
  const deliveryTime = summary.averageResponseTimeMs || summary.averageLatencyMs
    ? formatResponseMetric(agent)
    : "Not enough data yet";
  const typeLabel = profile.originType === "external" ? "External Agent" : "Platform Agent";
  const connectionStatus = profile.originType === "external"
    ? labelize(profile.connectionStatus || agent?.healthStatus || profile.healthStatus || "unknown")
    : "Dispatch managed";
  const verification = buildAgentVerificationModel(agent, taskCollections);
  const verificationLabel = verification.stateLabel;
  const bestUseCases = (profile.skills?.length ? profile.skills : profile.capabilityTags || profile.skillCategories || [])
    .slice(0, 5)
    .map((item) => labelize(item));
  const recentWork = buildRecentAgentWork(agent, taskCollections);
  const suggestedTemplates = buildSuggestedTaskTemplatesForAgent(agent);
  const servicePackages = buildAgentServicePackages(agent);
  const description = profile.description || "Marketplace worker for structured funded AI tasks.";
  const specialty = bestUseCases[0] || labelize(profile.category || "general work");

  return {
    name: profile.publicName || "Unnamed Agent",
    slug: profile.slug || "",
    categoryLabel: labelize(profile.category || "general"),
    typeLabel,
    description,
    shortDescription: description.split(".")[0].slice(0, 110),
    specialty,
    bestUseCases,
    badges: buildAgentIdentityBadges(agent),
    connectionStatus,
    verificationLabel,
    verificationState: verification.state,
    verificationTone: verification.tone,
    readinessLabel: verification.stateLabel,
    readinessTone: verification.tone,
    verificationChecklist: verification.checklist,
    verificationMissingCount: verification.missingCount,
    verificationLimitedCount: verification.limitedCount,
    verificationNextAction: verification.nextAction,
    verificationTrustNote: verification.trustNote,
    statusLabel: labelize(summary.status || "new"),
    completedTasksDisplay: String(paidCompleted || 0),
    approvalRateDisplay: approvalRate,
    totalEarnedDisplay: `${Number(paidEarnings || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`,
    averageDeliveryDisplay: deliveryTime,
    averageScoreDisplay: averageScore,
    reviewsDisplay: (summary.totalReviews || summary.totalApprovals || 0) > 0
      ? String(summary.totalReviews || summary.totalApprovals)
      : "No reviews yet",
    rankDisplay: summary.rankPosition ? `#${summary.rankPosition}` : "Not ranked yet",
    pricingNote: profile.pricingHint || "Set per funded task reward",
    payoutWalletDisplay: shortWallet(profile.payoutWallet || profile.ownerWallet),
    recentWork,
    suggestedTemplates,
    servicePackages,
    packageSummary: servicePackages.length
      ? `Packages from ${Math.min(...servicePackages.map((item) => item.priceUsdc))} USDC`
      : "Custom funded tasks available",
    trustNote: paidCompleted > 0
      ? "Trust comes from funded task completions, owner-approved outcomes, settlement history, and reliability over time."
      : "Not enough completed work yet. Reputation will build as this agent completes approved funded tasks.",
  };
}

export function buildAgentIdentityBadges(agent) {
  const badges = [];
  if (agent?.profile?.originType === "platform") {
    badges.push("Platform Agent");
  }
  if (agent?.profile?.originType === "external") {
    badges.push("External Agent");
    badges.push("ERC-8183 compatible");
  }
  if ((agent?.performanceSummary?.rankPosition || 0) === 1 && (agent?.performanceSummary?.tasksAttempted || 0) > 0) {
    badges.push("Top Agent");
  }
  if (agent?.performanceSummary?.status === "new") {
    badges.push("New");
  }
  if (agent?.profile?.skillCategories?.length) {
    badges.push(labelize(agent.profile.skillCategories[0]));
  }
  return badges;
}

export function buildRecentAgentWork(agent, taskCollections = {}) {
  const allTasks = [
    ...(taskCollections.completedTasks || []),
    ...(taskCollections.rejectedTasks || []),
    ...(taskCollections.disputedTasks || []),
  ];

  return allTasks
    .filter((task) => task.participatingAgentIds?.includes(agent.profile.agentId) || task.selectedAgentId === agent.profile.agentId)
    .filter((task, index, items) => items.findIndex((candidate) => candidate.taskId === task.taskId) === index)
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime())
    .slice(0, 5)
    .map((task) => ({
      taskId: task.taskId,
      title: buildSafeTaskSummary(task),
      category: labelize(task.category),
      status: labelize(task.status),
      rewardAmount: Number(task.rewardAmount || 0),
      evaluationScore: typeof task.latestEvaluation?.overallScore === "number" ? Math.round(task.latestEvaluation.overallScore) : null,
      settlementStatus: task.settlementSummary?.settlementReadinessLabel || labelize(task.settlementState || task.status),
      completedAt: task.latestSettlement?.settlementTimestamp || task.updatedAt || task.createdAt,
      approvalIndicator: buildApprovalIndicator(task),
    }));
}

function buildSafeTaskSummary(task) {
  const raw = String(task?.title || "").trim();
  if (!raw) return `${labelize(task?.category || "task")} task`;
  return raw.length > 72 ? `${raw.slice(0, 69)}...` : raw;
}

function buildApprovalIndicator(task) {
  const status = String(task?.status || "").toUpperCase();
  if (status === "SETTLED") return "Paid";
  if (status === "APPROVED") return "Approved";
  if (status === "REFUNDED") return "Refunded";
  if (status === "REJECTED") return "Rejected";
  if (status === "DISPUTED") return "Disputed";
  return labelize(task?.resultStatus || "completed");
}

function formatResponseMetric(agent) {
  const latency = agent.performanceSummary?.averageResponseTimeMs || agent.performanceSummary?.averageLatencyMs || 0;
  if (!latency) return "No response data yet";
  if (latency < 1000) return `${latency} ms`;
  if (latency < 60000) return `${Math.round(latency / 1000)} sec`;
  return `${Math.round(latency / 60000)} min`;
}

function readBigIntLike(value) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === "string" && value.trim()) {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

export function buildReviewPanelModel(task) {
  const hasEvaluation = Boolean(task?.latestEvaluation);
  const canReviewSubmittedResult = ["SUBMITTED", "UNDER_REVIEW"].includes(task?.status);
  const revisionRequested = Boolean(task?.revisionRequests?.length)
    || String(task?.resultStatus || "").toLowerCase() === "needs_revision"
    || task?.userReview?.decision === "needs_human_review";
  const disputeOpen = Boolean(task?.disputeRecords?.length)
    || task?.disputeRecord?.status === "open"
    || String(task?.status || "").toUpperCase() === "DISPUTED"
    || String(task?.settlementState || "").toLowerCase() === "disputed";
  const canDispute = !disputeOpen && ["SUBMITTED", "UNDER_REVIEW", "REJECTED", "APPROVED"].includes(task?.status);
  const canAppeal = ["DISPUTED", "REJECTED", "UNRESOLVED"].includes(task?.status);
  const settlementReady = !disputeOpen && (task?.status === "APPROVED" || (task?.reviewActions || []).includes("settle"));
  const finalOutcome = task?.latestEvaluation?.finalOutcome || null;
  return {
    primaryActions: settlementReady ? ["settle"] : canReviewSubmittedResult && !revisionRequested && !disputeOpen ? ["approve", "request_revision"] : [],
    advancedActions: [
      ...(canReviewSubmittedResult ? ["assisted", "hybrid"] : []),
      ...(canDispute ? ["dispute"] : []),
      ...(canAppeal ? ["appeal"] : []),
    ],
    headline: settlementReady
      ? "This task is ready for Arc Testnet USDC settlement."
        : disputeOpen || finalOutcome === "disputed"
        ? "Payment remains locked during dispute."
        : finalOutcome === "unresolved" || task?.status === "UNRESOLVED"
          ? "Review is paused for escalation. AI review is guidance; unresolved states should only come from dispute or appeal paths."
        : revisionRequested
          ? "The owner requested changes. Payment stays funded and locked until revised work is approved."
          : canReviewSubmittedResult
            ? (hasEvaluation ? "AI review is attached as guidance. You decide whether to approve or request changes." : "Review the submitted output and decide whether payment can be released.")
        : "Waiting for a submitted result before review and settlement actions become available.",
  };
}

export function buildTaskResultModel(task, executionRuns = []) {
  const sortedRuns = [...(executionRuns || [])]
    .sort((left, right) => new Date(right.completedAt || right.updatedAt || 0).getTime() - new Date(left.completedAt || left.updatedAt || 0).getTime());
  const latestCompletedRun = sortedRuns.find((run) => {
    const payload = run?.rawPayload;
    return run?.state === "completed" && payload && typeof payload === "object" && !Array.isArray(payload);
  }) || null;
  const latestRun = latestCompletedRun || sortedRuns[0] || null;
  const trace = latestRun && latestRun.rawPayload && typeof latestRun.rawPayload === "object" && !Array.isArray(latestRun.rawPayload)
    ? latestRun.rawPayload
    : null;
  const finalOutput = trace?.finalOutput || null;
  const draftOutput = trace?.draftOutput || null;
  const structuredTask = trace?.structuredTask || null;
  const evaluation = trace?.evaluation || null;
  const runSummary = trace?.runSummary || null;
  const stageTimingsMs = trace?.stageTimingsMs || null;
  const sections = Array.isArray(finalOutput?.sections) ? finalOutput.sections : [];
  const summary = finalOutput?.summary || task?.structuredNotes || "";

  const improveEligibleStatuses = new Set(["SUBMITTED", "UNDER_REVIEW", "REJECTED"]);
  const hasLiveOnchainAnchor = /^0x[a-f0-9]{40}:/i.test(String(task?.onchainTaskRef || ""));
  const otherwiseImproveEligible = Boolean(
    latestRun?.endpointUrl?.startsWith("platform://")
      && improveEligibleStatuses.has(task?.status)
      && !["settled", "refunded", "disputed"].includes(task?.settlementState),
  );
  const canImproveAgain = Boolean(
    otherwiseImproveEligible && !hasLiveOnchainAnchor,
  );

  return {
    title: summary,
    sections,
    finalOutputText: sections.length
      ? sections.map((section) => `${section.heading}\n${(section.bullets || []).map((bullet) => `- ${bullet}`).join("\n")}`).join("\n\n")
      : String(summary || "").trim(),
    qualityScore: typeof trace?.score === "number" ? Math.round(trace.score) : typeof evaluation?.overall === "number" ? Math.round(evaluation.overall) : null,
    aiReviewScore: typeof task?.latestEvaluation?.consensusScore === "number" ? Math.round(task.latestEvaluation.consensusScore) : null,
    reviewConfidence: typeof task?.latestEvaluation?.consensusConfidence === "number" ? Math.round(task.latestEvaluation.consensusConfidence * 100) : null,
    finalOutcome: task?.latestEvaluation?.finalOutcome || null,
    evaluationNote: task?.latestEvaluation?.equivalenceSummary || task?.latestEvaluation?.summary || null,
    confidence: trace?.confidence || finalOutput?.confidence || null,
    modeUsed: trace?.mode || null,
    workerLabel: latestRun?.endpointUrl?.startsWith("platform://") ? "Platform Agent" : null,
    deliveryNote: task?.selectedAgents?.[0]?.originType === "platform"
      ? "This is a platform-run benchmark worker result inside the same funded-task marketplace path."
      : null,
    draftText: draftOutput
      ? [draftOutput.summary, ...(draftOutput.sections || []).map((section) => `${section.heading}\n${(section.bullets || []).map((bullet) => `- ${bullet}`).join("\n")}`)].join("\n\n")
      : null,
    structuredTask,
    evaluation,
    runSummary,
    stageTimingsMs,
    hasDraft: Boolean(draftOutput),
    canImproveAgain,
    improveAgainUnavailableReason: !canImproveAgain && otherwiseImproveEligible && hasLiveOnchainAnchor
      ? "Improve Again is disabled for live Arc-submitted tasks because the current contract cannot safely reopen execution after submission."
      : null,
    latestRunId: latestRun?.runId || null,
  };
}

import { formatUnits, parseUnits } from "viem";
import type { ArcChainService } from "./arcChainService";

const VALID_TX_HASH = /^0x[a-fA-F0-9]{64}$/;
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export type NanoArcProofStatus = "verified" | "pending" | "rejected" | "unavailable";

export type NanoArcProofVerificationInput = {
  txHash: string;
  expectedPayer?: string | null;
  expectedPayee?: string | null;
  expectedAmountUsdc: number;
  tokenAddress?: string | null;
  network?: string | null;
};

export type NanoArcProofVerificationResult = {
  proofStatus: NanoArcProofStatus;
  reason: string;
  txHash: string | null;
  explorerLink: string | null;
  matched: {
    token: string;
    from: string;
    to: string;
    amountUsdc: number;
  } | null;
};

type ExternalLog = {
  address?: unknown;
  topics?: unknown;
  data?: unknown;
};

type ExternalReceipt = {
  status?: unknown;
  logs?: unknown;
};

function normalizeAddress(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function topicToAddress(topic: unknown) {
  const text = typeof topic === "string" ? topic.trim() : "";
  if (!/^0x[a-fA-F0-9]{64}$/.test(text)) return "";
  return `0x${text.slice(-40)}`.toLowerCase();
}

function readLogAmount(data: unknown) {
  const text = typeof data === "string" ? data.trim() : "";
  if (!/^0x[a-fA-F0-9]+$/.test(text)) return null;
  try {
    return BigInt(text);
  } catch {
    return null;
  }
}

function sameAddress(left: unknown, right: unknown) {
  return Boolean(normalizeAddress(left) && normalizeAddress(left) === normalizeAddress(right));
}

export class NanoArcProofService {
  constructor(private readonly chainService: ArcChainService) {}

  async verify(input: NanoArcProofVerificationInput): Promise<NanoArcProofVerificationResult> {
    const txHash = String(input.txHash || "").trim();
    if (!VALID_TX_HASH.test(txHash)) {
      return this.result("rejected", "Enter a valid Arc transaction hash.", null, null);
    }
    if (input.network && !/arc testnet/i.test(input.network)) {
      return this.result("rejected", "Only Arc Testnet proof is supported for this Nano demo.", txHash, null);
    }
    if (!(Number(input.expectedAmountUsdc) > 0)) {
      return this.result("rejected", "Expected USDC amount is required for proof verification.", txHash, null);
    }

    const tokenAddress = normalizeAddress(input.tokenAddress || this.chainService.paymentTokenAddress);
    const expectedAmount = parseUnits(String(input.expectedAmountUsdc), this.chainService.tokenDecimals);
    let receipt: ExternalReceipt | null = null;
    try {
      receipt = await this.chainService.getExternalReceipt(txHash) as ExternalReceipt | null;
    } catch {
      return this.result("unavailable", "Arc proof is temporarily unavailable. Try again shortly.", txHash, null);
    }

    if (!receipt) {
      return this.result("pending", "Arc transaction receipt is not available yet.", txHash, null);
    }
    if (!this.chainService.isExternalReceiptSuccessful(receipt)) {
      return this.result("rejected", "Arc transaction did not complete successfully.", txHash, null);
    }

    const logs = Array.isArray(receipt.logs) ? receipt.logs as ExternalLog[] : [];
    const transferLogs = logs.filter((log) => {
      const topics = Array.isArray(log.topics) ? log.topics : [];
      return sameAddress(log.address, tokenAddress)
        && String(topics[0] || "").toLowerCase() === TRANSFER_TOPIC
        && topics.length >= 3;
    });
    if (!transferLogs.length) {
      return this.result("rejected", "No matching Arc USDC transfer was found in this transaction.", txHash, null);
    }

    for (const log of transferLogs) {
      const topics = Array.isArray(log.topics) ? log.topics : [];
      const from = topicToAddress(topics[1]);
      const to = topicToAddress(topics[2]);
      const amount = readLogAmount(log.data);
      if (!from || !to || amount == null) continue;
      if (input.expectedPayer && !sameAddress(from, input.expectedPayer)) continue;
      if (input.expectedPayee && !sameAddress(to, input.expectedPayee)) continue;
      if (amount !== expectedAmount) continue;
      return this.result("verified", "Arc USDC transfer proof verified.", txHash, {
        token: tokenAddress,
        from,
        to,
        amountUsdc: Number(formatUnits(amount, this.chainService.tokenDecimals)),
      });
    }

    return this.result("rejected", "Arc USDC transfer did not match the expected payer, payee, or amount.", txHash, null);
  }

  private result(
    proofStatus: NanoArcProofStatus,
    reason: string,
    txHash: string | null,
    matched: NanoArcProofVerificationResult["matched"],
  ): NanoArcProofVerificationResult {
    return {
      proofStatus,
      reason,
      txHash,
      explorerLink: txHash ? `${this.chainService.explorerBaseUrl.replace(/\/$/, "")}/tx/${txHash}` : null,
      matched,
    };
  }
}

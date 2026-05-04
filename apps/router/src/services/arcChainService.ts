import {
  chainContractStateResponseSchema,
  chainPublicConfigSchema,
  chainStatusResponseSchema,
  chainReceiptViewSchema,
  chainTaskWriteResponseSchema,
  type ChainContractStateRequest,
  type ChainContractStateResponse,
  type ChainPublicConfig,
  type ChainStatusResponse,
  type ChainReceiptView,
  type ChainTaskWriteRequest,
  type ChainTaskWriteResponse,
} from "@marketplace/shared";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  derivePlatformAgentOnchainId,
  getUserFacingBuiltInPlatformAgents,
  resolvePlatformAgentOwnerWallet,
  type BuiltInPlatformAgentDefinition,
} from "./platformAgentCatalog";
import { ARC_TESTNET, ARC_USDC_ADDRESS, dispatchAgentRegistryAbi, dispatchMarketplaceAbi } from "../lib/arcContracts";

type JsonRpcEnvelope<T> = {
  result?: T;
  error?: { message?: string };
};

type TxReceiptLike = {
  transactionHash?: string;
  status?: string | number;
  blockNumber?: bigint | number | string | null;
  contractAddress?: string | null;
};

export class ArcChainService {
  readonly rpcUrl = process.env.ARC_RPC_URL ?? ARC_TESTNET.rpcUrls.default.http[0];
  readonly browserRpcUrl = process.env.ARC_BROWSER_RPC_URL ?? this.rpcUrl;
  readonly chainKey = (process.env.ARC_CHAIN_KEY ?? "arcTestnet") as ChainPublicConfig["chainKey"];
  readonly chainId = Number(process.env.ARC_CHAIN_ID ?? ARC_TESTNET.id);
  readonly networkName = process.env.ARC_NETWORK_NAME ?? ARC_TESTNET.name;
  readonly taskEscrowAddress = process.env.ARC_TASK_MARKETPLACE_ADDRESS ?? null;
  readonly agentRegistryAddress = process.env.ARC_AGENT_REGISTRY_ADDRESS ?? null;
  readonly paymentTokenAddress = process.env.ARC_PAYMENT_TOKEN_ADDRESS ?? ARC_USDC_ADDRESS;
  readonly explorerBaseUrl = process.env.ARC_EXPLORER_BASE_URL ?? ARC_TESTNET.blockExplorers.default.url;
  readonly serverPrivateKey = process.env.ARC_SERVER_PRIVATE_KEY ?? "";
  readonly serverWalletAddress = process.env.ARC_SERVER_WALLET_ADDRESS ?? "";
  readonly preferredMode = (process.env.ARC_CHAIN_MODE ?? "browser_wallet") as ChainPublicConfig["chainMode"];
  readonly requiresTokenApproval = true;
  readonly tokenDecimals = Number(process.env.ARC_PAYMENT_TOKEN_DECIMALS ?? "6");
  readonly paymentTokenSymbol = process.env.ARC_PAYMENT_TOKEN_SYMBOL ?? "USDC";
  readonly gasTokenSymbol = process.env.ARC_GAS_TOKEN_SYMBOL ?? "USDC";
  readonly gasTokenDecimals = Number(process.env.ARC_GAS_TOKEN_DECIMALS ?? "18");

  startupIssues() {
    const issues: string[] = [];
    if (!this.taskEscrowAddress) issues.push("ARC_TASK_MARKETPLACE_ADDRESS is not configured.");
    if (!this.agentRegistryAddress) issues.push("ARC_AGENT_REGISTRY_ADDRESS is not configured.");
    if (!this.serverPrivateKey) {
      issues.push("ARC_SERVER_PRIVATE_KEY is not configured. Platform-agent registration, onchain submission, and settlement writes will be disabled.");
    }
    return issues;
  }

  get canServerWrite() {
    return Boolean(this.serverPrivateKey);
  }

  getPublicConfig(): ChainPublicConfig {
    const notes: string[] = [
      "Dispatch is running on Arc Testnet through standard EVM transactions.",
      "Arc uses native USDC for gas, and Dispatch escrow funding uses the Arc USDC token contract.",
      "Task funding requires wallet-based token approval before escrow funding when allowance is missing.",
    ];
    if (!this.taskEscrowAddress) notes.push("Task marketplace contract address is not configured.");
    if (!this.agentRegistryAddress) notes.push("Agent registry contract address is not configured.");
    if (this.resolveMode() === "browser_wallet") {
      notes.push("Browser wallet mode is active. Buyers fund tasks from their connected Arc wallet.");
    }
    if (this.resolveMode() === "server_signer_proxy") {
      notes.push("Server signer mode is available for operator actions such as assignment, review finalization, settlement, and refunds.");
      notes.push("Task funding still requires a buyer wallet because Arc escrow uses ERC-20 USDC transfers.");
    }

    return chainPublicConfigSchema.parse({
      rpcUrl: this.rpcUrl,
      browserRpcUrl: this.browserRpcUrl || null,
      chainKey: this.chainKey,
      chainMode: this.resolveMode(),
      chainId: this.chainId,
      networkName: this.networkName,
      taskEscrowAddress: this.taskEscrowAddress,
      agentRegistryAddress: this.agentRegistryAddress,
      paymentTokenAddress: this.paymentTokenAddress,
      paymentTokenSymbol: this.paymentTokenSymbol,
      paymentTokenDecimals: this.tokenDecimals,
      gasTokenSymbol: this.gasTokenSymbol,
      gasTokenDecimals: this.gasTokenDecimals,
      requiresTokenApproval: this.requiresTokenApproval,
      explorerBaseUrl: this.explorerBaseUrl,
      notes,
    });
  }

  async getStatus(): Promise<ChainStatusResponse> {
    const diagnostics = [...this.startupIssues()];
    let rpcReachable = false;
    let detectedChainId: number | null = null;

    try {
      detectedChainId = await this.publicClient().getChainId();
      rpcReachable = true;
      if (detectedChainId !== this.chainId) {
        diagnostics.push(`Arc RPC returned chain ID ${detectedChainId}, but Dispatch expects ${this.chainId}.`);
      }
    } catch (error) {
      diagnostics.push(`Arc RPC health check failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }

    const contractAddressesConfigured = Boolean(this.taskEscrowAddress && this.agentRegistryAddress);
    if (!contractAddressesConfigured) {
      diagnostics.push("Arc contract addresses are incomplete. Set both ARC_TASK_MARKETPLACE_ADDRESS and ARC_AGENT_REGISTRY_ADDRESS.");
    }

    return chainStatusResponseSchema.parse({
      ok: rpcReachable && contractAddressesConfigured && detectedChainId === this.chainId,
      config: this.getPublicConfig(),
      rpcReachable,
      detectedChainId,
      expectedChainId: this.chainId,
      contractAddressesConfigured,
      diagnostics,
    });
  }

  async getReceipt(hash: string): Promise<ChainReceiptView> {
    try {
      const receipt = await this.publicClient().getTransactionReceipt({ hash: hash as `0x${string}` });
      return this.normalizeReceipt(hash, receipt);
    } catch {
      return chainReceiptViewSchema.parse({
        hash,
        status: "PENDING",
        accepted: false,
        finalized: false,
        undetermined: false,
        contractAddress: null,
        blockNumber: null,
      });
    }
  }

  async getExternalReceipt(hash: string): Promise<unknown> {
    const response = await fetch(this.browserRpcUrl || this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "eth_getTransactionReceipt",
        params: [hash],
      }),
    });
    const payload = await response.json().catch(() => ({} as JsonRpcEnvelope<unknown>));
    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message || "External receipt query failed");
    }
    return payload.result ?? null;
  }

  isExternalReceiptSuccessful(receipt: unknown) {
    if (!receipt || typeof receipt !== "object") return false;
    const status = String((receipt as Record<string, unknown>).status ?? "").toLowerCase();
    return status === "0x1" || status === "1" || status === "success";
  }

  async getContractState(request: ChainContractStateRequest): Promise<ChainContractStateResponse> {
    const bytecode = await this.publicClient().getBytecode({ address: request.address as `0x${string}` });
    return chainContractStateResponseSchema.parse({
      address: request.address,
      status: request.status ?? "accepted",
      blockNumber: request.blockNumber ?? null,
      rawStateHex: bytecode ?? "0x",
    });
  }

  async writeTaskLifecycle(input: ChainTaskWriteRequest): Promise<ChainTaskWriteResponse> {
    if (!this.taskEscrowAddress) {
      throw new Error("Task marketplace contract address is not configured");
    }
    if (!this.canServerWrite) {
      throw new Error("Arc task funding must be signed from the buyer wallet in browser_wallet mode.");
    }
    if (!this.serverWalletAddress || this.serverWalletAddress.toLowerCase() !== input.creatorWallet.toLowerCase()) {
      throw new Error("Arc server_signer_proxy cannot fund tasks on behalf of a buyer wallet. Use browser_wallet mode for task posting.");
    }

    const rewardAmountBaseUnits = this.toTokenBaseUnits(String(input.rewardAmount));
    const createTxHash = await this.writeMarketAction("create_task", [
      input.taskId,
      rewardAmountBaseUnits,
      BigInt(input.deadlineTimestamp),
      input.taskMode,
      input.metadataUri,
      input.metadataHash,
    ]);
    const fundTxHash = await this.writeMarketAction("fund_task", [input.taskId]);
    let assignTxHash: string | null = null;
    if (input.selectedAgentId) {
      assignTxHash = await this.writeMarketAction("assign_task", [input.taskId, input.selectedAgentId]);
    }
    const latestReceipt = await this.getReceipt(assignTxHash ?? fundTxHash);
    return chainTaskWriteResponseSchema.parse({
      taskId: input.taskId,
      createTxHash,
      fundTxHash,
      assignTxHash,
      latestReceipt,
      onchainTaskRef: `${this.taskEscrowAddress}:${input.taskId}`,
      notes: [
        "Arc EVM write path executed through the configured operator signer.",
        "Arc funding uses ERC-20 USDC escrow rather than native value transfer.",
      ],
    });
  }

  async readTask(taskId: string): Promise<unknown> {
    if (!this.taskEscrowAddress) {
      throw new Error("Task marketplace contract address is not configured");
    }
    const result = await this.publicClient().readContract({
      address: this.taskEscrowAddress as `0x${string}`,
      abi: dispatchMarketplaceAbi,
      functionName: "get_task",
      args: [taskId],
    });
    return result;
  }

  async readAgent(agentId: string): Promise<unknown> {
    if (!this.agentRegistryAddress) {
      throw new Error("Agent registry contract address is not configured");
    }
    const result = await this.publicClient().readContract({
      address: this.agentRegistryAddress as `0x${string}`,
      abi: dispatchAgentRegistryAbi,
      functionName: "get_agent",
      args: [agentId],
    });
    return result;
  }

  async bootstrapPlatformAgentsOnchain(definitions = getUserFacingBuiltInPlatformAgents()) {
    if (!this.canServerWrite) {
      return [];
    }
    const items = [];
    for (const definition of definitions) {
      items.push(await this.upsertPlatformAgentOnchain(definition));
    }
    return items;
  }

  async upsertPlatformAgentOnchain(definition: BuiltInPlatformAgentDefinition) {
    if (!this.agentRegistryAddress) {
      throw new Error("Agent registry contract address is not configured");
    }
    if (!this.canServerWrite) {
      throw new Error("Arc operator signer is required for platform-agent registration");
    }

    const ownerWallet = resolvePlatformAgentOwnerWallet();
    const onchainAgentId = derivePlatformAgentOnchainId(ownerWallet, definition);
    const versionHash = `builtin_${definition.slug}_arc_v1`;
    const metadataUri = `dispatch://agents/${definition.slug}`;
    const metadataHash = versionHash;

    let exists = false;
    try {
      await this.readAgent(onchainAgentId);
      exists = true;
    } catch {
      exists = false;
    }

    const txHash = exists
      ? await this.writeRegistryAction("update_agent", [onchainAgentId, versionHash, metadataUri, metadataHash])
      : await this.writeRegistryAction("register_agent", [onchainAgentId, definition.slug, versionHash, metadataUri, metadataHash]);

    return {
      agentId: definition.agentId,
      onchainAgentId,
      txHash,
      action: exists ? "updated" : "registered",
      receipt: await this.getReceipt(txHash),
    };
  }

  async assignTaskToAgent(taskId: string, agentOnchainId: string) {
    const txHash = await this.writeMarketAction("assign_task", [taskId, agentOnchainId]);
    return { txHash };
  }

  async startTaskExecution(taskId: string, agentOnchainId: string) {
    const txHash = await this.writeMarketAction("start_execution", [taskId, agentOnchainId]);
    return { txHash };
  }

  async submitTaskResult(input: {
    taskId: string;
    agentOnchainId: string;
    submissionNonce: string;
    resultHash: string;
    metadataUri: string;
    metadataHash: string;
  }) {
    const txHash = await this.writeMarketAction("submit_task", [
      input.taskId,
      input.agentOnchainId,
      input.submissionNonce,
      input.resultHash,
      input.metadataUri,
      input.metadataHash,
    ]);
    return {
      txHash,
      submissionId: this.deriveSubmissionId(input.taskId, input.agentOnchainId, input.submissionNonce),
    };
  }

  async approveTaskSubmission(taskId: string, submissionId: string) {
    const approvalTxHash = await this.writeMarketAction("approve_submission", [taskId, submissionId]);
    return { approvalTxHash, txHash: approvalTxHash };
  }

  async rejectTaskSubmission(taskId: string, submissionId: string) {
    const rejectionTxHash = await this.writeMarketAction("reject_submission", [taskId, submissionId]);
    return { rejectionTxHash, txHash: rejectionTxHash };
  }

  async disputeTask(taskId: string, reasonHash = "router_dispute") {
    const txHash = await this.writeMarketAction("dispute_task", [taskId, reasonHash]);
    return { txHash };
  }

  async appealTask(taskId: string, appealHash = "router_appeal") {
    const txHash = await this.writeMarketAction("appeal_task", [taskId, appealHash]);
    return { txHash };
  }

  async finalizeTaskReview(input: {
    taskId: string;
    submissionId: string;
    requestedOutcome: "accepted" | "rejected" | "disputed" | "unresolved";
    consensusScore: number;
    validatorAgreement: number;
    consensusConfidence: number;
    evaluationHash: string;
  }) {
    const txHash = await this.writeMarketAction("finalize_review", [
      input.taskId,
      input.submissionId,
      input.requestedOutcome,
      BigInt(Math.round(input.consensusScore)),
      BigInt(Math.round(input.validatorAgreement * 10_000)),
      BigInt(Math.round(input.consensusConfidence * 10_000)),
      input.evaluationHash,
    ]);
    return { txHash };
  }

  async settleTask(taskId: string) {
    const txHash = await this.writeMarketAction("settle_task", [taskId]);
    return { txHash };
  }

  async cancelTask(taskId: string) {
    const txHash = await this.writeMarketAction("cancel_task", [taskId]);
    return { txHash };
  }

  async refundTask(taskId: string) {
    const txHash = await this.writeMarketAction("refund_task", [taskId]);
    return { txHash };
  }

  toTokenBaseUnits(amount: string) {
    const source = String(amount || "").trim();
    if (!source || !/^\d+(\.\d+)?$/.test(source)) {
      throw new Error(`Reward amount must be a valid ${this.paymentTokenSymbol} amount`);
    }
    return parseUnits(source, this.tokenDecimals);
  }

  formatTokenAmount(amount: bigint) {
    return formatUnits(amount, this.tokenDecimals);
  }

  private resolveMode(): ChainPublicConfig["chainMode"] {
    if (this.preferredMode === "read_only") return "read_only";
    if (this.preferredMode === "server_signer_proxy") {
      return this.serverPrivateKey ? "server_signer_proxy" : "read_only";
    }
    return "browser_wallet";
  }

  private publicClient() {
    return createPublicClient({
      chain: ARC_TESTNET,
      transport: http(this.rpcUrl),
    });
  }

  private walletClient() {
    if (!this.serverPrivateKey) {
      throw new Error("ARC_SERVER_PRIVATE_KEY is required for operator writes");
    }
    const account = privateKeyToAccount(this.serverPrivateKey as `0x${string}`);
    return createWalletClient({
      account,
      chain: ARC_TESTNET,
      transport: http(this.rpcUrl),
    });
  }

  private async writeRegistryAction(functionName: string, args: readonly unknown[]) {
    if (!this.agentRegistryAddress) {
      throw new Error("Agent registry contract address is not configured");
    }
    const client = this.walletClient();
    const hash = await client.writeContract({
      address: this.agentRegistryAddress as `0x${string}`,
      abi: dispatchAgentRegistryAbi,
      functionName: functionName as any,
      args: args as any,
    });
    await this.publicClient().waitForTransactionReceipt({ hash });
    return hash;
  }

  private async writeMarketAction(functionName: string, args: readonly unknown[]) {
    if (!this.taskEscrowAddress) {
      throw new Error("Task marketplace contract address is not configured");
    }
    const client = this.walletClient();
    const hash = await client.writeContract({
      address: this.taskEscrowAddress as `0x${string}`,
      abi: dispatchMarketplaceAbi,
      functionName: functionName as any,
      args: args as any,
    });
    await this.publicClient().waitForTransactionReceipt({ hash });
    return hash;
  }

  private normalizeReceipt(hash: string, raw: TxReceiptLike): ChainReceiptView {
    const status = String(raw?.status ?? "").toLowerCase();
    const normalized =
      status === "success" || status === "0x1" || status === "1" ? "ACCEPTED"
        : status === "reverted" || status === "0x0" || status === "0" ? "FAILED"
          : "PENDING";
    return chainReceiptViewSchema.parse({
      hash,
      status: normalized,
      accepted: normalized === "ACCEPTED",
      finalized: false,
      undetermined: false,
      contractAddress: raw?.contractAddress ?? null,
      blockNumber: raw?.blockNumber != null ? String(raw.blockNumber) : null,
      raw,
    });
  }

  private deriveSubmissionId(taskId: string, agentOnchainId: string, submissionNonce: string) {
    return `sub:${taskId}:${agentOnchainId}:${submissionNonce}`;
  }
}

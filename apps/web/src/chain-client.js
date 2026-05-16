import {
  createPublicClient,
  createWalletClient,
  custom,
  erc20Abi,
  formatUnits,
  parseAbi,
  parseUnits,
} from "viem";
import { getInjectedWalletProvider, getInjectedWalletProviderLabel } from "./browser-wallet.js";
import {
  validateChainConfig,
  validateChainStatus,
  validateChainReceipt,
  validateOnchainTaskResponse,
  validateTaskChainSyncResponse,
  validateTaskWriteResponse,
} from "./api-contracts.js";

const marketplaceAbi = parseAbi([
  "function create_task(string taskId, uint256 rewardAmount, uint256 deadlineTimestamp, string taskMode, string metadataUri, string metadataHash)",
  "function fund_task(string taskId)",
  "function assign_task(string taskId, string agentId)",
]);
const MAX_UINT256 = (1n << 256n) - 1n;
export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_TESTNET_CHAIN_ID_HEX = "0x4cef52";
export const ARC_TESTNET_RPC_URL = "https://rpc.testnet.arc.network";
export const ARC_TESTNET_EXPLORER_URL = "https://testnet.arcscan.app";
export const ARC_TESTNET_USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
export const ARC_TESTNET_USDC_DECIMALS = 6;

export function createMarketplaceChainClient({ apiBase, getWalletAddress, onStatus }) {
  let browserContextPromise = null;

  async function getConfig() {
    return fetchJson("/api/chain/config", validateChainConfig);
  }

  async function getStatus() {
    return fetchJson("/api/chain/status", validateChainStatus);
  }

  async function connectWallet() {
    const walletAddress = getWalletAddress()?.trim();
    if (!walletAddress) {
      throw new Error("Connect a browser wallet before sending an Arc Testnet transaction.");
    }
    return { walletAddress };
  }

  async function createTaskLifecycle({
    taskId,
    rewardAmount,
    deadlineIso,
    taskMode,
    metadataUri,
    metadataHash,
    selectedAgentId,
    selectedAgentOnchainId,
  }) {
    await connectWallet();
    const config = await getConfig();
    if (config.chainMode === "read_only") {
      throw new Error("Arc writes are disabled in this environment.");
    }
    if (config.chainMode !== "browser_wallet") {
      throw new Error(`Task posting on ${chainDisplayName(config)} must be signed from the connected browser wallet.`);
    }
    assertBrowserFundingConfig(config);
    return createBrowserTaskLifecycle({
      config,
      taskId,
      rewardAmount,
      deadlineIso,
      taskMode,
      metadataUri,
      metadataHash,
      selectedAgentId,
      selectedAgentOnchainId,
    });
  }

  async function createBrowserTaskLifecycle({
    config,
    taskId,
    rewardAmount,
    deadlineIso,
    taskMode,
    metadataUri,
    metadataHash,
    selectedAgentId,
    selectedAgentOnchainId,
  }) {
    assertBrowserFundingConfig(config);
    const walletAddress = getWalletAddress()?.trim();
    const providerLabel = getInjectedWalletProviderLabel();
    if (!walletAddress) {
      throw new Error(`Connect ${providerLabel} before sending a ${chainDisplayName(config)} transaction.`);
    }

    const { publicClient, walletClient } = await getBrowserWriteContext(config);
    const rewardBaseUnits = toTokenBaseUnits(String(rewardAmount ?? ""), Number(config.paymentTokenDecimals ?? 6));
    await assertSufficientBalances({
      publicClient,
      walletAddress,
      displayRewardAmount: String(rewardAmount),
      rewardBaseUnits,
      paymentTokenAddress: config.paymentTokenAddress,
      taskEscrowAddress: config.taskEscrowAddress,
      paymentTokenSymbol: config.paymentTokenSymbol || "USDC",
      gasTokenSymbol: config.gasTokenSymbol || "USDC",
      tokenDecimals: Number(config.paymentTokenDecimals ?? 6),
      gasDecimals: Number(config.gasTokenDecimals ?? 18),
      providerLabel,
    });

    const partialWriteResult = {
      taskId,
      createTxHash: null,
      fundTxHash: null,
      assignTxHash: null,
      latestReceipt: null,
      onchainTaskRef: `${config.taskEscrowAddress}:${taskId}`,
    };

    if (config.requiresTokenApproval) {
      const allowance = await publicClient.readContract({
        address: config.paymentTokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [walletAddress, config.taskEscrowAddress],
      }).catch(() => 0n);
      if (BigInt(allowance || 0n) < rewardBaseUnits) {
        onStatus?.("pending_wallet", `Approve ${config.paymentTokenSymbol || "USDC"} for escrow funding.`);
        const approvalHash = await walletClient.writeContract({
          address: config.paymentTokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [config.taskEscrowAddress, MAX_UINT256],
          account: walletAddress,
        });
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      }
    }

    const resolvedSelectedAgentId = selectedAgentOnchainId || selectedAgentId || null;
    const totalSteps = resolvedSelectedAgentId ? 3 : 2;

    const createTxHash = await runWriteStep({
      walletClient,
      publicClient,
      label: "create_task",
      stepIndex: 1,
      totalSteps,
      onStatus,
      request: {
        address: config.taskEscrowAddress,
        abi: marketplaceAbi,
        functionName: "create_task",
        args: [
          taskId,
          rewardBaseUnits,
          BigInt(Math.floor(new Date(deadlineIso).getTime() / 1000)),
          taskMode,
          metadataUri,
          metadataHash,
        ],
        account: walletAddress,
      },
    });
    partialWriteResult.createTxHash = createTxHash;
    await recordBrowserTrace(taskId, { createTxHash });

    const fundTxHash = await runWriteStep({
      walletClient,
      publicClient,
      label: "fund_task",
      stepIndex: 2,
      totalSteps,
      onStatus,
      request: {
        address: config.taskEscrowAddress,
        abi: marketplaceAbi,
        functionName: "fund_task",
        args: [taskId],
        account: walletAddress,
      },
    });
    partialWriteResult.fundTxHash = fundTxHash;
    await recordBrowserTrace(taskId, { createTxHash, fundTxHash });

    let assignTxHash = null;
    if (resolvedSelectedAgentId) {
      assignTxHash = await runWriteStep({
        walletClient,
        publicClient,
        label: "assign_task",
        stepIndex: 3,
        totalSteps,
        onStatus,
        request: {
          address: config.taskEscrowAddress,
          abi: marketplaceAbi,
          functionName: "assign_task",
          args: [taskId, resolvedSelectedAgentId],
          account: walletAddress,
        },
      });
      partialWriteResult.assignTxHash = assignTxHash;
      await recordBrowserTrace(taskId, { createTxHash, fundTxHash, assignTxHash });
    }

    const createReceipt = await pollReceipt(createTxHash, { intervalMs: 1800, maxAttempts: 30 }).catch(() => null);
    const fundReceipt = await pollReceipt(fundTxHash, { intervalMs: 1800, maxAttempts: 30 }).catch(() => null);
    const assignReceipt = assignTxHash
      ? await pollReceipt(assignTxHash, { intervalMs: 1800, maxAttempts: 30 }).catch(() => null)
      : null;
    const latestReceipt = assignReceipt
      || fundReceipt
      || createReceipt
      || {
        hash: assignTxHash || fundTxHash || createTxHash,
        status: "PENDING",
        accepted: false,
        finalized: false,
        undetermined: false,
        contractAddress: null,
        blockNumber: null,
      };

    return validateTaskWriteResponse({
      taskId,
      createTxHash,
      fundTxHash,
      assignTxHash,
      latestReceipt,
      onchainTaskRef: `${config.taskEscrowAddress}:${taskId}`,
      notes: [
        `${providerLabel} browser signing is active on Arc Testnet.`,
        `${config.paymentTokenSymbol || "USDC"} approval may be required before escrow funding.`,
        `create_task status: ${createReceipt?.status || "PENDING"}`,
        `fund_task status: ${fundReceipt?.status || "PENDING"}`,
        ...(assignTxHash ? [`assign_task status: ${assignReceipt?.status || "PENDING"}`] : []),
      ],
    });
  }

  async function pollReceipt(hash, options = {}) {
    const intervalMs = options.intervalMs ?? 2000;
    const maxAttempts = options.maxAttempts ?? 30;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const receipt = await fetchJson(`/api/chain/receipts/${hash}`, validateChainReceipt);
      const uiState = normalizeTransactionState(receipt.status);
      onStatus?.(uiState, `Transaction ${receipt.status.toLowerCase()}.`);
      if (["ACCEPTED", "FINALIZED", "FAILED", "UNDETERMINED"].includes(receipt.status)) {
        return receipt;
      }
      await delay(intervalMs);
    }
    throw new Error(`Receipt polling timed out for ${hash}`);
  }

  async function getExternalReceipt(hash) {
    const config = await getConfig();
    const response = await fetch(config.browserRpcUrl || config.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "eth_getTransactionReceipt",
        params: [hash],
      }),
    }).catch(() => null);
    if (!response?.ok) return null;
    const payload = await response.json().catch(() => null);
    if (!payload || payload.error) return null;
    return payload.result ?? null;
  }

  async function findSuccessfulExternalReceipt(hashes) {
    for (const hash of hashes) {
      if (!(typeof hash === "string" && hash.startsWith("0x"))) continue;
      const receipt = await getExternalReceipt(hash).catch(() => null);
      const status = String(receipt?.status ?? "").toLowerCase();
      if (status === "0x1" || status === "1" || status === "success") {
        return validateChainReceipt({
          hash,
          status: "ACCEPTED",
          accepted: true,
          finalized: false,
          undetermined: false,
          contractAddress: receipt?.contractAddress ?? null,
          blockNumber: receipt?.blockNumber ? String(receipt.blockNumber) : null,
        });
      }
    }
    return null;
  }

  async function readContractState(address, status = "accepted") {
    return fetchJson(`/api/chain/contracts/${encodeURIComponent(address)}/state?status=${encodeURIComponent(status)}`);
  }

  async function readOnchainTask(taskId) {
    return fetchJson(`/api/chain/tasks/${encodeURIComponent(taskId)}/onchain`, validateOnchainTaskResponse);
  }

  async function syncTask(taskId, writeResult, latestReceipt) {
    return sendJson(`/api/chain/tasks/${taskId}/sync`, "POST", {
      createTxHash: writeResult.createTxHash,
      fundTxHash: writeResult.fundTxHash,
      assignTxHash: writeResult.assignTxHash ?? null,
      latestReceipt,
      onchainTaskRef: writeResult.onchainTaskRef ?? null,
    }, validateTaskChainSyncResponse);
  }

  async function primeBrowserLifecycle() {
    const config = await getConfig();
    if (config.chainMode !== "browser_wallet") return null;
    return getBrowserWriteContext(config);
  }

  async function getWalletNetworkSnapshot() {
    const walletAddress = getWalletAddress()?.trim();
    const config = await getConfig();
    const provider = getInjectedWalletProvider();
    if (!provider?.request) {
      return {
        walletAddress,
        chainId: null,
        expectedChainId: Number(config.chainId || ARC_TESTNET_CHAIN_ID),
        isArcTestnet: false,
        usdcBalance: null,
        nativeGasBalance: null,
        tokenDecimals: Number(config.paymentTokenDecimals ?? ARC_TESTNET_USDC_DECIMALS),
        message: "No EVM browser wallet was detected.",
      };
    }
    const rawChainId = await provider.request({ method: "eth_chainId" }).catch(() => null);
    const chainId = parseChainId(rawChainId);
    const expectedChainId = Number(config.chainId || ARC_TESTNET_CHAIN_ID);
    const isArcTestnet = chainId === expectedChainId;
    if (!walletAddress || !isArcTestnet) {
      return {
        walletAddress,
        chainId,
        expectedChainId,
        isArcTestnet,
        usdcBalance: null,
        nativeGasBalance: null,
        tokenDecimals: Number(config.paymentTokenDecimals ?? ARC_TESTNET_USDC_DECIMALS),
        message: !walletAddress
          ? "Connect a wallet to read Arc Testnet balances."
          : `Switch to Arc Testnet to fund tasks with testnet USDC.`,
      };
    }

    const chain = resolveArcChain(config);
    const publicClient = createPublicClient({ chain, transport: custom(provider) });
    const tokenAddress = config.paymentTokenAddress || ARC_TESTNET_USDC_ADDRESS;
    const tokenDecimals = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "decimals",
    }).then((value) => Number(value)).catch(() => Number(config.paymentTokenDecimals ?? ARC_TESTNET_USDC_DECIMALS));
    const [tokenBalance, nativeGasBalance] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [walletAddress],
      }).catch(() => null),
      publicClient.getBalance({ address: walletAddress }).catch(() => null),
    ]);
    return {
      walletAddress,
      chainId,
      expectedChainId,
      isArcTestnet,
      usdcBalance: tokenBalance == null ? null : formatUnits(BigInt(tokenBalance), tokenDecimals),
      nativeGasBalance: nativeGasBalance == null ? null : formatUnits(BigInt(nativeGasBalance), Number(config.gasTokenDecimals ?? 18)),
      tokenDecimals,
      message: "Arc Testnet wallet is ready for testnet USDC funding.",
    };
  }

  async function switchWalletToArcTestnet() {
    const config = await getConfig();
    const provider = getInjectedWalletProvider();
    if (!provider?.request) {
      throw new Error("No EVM browser wallet was detected.");
    }
    await ensureProviderChain(provider, resolveArcChain(config));
    browserContextPromise = null;
    return getWalletNetworkSnapshot();
  }

  function resetBrowserContext() {
    browserContextPromise = null;
  }

  return {
    getConfig,
    getStatus,
    connectWallet,
    createTaskLifecycle,
    primeBrowserLifecycle,
    getWalletNetworkSnapshot,
    switchWalletToArcTestnet,
    resetBrowserContext,
    pollReceipt,
    readContractState,
    readOnchainTask,
    syncTask,
    getExternalReceipt,
    findSuccessfulExternalReceipt,
  };

  async function getBrowserWriteContext(config) {
    if (!browserContextPromise) {
      browserContextPromise = (async () => {
        const provider = getInjectedWalletProvider();
        if (!provider?.request) {
          throw new Error("A browser wallet with EVM support was not detected.");
        }
        const chain = resolveArcChain(config);
        await ensureProviderChain(provider, chain);
        const publicClient = createPublicClient({
          chain,
          transport: custom(provider),
        });
        const walletClient = createWalletClient({
          chain,
          transport: custom(provider),
        });
        return { publicClient, walletClient };
      })().catch((error) => {
        browserContextPromise = null;
        throw error;
      });
    }
    return browserContextPromise;
  }

  async function fetchJson(path, validate) {
    const response = await fetch(`${apiBase}${path}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed for ${path}`);
    return validate ? validate(payload) : payload;
  }

  async function sendJson(path, method, body, validate) {
    const response = await fetch(`${apiBase}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed for ${path}`);
    return validate ? validate(payload) : payload;
  }

  async function recordBrowserTrace(taskId, trace) {
    try {
      await sendJson(`/api/task-market/tasks/${encodeURIComponent(taskId)}/browser-trace`, "POST", trace);
    } catch {
      // best effort only
    }
  }
}

function assertBrowserFundingConfig(config) {
  if (!config?.taskEscrowAddress) {
    throw new Error("Arc marketplace contract address is not configured. Set ARC_TASK_MARKETPLACE_ADDRESS before wallet-funded task posting.");
  }
  if (!config?.paymentTokenAddress) {
    throw new Error("Arc USDC token address is not configured. Set ARC_PAYMENT_TOKEN_ADDRESS to 0x3600000000000000000000000000000000000000.");
  }
}

async function runWriteStep({ walletClient, publicClient, label, stepIndex, totalSteps, onStatus, request }) {
  const stepPrefix = totalSteps > 1 ? `Step ${stepIndex}/${totalSteps}: ` : "";
  onStatus?.("pending_wallet", `${stepPrefix}Confirm ${label} in your wallet.`);
  let hash;
  try {
    hash = await walletClient.writeContract(request);
  } catch (error) {
    if (error?.code === 4001 || /user rejected|rejected/i.test(String(error?.message || ""))) {
      throw new Error(`Transaction rejected. Confirm ${label} in your wallet to continue funding on Arc Testnet.`);
    }
    throw error;
  }
  onStatus?.("pending_chain", `${stepPrefix}${label} submitted. Waiting for Arc Testnet confirmation.`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (String(receipt.status).toLowerCase() !== "success") {
    throw new Error(`${label} failed onchain.`);
  }
  return hash;
}

async function assertSufficientBalances({
  publicClient,
  walletAddress,
  displayRewardAmount,
  rewardBaseUnits,
  paymentTokenAddress,
  taskEscrowAddress,
  paymentTokenSymbol,
  gasTokenSymbol,
  tokenDecimals,
  gasDecimals,
  providerLabel,
}) {
  const [gasBalance, tokenBalance, allowance] = await Promise.all([
    publicClient.getBalance({ address: walletAddress }),
    publicClient.readContract({
      address: paymentTokenAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [walletAddress],
    }).catch(() => 0n),
    publicClient.readContract({
      address: paymentTokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [walletAddress, taskEscrowAddress],
    }).catch(() => 0n),
  ]);

  if (BigInt(tokenBalance || 0n) < rewardBaseUnits) {
    throw new Error(
      `${providerLabel} wallet balance is too low for this task reward. Required: ${displayRewardAmount} ${paymentTokenSymbol}. Current token balance is lower than the requested reward.`,
    );
  }
  if (BigInt(gasBalance || 0n) === 0n) {
    throw new Error(
      `${providerLabel} wallet has no native ${gasTokenSymbol} available for Arc gas. Add a small gas balance before posting a task.`,
    );
  }
  return {
    tokenBalance,
    gasBalance,
    allowance,
    formattedTokenBalance: formatBaseUnits(BigInt(tokenBalance || 0n), tokenDecimals),
    formattedGasBalance: formatBaseUnits(BigInt(gasBalance || 0n), gasDecimals),
  };
}

function resolveArcChain(config) {
  return {
    id: Number(config.chainId || ARC_TESTNET_CHAIN_ID),
    name: config.networkName || "Arc Testnet",
    nativeCurrency: {
      name: config.gasTokenSymbol || "USDC",
      symbol: config.gasTokenSymbol || "USDC",
      decimals: Number(config.gasTokenDecimals ?? 18),
    },
    rpcUrls: {
      default: {
        http: [config.browserRpcUrl || config.rpcUrl],
      },
    },
    blockExplorers: config.explorerBaseUrl
      ? {
        default: {
          name: "Explorer",
          url: config.explorerBaseUrl,
        },
      }
      : undefined,
  };
}

async function ensureProviderChain(provider, chain) {
  const targetChainId = `0x${Number(chain.id).toString(16)}`;
  const currentChainId = await provider.request({ method: "eth_chainId" }).catch(() => null);
  if (String(currentChainId || "").toLowerCase() === targetChainId.toLowerCase()) {
    return;
  }
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainId }],
    });
    return;
  } catch (error) {
    if (error?.code === 4001) {
      throw new Error(`Approve the switch to ${chain.name} in your wallet before continuing.`);
    }
  }
  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: targetChainId,
        chainName: chain.name,
        rpcUrls: chain.rpcUrls?.default?.http || [],
        nativeCurrency: chain.nativeCurrency,
        blockExplorerUrls: chain.blockExplorers?.default?.url ? [chain.blockExplorers.default.url] : undefined,
      }],
    });
  } catch (error) {
    if (error?.code === 4001) {
      throw new Error(`Approve the ${chain.name} network request in your wallet before continuing.`);
    }
    throw error;
  }
  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: targetChainId }],
  });
}

function toTokenBaseUnits(amount, decimals = 6) {
  const source = String(amount || "").trim();
  if (!source || !/^\d+(\.\d+)?$/.test(source)) {
    throw new Error("Reward must be a valid USDC amount.");
  }
  return parseUnits(source, decimals);
}

function chainDisplayName(config = {}) {
  const raw = `${config.chainKey || ""} ${config.networkName || ""}`.toLowerCase();
  return raw.includes("arc") ? "Arc Testnet" : "GenLayer";
}

function parseChainId(value) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  const text = String(value || "").trim();
  if (!text) return null;
  if (text.startsWith("0x")) return Number.parseInt(text, 16);
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatBaseUnits(value, decimals = 6) {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const text = absolute.toString().padStart(decimals + 1, "0");
  const whole = text.slice(0, -decimals) || "0";
  const fraction = text.slice(-decimals).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction.slice(0, Math.min(decimals, 6))}` : ""}`;
}

function normalizeTransactionState(status) {
  if (status === "FINALIZED" || status === "ACCEPTED") return "accepted";
  if (status === "FAILED" || status === "UNDETERMINED") return "failed";
  return "pending_chain";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const artifactsRoot = resolve(packageRoot, "artifacts", "arc");

const ARC_TESTNET = {
  id: 5_042_002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network"] } },
};

const privateKey = process.env.ARC_DEPLOYER_PRIVATE_KEY || process.env.ARC_SERVER_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("ARC_DEPLOYER_PRIVATE_KEY or ARC_SERVER_PRIVATE_KEY is required for Arc deployment.");
}

const treasury = process.env.ARC_PLATFORM_TREASURY_ADDRESS || process.env.PLATFORM_TREASURY_WALLET || process.env.ARC_SERVER_WALLET_ADDRESS;
if (!treasury) {
  throw new Error("ARC_PLATFORM_TREASURY_ADDRESS or PLATFORM_TREASURY_WALLET is required.");
}

const paymentTokenAddress = process.env.ARC_PAYMENT_TOKEN_ADDRESS || "0x3600000000000000000000000000000000000000";
const feeBps = BigInt(Number(process.env.ARC_PLATFORM_FEE_BPS || process.env.PLATFORM_FEE_BPS || "250"));
const account = privateKeyToAccount(privateKey);
const operator = process.env.ARC_OPERATOR_ADDRESS || account.address;

const publicClient = createPublicClient({
  chain: ARC_TESTNET,
  transport: http(ARC_TESTNET.rpcUrls.default.http[0]),
});
const walletClient = createWalletClient({
  account,
  chain: ARC_TESTNET,
  transport: http(ARC_TESTNET.rpcUrls.default.http[0]),
});

const registryArtifact = JSON.parse(readFileSync(resolve(artifactsRoot, "DispatchAgentRegistry.json"), "utf8"));
const marketplaceArtifact = JSON.parse(readFileSync(resolve(artifactsRoot, "DispatchMarketplace.json"), "utf8"));

const registryHash = await walletClient.deployContract({
  abi: registryArtifact.abi,
  bytecode: registryArtifact.bytecode,
});
const registryReceipt = await publicClient.waitForTransactionReceipt({ hash: registryHash });
const registryAddress = registryReceipt.contractAddress;
if (!registryAddress) throw new Error("Agent registry deployment returned no contract address.");

const marketHash = await walletClient.deployContract({
  abi: marketplaceArtifact.abi,
  bytecode: marketplaceArtifact.bytecode,
  args: [paymentTokenAddress, registryAddress, treasury, operator, feeBps],
});
const marketReceipt = await publicClient.waitForTransactionReceipt({ hash: marketHash });
const marketplaceAddress = marketReceipt.contractAddress;
if (!marketplaceAddress) throw new Error("Marketplace deployment returned no contract address.");

console.log(JSON.stringify({
  network: "arcTestnet",
  rpcUrl: ARC_TESTNET.rpcUrls.default.http[0],
  deployer: account.address,
  operator,
  paymentTokenAddress,
  platformFeeBps: Number(feeBps),
  registryAddress,
  marketplaceAddress,
  explorerBaseUrl: "https://testnet.arcscan.app",
}, null, 2));

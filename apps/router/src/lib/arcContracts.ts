import { defineChain, erc20Abi, parseAbi } from "viem";

export const ARC_TESTNET = defineChain({
  id: 5_042_002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arcscan",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

export const ARC_USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

export const dispatchAgentRegistryAbi = parseAbi([
  "function register_agent(string agentId, string slug, string versionHash, string metadataUri, string metadataHash)",
  "function update_agent(string agentId, string versionHash, string metadataUri, string metadataHash)",
  "function disable_agent(string agentId)",
  "function ownerOfAgent(string agentId) view returns (address)",
  "function isAgentActive(string agentId) view returns (bool)",
  "function get_agent(string agentId) view returns (address owner, string slug, string versionHash, string metadataUri, string metadataHash, bool active, uint64 registeredAt, uint64 updatedAt)",
]);

export const dispatchMarketplaceAbi = parseAbi([
  "function create_task(string taskId, uint256 rewardAmount, uint256 deadlineTimestamp, string taskMode, string metadataUri, string metadataHash)",
  "function fund_task(string taskId)",
  "function assign_task(string taskId, string agentId)",
  "function start_execution(string taskId, string agentId)",
  "function submit_task(string taskId, string agentId, string submissionNonce, string resultHash, string metadataUri, string metadataHash)",
  "function start_review(string taskId)",
  "function approve_submission(string taskId, string submissionId)",
  "function reject_submission(string taskId, string submissionId)",
  "function dispute_task(string taskId, string reasonHash)",
  "function appeal_task(string taskId, string appealHash)",
  "function finalize_review(string taskId, string submissionId, string requestedOutcome, uint256 consensusScore, uint256 validatorAgreementBps, uint256 consensusConfidenceBps, string evaluationHash)",
  "function settle_task(string taskId)",
  "function cancel_task(string taskId)",
  "function refund_task(string taskId)",
  "function get_task(string taskId) view returns (address creator, uint256 rewardAmount, uint64 deadlineTimestamp, string taskMode, string metadataUri, string metadataHash, string stateName, uint8 state, uint256 escrow_locked, string assignedAgentId, string latestSubmissionId, string latestResultHash, string latestResultUri, string latestResultMetadataHash, string reviewOutcome, uint256 consensusScore, uint256 validatorAgreementBps, uint256 consensusConfidenceBps, string evaluationHash)",
]);

export { erc20Abi };

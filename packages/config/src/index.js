export const defaultConfig = {
  chain: {
    chainKey: "arcTestnet",
    rpcUrl: "https://rpc.testnet.arc.network",
  },
  execution: {
    maxRetries: 3,
    baseBackoffMs: 1500,
    timeoutMs: 120000,
  },
  settlement: {
    platformFeeBps: 250,
  },
};

export const arcTestnetConfig = {
  chain: {
    chainKey: "arcTestnet",
    rpcUrl: "https://rpc.testnet.arc.network",
  },
};

export const bradburyTestnetConfig = arcTestnetConfig;

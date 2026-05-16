function listInjectedProviders() {
  if (typeof window === "undefined") return [];
  const provider = window.ethereum;
  if (!provider) return [];
  if (Array.isArray(provider.providers) && provider.providers.length) {
    return provider.providers.filter(Boolean);
  }
  return [provider];
}

function providerScore(provider) {
  if (!provider) return -1;
  if (provider.isRabby) return 300;
  if (provider.isMetaMask) return 200;
  if (provider.isCoinbaseWallet) return 100;
  return 0;
}

export function getInjectedWalletProvider() {
  const providers = listInjectedProviders();
  if (!providers.length) return null;
  return [...providers].sort((left, right) => providerScore(right) - providerScore(left))[0] || null;
}

export function getInjectedWalletProviderLabel() {
  const provider = getInjectedWalletProvider();
  if (!provider) return "Browser Wallet";
  if (provider.isRabby) return "Rabby";
  if (provider.isMetaMask) return "MetaMask";
  if (provider.isCoinbaseWallet) return "Coinbase Wallet";
  return "Browser Wallet";
}

export function isInjectedWalletAvailable() {
  return Boolean(getInjectedWalletProvider()?.request);
}

export async function getInjectedWalletAddress() {
  const provider = getInjectedWalletProvider();
  if (!provider?.request) return "";
  const accounts = await provider.request({ method: "eth_accounts" });
  return Array.isArray(accounts) && accounts[0] ? accounts[0] : "";
}

export async function connectInjectedWallet() {
  const provider = getInjectedWalletProvider();
  if (!provider?.request) {
    throw new Error("Rabby or another injected wallet was not detected in this browser.");
  }
  let accounts;
  try {
    accounts = await provider.request({ method: "eth_requestAccounts" });
  } catch (error) {
    if (error?.code === 4001) {
      throw new Error("Wallet connection was rejected. Approve the connection request to fund tasks with testnet USDC.");
    }
    throw error;
  }
  if (!Array.isArray(accounts) || !accounts[0]) {
    throw new Error("No browser wallet account was returned.");
  }
  return accounts[0];
}

export async function signInjectedWalletMessage(message, walletAddress) {
  const provider = getInjectedWalletProvider();
  if (!provider?.request) {
    throw new Error("Rabby or another injected wallet was not detected in this browser.");
  }
  const account = walletAddress || (await getInjectedWalletAddress());
  if (!account) {
    throw new Error("Connect a browser wallet before signing a message.");
  }
  try {
    return await provider.request({
      method: "personal_sign",
      params: [message, account],
    });
  } catch (error) {
    if (error?.code === 4001) {
      throw new Error("Approve the ownership signature in your wallet before continuing.");
    }
    return provider.request({
      method: "eth_sign",
      params: [account, message],
    });
  }
}

export function watchInjectedWallet({ onAccountsChanged, onChainChanged } = {}) {
  const provider = getInjectedWalletProvider();
  if (!provider?.on) {
    return () => {};
  }

  const handleAccountsChanged = (accounts) => {
    onAccountsChanged?.(Array.isArray(accounts) ? accounts : []);
  };
  const handleChainChanged = (chainId) => {
    onChainChanged?.(chainId);
  };

  provider.on("accountsChanged", handleAccountsChanged);
  provider.on("chainChanged", handleChainChanged);

  return () => {
    provider.removeListener?.("accountsChanged", handleAccountsChanged);
    provider.removeListener?.("chainChanged", handleChainChanged);
  };
}

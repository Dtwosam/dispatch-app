export function getAppElements() {
  return {
    body: document.body,
    ownerWallet: document.getElementById("ownerWallet"),
    brandSlot: document.getElementById("brandSlot"),
    routeList: document.getElementById("routeList"),
    statusToast: document.getElementById("statusToast"),
    appRoot: document.getElementById("appRoot"),
    topbarActions: document.getElementById("topbarActions"),
    walletSheet: document.getElementById("walletSheet"),
    burstLayer: document.getElementById("burstLayer"),
  };
}

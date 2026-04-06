$env:ARC_CHAIN_MODE = "browser_wallet"
$env:ARC_CHAIN_ID = "5042002"
$env:ARC_CHAIN_KEY = "arcTestnet"
$env:ARC_RPC_URL = "https://rpc.testnet.arc.network"
$env:ARC_BROWSER_RPC_URL = "https://rpc.testnet.arc.network"
$env:ARC_PAYMENT_TOKEN_ADDRESS = "0x3600000000000000000000000000000000000000"
$env:ARC_PAYMENT_TOKEN_SYMBOL = "USDC"
$env:ARC_PAYMENT_TOKEN_DECIMALS = "18"
$env:ARC_GAS_TOKEN_SYMBOL = "USDC"
$env:ARC_EXPLORER_BASE_URL = "https://testnet.arcscan.app"

if (-not $env:PLATFORM_AGENT_OWNER_WALLET -and $env:ARC_SERVER_WALLET_ADDRESS) {
  $env:PLATFORM_AGENT_OWNER_WALLET = $env:ARC_SERVER_WALLET_ADDRESS
}

npm run dev:router

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$localDir = Join-Path $root ".local"
New-Item -ItemType Directory -Force -Path $localDir | Out-Null

$envDefaults = @{
  ADMIN_WALLETS = "0xadmin001,0xops002"
  EVALUATOR_BASE_URL = "http://localhost:4030"
  ROUTER_PUBLIC_BASE_URL = "http://localhost:4020"
  ROUTER_AGENT_SHARED_SECRET = "dev-router-secret"
  ROUTER_CALLBACK_SECRET = "dev-router-secret"
  ALLOWED_ORIGINS = "http://localhost:3005,http://localhost:3000,https://dispatch-steel.vercel.app"
  ALLOW_INSECURE_DEV_OWNER_PROOFS = "true"
  ARC_RPC_URL = "https://rpc.testnet.arc.network"
  ARC_BROWSER_RPC_URL = "https://rpc.testnet.arc.network"
  ARC_CHAIN_ID = "5042002"
  ARC_CHAIN_KEY = "arcTestnet"
  ARC_CHAIN_MODE = "read_only"
  ARC_NETWORK_NAME = "Arc Testnet"
  ARC_PAYMENT_TOKEN_ADDRESS = "0x3600000000000000000000000000000000000000"
  ARC_PAYMENT_TOKEN_SYMBOL = "USDC"
  ARC_PAYMENT_TOKEN_DECIMALS = "6"
  ARC_GAS_TOKEN_SYMBOL = "USDC"
  ARC_GAS_TOKEN_DECIMALS = "18"
  ARC_EXPLORER_BASE_URL = "https://testnet.arcscan.app"
  PLATFORM_FEE_BPS = "250"
}

$services = @(
  @{ Name = "evaluator"; Command = "npm run dev:evaluator"; Port = 4030 },
  @{ Name = "router"; Command = "npm run dev:router"; Port = 4020 },
  @{ Name = "adapter"; Command = "npm run dev:adapter"; Port = 4010 },
  @{ Name = "web"; Command = "npm run dev:web"; Port = 3000 }
)

$started = @()
foreach ($service in $services) {
  $stdoutPath = Join-Path $localDir "$($service.Name).out.log"
  $stderrPath = Join-Path $localDir "$($service.Name).err.log"
  $envBlock = ($envDefaults.GetEnumerator() | ForEach-Object {
    'set "{0}={1}"' -f $_.Key, $_.Value
  }) -join " && "
  $script = "$envBlock && cd /d `"$root`" && $($service.Command)"
  $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $script -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
  $started += [pscustomobject]@{
    name = $service.Name
    pid = $process.Id
    port = $service.Port
    stdoutLog = $stdoutPath
    stderrLog = $stderrPath
  }
}

$started | ConvertTo-Json | Set-Content -Path (Join-Path $localDir "pids.json")
Write-Host "Started local stack:"
$started | ForEach-Object { Write-Host " - $($_.name) on port $($_.port) (PID $($_.pid))" }
Write-Host "Logs are in $localDir"

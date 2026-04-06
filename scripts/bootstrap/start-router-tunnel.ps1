$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$routerPort = if ($env:ROUTER_PORT) { $env:ROUTER_PORT } else { "4020" }

if (-not $env:ALLOWED_ORIGINS) {
  $env:ALLOWED_ORIGINS = "http://localhost:3005,http://localhost:3000,https://dispatch-steel.vercel.app"
}

Write-Host "Starting free public tunnel for local router on port $routerPort..."
Write-Host "Allowed frontend origins: $($env:ALLOWED_ORIGINS)"
Write-Host ""
Write-Host "When the tunnel URL appears, open:"
Write-Host "https://dispatch-steel.vercel.app/?apiBase=<YOUR_TUNNEL_URL>"
Write-Host ""

Set-Location $root
npx localtunnel --port $routerPort

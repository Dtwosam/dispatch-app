$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$pidFile = Join-Path $root ".local\pids.json"

if (-not (Test-Path $pidFile)) {
  Write-Host "No running local stack metadata found."
  exit 0
}

$services = Get-Content $pidFile | ConvertFrom-Json
foreach ($service in $services) {
  try {
    Stop-Process -Id $service.pid -Force -ErrorAction Stop
    Write-Host "Stopped $($service.name) (PID $($service.pid))"
  } catch {
    Write-Host "Could not stop $($service.name) (PID $($service.pid)); it may already be closed."
  }
}

Remove-Item $pidFile -Force

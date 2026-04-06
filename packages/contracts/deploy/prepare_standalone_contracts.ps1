$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $root "marketplace"
$outDir = Join-Path $root ".generated"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$constantsSource = (Get-Content (Join-Path $sourceDir "constants.py") -Raw).Trim()
$errorsSource = (Get-Content (Join-Path $sourceDir "errors.py") -Raw).Trim()
$sharedBlock = $constantsSource + "`n`n" + $errorsSource + "`n"

function Prepare-File([string]$filename) {
  $sourcePath = Join-Path $sourceDir $filename
  $targetPath = Join-Path $outDir $filename
  $source = Get-Content $sourcePath -Raw

  $withoutLocalImports = [regex]::Replace($source, "(?ms)^from \.constants import \([\s\S]*?\)\r?\n", "")
  $withoutLocalImports = [regex]::Replace($withoutLocalImports, "(?m)^from \.constants import .*\r?\n", "")
  $withoutLocalImports = [regex]::Replace($withoutLocalImports, "(?ms)^from \.errors import \([\s\S]*?\)\r?\n", "")
  $withoutLocalImports = [regex]::Replace($withoutLocalImports, "(?m)^from \.errors import .*\r?\n", "")

  $insertionTarget = "from genlayer import *"
  if (-not $withoutLocalImports.Contains($insertionTarget)) {
    throw "Could not find insertion point in $filename"
  }

  $standalone = $withoutLocalImports.Replace($insertionTarget, $insertionTarget + "`r`n`r`n" + $sharedBlock)
  Set-Content -Path $targetPath -Value $standalone
  Write-Host "prepared .generated/$filename"
}

Prepare-File "agent_registry.py"
Prepare-File "task_escrow.py"

# Deploy Fix Script
Set-Location $PSScriptRoot
$ErrorActionPreference = "Stop"

Write-Host "Corrected Directory to: $(Get-Location)"

Write-Host "Cleaning Environment..."
if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }
if (Test-Path package-lock.json) { Remove-Item -Force package-lock.json }

Write-Host "Installing Dependencies (No Lockfile)..."
npm install --no-package-lock
if ($LASTEXITCODE -ne 0) { 
    Write-Error "NPM Install Failed! Please check the error above."
    exit 1 
}

Write-Host "Deploying via Direct Node Execution..."
# Execute Hardhat's internal CLI directly to bypass wrapper checks
node node_modules/hardhat/internal/cli/cli.js run scripts/deploy.js --network polygon_mainnet

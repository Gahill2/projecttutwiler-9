# Guard - Development Environment Setup Script
# This script helps developers set up their .env file for development

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Guard - Development Environment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$devEnvFile = Join-Path $projectRoot ".env.development"
$envFile = Join-Path $projectRoot ".env"

# Check if .env.development exists
if (-not (Test-Path $devEnvFile)) {
    Write-Host "[ERROR] .env.development file not found!" -ForegroundColor Red
    Write-Host "Expected location: $devEnvFile" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check if .env already exists
if (Test-Path $envFile) {
    Write-Host "[WARNING] .env file already exists!" -ForegroundColor Yellow
    Write-Host ""
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "[INFO] Setup cancelled. Your existing .env file is unchanged." -ForegroundColor Green
        Write-Host ""
        exit 0
    }
}

# Copy .env.development to .env
Write-Host "[INFO] Copying .env.development to .env..." -ForegroundColor Cyan
Copy-Item $devEnvFile $envFile -Force
Write-Host "[OK] .env file created!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Edit .env file and update:" -ForegroundColor Yellow
Write-Host "   - Database connection strings (JAWSDB_URL, etc.)" -ForegroundColor White
Write-Host "   - Pinecone API key (if needed)" -ForegroundColor White
Write-Host "   - Other service configurations" -ForegroundColor White
Write-Host ""
Write-Host "2. Run the startup wizard:" -ForegroundColor Yellow
Write-Host "   start.bat" -ForegroundColor White
Write-Host ""
Write-Host "Note: The wizard will detect your existing .env file" -ForegroundColor Gray
Write-Host "      and skip the configuration step." -ForegroundColor Gray
Write-Host ""


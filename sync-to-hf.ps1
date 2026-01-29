# Sync Backend to Hugging Face Space
# Run this script whenever you want to deploy Backend changes to HF

Write-Host "Syncing Backend to Hugging Face Space..." -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir

git checkout master
git pull origin master

$hasChanges = git status --porcelain
if ($hasChanges) {
    Write-Host "Stashing uncommitted changes..." -ForegroundColor Yellow
    git stash push -m "Auto-stash before HF sync"
    $stashed = $true
} else {
    $stashed = $false
}

git checkout hf-space
git checkout master -- Backend/ Dockerfile static/ .dockerignore

$date = Get-Date -Format 'yyyy-MM-dd HH:mm'
git add Backend/ Dockerfile static/ .dockerignore
git diff --cached --quiet
if ($LASTEXITCODE -eq 1) {
    git commit -m "Sync Backend from master - $date"
    Write-Host "Changes committed" -ForegroundColor Green
} else {
    Write-Host "No changes to commit" -ForegroundColor Yellow
}

git push hf hf-space:main

git checkout master

if ($stashed) {
    Write-Host "Restoring stashed changes..." -ForegroundColor Yellow
    git stash pop
}

Pop-Location

Write-Host "Successfully synced to Hugging Face Space!" -ForegroundColor Green
Write-Host "View at: https://huggingface.co/spaces/0xarchit/UrbanLens" -ForegroundColor Blue

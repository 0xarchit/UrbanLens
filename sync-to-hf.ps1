# Sync Backend to Hugging Face Space
# Run this script whenever you want to deploy Backend changes to HF

Write-Host "🔄 Syncing Backend to Hugging Face Space..." -ForegroundColor Cyan

# 1. Ensure we're on master and it's up to date
git checkout master
git pull origin master

# 2. Switch to hf-space branch
git checkout hf-space

# 3. Copy latest Backend files from master
git checkout master -- Backend/ Dockerfile static/ .dockerignore

# 4. Commit changes
$date = Get-Date -Format 'yyyy-MM-dd HH:mm'
git add Backend/ Dockerfile static/ .dockerignore
git diff --cached --quiet
if ($LASTEXITCODE -eq 1) {
    git commit -m "Sync Backend from master - $date"
    Write-Host "✅ Changes committed" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No changes to commit" -ForegroundColor Yellow
}

# 5. Push to Hugging Face
git push hf hf-space:main

# 6. Return to master
git checkout master

Write-Host "✅ Successfully synced to Hugging Face Space!" -ForegroundColor Green
Write-Host "🌐 View at: https://huggingface.co/spaces/0xarchit/UrbanLens" -ForegroundColor Blue

@echo off
title City Issue Professional Orchestrator

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

:: Run the orchestrator script
node start.js

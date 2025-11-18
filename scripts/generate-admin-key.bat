@echo off
REM Launcher for Admin API Key Generator
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "generate-admin-key.ps1"


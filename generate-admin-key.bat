@echo off
REM Convenience launcher for Admin API Key Generator
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "scripts\generate-admin-key.ps1"


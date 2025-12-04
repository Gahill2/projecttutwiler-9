@echo off
echo Starting Setup Wizard...
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -WindowStyle Normal -File startup-wizard.ps1
pause


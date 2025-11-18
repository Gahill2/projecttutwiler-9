@echo off
REM Guard - Main Entry Point
REM Launches the GUI startup wizard which handles everything

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "startup-wizard.ps1"


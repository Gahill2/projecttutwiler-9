@echo off
REM Guard - Development Environment Setup
REM Convenience wrapper for Windows

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "scripts\setup-dev-env.ps1"


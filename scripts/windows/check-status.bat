@echo off
setlocal enabledelayedexpansion

REM Project Tutwiler - Service Status Checker with Popup
REM Shows status of all services in a popup dialog

echo ========================================
echo Project Tutwiler - Service Status Check
echo ========================================
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Docker is not running. Please start Docker Desktop first.', 'Project Tutwiler - Status Check', 'OK', 'Error')" >nul
    exit /b 1
)

REM Check if docker-compose is available
docker compose version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Docker Compose is not available. Please ensure Docker Desktop is up to date.', 'Project Tutwiler - Status Check', 'OK', 'Error')" >nul
    exit /b 1
)

REM Get service status
echo Checking service status...

REM Build status message
set RUNNING_COUNT=0
set TOTAL_COUNT=0
set STATUS_MSG=Service Status:

REM Check each service
cd ..\..
for %%s in (frontend api-gateway orchestrator ai-rag cve-ingestor etl-nv etl-v ollama) do (
    set /a TOTAL_COUNT+=1
    docker compose ps %%s --format "{{.Status}}" 2>nul | findstr /C:"Up" >nul
    if !ERRORLEVEL! EQU 0 (
        set /a RUNNING_COUNT+=1
        set STATUS_MSG=!STATUS_MSG!%%s: Running;
    ) else (
        set STATUS_MSG=!STATUS_MSG!%%s: Not Running;
    )
)

REM Build final message
if %RUNNING_COUNT% EQU 0 (
    set FINAL_MSG=!STATUS_MSG!No services are currently running.;Run start.bat to start all services.
    powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $msg = '!FINAL_MSG!'.Replace(';', [Environment]::NewLine); [System.Windows.Forms.MessageBox]::Show($msg, 'Project Tutwiler - Service Status', 'OK', 'Warning')" >nul
) else if %RUNNING_COUNT% EQU %TOTAL_COUNT% (
    set FINAL_MSG=!STATUS_MSG!All services are running! (%RUNNING_COUNT%/%TOTAL_COUNT%);Access the app at:;Frontend: http://localhost:3000;Portal: http://localhost:3000/portal;Admin: http://localhost:3000/admin/analytics
    powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $msg = '!FINAL_MSG!'.Replace(';', [Environment]::NewLine); [System.Windows.Forms.MessageBox]::Show($msg, 'Project Tutwiler - Service Status', 'OK', 'Information')" >nul
) else (
    set FINAL_MSG=!STATUS_MSG!Some services are not running (%RUNNING_COUNT%/%TOTAL_COUNT%);Run start.bat to start all services.
    powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $msg = '!FINAL_MSG!'.Replace(';', [Environment]::NewLine); [System.Windows.Forms.MessageBox]::Show($msg, 'Project Tutwiler - Service Status', 'OK', 'Warning')" >nul
)

REM Also show in console
echo.
echo Service Status:
echo ========================================
docker compose ps
echo.
echo Access the app at:
echo   Frontend: http://localhost:3000
echo   Portal: http://localhost:3000/portal
echo   Admin: http://localhost:3000/admin/analytics
echo.

pause


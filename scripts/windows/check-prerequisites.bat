@echo off
setlocal enabledelayedexpansion

REM Project Tutwiler - Prerequisites Checker with Popups
REM This script checks for required software and shows popup dialogs

echo ========================================
echo Project Tutwiler - Prerequisites Check
echo ========================================
echo.

set MISSING_PREREQS=0
set PREREQ_LIST=

REM Check if Docker is installed
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    set /a MISSING_PREREQS+=1
    set PREREQ_LIST=Docker Desktop
)

REM Check if Docker is running
if %MISSING_PREREQS% EQU 0 (
    docker ps >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        set DOCKER_NOT_RUNNING=1
    )
)

REM Show results in popup
if %MISSING_PREREQS% GTR 0 (
    echo [WARNING] Missing prerequisites detected!
    echo.
    echo Missing: %PREREQ_LIST%
    echo.
    
    REM Show popup dialog
    powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $result = [System.Windows.Forms.MessageBox]::Show('Missing Prerequisites:' + [Environment]::NewLine + [Environment]::NewLine + '%PREREQ_LIST%' + [Environment]::NewLine + [Environment]::NewLine + 'Would you like to open the download page for Docker Desktop?', 'Project Tutwiler - Prerequisites Check', 'YesNo', 'Warning'); exit $result"
    
    if %ERRORLEVEL% EQU 6 (
        echo Opening Docker Desktop download page...
        start https://www.docker.com/products/docker-desktop
        echo.
        echo Please install Docker Desktop and run this script again.
        pause
        exit /b 1
    ) else (
        echo Please install the missing prerequisites and run this script again.
        pause
        exit /b 1
    )
)

if defined DOCKER_NOT_RUNNING (
    echo [INFO] Docker Desktop is not running.
    echo.
    
    REM Show popup asking to start Docker
    powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $result = [System.Windows.Forms.MessageBox]::Show('Docker Desktop is not running.' + [Environment]::NewLine + [Environment]::NewLine + 'Would you like to start Docker Desktop now?', 'Project Tutwiler - Docker Check', 'YesNo', 'Question'); exit $result"
    
    if %ERRORLEVEL% EQU 6 (
        echo Attempting to start Docker Desktop...
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" 2>nul
        start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" 2>nul
        start "" "%LOCALAPPDATA%\Docker\Docker Desktop.exe" 2>nul
        
        echo Waiting for Docker to start (this may take 30-60 seconds)...
        
        REM Wait for Docker with progress
        set /a count=0
        :wait_docker
        docker ps >nul 2>&1
        if %ERRORLEVEL% EQU 0 goto docker_ready
        set /a count+=1
        if %count% GEQ 12 (
            powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Docker did not start in time. Please start Docker Desktop manually and try again.', 'Project Tutwiler - Error', 'OK', 'Error')" >nul
            pause
            exit /b 1
        )
        echo Waiting for Docker... [%count%/12]
        timeout /t 5 /nobreak >nul
        goto wait_docker
        
        :docker_ready
        powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Docker Desktop is now running!', 'Project Tutwiler - Success', 'OK', 'Information')" >nul
    ) else (
        echo Please start Docker Desktop manually and run this script again.
        pause
        exit /b 1
    )
)

REM Check if .env file exists (relative to project root)
cd ..\..
if not exist .env (
    if exist .env.sample (
        powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $result = [System.Windows.Forms.MessageBox]::Show('.env file not found.' + [Environment]::NewLine + [Environment]::NewLine + 'Would you like to create it from .env.sample?', 'Project Tutwiler - Configuration', 'YesNo', 'Question'); exit $result"
        
        if %ERRORLEVEL% EQU 6 (
            copy .env.sample .env >nul
            powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('.env file created! Please edit it with your configuration before starting services.', 'Project Tutwiler - Configuration', 'OK', 'Information')" >nul
        )
    )
)

REM All checks passed
echo.
echo [SUCCESS] All prerequisites are met!
echo.
powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('All prerequisites are installed and ready!' + [Environment]::NewLine + [Environment]::NewLine + 'You can now run start.bat to start all services.', 'Project Tutwiler - Ready', 'OK', 'Information')" >nul

exit /b 0


@echo off
REM Automatically pull Ollama models when container is ready

set CONTAINER_NAME=projecttutwiler-9-ollama-1
set MAX_WAIT=60
set WAIT_COUNT=0

echo Waiting for Ollama container to be ready...

:wait_loop
docker ps --format "{{.Names}}" | findstr /C:"%CONTAINER_NAME%" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Ollama container is running!
    goto container_ready
)

timeout /t 2 /nobreak >nul
set /a WAIT_COUNT+=2
echo Waiting... (%WAIT_COUNT%/%MAX_WAIT% seconds)

if %WAIT_COUNT% GEQ %MAX_WAIT% (
    echo ERROR: Ollama container did not start in time
    exit /b 1
)

goto wait_loop

:container_ready
timeout /t 5 /nobreak >nul

echo Pulling Ollama models...
echo This may take 10-20 minutes on first run...

docker exec %CONTAINER_NAME% ollama pull llama3.1:8b
if %ERRORLEVEL% NEQ 0 (
    echo Warning: Failed to pull llama3.1:8b
)

docker exec %CONTAINER_NAME% ollama pull nomic-embed-text
if %ERRORLEVEL% NEQ 0 (
    echo Warning: Failed to pull nomic-embed-text
)

echo Done! Models are ready.


@echo off
REM ==========================================
REM Docker Health Check for Voting System (Windows)
REM Checks container status and key endpoints.
REM Ports shown are defaults; customize in .env.
REM ==========================================

set COMPOSE_FILE=infra\docker\docker-compose.yml
set ENV_FILE=.env

echo ===========================================
echo   Voting System Health Check
echo ===========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    exit /b 1
)
echo [OK] Docker is running
echo.

echo Checking container status...
docker-compose -f %COMPOSE_FILE% --env-file %ENV_FILE% ps
echo.

echo Checking service endpoints (default ports)...
echo.

curl -sf http://localhost:3000/api/elections >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Backend API not responding
) else (
    echo [OK] Backend API responding (http://localhost:3000)
)

curl -sf http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Frontend not responding
) else (
    echo [OK] Frontend responding (http://localhost:5173)
)

curl -sf http://localhost:5174 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Admin panel not responding
) else (
    echo [OK] Admin panel responding (http://localhost:5174)
)

curl -sf http://localhost:8080 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] phpMyAdmin not responding
) else (
    echo [OK] phpMyAdmin responding (http://localhost:8080)
)

echo.
echo ===========================================
echo Health check completed!
echo ===========================================
echo.

pause

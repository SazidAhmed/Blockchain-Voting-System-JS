@echo off
REM ==========================================
REM Docker Health Check for Voting System (Windows)
REM ==========================================

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
docker-compose ps
echo.

echo Checking service endpoints...
echo.

curl -sf http://localhost:3000/api/elections >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Backend API not responding
) else (
    echo [OK] Backend API responding ^(http://localhost:3000^)
)

curl -sf http://localhost:3001/node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Blockchain node not responding
) else (
    echo [OK] Blockchain node responding ^(http://localhost:3001^)
)

curl -sf http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Frontend not responding
) else (
    echo [OK] Frontend responding ^(http://localhost:5173^)
)

curl -sf http://localhost:8080 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] phpMyAdmin not responding
) else (
    echo [OK] phpMyAdmin responding ^(http://localhost:8080^)
)

echo.
echo ===========================================
echo Health check completed!
echo ===========================================
echo.

pause

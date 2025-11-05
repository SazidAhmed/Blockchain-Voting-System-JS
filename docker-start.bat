@echo off
REM Docker Start Script for Voting System (Windows)
REM This script helps you start the entire voting system with Docker

echo ==========================================
echo University Blockchain Voting System
echo Docker Quick Start Script (Windows)
echo ==========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed!
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed!
    echo Please install Docker Compose
    pause
    exit /b 1
)

REM Check if Docker daemon is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker daemon is not running!
    echo Please start Docker Desktop
    pause
    exit /b 1
)

echo [OK] Docker is installed and running
echo.

REM Check if .env file exists
if not exist .env (
    echo [WARNING] .env file not found. Creating from .env.example...
    if exist .env.example (
        copy .env.example .env
        echo [OK] .env file created
        echo [WARNING] Please edit .env and update the JWT_SECRET and passwords!
        echo.
    ) else (
        echo [ERROR] .env.example not found!
        pause
        exit /b 1
    )
)

REM Show menu
echo What would you like to do?
echo 1) Start all services (first time)
echo 2) Start all services (already built)
echo 3) Stop all services
echo 4) View logs
echo 5) Restart services
echo 6) Clean up (remove containers and volumes)
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto build_start
if "%choice%"=="2" goto start
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto logs
if "%choice%"=="5" goto restart
if "%choice%"=="6" goto cleanup
goto invalid

:build_start
echo.
echo [INFO] Building and starting all services...
echo This may take 5-10 minutes on first run...
echo.
docker-compose up --build -d
echo.
echo [OK] All services started!
echo.
echo Services are now running:
echo   - Frontend:     http://localhost:5173
echo   - Backend API:  http://localhost:3000
echo   - Blockchain:   http://localhost:3001
echo   - phpMyAdmin:   http://localhost:8080
echo.
echo View logs with: docker-compose logs -f
goto end

:start
echo.
echo [INFO] Starting all services...
docker-compose up -d
echo.
echo [OK] All services started!
echo.
echo Services are now running:
echo   - Frontend:     http://localhost:5173
echo   - Backend API:  http://localhost:3000
echo   - Blockchain:   http://localhost:3001
echo   - phpMyAdmin:   http://localhost:8080
goto end

:stop
echo.
echo [INFO] Stopping all services...
docker-compose down
echo [OK] All services stopped!
goto end

:logs
echo.
echo [INFO] Viewing logs (Ctrl+C to exit)...
echo.
docker-compose logs -f
goto end

:restart
echo.
echo [INFO] Restarting all services...
docker-compose restart
echo [OK] All services restarted!
goto end

:cleanup
echo.
echo [WARNING] This will delete all data (database, blockchain, etc.)
set /p confirm="Are you sure? (yes/no): "
if "%confirm%"=="yes" (
    echo.
    echo [INFO] Cleaning up...
    docker-compose down -v
    echo [OK] Cleanup complete!
) else (
    echo Cancelled.
)
goto end

:invalid
echo [ERROR] Invalid choice
goto end

:end
echo.
echo ==========================================
echo For more commands, see DOCKER_SETUP.md
echo ==========================================
pause

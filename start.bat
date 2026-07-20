@echo off
setlocal enabledelayedexpansion
title CRM System

cd /d "%~dp0"

echo.
echo ============================================
echo      CRM System v1.0
echo ============================================
echo.

echo [1/3] Checking dependencies...
if not exist "crm-backend\node_modules\" (
    echo   [ERROR] Backend dependencies missing! Run: cd crm-backend ^&^& npm install
    pause
    exit /b 1
)
if not exist "crm-frontend\node_modules\" (
    echo   [ERROR] Frontend dependencies missing! Run: cd crm-frontend ^&^& npm install
    pause
    exit /b 1
)
if not exist "node_modules\.bin\concurrently.cmd" (
    echo   [ERROR] concurrently missing! Run: npm install
    pause
    exit /b 1
)
echo   Dependencies ready [OK]

echo.
echo [2/3] Checking database...

set DB_FILE=crm-backend\prisma\crm.db
set BACKUP_DIR=crm-backend\prisma\backups

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

if exist "%DB_FILE%" (
    echo   Backing up database...
    set TS=%date:~0,10%_%time:~0,2%%time:~3,2%%time:~6,2%
    set TS=!TS: =0!
    set TS=!TS:/=-!
    copy "%DB_FILE%" "%BACKUP_DIR%\crm.db.!TS!.bak" >nul 2>&1
    echo   Auto-backup created [OK]
)

:: Verify Prisma client exists
if not exist "crm-backend\node_modules\.prisma\client\index.js" (
    echo   Generating Prisma client...
    cd crm-backend
    call npx prisma generate
    if %errorlevel% neq 0 (
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

:: Initialize database if missing
if not exist "%DB_FILE%" (
    echo   Initializing database...
    cd crm-backend
    call npx prisma migrate deploy
    if %errorlevel% neq 0 (
        cd ..
        echo   [ERROR] Database migration failed
        pause
        exit /b 1
    )
    call npx tsx src/seed.ts
    cd ..
    echo   Database initialized [OK]
) else (
    echo   Database is ready [OK]
)

echo.
echo [3/3] Starting services...
echo.
echo   Backend : http://localhost:3001
echo   Frontend: http://localhost:5173
echo.
echo   Press Ctrl+C to stop all services
echo ============================================
echo.

call npx concurrently -n BE,FE -c blue,green "cd crm-backend && npx tsx src/index.ts" "cd crm-frontend && npx vite --host"

pause

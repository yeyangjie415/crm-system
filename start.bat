@echo off
setlocal enabledelayedexpansion
title CRM System

cd /d "%~dp0"

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install https://nodejs.org
    pause
    exit /b 1
)

echo.
echo ============================================
echo      CRM System v1.0
echo ============================================
echo.

echo [1/3] Checking dependencies...

if not exist "crm-backend\node_modules\" (
    echo   Installing backend dependencies...
    cd crm-backend
    call npm install
    cd ..
)
if not exist "crm-frontend\node_modules\" (
    echo   Installing frontend dependencies...
    cd crm-frontend
    call npm install
    cd ..
)
if not exist "node_modules\.bin\concurrently.cmd" (
    echo   Installing concurrently...
    call npm install
)

echo.
echo [2/3] Checking database...

set DB_FILE=crm-backend\prisma\crm.db
set BACKUP_DIR=crm-backend\prisma\backups
set VERSION_FILE=crm-backend\.version

:: Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Auto-backup: copy existing db before any operation
if exist "%DB_FILE%" (
    for /f %%i in ('wmic os get localtime ^| findstr [0-9]') do set TS=%%i
    set TS=!TS:~0,4!-!TS:~4,2!-!TS:~6,2!_!TS:~8,2!!TS:~10,2!!TS:~12,2!
    copy "%DB_FILE%" "%BACKUP_DIR%\crm.db.!TS!.bak" >nul 2>&1
    echo   Auto-backup created [OK]

    :: Clean old backups (keep 7 days)
    forfiles /p "%BACKUP_DIR%" /m "crm.db.*.bak" /d -7 /c "cmd /c del @file" >nul 2>&1
)

:: Version check: detect upgrades
set OLD_VER=
if exist "%VERSION_FILE%" set /p OLD_VER=<"%VERSION_FILE%"

for /f "tokens=2 delims=:," %%v in ('type crm-backend\package.json ^| findstr "version"') do (
    set NEW_VER=%%~v
    set NEW_VER=!NEW_VER:"=!
    set NEW_VER=!NEW_VER: =!
)

if not "!OLD_VER!"=="!NEW_VER!" (
    echo   Version changed: !OLD_VER! -^> !NEW_VER!
    if exist "%DB_FILE%" (
        echo   Creating pre-upgrade backup...
        copy "%DB_FILE%" "%BACKUP_DIR%\pre-upgrade-!OLD_VER!-!TS!.db" >nul 2>&1
        echo   Pre-upgrade backup saved [OK]
    )
    echo !NEW_VER!>"%VERSION_FILE%"
)

:: Initialize database if needed
if not exist "%DB_FILE%" (
    echo   Initializing database...
    cd crm-backend
    call npx prisma migrate deploy
    call npx tsx src/seed.ts
    cd ..
) else (
    echo   Database is ready [OK]
)

echo.
echo [3/3] Starting services...
echo.
echo   Backend : http://localhost:3001
echo   Frontend: http://localhost:5173
echo   Login   : admin / admin123
echo.
echo   Press Ctrl+C to stop all services
echo ============================================
echo.

call npx concurrently -n BE,FE -c blue,green "cd crm-backend && npx tsx src/index.ts" "cd crm-frontend && npx vite --host"

pause

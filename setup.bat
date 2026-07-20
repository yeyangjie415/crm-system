@echo off
setlocal enabledelayedexpansion
title CRM System Setup

cd /d "%~dp0"

echo ============================================
echo      CRM System v1.0 - 一键部署安装
echo ============================================
echo.

:: Step 1: Check Node.js
echo [1/5] 检测 Node.js 运行环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [INFO] 未检测到 Node.js，正在下载安装...
    echo   请稍候，自动下载 Node.js 安装包...

    :: Detect 32/64 bit
    if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
        set NODE_URL=https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi
    ) else (
        set NODE_URL=https://nodejs.org/dist/v22.14.0/node-v22.14.0-x86.msi
    )

    :: Download using PowerShell
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%TEMP%\node-install.msi'}"

    if not exist "%TEMP%\node-install.msi" (
        echo   [ERROR] 下载失败，请手动安装 Node.js
        echo   下载地址：https://nodejs.org/
        pause
        exit /b 1
    )

    echo   正在安装 Node.js（请完成安装向导后继续）...
    msiexec /i "%TEMP%\node-install.msi" /quiet /norestart
    echo   等待安装完成...
    :: Wait and refresh PATH
    waitfor SetupDone 2>nul || timeout /t 5 /nobreak >nul
    call refreshEnv.cmd 2>nul || (
        for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "PATH=%%b;%%c"
    )

    where node >nul 2>&1
    if %errorlevel% neq 0 (
        echo   [WARNING] Node.js 已安装但可能需要重启才能识别
        echo   请重启电脑后重新运行 setup.bat
        pause
        exit /b 1
    )
    echo   Node.js 安装完成
) else (
    for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
    echo   Node.js !NODE_VER! [OK]
)

:: Check Node.js version compatibility
for /f "tokens=2 delims=v." %%a in ('node -v') do set NODE_MAJOR=%%a
if !NODE_MAJOR! gtr 22 (
    echo   [WARNING] Node.js major version !NODE_MAJOR! detected. This application is tested with Node.js 22 LTS.
    echo   Some packages ^(e.g. Prisma native binaries^) may not be compatible.
    echo.
)

echo.

:: Step 2: Install dependencies
echo [2/5] 安装项目依赖...

if not exist "crm-backend\node_modules\" (
    echo   安装后端依赖...
    cd crm-backend
    call npm install --silent
    cd ..
) else (
    echo   后端依赖已安装 [OK]
)

if not exist "crm-frontend\node_modules\" (
    echo   安装前端依赖...
    cd crm-frontend
    call npm install --silent
    cd ..
) else (
    echo   前端依赖已安装 [OK]
)

if not exist "node_modules\.bin\concurrently.cmd" (
    echo   安装 concurrently...
    call npm install --silent
) else (
    echo   concurrently 已安装 [OK]
)

echo.

:: Step 3: Initialize database
echo [3/5] 初始化数据库...

:: Always regenerate Prisma client (essential for backend startup)
cd crm-backend
echo   生成 Prisma 客户端...
call npx prisma generate 2>"%TEMP%\crm-prisma-generate-error.log"
if %errorlevel% neq 0 (
    echo   [ERROR] Prisma 客户端生成失败！请检查网络连接后重试
    type "%TEMP%\crm-prisma-generate-error.log"
    cd ..
    pause
    exit /b 1
)

if not exist "prisma\crm.db" (
    echo   创建数据库...
    call npx prisma migrate deploy 2>"%TEMP%\crm-db-migrate-error.log"
    if %errorlevel% neq 0 (
        echo   [ERROR] 数据库迁移失败！
        type "%TEMP%\crm-db-migrate-error.log"
        cd ..
        pause
        exit /b 1
    )
    call npx tsx src/seed.ts 2>"%TEMP%\crm-db-seed-error.log"
    if %errorlevel% neq 0 (
        echo   [ERROR] 数据初始化失败！
        type "%TEMP%\crm-db-seed-error.log"
        cd ..
        pause
        exit /b 1
    )
    echo   数据库初始化完成
) else (
    echo   数据库已存在 [OK]
)
cd ..

echo.

:: Step 4: Create desktop shortcut
echo [4/5] 创建桌面快捷方式...

set SHORTCUT_NAME=CRM System
set STARTUP_SCRIPT=%~dp0start.bat
set ICON_PATH=%~dp0crm-frontend\public\favicon.svg

:: Use PowerShell to create shortcut
powershell -Command "& {
    $ws = New-Object -ComObject WScript.Shell;
    $sc = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\' + '%SHORTCUT_NAME%' + '.lnk');
    $sc.TargetPath = '%STARTUP_SCRIPT:\=\\%';
    $sc.WorkingDirectory = '%~dp0';
    $sc.Description = 'CRM System v1.0';
    $sc.Save();
    Write-Output '   桌面快捷方式已创建 [OK]'
}"

echo.

:: Step 5: Auto-start (optional)
echo [5/5] 开机自启（可选）...
powershell -Command "& {
    $ws = New-Object -ComObject WScript.Shell;
    $startupPath = [Environment]::GetFolderPath('Startup');
    $scPath = $startupPath + '\' + '%SHORTCUT_NAME%' + '.lnk';
    if (!(Test-Path $scPath)) {
        $sc = $ws.CreateShortcut($scPath);
        $sc.TargetPath = '%STARTUP_SCRIPT:\=\\%';
        $sc.WorkingDirectory = '%~dp0';
        $sc.Description = 'CRM System v1.0';
        $sc.Save();
        Write-Output '   已添加开机自启 [OK]';
    } else {
        Write-Output '   开机自启已存在 [OK]';
    }
}"

echo.
echo ============================================
echo      安装完成！
echo.
echo   桌面快捷方式：CRM System
echo   双击即可启动系统
echo.
echo   启动后访问：http://localhost:5173
echo   管理员账号：admin / admin123
echo.
echo   ！！！注意：首次安装后请重启电脑 ！！！
echo   让 Node.js 环境变量生效
echo ============================================
echo.

pause

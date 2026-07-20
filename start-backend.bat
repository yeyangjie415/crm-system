@echo off
title CRM Backend
cd /d "%~dp0crm-backend"
echo ============================================
echo      CRM System - Backend
echo      http://localhost:3001
echo ============================================
echo.
npx tsx src/index.ts
pause

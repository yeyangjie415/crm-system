@echo off
title CRM Frontend
cd /d "%~dp0crm-frontend"
echo ============================================
echo      CRM System - Frontend
echo      http://localhost:5173
echo ============================================
echo.
npx vite --host
pause

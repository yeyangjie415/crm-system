#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     CRM 客户关系管理系统 v1.0             ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
    echo "[错误] 未找到 Node.js，请先安装 https://nodejs.org"
    exit 1
fi

echo "[1/3] 检查依赖..."
[ ! -d "crm-backend/node_modules" ] && (cd crm-backend && npm install)
[ ! -d "crm-frontend/node_modules" ] && (cd crm-frontend && npm install)
[ ! -d "node_modules/concurrently" ] && npm install

echo ""
echo "[2/3] 检查数据库..."
if [ ! -f "crm-backend/prisma/crm.db" ]; then
    echo "   初始化数据库..."
    (cd crm-backend && npx prisma migrate deploy && npx tsx src/seed.ts)
else
    echo "   数据库已就绪 ✓"
fi

echo ""
echo "[3/3] 启动服务..."
echo ""
echo "   后端服务: http://localhost:3001"
echo "   前端页面: http://localhost:5173"
echo "   登录账号: admin / admin123"
echo ""
echo "   按 Ctrl+C 停止所有服务"
echo "═══════════════════════════════════════════"
echo ""

npx concurrently -n BE,FE -c blue,green \
    "cd crm-backend && npx tsx src/index.ts" \
    "cd crm-frontend && npx vite --host"

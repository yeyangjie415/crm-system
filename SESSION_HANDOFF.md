# CRM 系统 — 会话收尾文档

> 本文档用于新会话快速了解项目状态。当前版本：**v1.2**

---

## 项目结构

```
e:\CRM系统\
├── crm-backend/          # Express + Prisma + SQLite 后端
│   ├── src/
│   │   ├── index.ts       # Express 入口（端口 3001）
│   │   ├── routes/         # API 路由
│   │   ├── middleware/     # JWT 认证中间件
│   │   └── lib/prisma.ts   # PrismaClient 单例
│   ├── prisma/
│   │   ├── schema.prisma   # 数据模型
│   │   └── migrations/     # 迁移文件
│   └── src/seed.ts         # 种子数据
├── crm-frontend/          # React 19 + Vite 8 + Tailwind 前端
│   ├── src/
│   │   ├── hooks/          # 数据 Provider（Context）
│   │   ├── components/     # UI 组件
│   │   ├── pages/          # 页面
│   │   └── lib/api.ts      # API 客户端
│   └── vite.config.ts      # 代理 /api → localhost:3001
├── crm-launcher/          # 启动管理器（Node.js 轻量方案）
│   ├── server.js           # 主程序（端口 3002）
│   └── renderer/           # 状态面板 UI
├── installer/
│   ├── crm-installer.iss   # Inno Setup 安装脚本
│   └── CRM-System-Setup-v1.2.0.exe  # 打包好的安装包
├── start.bat               # 一键启动（启动前后端）
├── setup.bat               # 一键部署安装脚本
└── package.json            # 根（concurrently）
```

## 端口约定

| 服务 | 端口 |
|------|------|
| 后端 API | 3001 |
| 前端 Dev Server | 5173 |
| 启动管理器 | 3002 |

## 数据库

- **SQLite**：`crm-backend/prisma/crm.db`
- 修改 schema 后需要：`npx prisma migrate dev` → `npx prisma generate` → **重启后端**
- 后端新增路由后需要**重启后端**才能生效（当前非 watch 模式）

## 本次会话完成的工作（v1.0 → v1.2）

### 权限控制
- 仪表盘：统计数据按权限过滤，近期活动仅超级管理员可见
- 客户管理/项目成交/报表中心：一般用户仅显示有权限的数据
- 报销/外勤/协同办公：一般用户仅显示本人相关数据
- 提成发放：仅超级管理员可访问

### 数据持久化修复
- 所有 hook 的 mutation 改为乐观更新 + API 失败时 toast 提示
- `isBackendAvailable()` 缓存改为 30 秒过期
- 新增 `loginVersion` 触发刷新后重新加载数据
- `detailedAddress` 字段加入 Prisma schema
- `Project.createdBy` 改为存储用户姓名
- `CustomerAnnotation` 新增 `projectId` 字段（简标按项目独立存储）

### 客户列表功能
- 多项目客户：展开/收起显示所有项目（含创建人、跟进人、时间轴、金额、状态、简标列）
- 表头排序：跟进时间轴（最新/最早）、项目金额（最大/最小）
- 批量删除（报销/外勤/协同办公）
- CSV 批量导入客户

### 跟进功能
- 项目卡片新增「计划时间轴」（在跟进时间轴上方）
- 新增「添加跟进计划」功能（计划内容 + 计划日期）
- 原「下一步跟进计划」从跟进记录弹窗移到计划时间轴
- 仪表盘待办：跟进计划支持勾选完成
- 跟进记录按项目独立存储

### 部署
- `crm-launcher/` 启动管理器（自动启动前后端、状态监测、重启、开机自启）
- Inno Setup 安装包 v1.2
- `setup.bat` 一键部署安装脚本

### 登录后数据空白修复（登录管理模块）
- **根因**：后端冷启动期间登录会静默回退"离线模式"且全程无 token → 数据请求全部 401 → Provider 静默重试后放弃 → 数据空白无提示；二次登录后端已就绪故正常
- `useBackendLoad.ts`（新增）：共享加载 hook（cancelled 取消幽灵链、无 token 不发请求、重试耗尽 toast 提示、401 不重试）
- `useAuth.tsx`：登录先重试后端约 10 秒（4 次×2.5s）；仍失败才进离线模式并**明确 toast 提示**；密码被后端明确拒绝(401/403)时不回退离线；挂载时用 `getMe()` 校验恢复的会话（过期则清除并提示）；监听全局 `crm:auth-expired` 事件自动登出
- `api.ts`：错误附带 HTTP 状态码；带 token 请求收到 401 → 派发 `crm:auth-expired` 事件
- 5 个数据 Provider + UserProvider 全部换用 `useBackendLoad`；UserProvider 暴露 `reloadUsers()`（它在 AuthProvider 外层，读不到 loginVersion）；退出登录清空残留数据
- `LoginPage.tsx`：移除 600ms setTimeout；登录超 2.5s 显示"正在连接服务器…"
- `DashboardPage.tsx`：后端从故障恢复时提示"请退出并重新登录以同步数据"
- 后端 token 有效期 24h → **30d**（匹配界面"记住登录（30天有效）"）
- 新增 15 个测试（useBackendLoad 8 个 + useAuth 7 个），共 132 个全部通过

## 已知注意事项

1. **后端非 watch 模式**：`start.bat` 用 `tsx` 而非 `tsx watch`，修改后端代码后需手动重启
2. **Prisma Client**：schema 变更后需 `npx prisma generate` 且需后端进程停止才能覆盖 dll
3. **跟进计划数据格式**：计划记录 content 带 `📋 下一步计划：` 前缀，仪表盘 TaskList 依赖此格式解析
4. **简标 projectId**：新加的简标带 `projectId`，旧简标无 `projectId`（不受影响但不显示在弹窗中）
5. **类型错误已全部清理**：原 23 个预先存在的 TS 错误已修复（未使用导入/变量删除、GlassCard 新增可选 `onClick` prop、RegionSelector 去掉未用的 `required` 解构但保留接口、ReportsPage 删除未接线的 period 状态、合同测试数据补 `completed: false`），`npm run build`（tsc -b && vite build）现可通过。日常验证用 `npx tsc --noEmit -p tsconfig.app.json`（注意根 tsconfig 是空 solution，直接 `tsc --noEmit` 不检查任何文件）

## 快速验证命令

```bash
# 前端类型检查（注意：根 tsconfig 是空 solution，必须指定 -p）
cd crm-frontend && npx tsc --noEmit -p tsconfig.app.json

# 前端测试（132 个）
cd crm-frontend && npx vitest run

# 后端类型检查（存在预先存在的 req.params 类型错误，非本次引入）
cd crm-backend && npx tsc --noEmit
```

## Git 标签

```
7be42aa (HEAD -> master, tag: v1.2) CRM System v1.2
5537336 (tag: v1.0) CRM System v1.0
```

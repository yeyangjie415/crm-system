# CRM 客户关系管理系统

一套面向销售团队的前后端一体化 CRM 系统，覆盖客户、合同、回款、费用报销、拜访、任务与提成等核心业务场景，采用 React + Express + Prisma + SQLite 构建。

## 功能模块

- **客户管理**：客户档案、联系人、跟进记录、客户分配与归档
- **商机与项目**：项目/商机跟踪、阶段推进
- **合同与回款**：合同管理、回款计划、回款登记
- **费用管理**：费用申请、费用明细、报销流程
- **拜访管理**：拜访记录与关联客户
- **任务中心**：任务分派、状态跟踪、到期提醒
- **提成计算**：基于合同与回款规则的提成统计
- **报表中心**：销售、客户、回款等数据统计
- **通知与审计**：站内通知、操作审计日志
- **权限管理**：基于角色的访问控制（管理员 / 销售等）

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 19、TypeScript、Vite、React Router、Tailwind CSS |
| 后端 | Node.js、Express、TypeScript |
| 数据库 | SQLite + Prisma ORM |
| 鉴权 | JWT + bcrypt |
| 测试 | Vitest + Testing Library |

## 目录结构

```
.
├── crm-backend/          # Express + Prisma 后端
│   ├── prisma/           # 数据模型、迁移、种子数据
│   └── src/
│       ├── middleware/   # 鉴权与中间件
│       └── routes/       # 业务 API 路由
├── crm-frontend/         # React 前端
│   └── src/
│       ├── components/   # 业务组件
│       ├── hooks/        # 数据请求 Hooks
│       ├── lib/          # API 封装与工具
│       └── pages/        # 页面
├── crm-launcher/         # 桌面启动器
├── installer/            # 打包安装脚本
└── package.json          # 根目录一键启动脚本
```

## 快速开始

### 环境要求

- Node.js 20+
- npm 10+

### 安装依赖

```bash
npm run install:all
```

### 初始化数据库

```bash
npm run db:setup
```

该命令会执行 Prisma 迁移并写入种子数据。

### 启动开发环境

```bash
npm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:3001

也可以分别启动：

```bash
npm run dev:backend
npm run dev:frontend
```

### 构建

```bash
npm run build
```

### 测试

```bash
cd crm-frontend
npm test
```

## 配置说明

后端支持以下环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3001` | 后端服务端口 |
| `JWT_SECRET` | `crm-dev-secret-key-change-in-production` | JWT 签名密钥，**生产环境务必修改** |

前端通过 `crm-frontend/.env.development` / `.env.production` 配置 API 地址：

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_TITLE=CRM 管理系统
```

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。

# CRM Backend API Test Plan

## Overview
Test script to verify data persistence for the CRM backend at `http://localhost:3001`.

## Prisma Schema Key Insights
- **Database**: SQLite at `crm-backend/prisma/crm.db`
- **IDs**: All models use `String @id` — must be manually generated (UUID format)
- **All models require specific required fields** (see table below)

## Required Fields Per Model

| Model | Required Fields |
|-------|----------------|
| Customer | id, name, region, type, positioning, createdBy, createdByName, createdAt |
| Visit | id, date, salesperson, customerId, customerName, location, contact, duration |
| Expense | id, date, category, amount, hasInvoice, reason, status, submittedBy |
| Task | id, title, content, assignedBy, assignedTo, createdAt, deadline, source |
| FollowRecord | id, projectId, content, recordedBy, recordedAt |

## Authentication
- Login: `POST /api/auth/login` with `{ username, password }`
- Token format: `Authorization: Bearer <token>` (24-hour expiry)
- All data routes use `requireAuth` middleware (401 if missing/invalid)
- `GET /api/auth/me` returns user data (or 401/404)

## Expected HTTP Codes
- Login success: 200
- Auth failure: 401
- Create: 201
- Read list: 200
- Read single: 200 (404 if not found)
- Update: 200
- Hard delete: 204
- Validation/not found: 400/404
- Server error: 500

## Test Script (test-api.js)
The attached test script will run all 7 test groups sequentially:

1. **Login** — POST /api/auth/login (admin/admin123), extract token
2. **GET /api/auth/me** — verify HEAD and GET work
3. **Customer CRUD** — Create, List, Update, Hard Delete  
4. **Visits** — Create, List
5. **Expenses** — Create, List
6. **Tasks** — Create, List
7. **Follow-Records** — Create, List (with and without projectId filter)

Each step validates the response status code and reports PASS/FAIL with the exact error on failure.

## Execution
Run with Node.js:
```bash
node e:\CRM系统\crm-backend\test-api.js
```

The script checks if the backend is running first and exits cleanly with a summary table.

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissionLevel" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" TEXT NOT NULL,
    "lastLogin" TEXT,
    "disabled" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "region" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "positioning" TEXT NOT NULL,
    "customerAttribute" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "notes" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "hiddenBy" TEXT NOT NULL DEFAULT '[]',
    "deletedBy" TEXT,
    "deletedAt" TEXT,
    "provinceCode" TEXT,
    "provinceName" TEXT,
    "cityCode" TEXT,
    "cityName" TEXT,
    "districtCode" TEXT,
    "districtName" TEXT,
    "ownedBy" TEXT,
    "ownedByName" TEXT,
    "lastActivityAt" TEXT,
    "reclaimedAt" TEXT,
    "reclaimDays" INTEGER NOT NULL DEFAULT 30,
    "accessControl" TEXT NOT NULL DEFAULT '[]',
    "annotations" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "description" TEXT,
    "describedBy" TEXT,
    "customerId" TEXT NOT NULL,
    CONSTRAINT "Contact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "contactName" TEXT,
    "reportStatus" TEXT NOT NULL,
    "followStatus" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "nextFollowUp" TEXT,
    "nextFollowUpDate" TEXT,
    "createdAt" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "recordedAt" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "contractDate" TEXT NOT NULL,
    "attributedTo" TEXT NOT NULL,
    "attributedToName" TEXT NOT NULL,
    "projectAmount" REAL NOT NULL,
    "settlementAmount" REAL NOT NULL,
    "extraAmount" REAL NOT NULL,
    "extraTaxIncluded" BOOLEAN NOT NULL,
    "extraPaid" BOOLEAN NOT NULL DEFAULT false,
    "customerAttribute" TEXT NOT NULL,
    "isFirstContract" BOOLEAN NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "stampContractUploaded" BOOLEAN NOT NULL DEFAULT false,
    "invoiceUploaded" BOOLEAN NOT NULL DEFAULT false,
    "contractFile" TEXT,
    "invoiceFile" TEXT,
    "processFiles" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "paymentDate" TEXT,
    "voucherFile" TEXT,
    CONSTRAINT "Payment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArchivedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "uploadedAt" TEXT NOT NULL,
    CONSTRAINT "ArchivedFile_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "hasInvoice" BOOLEAN NOT NULL,
    "project" TEXT,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "salesperson" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "duration" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "deadline" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "targetName" TEXT,
    "detail" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "fromUserName" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "contractId" TEXT
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

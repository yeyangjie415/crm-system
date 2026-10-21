/*
  Warnings:

  - You are about to drop the column `amount` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `hasInvoice` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `project` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `submittedBy` on the `Expense` table. All the data in the column will be lost.
  - Added the required column `createdAt` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerId` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerName` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fieldworkDate` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fieldworkLocation` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `submittedById` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `submittedByName` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workContent` to the `Expense` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "expenseId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "managerId" TEXT;

-- CreateTable
CREATE TABLE "ExpenseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    CONSTRAINT "ExpenseItem_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "visitId" TEXT,
    "fieldworkDate" TEXT NOT NULL,
    "fieldworkLocation" TEXT NOT NULL,
    "workContent" TEXT NOT NULL,
    "notes" TEXT,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submittedByName" TEXT NOT NULL,
    "rejectReason" TEXT,
    "rejectedByStage" TEXT,
    "statusHistory" TEXT NOT NULL DEFAULT '[]',
    "attachments" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "Expense_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Expense" ("id", "notes", "status") SELECT "id", "notes", "status" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

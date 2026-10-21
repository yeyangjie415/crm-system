-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "comment" TEXT;
ALTER TABLE "Notification" ADD COLUMN "taskId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "deadline" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL
);
INSERT INTO "new_Task" ("assignedBy", "assignedTo", "completed", "content", "createdAt", "deadline", "id", "source", "title") SELECT "assignedBy", "assignedTo", "completed", "content", "createdAt", "deadline", "id", "source", "title" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Backfill: existing completed tasks get status='completed'
UPDATE "Task" SET status = 'completed' WHERE completed = 1;

-- AlterTable
ALTER TABLE "TaskDependency" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TaskDependency_deletedAt_idx" ON "TaskDependency"("deletedAt");

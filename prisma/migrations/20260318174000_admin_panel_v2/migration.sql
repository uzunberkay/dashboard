-- AlterEnum
ALTER TYPE "ActivityLogEvent" ADD VALUE 'BULK_USER_UPDATED';

-- AlterEnum
ALTER TYPE "ActivityLogEvent" ADD VALUE 'ADMIN_SETTINGS_UPDATED';

-- AlterEnum
ALTER TYPE "ActivityLogEvent" ADD VALUE 'ADMIN_EXPORT_CREATED';

-- AlterEnum
ALTER TYPE "ActivityLogEvent" ADD VALUE 'SAVED_VIEW_CREATED';

-- AlterEnum
ALTER TYPE "ActivityLogEvent" ADD VALUE 'SAVED_VIEW_UPDATED';

-- AlterEnum
ALTER TYPE "ActivityLogEvent" ADD VALUE 'SAVED_VIEW_DELETED';

-- CreateEnum
CREATE TYPE "AdminSettingKey" AS ENUM (
    'dashboardDefaultRange',
    'activityRetentionDays',
    'exportMaxRows',
    'dbDegradedThresholdMs',
    'dashboardCacheTtlSec',
    'systemCacheTtlSec'
);

-- CreateEnum
CREATE TYPE "AdminSavedViewScope" AS ENUM ('DASHBOARD', 'ACTIVITY', 'USERS');

-- CreateTable
CREATE TABLE "AdminSetting" (
    "key" "AdminSettingKey" NOT NULL,
    "valueJson" JSONB NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AdminSavedView" (
    "id" TEXT NOT NULL,
    "scope" "AdminSavedViewScope" NOT NULL,
    "name" TEXT NOT NULL,
    "filtersJson" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSavedView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminSavedView_scope_isDefault_updatedAt_idx" ON "AdminSavedView"("scope", "isDefault", "updatedAt");

-- CreateIndex
CREATE INDEX "AdminSavedView_createdByUserId_scope_idx" ON "AdminSavedView"("createdByUserId", "scope");

-- AddForeignKey
ALTER TABLE "AdminSetting" ADD CONSTRAINT "AdminSetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSavedView" ADD CONSTRAINT "AdminSavedView_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

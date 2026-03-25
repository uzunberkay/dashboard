BEGIN;

ALTER TYPE "UserRole" RENAME TO "UserRole_old";

CREATE TYPE "UserRole" AS ENUM ('USER', 'SUPPORT', 'ANALYST', 'OPS_ADMIN', 'SUPER_ADMIN');

ALTER TABLE "User"
  ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole"
  USING (
    CASE
      WHEN "role"::text = 'ADMIN' THEN 'SUPER_ADMIN'::"UserRole"
      ELSE "role"::text::"UserRole"
    END
  );

ALTER TABLE "User"
  ALTER COLUMN "role" SET DEFAULT 'USER';

DROP TYPE "UserRole_old";

ALTER TYPE "ActivityLogEvent" ADD VALUE IF NOT EXISTS 'APPROVAL_REQUESTED';
ALTER TYPE "ActivityLogEvent" ADD VALUE IF NOT EXISTS 'APPROVAL_APPROVED';
ALTER TYPE "ActivityLogEvent" ADD VALUE IF NOT EXISTS 'APPROVAL_REJECTED';
ALTER TYPE "ActivityLogEvent" ADD VALUE IF NOT EXISTS 'USER_NOTE_CREATED';
ALTER TYPE "ActivityLogEvent" ADD VALUE IF NOT EXISTS 'USER_SESSIONS_REVOKED';
ALTER TYPE "ActivityLogEvent" ADD VALUE IF NOT EXISTS 'RAW_EXPORT_REQUESTED';
ALTER TYPE "ActivityLogEvent" ADD VALUE IF NOT EXISTS 'RAW_EXPORT_DOWNLOADED';
ALTER TYPE "ActivityLogEvent" ADD VALUE IF NOT EXISTS 'FINANCE_REMINDER_JOB_SUCCEEDED';
ALTER TYPE "ActivityLogEvent" ADD VALUE IF NOT EXISTS 'FINANCE_REMINDER_JOB_FAILED';

CREATE TYPE "AdminApprovalActionType" AS ENUM (
  'USER_ACCOUNT_UPDATE',
  'BULK_USER_ACCOUNT_UPDATE',
  'ADMIN_SETTINGS_UPDATE',
  'RAW_USER_EXPORT'
);

CREATE TYPE "AdminApprovalRequestStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED'
);

CREATE TABLE "AdminApprovalRequest" (
  "id" TEXT NOT NULL,
  "actionType" "AdminApprovalActionType" NOT NULL,
  "status" "AdminApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',
  "payloadJson" JSONB NOT NULL,
  "reason" TEXT,
  "targetUserId" TEXT,
  "requestedByUserId" TEXT NOT NULL,
  "approvedByUserId" TEXT,
  "rejectionReason" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  "fulfillmentToken" TEXT,
  "fulfillmentExpiresAt" TIMESTAMP(3),
  "fulfilledAt" TIMESTAMP(3),

  CONSTRAINT "AdminApprovalRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminUserNote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AdminUserNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminApprovalRequest_fulfillmentToken_key" ON "AdminApprovalRequest"("fulfillmentToken");
CREATE INDEX "AdminApprovalRequest_status_expiresAt_createdAt_idx" ON "AdminApprovalRequest"("status", "expiresAt", "createdAt");
CREATE INDEX "AdminApprovalRequest_requestedByUserId_status_createdAt_idx" ON "AdminApprovalRequest"("requestedByUserId", "status", "createdAt");
CREATE INDEX "AdminApprovalRequest_targetUserId_createdAt_idx" ON "AdminApprovalRequest"("targetUserId", "createdAt");
CREATE INDEX "AdminUserNote_userId_createdAt_idx" ON "AdminUserNote"("userId", "createdAt");
CREATE INDEX "AdminUserNote_authorUserId_createdAt_idx" ON "AdminUserNote"("authorUserId", "createdAt");

ALTER TABLE "AdminApprovalRequest"
  ADD CONSTRAINT "AdminApprovalRequest_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdminApprovalRequest"
  ADD CONSTRAINT "AdminApprovalRequest_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminApprovalRequest"
  ADD CONSTRAINT "AdminApprovalRequest_approvedByUserId_fkey"
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdminUserNote"
  ADD CONSTRAINT "AdminUserNote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminUserNote"
  ADD CONSTRAINT "AdminUserNote_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

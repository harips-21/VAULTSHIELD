ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'COLLABORATOR_INVITED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'INVITATION_ACCEPTED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'INVITATION_REJECTED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'PERMISSION_CHANGED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'ACCESS_REVOKED';

CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'REVOKED');
CREATE TYPE "NotificationType" AS ENUM (
  'COLLABORATION_INVITATION',
  'PERMISSION_CHANGED',
  'ACCESS_REVOKED',
  'INVITATION_RESPONSE'
);

ALTER TABLE "document_shares" ADD COLUMN "created_by_user_id" TEXT;
ALTER TABLE "folder_shares" ADD COLUMN "created_by_user_id" TEXT;

ALTER TABLE "document_shares"
  ADD CONSTRAINT "document_shares_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folder_shares"
  ADD CONSTRAINT "folder_shares_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "document_shares_shared_with_user_id_document_id_idx" ON "document_shares"("shared_with_user_id", "document_id");
CREATE INDEX "document_shares_created_by_user_id_document_id_idx" ON "document_shares"("created_by_user_id", "document_id");
CREATE INDEX "folder_shares_shared_with_user_id_folder_id_idx" ON "folder_shares"("shared_with_user_id", "folder_id");
CREATE INDEX "folder_shares_created_by_user_id_folder_id_idx" ON "folder_shares"("created_by_user_id", "folder_id");

CREATE TABLE "collaboration_invitations" (
  "id" TEXT NOT NULL,
  "document_id" TEXT,
  "folder_id" TEXT,
  "invited_by_user_id" TEXT NOT NULL,
  "invited_user_id" TEXT NOT NULL,
  "permission" "PermissionLevel" NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "responded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "collaboration_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "collaboration_invitations_resource_check" CHECK (
    ("document_id" IS NOT NULL AND "folder_id" IS NULL) OR
    ("document_id" IS NULL AND "folder_id" IS NOT NULL)
  ),
  CONSTRAINT "collaboration_invitations_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collaboration_invitations_folder_id_fkey"
    FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collaboration_invitations_invited_by_user_id_fkey"
    FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collaboration_invitations_invited_user_id_fkey"
    FOREIGN KEY ("invited_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "collaboration_invitations_invited_user_id_status_expires_at_idx"
  ON "collaboration_invitations"("invited_user_id", "status", "expires_at");
CREATE INDEX "collaboration_invitations_invited_by_user_id_created_at_idx"
  ON "collaboration_invitations"("invited_by_user_id", "created_at");
CREATE INDEX "collaboration_invitations_document_id_invited_user_id_status_idx"
  ON "collaboration_invitations"("document_id", "invited_user_id", "status");
CREATE INDEX "collaboration_invitations_folder_id_invited_user_id_status_idx"
  ON "collaboration_invitations"("folder_id", "invited_user_id", "status");

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "actor_id" TEXT,
  "type" "NotificationType" NOT NULL,
  "message" TEXT NOT NULL,
  "document_id" TEXT,
  "folder_id" TEXT,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "notifications_user_id_read_at_created_at_idx"
  ON "notifications"("user_id", "read_at", "created_at");

CREATE TABLE "collaborator_revocations" (
  "id" TEXT NOT NULL,
  "document_id" TEXT,
  "folder_id" TEXT,
  "user_id" TEXT NOT NULL,
  "revoked_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collaborator_revocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "collaborator_revocations_resource_check" CHECK (
    ("document_id" IS NOT NULL AND "folder_id" IS NULL) OR
    ("document_id" IS NULL AND "folder_id" IS NOT NULL)
  ),
  CONSTRAINT "collaborator_revocations_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collaborator_revocations_folder_id_fkey"
    FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collaborator_revocations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collaborator_revocations_revoked_by_user_id_fkey"
    FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "collaborator_revocations_document_id_user_id_idx"
  ON "collaborator_revocations"("document_id", "user_id");
CREATE INDEX "collaborator_revocations_folder_id_user_id_idx"
  ON "collaborator_revocations"("folder_id", "user_id");

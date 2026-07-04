-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMINISTRATOR', 'SUPPORT', 'FINANCE', 'MODERATOR');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ProviderDecisionAction" AS ENUM ('APPROVE', 'REJECT', 'BLOCK', 'UNBLOCK');

-- AlterTable
ALTER TABLE "prestadores"
ADD COLUMN "status" "ProviderStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "status_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Deterministic compatibility mapping for existing rows.
UPDATE "prestadores"
SET "status" = CASE
  WHEN "verificado" = true THEN 'APPROVED'::"ProviderStatus"
  ELSE 'PENDING'::"ProviderStatus"
END;

ALTER TABLE "prestadores"
ADD CONSTRAINT "prestadores_status_verified_sync_check"
CHECK ("verificado" = ("status" = 'APPROVED'::"ProviderStatus"));

-- CreateTable
CREATE TABLE "admin_users" (
  "id" BIGSERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT,
  "role" "AdminRole" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "token_version" INTEGER NOT NULL DEFAULT 0,
  "invitation_token_hash" TEXT,
  "invitation_expires_at" TIMESTAMP(3),
  "activated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_decisions" (
  "id" BIGSERIAL NOT NULL,
  "provider_id" BIGINT NOT NULL,
  "action" "ProviderDecisionAction" NOT NULL,
  "from_status" "ProviderStatus" NOT NULL,
  "to_status" "ProviderStatus" NOT NULL,
  "reason" TEXT,
  "actor_admin_id" BIGINT NOT NULL,
  "actor_role" "AdminRole" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "provider_decisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "provider_decisions_reason_required_check" CHECK ("action" = 'APPROVE'::"ProviderDecisionAction" OR "reason" IS NOT NULL)
);

-- CreateTable
CREATE TABLE "audit_logs" (
  "id" BIGSERIAL NOT NULL,
  "actor_admin_id" BIGINT NOT NULL,
  "actor_role" "AdminRole" NOT NULL,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "reason" TEXT,
  "request_id" TEXT NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
CREATE INDEX "admin_users_active_role_idx" ON "admin_users"("active", "role");
CREATE INDEX "prestadores_status_created_at_idx" ON "prestadores"("status", "created_at");
CREATE INDEX "prestadores_status_changed_at_idx" ON "prestadores"("status_changed_at");
CREATE INDEX "provider_decisions_provider_id_created_at_idx" ON "provider_decisions"("provider_id", "created_at");
CREATE INDEX "provider_decisions_actor_admin_id_created_at_idx" ON "provider_decisions"("actor_admin_id", "created_at");
CREATE INDEX "provider_decisions_action_created_at_idx" ON "provider_decisions"("action", "created_at");
CREATE INDEX "audit_logs_actor_admin_id_created_at_idx" ON "audit_logs"("actor_admin_id", "created_at");
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs"("request_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "provider_decisions"
ADD CONSTRAINT "provider_decisions_provider_id_fkey"
FOREIGN KEY ("provider_id") REFERENCES "prestadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "provider_decisions"
ADD CONSTRAINT "provider_decisions_actor_admin_id_fkey"
FOREIGN KEY ("actor_admin_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
ADD CONSTRAINT "audit_logs_actor_admin_id_fkey"
FOREIGN KEY ("actor_admin_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

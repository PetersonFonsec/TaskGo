ALTER TABLE "provider_payout_profiles" ADD COLUMN "pix_key" TEXT, ADD COLUMN "pix_key_type" TEXT;
ALTER TABLE "pagamentos"
  ADD COLUMN "settlement_strategy" TEXT NOT NULL DEFAULT 'LEGACY_SPLIT',
  ADD COLUMN "settlement_destination" JSONB,
  ADD COLUMN "refund_requested_at" TIMESTAMP(3),
  ADD COLUMN "settlement_blocked_at" TIMESTAMP(3);
ALTER TABLE "pagamentos" ALTER COLUMN "provider" SET DEFAULT 'ABACATEPAY';
ALTER TABLE "pagamentos" ALTER COLUMN "settlement_strategy" SET DEFAULT 'PIX_TRANSFER';
ALTER TABLE "payment_attempts" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'PAGARME', ADD COLUMN "submitted_at" TIMESTAMP(3);
ALTER TABLE "payment_attempts" ALTER COLUMN "provider" SET DEFAULT 'ABACATEPAY';
CREATE TABLE "payment_settlements" (
  "payment_id" BIGINT PRIMARY KEY REFERENCES "pagamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "strategy" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'READY',
  "amount_cents" INTEGER NOT NULL CHECK ("amount_cents" >= 100),
  "destination" JSONB NOT NULL,
  "external_id" TEXT NOT NULL UNIQUE,
  "transfer_id" TEXT UNIQUE,
  "submitted_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "settlement_status" CHECK ("status" IN ('READY','SUBMITTING','PENDING','SUCCEEDED','FAILED','REVIEW','BLOCKED'))
);
CREATE INDEX "payment_settlements_status_updated_at_idx" ON "payment_settlements"("status", "updated_at");

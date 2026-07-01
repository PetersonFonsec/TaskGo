ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PENDENTE';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'AUTORIZADO';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PAGO';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'FALHOU';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELADO';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REEMBOLSADO';

ALTER TABLE "pagamentos"
ADD COLUMN "authorized_at" TIMESTAMP(3),
ADD COLUMN "captured_at" TIMESTAMP(3),
ADD COLUMN "canceled_at" TIMESTAMP(3),
ADD COLUMN "refunded_at" TIMESTAMP(3),
ADD COLUMN "failure_reason" TEXT,
ADD COLUMN "payment_url" TEXT,
ADD COLUMN "raw_provider_response" JSONB;

CREATE TABLE "payment_webhook_events" (
    "id" TEXT NOT NULL,
    "payment_id" BIGINT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_webhook_events_payment_id_idx" ON "payment_webhook_events"("payment_id");
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_payment_id_fkey"
FOREIGN KEY ("payment_id") REFERENCES "pagamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

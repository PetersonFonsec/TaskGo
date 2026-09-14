CREATE TABLE "payment_attempts" (
  "order_id" BIGINT PRIMARY KEY REFERENCES "pedidos"("id") ON DELETE RESTRICT,
  "idempotency_key" TEXT NOT NULL UNIQUE,
  "method" "PaymentMethod" NOT NULL,
  "request" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "payment_webhook_events" ALTER COLUMN "processed_at" DROP NOT NULL;
ALTER TABLE "payment_webhook_events" ALTER COLUMN "processed_at" DROP DEFAULT;

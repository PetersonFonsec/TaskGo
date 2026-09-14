ALTER TABLE "OrderDispute" ADD COLUMN "openedById" BIGINT, ADD COLUMN "resolvedById" BIGINT, ADD COLUMN "resolution" TEXT, ADD COLUMN "resolvedAt" TIMESTAMP(3);
CREATE INDEX "OrderDispute_orderId_status_idx" ON "OrderDispute"("orderId", "status");

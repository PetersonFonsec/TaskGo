CREATE TYPE "OrderCancellationReason" AS ENUM ('NO_AVAILABILITY', 'OUT_OF_AREA', 'SERVICE_NOT_OFFERED', 'OTHER');
ALTER TABLE "pedidos" ADD COLUMN "cancellation_reason" "OrderCancellationReason", ADD COLUMN "cancellation_note" TEXT;

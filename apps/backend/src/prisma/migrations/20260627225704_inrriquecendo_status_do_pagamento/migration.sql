/*
  Warnings:

  - The values [PENDENTE,PAGO,FALHOU,CANCELADO] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'RELEASED', 'REFUNDED', 'FAILED', 'CANCELED');
ALTER TABLE "pagamentos" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
COMMIT;

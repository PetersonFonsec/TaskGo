/*
  Warnings:

  - A unique constraint covering the columns `[provider_order_id]` on the table `pagamentos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[provider_charge_id]` on the table `pagamentos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pagarme_recipient_id]` on the table `prestadores` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELADO';

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "platform_fee_pct" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "pagamentos" ADD COLUMN     "fee_pct" DECIMAL(65,30),
ADD COLUMN     "pix_expires_at" TIMESTAMP(3),
ADD COLUMN     "pix_qrcode" TEXT,
ADD COLUMN     "pix_qrcode_base64" TEXT,
ADD COLUMN     "platform_amount" DECIMAL(65,30),
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'PAGARME',
ADD COLUMN     "provider_amount" DECIMAL(65,30),
ADD COLUMN     "provider_charge_id" TEXT,
ADD COLUMN     "provider_order_id" TEXT;

-- AlterTable
ALTER TABLE "prestadores" ADD COLUMN     "pagarme_recipient_id" TEXT;

-- AlterTable
ALTER TABLE "servicos" ADD COLUMN     "platform_fee_pct" DECIMAL(65,30);

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_provider_order_id_key" ON "pagamentos"("provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_provider_charge_id_key" ON "pagamentos"("provider_charge_id");

-- CreateIndex
CREATE UNIQUE INDEX "prestadores_pagarme_recipient_id_key" ON "prestadores"("pagarme_recipient_id");

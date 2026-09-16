/*
  Warnings:

  - You are about to drop the column `clientConfirmedAt` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `providerFinishedAt` on the `usuarios` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_attempts" DROP CONSTRAINT "payment_attempts_order_id_fkey";

-- AlterTable
ALTER TABLE "provider_payout_profiles" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "clientConfirmedAt",
DROP COLUMN "providerFinishedAt";

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

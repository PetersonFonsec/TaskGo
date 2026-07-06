/*
  Warnings:

  - Added the required column `preco_ajustado` to the `pedidos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "estimatedPrice" DECIMAL(65,30),
ADD COLUMN     "motivo_ajuste_preco" TEXT,
ADD COLUMN     "preco_ajustado" BOOLEAN NOT NULL DEFAULT false;

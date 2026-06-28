-- CreateEnum
CREATE TYPE "OrderEventType" AS ENUM ('REQUESTED', 'ACCEPTED', 'PAYMENT_AUTHORIZED', 'PROVIDER_ON_THE_WAY', 'SERVICE_STARTED', 'PRICE_UPDATED', 'SERVICE_FINISHED', 'CLIENT_CONFIRMED', 'PAYMENT_CAPTURED', 'PAYMENT_RELEASED', 'CANCELED');

-- CreateEnum
CREATE TYPE "OrderPhotoType" AS ENUM ('BEFORE', 'AFTER', 'RECEIPT', 'DAMAGE');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "clientConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "providerFinishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "historico_pedido" (
    "id" BIGSERIAL NOT NULL,
    "pedido_id" BIGINT NOT NULL,
    "event" "OrderEventType" NOT NULL,
    "description" TEXT,
    "createdBy" "UserType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historico_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencia_pedido_executado" (
    "id" BIGSERIAL NOT NULL,
    "pedido_id" BIGINT NOT NULL,
    "uploadedBy" "UserType" NOT NULL,
    "url" TEXT NOT NULL,
    "type" "OrderPhotoType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidencia_pedido_executado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "historico_pedido_pedido_id_key" ON "historico_pedido"("pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "evidencia_pedido_executado_pedido_id_key" ON "evidencia_pedido_executado"("pedido_id");

-- AddForeignKey
ALTER TABLE "historico_pedido" ADD CONSTRAINT "historico_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia_pedido_executado" ADD CONSTRAINT "evidencia_pedido_executado_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

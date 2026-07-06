/*
  Warnings:

  - The values [PENDENTE,CONFIRMADO] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('AGUARDANDO_APROVACAO', 'REJEITADO', 'AGUARDANDO_PAGAMENTO', 'AGENDADO', 'EM_DESLOCAMENTO', 'EM_ANDAMENTO', 'AGUARDANDO_CONFIRMACAO_CLIENTE', 'CONCLUIDO', 'CANCELADO', 'DISPUTA');
ALTER TABLE "pedidos" ALTER COLUMN "status" TYPE "OrderStatus_new" USING (
  CASE "status"::text
    WHEN 'PENDENTE' THEN 'AGUARDANDO_APROVACAO'
    WHEN 'CONFIRMADO' THEN 'AGENDADO'
    ELSE "status"::text
  END::"OrderStatus_new"
);
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
COMMIT;

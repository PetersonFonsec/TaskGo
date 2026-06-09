-- AlterTable
ALTER TABLE "prestadores" ADD COLUMN     "aceitaCartao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aceitaEmergencia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aceitaPix" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disponivel24h" BOOLEAN NOT NULL DEFAULT false;

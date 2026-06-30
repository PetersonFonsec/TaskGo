ALTER TABLE "pedidos"
ADD COLUMN "provider_finished_at" TIMESTAMP(3);

ALTER TABLE "pedidos" ALTER COLUMN "preco_ajustado" SET DEFAULT false;

DROP INDEX IF EXISTS "historico_pedido_pedido_id_key";
DROP INDEX IF EXISTS "evidencia_pedido_executado_pedido_id_key";

CREATE INDEX "historico_pedido_pedido_id_idx" ON "historico_pedido"("pedido_id");
CREATE INDEX "evidencia_pedido_executado_pedido_id_idx" ON "evidencia_pedido_executado"("pedido_id");

CREATE TABLE "order_completions" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "completed_by_provider_at" TIMESTAMP(3),
    "confirmed_by_client_at" TIMESTAMP(3),
    "provider_notes" TEXT,
    "client_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "order_completions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_completions_order_id_key" ON "order_completions"("order_id");
ALTER TABLE "order_completions" ADD CONSTRAINT "order_completions_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

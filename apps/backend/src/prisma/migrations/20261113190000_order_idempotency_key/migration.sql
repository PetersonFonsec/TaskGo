-- Idempotência da criação de pedidos: o app envia uma chave por tentativa e,
-- se a resposta se perder, repete a mesma chave para receber o pedido original.
-- Coluna opcional: pedidos existentes e o site (que não envia chave) seguem iguais.
ALTER TABLE "pedidos" ADD COLUMN "idempotency_key" TEXT;
CREATE UNIQUE INDEX "pedidos_cliente_id_idempotency_key_key" ON "pedidos"("cliente_id", "idempotency_key");

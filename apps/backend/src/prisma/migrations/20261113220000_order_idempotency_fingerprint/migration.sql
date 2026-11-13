-- Impressão digital da intenção de criação ligada à Idempotency-Key (nula em pedidos sem chave).
ALTER TABLE "pedidos" ADD COLUMN "idempotency_fingerprint" TEXT;

-- CreateTable
CREATE TABLE "client_favorites" (
    "id" BIGSERIAL NOT NULL,
    "cliente_id" BIGINT NOT NULL,
    "prestador_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_favorites_cliente_id_idx" ON "client_favorites"("cliente_id");

-- CreateIndex
CREATE INDEX "client_favorites_cliente_id_prestador_id_idx" ON "client_favorites"("cliente_id", "prestador_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_favorites_cliente_id_prestador_id_key" ON "client_favorites"("cliente_id", "prestador_id");

-- AddForeignKey
ALTER TABLE "client_favorites" ADD CONSTRAINT "client_favorites_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_favorites" ADD CONSTRAINT "client_favorites_prestador_id_fkey" FOREIGN KEY ("prestador_id") REFERENCES "prestadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

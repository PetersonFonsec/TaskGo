CREATE TABLE "notificacoes" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "pedido_id" BIGINT,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "lida_em" TIMESTAMP(3),
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notificacoes_usuario_id_lida_em_criada_em_idx"
ON "notificacoes"("usuario_id", "lida_em", "criada_em");

ALTER TABLE "notificacoes"
ADD CONSTRAINT "notificacoes_usuario_id_fkey"
FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

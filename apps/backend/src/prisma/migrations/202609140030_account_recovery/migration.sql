ALTER TABLE "usuarios" ADD COLUMN "password_changed_at" TIMESTAMP(3);
CREATE TABLE "password_reset_tokens" (
  "token_hash" TEXT PRIMARY KEY,
  "user_id" BIGINT NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

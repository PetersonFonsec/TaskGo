-- Liga o aparelho à sessão (família do refresh token) que o registrou, para
-- que o logout dessa sessão desvincule o aparelho. Registros existentes
-- ficam sem sessão e continuam removíveis por DELETE /devices/:token.
ALTER TABLE "device_tokens" ADD COLUMN "session_family_id" TEXT;
CREATE INDEX "device_tokens_session_family_id_idx" ON "device_tokens"("session_family_id");

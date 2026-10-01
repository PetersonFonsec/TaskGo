ALTER TABLE admin_users ADD COLUMN last_mfa_step INTEGER NOT NULL DEFAULT -1;
CREATE TABLE security_rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at TIMESTAMP(3) NOT NULL);
CREATE INDEX security_rate_limits_expires_idx ON security_rate_limits(expires_at);
CREATE TABLE security_challenges (key TEXT PRIMARY KEY, user_id BIGINT NOT NULL, type TEXT NOT NULL, target TEXT NOT NULL, token_hash TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, expires_at TIMESTAMP(3) NOT NULL);
CREATE INDEX security_challenges_expires_idx ON security_challenges(expires_at);
ALTER TABLE pedidos ADD COLUMN reservation_expires_at TIMESTAMP(3);
UPDATE pedidos SET reservation_expires_at = NOW() + interval '15 minutes' WHERE status IN ('AGUARDANDO_APROVACAO', 'AGUARDANDO_PAGAMENTO');
CREATE INDEX pedidos_reservation_expiry_idx ON pedidos(status, reservation_expires_at);
ALTER TABLE payment_attempts ADD CONSTRAINT payment_attempts_order_id_fkey FOREIGN KEY (order_id) REFERENCES pedidos(id) ON DELETE RESTRICT NOT VALID;

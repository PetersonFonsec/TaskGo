-- The provider insertion trigger creates payout profiles without updated_at.
-- @updatedAt only runs in Prisma, so these SQL inserts also need a DB default.
ALTER TABLE "provider_payout_profiles"
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

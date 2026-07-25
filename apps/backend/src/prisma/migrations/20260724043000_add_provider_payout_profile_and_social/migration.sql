-- CreateEnum
CREATE TYPE "ProviderPayoutSyncStatus" AS ENUM (
  'NOT_CONFIGURED',
  'PENDING',
  'READY',
  'REJECTED',
  'UNKNOWN'
);

-- CreateEnum
CREATE TYPE "ProviderBankAccountStatus" AS ENUM (
  'UNCONFIRMED',
  'PROCESSING',
  'CONFIRMED',
  'ERROR'
);

-- AlterTable
ALTER TABLE "prestadores"
ADD COLUMN "whatsapp" TEXT,
ADD COLUMN "instagram" TEXT,
ADD COLUMN "facebook" TEXT,
ADD COLUMN "linkedin" TEXT;

-- CreateTable
CREATE TABLE "provider_payout_profiles" (
  "provider_id" BIGINT NOT NULL,
  "pagarme_recipient_id" TEXT,
  "sync_status" "ProviderPayoutSyncStatus" NOT NULL DEFAULT 'UNKNOWN',
  "bank_account_status" "ProviderBankAccountStatus" NOT NULL DEFAULT 'UNCONFIRMED',
  "bank_name" TEXT,
  "bank_code" TEXT,
  "branch_last_digits" TEXT,
  "account_last_digits" TEXT,
  "last_synchronized_at" TIMESTAMP(3),
  "last_error_code" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "provider_payout_profiles_pkey" PRIMARY KEY ("provider_id")
);

-- Preserve legacy recipient identifiers without inferring readiness.
INSERT INTO "provider_payout_profiles" (
  "provider_id",
  "pagarme_recipient_id",
  "sync_status",
  "bank_account_status"
)
SELECT
  "id",
  "pagarme_recipient_id",
  'UNKNOWN'::"ProviderPayoutSyncStatus",
  'UNCONFIRMED'::"ProviderBankAccountStatus"
FROM "prestadores";

-- CreateIndex
CREATE UNIQUE INDEX "provider_payout_profiles_pagarme_recipient_id_key"
ON "provider_payout_profiles"("pagarme_recipient_id");

-- AddForeignKey
ALTER TABLE "provider_payout_profiles"
ADD CONSTRAINT "provider_payout_profiles_provider_id_fkey"
FOREIGN KEY ("provider_id") REFERENCES "prestadores"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Every provider insertion receives an explicit safe payout state, including
-- legacy fixtures that still write pagarme_recipient_id on prestadores.
CREATE FUNCTION "create_default_provider_payout_profile"()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "provider_payout_profiles" (
    "provider_id",
    "pagarme_recipient_id",
    "sync_status",
    "bank_account_status"
  )
  VALUES (
    NEW."id",
    NEW."pagarme_recipient_id",
    'UNKNOWN',
    'UNCONFIRMED'
  )
  ON CONFLICT ("provider_id") DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "prestadores_create_default_payout_profile"
AFTER INSERT ON "prestadores"
FOR EACH ROW
EXECUTE FUNCTION "create_default_provider_payout_profile"();

-- Keep the legacy recipient column as a compatibility shadow while the payout
-- profile remains the authoritative writable model for subsequent tasks.
CREATE FUNCTION "mirror_payout_recipient_to_legacy_provider"()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "prestadores"
  SET "pagarme_recipient_id" = NEW."pagarme_recipient_id"
  WHERE "id" = NEW."provider_id"
    AND "pagarme_recipient_id" IS DISTINCT FROM NEW."pagarme_recipient_id";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "provider_payout_profiles_mirror_legacy_recipient"
AFTER INSERT OR UPDATE OF "pagarme_recipient_id"
ON "provider_payout_profiles"
FOR EACH ROW
EXECUTE FUNCTION "mirror_payout_recipient_to_legacy_provider"();

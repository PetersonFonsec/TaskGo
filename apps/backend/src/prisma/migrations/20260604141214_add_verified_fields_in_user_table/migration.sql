-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pending_email" TEXT,
ADD COLUMN     "pending_phone" TEXT,
ADD COLUMN     "phone_verified" BOOLEAN NOT NULL DEFAULT false;

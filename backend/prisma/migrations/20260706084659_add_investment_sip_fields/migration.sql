-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "isSip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sipAmount" DOUBLE PRECISION;

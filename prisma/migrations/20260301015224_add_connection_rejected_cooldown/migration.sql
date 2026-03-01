-- AlterEnum
ALTER TYPE "ConnectionStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Connection" ADD COLUMN     "cooldownUntil" TIMESTAMP(3);

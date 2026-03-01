-- AlterTable
ALTER TABLE "JamSession" ADD COLUMN     "cancellationPolicy" JSONB,
ADD COLUMN     "ticketPriceYen" INTEGER;

-- AlterTable
ALTER TABLE "JamSessionRegistration" ADD COLUMN     "paidAmountYen" INTEGER,
ADD COLUMN     "paymentIntentId" TEXT,
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "refundedAmountYen" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeAccountId" TEXT;

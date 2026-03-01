-- CreateTable
CREATE TABLE "VenueVerificationCode" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "claimerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueVerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenueVerificationCode_venueId_claimerId_idx" ON "VenueVerificationCode"("venueId", "claimerId");

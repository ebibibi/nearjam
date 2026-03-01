-- AlterTable
ALTER TABLE "JamSession" ADD COLUMN     "sessionSeriesId" TEXT;

-- CreateTable
CREATE TABLE "SessionSeries" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "venueId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rrule" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 120,
    "format" "SessionFormat" NOT NULL DEFAULT 'OPEN',
    "maxParticipants" INTEGER,
    "isSyncroom" BOOLEAN NOT NULL DEFAULT false,
    "moodFlags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueImpersonationReport" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueImpersonationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostAvailability" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "venueId" TEXT,
    "availableDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 120,
    "songIds" TEXT[],
    "instruments" TEXT[],
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionSeries_hostId_idx" ON "SessionSeries"("hostId");

-- CreateIndex
CREATE INDEX "SessionSeries_venueId_idx" ON "SessionSeries"("venueId");

-- CreateIndex
CREATE INDEX "VenueImpersonationReport_venueId_idx" ON "VenueImpersonationReport"("venueId");

-- CreateIndex
CREATE INDEX "VenueImpersonationReport_status_idx" ON "VenueImpersonationReport"("status");

-- CreateIndex
CREATE INDEX "HostAvailability_hostId_idx" ON "HostAvailability"("hostId");

-- CreateIndex
CREATE INDEX "HostAvailability_availableDate_idx" ON "HostAvailability"("availableDate");

-- AddForeignKey
ALTER TABLE "JamSession" ADD CONSTRAINT "JamSession_sessionSeriesId_fkey" FOREIGN KEY ("sessionSeriesId") REFERENCES "SessionSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSeries" ADD CONSTRAINT "SessionSeries_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSeries" ADD CONSTRAINT "SessionSeries_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

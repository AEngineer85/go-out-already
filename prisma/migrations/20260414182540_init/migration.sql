-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "refreshToken" TEXT,
    "defaultRadiusMiles" INTEGER NOT NULL DEFAULT 25,
    "defaultReminderMinutes" INTEGER NOT NULL DEFAULT 1440,
    "alertEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "locationName" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "sourceUrl" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "additionalSources" JSONB,
    "tags" TEXT[],
    "fingerprintHash" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "crawledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedToCalendar" BOOLEAN NOT NULL DEFAULT false,
    "calendarEventId" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlLog" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "sourcesTotal" INTEGER NOT NULL DEFAULT 0,
    "sourcesSuccess" INTEGER NOT NULL DEFAULT 0,
    "eventsFound" INTEGER NOT NULL DEFAULT 0,
    "eventsNew" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CrawlLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Event_fingerprintHash_key" ON "Event"("fingerprintHash");

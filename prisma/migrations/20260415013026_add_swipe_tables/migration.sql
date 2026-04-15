-- CreateTable
CREATE TABLE "SwipeAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwipeAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTagPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "swipeCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTagPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSourcePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "swipeCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSourcePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SwipeAction_userId_idx" ON "SwipeAction"("userId");

-- CreateIndex
CREATE INDEX "SwipeAction_userId_direction_idx" ON "SwipeAction"("userId", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "SwipeAction_userId_eventId_key" ON "SwipeAction"("userId", "eventId");

-- CreateIndex
CREATE INDEX "UserTagPreference_userId_idx" ON "UserTagPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTagPreference_userId_tag_key" ON "UserTagPreference"("userId", "tag");

-- CreateIndex
CREATE INDEX "UserSourcePreference_userId_idx" ON "UserSourcePreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSourcePreference_userId_sourceName_key" ON "UserSourcePreference"("userId", "sourceName");

-- AddForeignKey
ALTER TABLE "SwipeAction" ADD CONSTRAINT "SwipeAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwipeAction" ADD CONSTRAINT "SwipeAction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTagPreference" ADD CONSTRAINT "UserTagPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSourcePreference" ADD CONSTRAINT "UserSourcePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

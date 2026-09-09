-- CreateTable
CREATE TABLE "smtp_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fromName" TEXT NOT NULL DEFAULT 'Event Ticketing',
    "fromEmail" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByEmail" TEXT,

    CONSTRAINT "smtp_settings_pkey" PRIMARY KEY ("id")
);

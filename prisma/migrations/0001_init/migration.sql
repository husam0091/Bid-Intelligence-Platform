-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ESTIMATOR', 'MANAGER', 'EXECUTIVE', 'ADMIN');
CREATE TYPE "ProjectType" AS ENUM ('BUILDING', 'INFRASTRUCTURE', 'INDUSTRIAL');
CREATE TYPE "ProjectSize" AS ENUM ('MEDIUM_SMALL', 'LARGE', 'MEGA');
CREATE TYPE "TenderType" AS ENUM ('OPEN', 'LIMITED', 'NEGOTIATED');
CREATE TYPE "ClientCategory" AS ENUM ('GOV', 'PRIVATE', 'SEMI');
CREATE TYPE "Outcome" AS ENUM ('WON', 'LOST', 'PENDING', 'REJECTED');
CREATE TYPE "Decision" AS ENUM ('GO', 'REVIEW', 'NO_GO');
CREATE TYPE "RiskIndex" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "PipelineStatus" AS ENUM ('ACTIVE', 'AWAITING');

-- CreateTable: Org
CREATE TABLE "Org" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Org_slug_key" ON "Org"("slug");

-- CreateTable: User
CREATE TABLE "User" (
    "id"           TEXT NOT NULL,
    "orgId"        TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "email"        TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role"         "Role" NOT NULL DEFAULT 'ESTIMATOR',
    "active"       BOOLEAN NOT NULL DEFAULT true,
    "mustChange"   BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable: Bid
CREATE TABLE "Bid" (
    "id"             TEXT NOT NULL,
    "sr"             INTEGER NOT NULL,
    "orgId"          TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "location"       TEXT NOT NULL,
    "type"           "ProjectType" NOT NULL,
    "size"           "ProjectSize" NOT NULL,
    "duration"       TEXT NOT NULL,
    "tenderType"     "TenderType" NOT NULL,
    "clientCategory" "ClientCategory" NOT NULL,
    "consultant"     TEXT NOT NULL DEFAULT '',
    "pmc"            TEXT NOT NULL DEFAULT '',
    "estValue"       DOUBLE PRECISION NOT NULL,
    "contractValue"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualSpend"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "date"           TIMESTAMP(3) NOT NULL,
    "bidDate"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome"        "Outcome" NOT NULL DEFAULT 'PENDING',
    "pipelineStatus" "PipelineStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks"        TEXT NOT NULL DEFAULT '',
    "links"          TEXT NOT NULL DEFAULT '',
    "grossMarginPct" DOUBLE PRECISION,
    "mainCompetitor" TEXT NOT NULL DEFAULT '',
    "relStrength"    INTEGER NOT NULL DEFAULT 0,
    "budgetKnown"    INTEGER NOT NULL DEFAULT 0,
    "competitors"    INTEGER NOT NULL DEFAULT 0,
    "limitedInv"     INTEGER NOT NULL DEFAULT 0,
    "similarExp"     INTEGER NOT NULL DEFAULT 0,
    "noPriceBreakers" INTEGER NOT NULL DEFAULT 0,
    "techAdv"        INTEGER NOT NULL DEFAULT 0,
    "withinExpertise" INTEGER NOT NULL DEFAULT 0,
    "lowChanges"     INTEGER NOT NULL DEFAULT 0,
    "goodLocation"   INTEGER NOT NULL DEFAULT 0,
    "teamAvail"      INTEGER NOT NULL DEFAULT 0,
    "equipAvail"     INTEGER NOT NULL DEFAULT 0,
    "cashFlow"       INTEGER NOT NULL DEFAULT 0,
    "currWorkload"   INTEGER NOT NULL DEFAULT 0,
    "noImpactRunning" INTEGER NOT NULL DEFAULT 0,
    "ld"             INTEGER NOT NULL DEFAULT 0,
    "apg"            INTEGER NOT NULL DEFAULT 0,
    "perfBond"       INTEGER NOT NULL DEFAULT 0,
    "retention"      INTEGER NOT NULL DEFAULT 0,
    "newSystem"      INTEGER NOT NULL DEFAULT 0,
    "complexMEP"     INTEGER NOT NULL DEFAULT 0,
    "specialAuth"    INTEGER NOT NULL DEFAULT 0,
    "clientRep"      INTEGER NOT NULL DEFAULT 0,
    "clearDwgs"      INTEGER NOT NULL DEFAULT 0,
    "advPayment"     INTEGER NOT NULL DEFAULT 0,
    "payments"       INTEGER NOT NULL DEFAULT 0,
    "finDuration"    INTEGER NOT NULL DEFAULT 0,
    "totalScore"     INTEGER NOT NULL DEFAULT 0,
    "riskIndex"      "RiskIndex" NOT NULL DEFAULT 'HIGH',
    "decision"       "Decision" NOT NULL DEFAULT 'NO_GO',
    "expectWin"      DOUBLE PRECISION NOT NULL DEFAULT 0.09,
    "hardStop"       BOOLEAN NOT NULL DEFAULT false,
    "createdBy"      TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Bid_orgId_sr_key" ON "Bid"("orgId", "sr");
CREATE INDEX "Bid_orgId_outcome_idx" ON "Bid"("orgId", "outcome");
CREATE INDEX "Bid_orgId_decision_idx" ON "Bid"("orgId", "decision");
CREATE INDEX "Bid_orgId_date_idx" ON "Bid"("orgId", "date");

-- CreateTable: AiCache
CREATE TABLE "AiCache" (
    "id"        TEXT NOT NULL,
    "bidId"     TEXT NOT NULL,
    "lang"      TEXT NOT NULL,
    "feature"   TEXT NOT NULL,
    "cacheKey"  TEXT NOT NULL,
    "response"  TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiCache_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AiCache_cacheKey_key" ON "AiCache"("cacheKey");

-- AddForeignKey
ALTER TABLE "User"    ADD CONSTRAINT "User_orgId_fkey"     FOREIGN KEY ("orgId")     REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Bid"     ADD CONSTRAINT "Bid_orgId_fkey"      FOREIGN KEY ("orgId")     REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Bid"     ADD CONSTRAINT "Bid_createdBy_fkey"  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiCache" ADD CONSTRAINT "AiCache_bidId_fkey"  FOREIGN KEY ("bidId")     REFERENCES "Bid"("id")  ON DELETE CASCADE ON UPDATE CASCADE;

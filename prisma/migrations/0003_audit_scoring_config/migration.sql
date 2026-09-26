-- CreateTable: ScoringConfig
CREATE TABLE "ScoringConfig" (
    "id"         TEXT NOT NULL,
    "orgId"      TEXT NOT NULL,
    "goMin"      INTEGER NOT NULL DEFAULT 80,
    "reviewMin"  INTEGER NOT NULL DEFAULT 65,
    "cfrFlagMin" INTEGER NOT NULL DEFAULT 13,
    "winBands"   JSONB NOT NULL,
    "updatedBy"  TEXT,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScoringConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ScoringConfig_orgId_key" ON "ScoringConfig"("orgId");
ALTER TABLE "ScoringConfig" ADD CONSTRAINT "ScoringConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
    "id"        TEXT NOT NULL,
    "orgId"     TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "userName"  TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "action"    TEXT NOT NULL,
    "entity"    TEXT NOT NULL,
    "entityId"  TEXT,
    "bidSr"     INTEGER,
    "summary"   TEXT NOT NULL DEFAULT '',
    "changes"   JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");
CREATE INDEX "AuditLog_orgId_userId_idx" ON "AuditLog"("orgId", "userId");
CREATE INDEX "AuditLog_orgId_bidSr_idx" ON "AuditLog"("orgId", "bidSr");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: re-derive every bid with the unified rules
--   score >= 80 → GO / LOW | 65–79 → REVIEW / MEDIUM | < 65 → NO GO / HIGH
UPDATE "Bid" SET
  "decision"  = CASE WHEN "totalScore" >= 80 THEN 'GO'::"Decision"
                     WHEN "totalScore" >= 65 THEN 'REVIEW'::"Decision"
                     ELSE 'NO_GO'::"Decision" END,
  "riskIndex" = CASE WHEN "totalScore" >= 80 THEN 'LOW'::"RiskIndex"
                     WHEN "totalScore" >= 65 THEN 'MEDIUM'::"RiskIndex"
                     ELSE 'HIGH'::"RiskIndex" END,
  "expectWin" = CASE WHEN "totalScore" >= 90 THEN 0.75
                     WHEN "totalScore" >= 75 THEN 0.51
                     WHEN "totalScore" >= 65 THEN 0.3825
                     WHEN "totalScore" >= 50 THEN 0.18
                     ELSE 0.09 END,
  "hardStop"  = ("clientRep" + "clearDwgs" + "advPayment" + "payments" + "finDuration") < 13;

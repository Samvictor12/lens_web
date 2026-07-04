-- Account Groups & Industry COA classification layer

CREATE TYPE "ReportSection" AS ENUM ('BALANCE_SHEET', 'PROFIT_LOSS', 'NONE');
CREATE TYPE "PnlClassification" AS ENUM ('DIRECT_INCOME', 'INDIRECT_INCOME', 'DIRECT_EXPENSE', 'INDIRECT_EXPENSE', 'NOT_APPLICABLE');

CREATE TABLE "AccountGroup" (
    "id" SERIAL NOT NULL,
    "groupCode" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "nature" "LedgerType" NOT NULL,
    "parentGroupId" INTEGER,
    "reportSection" "ReportSection" NOT NULL DEFAULT 'NONE',
    "pnlClassification" "PnlClassification" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "isSystemGroup" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "delete_status" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "AccountGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountGroup_groupCode_key" ON "AccountGroup"("groupCode");
CREATE INDEX "AccountGroup_parentGroupId_idx" ON "AccountGroup"("parentGroupId");
CREATE INDEX "AccountGroup_nature_idx" ON "AccountGroup"("nature");

ALTER TABLE "AccountGroup" ADD CONSTRAINT "AccountGroup_parentGroupId_fkey"
    FOREIGN KEY ("parentGroupId") REFERENCES "AccountGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountGroup" ADD CONSTRAINT "AccountGroup_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountGroup" ADD CONSTRAINT "AccountGroup_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Ledger" ADD COLUMN "accountGroupId" INTEGER;
ALTER TABLE "Ledger" ADD COLUMN "isGroupLedger" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ledger" ADD COLUMN "allowsDirectPosting" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Ledger_accountGroupId_idx" ON "Ledger"("accountGroupId");

ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_accountGroupId_fkey"
    FOREIGN KEY ("accountGroupId") REFERENCES "AccountGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

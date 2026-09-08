-- Data-only: reclassify Capital as Liability under GRP-LIABILITIES; add Loans group + AC-2004.
-- Does not change Prisma schema.

-- Capital group: LIABILITY nested under Liabilities
UPDATE "AccountGroup"
SET
  nature = 'LIABILITY'::"LedgerType",
  "parentGroupId" = (SELECT id FROM "AccountGroup" WHERE "groupCode" = 'GRP-LIABILITIES' AND delete_status = false LIMIT 1),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "groupCode" = 'GRP-CAPITAL' AND delete_status = false;

-- Retype existing Capital posting ledgers
UPDATE "Ledger"
SET
  "ledgerType" = 'LIABILITY'::"LedgerType",
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "ledgerCode" IN ('AC-5001', 'AC-5002') AND delete_status = false;

-- Loans parent group under Liabilities
INSERT INTO "AccountGroup" (
  "groupCode",
  "groupName",
  nature,
  "parentGroupId",
  "reportSection",
  "pnlClassification",
  "isSystemGroup",
  "sortOrder",
  active_status,
  delete_status,
  "createdAt",
  "createdBy",
  "updatedAt"
)
SELECT
  'GRP-LOANS',
  'Loans',
  'LIABILITY'::"LedgerType",
  liab.id,
  'BALANCE_SHEET'::"ReportSection",
  'NOT_APPLICABLE'::"PnlClassification",
  true,
  25,
  true,
  false,
  CURRENT_TIMESTAMP,
  COALESCE((SELECT id FROM "User" WHERE delete_status = false ORDER BY id ASC LIMIT 1), 1),
  CURRENT_TIMESTAMP
FROM "AccountGroup" liab
WHERE liab."groupCode" = 'GRP-LIABILITIES'
  AND liab.delete_status = false
  AND EXISTS (SELECT 1 FROM "User" WHERE delete_status = false)
  AND NOT EXISTS (SELECT 1 FROM "AccountGroup" g WHERE g."groupCode" = 'GRP-LOANS');

-- Loans Payable posting ledger
INSERT INTO "Ledger" (
  "ledgerCode",
  "ledgerName",
  "ledgerType",
  "accountGroupId",
  "isGroupLedger",
  "allowsDirectPosting",
  "openingBalance",
  "currentBalance",
  description,
  "isSystemLedger",
  active_status,
  delete_status,
  "createdAt",
  "createdBy",
  "updatedAt"
)
SELECT
  'AC-2004',
  'Loans Payable',
  'LIABILITY'::"LedgerType",
  loans.id,
  false,
  true,
  0,
  0,
  'Loans payable',
  true,
  true,
  false,
  CURRENT_TIMESTAMP,
  COALESCE((SELECT id FROM "User" WHERE delete_status = false ORDER BY id ASC LIMIT 1), 1),
  CURRENT_TIMESTAMP
FROM "AccountGroup" loans
WHERE loans."groupCode" = 'GRP-LOANS'
  AND loans.delete_status = false
  AND EXISTS (SELECT 1 FROM "User" WHERE delete_status = false)
  AND NOT EXISTS (SELECT 1 FROM "Ledger" l WHERE l."ledgerCode" = 'AC-2004');

-- Ensure AC-2004 is mapped if the ledger already existed without a group
UPDATE "Ledger" l
SET
  "accountGroupId" = g.id,
  "ledgerType" = 'LIABILITY'::"LedgerType",
  "allowsDirectPosting" = true,
  "isGroupLedger" = false,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "AccountGroup" g
WHERE l."ledgerCode" = 'AC-2004'
  AND g."groupCode" = 'GRP-LOANS'
  AND l.delete_status = false;

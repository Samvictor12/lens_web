-- Per-Eye QC Rejection & Reprocess: IssuedEyeSide + issuedEye / isReused / eyeSide

CREATE TYPE "IssuedEyeSide" AS ENUM ('RIGHT', 'LEFT');

ALTER TABLE "InventoryItem" ADD COLUMN "issuedEye" "IssuedEyeSide";
ALTER TABLE "InventoryItem" ADD COLUMN "isReused" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "InventoryQcReturn" ADD COLUMN "eyeSide" "IssuedEyeSide";

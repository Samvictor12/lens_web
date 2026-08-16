-- LocationTrayMaster (UI: Tray) under Location + SaleOrder.locationTrayId for Issue & Pre-QC
CREATE TABLE IF NOT EXISTS "LocationTrayMaster" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "location_id" INTEGER NOT NULL,
  "activeStatus" BOOLEAN NOT NULL DEFAULT true,
  "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" INTEGER NOT NULL,
  "updatedBy" INTEGER,
  CONSTRAINT "LocationTrayMaster_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "LocationMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LocationTrayMaster_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LocationTrayMaster_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LocationTrayMaster_location_id_idx" ON "LocationTrayMaster"("location_id");

ALTER TABLE "SaleOrder"
  ADD COLUMN IF NOT EXISTS "locationTrayId" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SaleOrder_locationTrayId_fkey'
  ) THEN
    ALTER TABLE "SaleOrder"
      ADD CONSTRAINT "SaleOrder_locationTrayId_fkey"
      FOREIGN KEY ("locationTrayId") REFERENCES "LocationTrayMaster"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SaleOrder_locationTrayId_idx" ON "SaleOrder"("locationTrayId");

-- Add stock threshold configuration fields to LensProductMaster
ALTER TABLE "LensProductMaster" ADD COLUMN "minThresholdQty" INTEGER,
ADD COLUMN "maxThresholdQty" INTEGER;

-- Create index for low stock queries
CREATE INDEX "idx_LensProductMaster_minThreshold" ON "LensProductMaster"("minThresholdQty");

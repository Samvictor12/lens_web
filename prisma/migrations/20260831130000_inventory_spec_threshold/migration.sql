-- CreateTable
CREATE TABLE "InventorySpecThreshold" (
    "id" SERIAL NOT NULL,
    "lens_id" INTEGER NOT NULL,
    "godownType" "GodownType" NOT NULL,
    "sph" DECIMAL(6,2) NOT NULL,
    "cyl" DECIMAL(6,2) NOT NULL,
    "add" DECIMAL(6,2) NOT NULL,
    "minQty" INTEGER NOT NULL DEFAULT 0,
    "maxQty" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySpecThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventorySpecThreshold_lens_id_godownType_idx" ON "InventorySpecThreshold"("lens_id", "godownType");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySpecThreshold_lens_id_godownType_sph_cyl_add_key" ON "InventorySpecThreshold"("lens_id", "godownType", "sph", "cyl", "add");

-- AddForeignKey
ALTER TABLE "InventorySpecThreshold" ADD CONSTRAINT "InventorySpecThreshold_lens_id_fkey" FOREIGN KEY ("lens_id") REFERENCES "LensProductMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

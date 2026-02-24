/*
  Warnings:

  - You are about to drop the column `leftBase` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `leftBaseSize` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `leftBled` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `rightBase` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `rightBaseSize` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `rightBled` on the `SaleOrder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LensTintingMaster" ADD COLUMN     "tinting_price" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SaleOrder" DROP COLUMN "leftBase",
DROP COLUMN "leftBaseSize",
DROP COLUMN "leftBled",
DROP COLUMN "rightBase",
DROP COLUMN "rightBaseSize",
DROP COLUMN "rightBled",
ADD COLUMN     "material_id" INTEGER;

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "LensMaterialMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

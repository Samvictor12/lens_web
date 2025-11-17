/*
  Warnings:

  - You are about to drop the column `lensProduct_id` on the `PriceMapping` table. All the data in the column will be lost.
  - Added the required column `lensPrice_id` to the `PriceMapping` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."PriceMapping" DROP CONSTRAINT "PriceMapping_lensProduct_id_fkey";

-- DropIndex
DROP INDEX "public"."PriceMapping_lensProduct_id_idx";

-- AlterTable
ALTER TABLE "PriceMapping" DROP COLUMN "lensProduct_id",
ADD COLUMN     "discountPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lensPrice_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "PriceMapping_lensPrice_id_idx" ON "PriceMapping"("lensPrice_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "DepartmentDetails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceMapping" ADD CONSTRAINT "PriceMapping_lensPrice_id_fkey" FOREIGN KEY ("lensPrice_id") REFERENCES "LensPriceMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

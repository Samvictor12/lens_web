/*
  Warnings:

  - The values [DISPATCHED] on the enum `SaleOrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `DispatchCopy` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `customerAddress` on the `DispatchCopy` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `DispatchCopy` table. All the data in the column will be lost.
  - You are about to drop the column `customerPhone` on the `DispatchCopy` table. All the data in the column will be lost.
  - You are about to drop the column `deliveredAt` on the `DispatchCopy` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryMethod` on the `DispatchCopy` table. All the data in the column will be lost.
  - You are about to drop the column `dispatchDate` on the `DispatchCopy` table. All the data in the column will be lost.
  - You are about to drop the column `items` on the `DispatchCopy` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `DispatchCopy` table. All the data in the column will be lost.
  - You are about to drop the column `saleOrderId` on the `DispatchCopy` table. All the data in the column will be lost.
  - The `id` column on the `DispatchCopy` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `customerId` to the `DispatchCopy` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SaleOrderStatus_new" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_DISPATCH', 'DELIVERED');
ALTER TABLE "public"."SaleOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "SaleOrder" ALTER COLUMN "status" TYPE "SaleOrderStatus_new" USING ("status"::text::"SaleOrderStatus_new");
ALTER TYPE "SaleOrderStatus" RENAME TO "SaleOrderStatus_old";
ALTER TYPE "SaleOrderStatus_new" RENAME TO "SaleOrderStatus";
DROP TYPE "public"."SaleOrderStatus_old";
ALTER TABLE "SaleOrder" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."DispatchCopy" DROP CONSTRAINT "DispatchCopy_saleOrderId_fkey";

-- DropIndex
DROP INDEX "public"."DispatchCopy_saleOrderId_idx";

-- DropIndex
DROP INDEX "public"."DispatchCopy_saleOrderId_key";

-- DropIndex
DROP INDEX "public"."SaleOrder_customerId_idx";

-- AlterTable
ALTER TABLE "DispatchCopy" DROP CONSTRAINT "DispatchCopy_pkey",
DROP COLUMN "customerAddress",
DROP COLUMN "customerName",
DROP COLUMN "customerPhone",
DROP COLUMN "deliveredAt",
DROP COLUMN "deliveryMethod",
DROP COLUMN "dispatchDate",
DROP COLUMN "items",
DROP COLUMN "remarks",
DROP COLUMN "saleOrderId",
ADD COLUMN     "customerId" INTEGER NOT NULL,
ADD COLUMN     "deliveryNotes" TEXT,
ADD COLUMN     "driverContact" TEXT,
ADD COLUMN     "driverName" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "vehicleNumber" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "DispatchCopy_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "SaleOrder" ADD COLUMN     "actualDate" TIMESTAMP(3),
ADD COLUMN     "actualTime" TEXT,
ADD COLUMN     "assignedPerson" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "coatingName" TEXT,
ADD COLUMN     "coatingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "coatingType" TEXT,
ADD COLUMN     "customerRefNo" TEXT,
ADD COLUMN     "deliverySchedule" TIMESTAMP(3),
ADD COLUMN     "dia" TEXT,
ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "dispatchCopyId" INTEGER,
ADD COLUMN     "dispatchId" TEXT,
ADD COLUMN     "dispatchNotes" TEXT,
ADD COLUMN     "dispatchStatus" TEXT DEFAULT 'Pending',
ADD COLUMN     "estimatedDate" TIMESTAMP(3),
ADD COLUMN     "estimatedTime" TEXT,
ADD COLUMN     "fittingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "freeLens" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "itemRefNo" TEXT,
ADD COLUMN     "leftAdd" TEXT,
ADD COLUMN     "leftAxis" TEXT,
ADD COLUMN     "leftBase" TEXT,
ADD COLUMN     "leftBaseSize" TEXT,
ADD COLUMN     "leftBled" TEXT,
ADD COLUMN     "leftCylindrical" TEXT,
ADD COLUMN     "leftDia" TEXT,
ADD COLUMN     "leftEye" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leftSpherical" TEXT,
ADD COLUMN     "lensName" TEXT,
ADD COLUMN     "lensPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lensType" TEXT,
ADD COLUMN     "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "remark" TEXT,
ADD COLUMN     "rightAdd" TEXT,
ADD COLUMN     "rightAxis" TEXT,
ADD COLUMN     "rightBase" TEXT,
ADD COLUMN     "rightBaseSize" TEXT,
ADD COLUMN     "rightBled" TEXT,
ADD COLUMN     "rightCylindrical" TEXT,
ADD COLUMN     "rightDia" TEXT,
ADD COLUMN     "rightEye" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rightSpherical" TEXT,
ADD COLUMN     "tintingName" TEXT,
ADD COLUMN     "tintingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "type" TEXT;

-- CreateIndex
CREATE INDEX "DispatchCopy_customerId_idx" ON "DispatchCopy"("customerId");

-- CreateIndex
CREATE INDEX "SaleOrder_dispatchCopyId_idx" ON "SaleOrder"("dispatchCopyId");

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_dispatchCopyId_fkey" FOREIGN KEY ("dispatchCopyId") REFERENCES "DispatchCopy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchCopy" ADD CONSTRAINT "DispatchCopy_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

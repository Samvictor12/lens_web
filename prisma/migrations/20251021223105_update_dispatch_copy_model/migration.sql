/*
  Warnings:

  - The primary key for the `DispatchCopy` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `customerId` on the `DispatchCopy` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryNotes` on the `DispatchCopy` table. All the data in the column will be lost.
  - You are about to drop the column `driverContact` on the `DispatchCopy` table. All the data in the column will be lost.
  - You are about to drop the column `driverName` on the `DispatchCopy` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `DispatchCopy` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleNumber` on the `DispatchCopy` table. All the data in the column will be lost.
  - You are about to drop the column `dispatchId` on the `SaleOrder` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[saleOrderId]` on the table `DispatchCopy` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `customerAddress` to the `DispatchCopy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerName` to the `DispatchCopy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerPhone` to the `DispatchCopy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deliveryMethod` to the `DispatchCopy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dispatchDate` to the `DispatchCopy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `items` to the `DispatchCopy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saleOrderId` to the `DispatchCopy` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "SaleOrderStatus" ADD VALUE 'DISPATCHED';

-- DropForeignKey
ALTER TABLE "public"."DispatchCopy" DROP CONSTRAINT "DispatchCopy_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SaleOrder" DROP CONSTRAINT "SaleOrder_dispatchId_fkey";

-- DropIndex
DROP INDEX "public"."DispatchCopy_customerId_idx";

-- DropIndex
DROP INDEX "public"."SaleOrder_dispatchId_idx";

-- AlterTable
ALTER TABLE "DispatchCopy" DROP CONSTRAINT "DispatchCopy_pkey",
DROP COLUMN "customerId",
DROP COLUMN "deliveryNotes",
DROP COLUMN "driverContact",
DROP COLUMN "driverName",
DROP COLUMN "notes",
DROP COLUMN "vehicleNumber",
ADD COLUMN     "customerAddress" TEXT NOT NULL,
ADD COLUMN     "customerName" TEXT NOT NULL,
ADD COLUMN     "customerPhone" TEXT NOT NULL,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveryMethod" TEXT NOT NULL,
ADD COLUMN     "dispatchDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "items" JSONB NOT NULL,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "saleOrderId" INTEGER NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "DispatchCopy_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "DispatchCopy_id_seq";

-- AlterTable
ALTER TABLE "SaleOrder" DROP COLUMN "dispatchId";

-- CreateIndex
CREATE UNIQUE INDEX "DispatchCopy_saleOrderId_key" ON "DispatchCopy"("saleOrderId");

-- CreateIndex
CREATE INDEX "DispatchCopy_saleOrderId_idx" ON "DispatchCopy"("saleOrderId");

-- CreateIndex
CREATE INDEX "SaleOrder_customerId_idx" ON "SaleOrder"("customerId");

-- AddForeignKey
ALTER TABLE "DispatchCopy" ADD CONSTRAINT "DispatchCopy_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

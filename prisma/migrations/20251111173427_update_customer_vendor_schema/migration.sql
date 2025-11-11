/*
  Warnings:

  - You are about to drop the column `contactPerson` on the `Vendor` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `code` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedBy` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `Vendor` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."Customer_email_key";

-- DropIndex
DROP INDEX "public"."Vendor_email_key";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "active_status" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "businessCategory_id" INTEGER,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "createdBy" INTEGER NOT NULL,
ADD COLUMN     "credit_limit" INTEGER,
ADD COLUMN     "delete_status" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "outstanding_credit" INTEGER,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "shopname" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "updatedBy" INTEGER,
ALTER COLUMN "email" SET NOT NULL;

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "contactPerson",
ADD COLUMN     "active_status" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "createdBy" INTEGER NOT NULL,
ADD COLUMN     "delete_status" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "shopname" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "updatedBy" INTEGER NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- CreateTable
CREATE TABLE "businessCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businessCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "businessCategory_name_key" ON "businessCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_code_key" ON "Vendor"("code");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_businessCategory_id_fkey" FOREIGN KEY ("businessCategory_id") REFERENCES "businessCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `roleId` on the `Permission` table. All the data in the column will be lost.
  - You are about to drop the column `assignedPerson` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `coatingName` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `coatingPrice` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `coatingType` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `dia` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `fittingPrice` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `fittingType` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `lensName` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `lensType` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `tintingName` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `tintingPrice` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `lensVariantId` on the `SaleOrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `LensType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LensVariant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `POItem` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[orderNo]` on the table `SaleOrder` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdBy` to the `DepartmentDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DepartmentDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_id` to the `Permission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `SaleOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderNo` to the `SaleOrder` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."LensVariant" DROP CONSTRAINT "LensVariant_lensTypeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."POItem" DROP CONSTRAINT "POItem_lensVariantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."POItem" DROP CONSTRAINT "POItem_purchaseOrderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Permission" DROP CONSTRAINT "Permission_roleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SaleOrderItem" DROP CONSTRAINT "SaleOrderItem_lensVariantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_roleId_fkey";

-- DropIndex
DROP INDEX "public"."SaleOrderItem_lensVariantId_idx";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "alternatephone" TEXT;

-- AlterTable
ALTER TABLE "DepartmentDetails" ADD COLUMN     "active_status" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdBy" INTEGER NOT NULL,
ADD COLUMN     "delete_status" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" INTEGER;

-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "roleId",
ADD COLUMN     "role_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "SaleOrder" DROP COLUMN "assignedPerson",
DROP COLUMN "category",
DROP COLUMN "coatingName",
DROP COLUMN "coatingPrice",
DROP COLUMN "coatingType",
DROP COLUMN "dia",
DROP COLUMN "fittingPrice",
DROP COLUMN "fittingType",
DROP COLUMN "lensName",
DROP COLUMN "lensType",
DROP COLUMN "tintingName",
DROP COLUMN "tintingPrice",
ADD COLUMN     "Type_id" INTEGER,
ADD COLUMN     "activeStatus" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "assignedPerson_id" INTEGER,
ADD COLUMN     "category_id" INTEGER,
ADD COLUMN     "coating_id" INTEGER,
ADD COLUMN     "createdBy" INTEGER NOT NULL,
ADD COLUMN     "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dia_id" INTEGER,
ADD COLUMN     "fitting_id" INTEGER,
ADD COLUMN     "lens_id" INTEGER,
ADD COLUMN     "orderNo" TEXT NOT NULL,
ADD COLUMN     "tinting_id" INTEGER,
ADD COLUMN     "updatedBy" INTEGER;

-- AlterTable
ALTER TABLE "SaleOrderItem" DROP COLUMN "lensVariantId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "roleId",
ADD COLUMN     "role_id" INTEGER;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "alternatephone" TEXT;

-- AlterTable
ALTER TABLE "businessCategory" ADD COLUMN     "active_status" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "delete_status" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "createdBy" DROP DEFAULT;

-- DropTable
DROP TABLE "public"."LensType";

-- DropTable
DROP TABLE "public"."LensVariant";

-- DropTable
DROP TABLE "public"."POItem";

-- CreateTable
CREATE TABLE "LensCategoryMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "LensCategoryMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LensMaterialMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "LensMaterialMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LensCoatingMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "description" TEXT,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "LensCoatingMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LensFittingMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "description" TEXT,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "LensFittingMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LensDiaMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "description" TEXT,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "LensDiaMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LensTintingMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "description" TEXT,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "LensTintingMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LensBrandMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "LensBrandMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LensTypeMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "LensTypeMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LensProductMaster" (
    "id" SERIAL NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "type_id" INTEGER NOT NULL,
    "product_code" TEXT NOT NULL,
    "lens_name" TEXT NOT NULL,
    "index_value" INTEGER,
    "sphere_min" DOUBLE PRECISION,
    "sphere_max" DOUBLE PRECISION,
    "cyl_min" DOUBLE PRECISION,
    "cyl_max" DOUBLE PRECISION,
    "add_min" DOUBLE PRECISION,
    "add_max" DOUBLE PRECISION,
    "range_text" TEXT,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "LensProductMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LensPriceMaster" (
    "id" SERIAL NOT NULL,
    "lens_id" INTEGER NOT NULL,
    "coating_id" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "LensPriceMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceMapping" (
    "id" SERIAL NOT NULL,
    "lensProduct_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "PriceMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LensCategoryMaster_name_key" ON "LensCategoryMaster"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LensMaterialMaster_name_key" ON "LensMaterialMaster"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LensCoatingMaster_name_key" ON "LensCoatingMaster"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LensFittingMaster_name_key" ON "LensFittingMaster"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LensDiaMaster_name_key" ON "LensDiaMaster"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LensTintingMaster_name_key" ON "LensTintingMaster"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LensBrandMaster_name_key" ON "LensBrandMaster"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LensTypeMaster_name_key" ON "LensTypeMaster"("name");

-- CreateIndex
CREATE INDEX "PriceMapping_lensProduct_id_idx" ON "PriceMapping"("lensProduct_id");

-- CreateIndex
CREATE INDEX "PriceMapping_customer_id_idx" ON "PriceMapping"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "SaleOrder_orderNo_key" ON "SaleOrder"("orderNo");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessCategory" ADD CONSTRAINT "businessCategory_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessCategory" ADD CONSTRAINT "businessCategory_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensCategoryMaster" ADD CONSTRAINT "LensCategoryMaster_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensCategoryMaster" ADD CONSTRAINT "LensCategoryMaster_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensMaterialMaster" ADD CONSTRAINT "LensMaterialMaster_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensMaterialMaster" ADD CONSTRAINT "LensMaterialMaster_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensCoatingMaster" ADD CONSTRAINT "LensCoatingMaster_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensCoatingMaster" ADD CONSTRAINT "LensCoatingMaster_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensFittingMaster" ADD CONSTRAINT "LensFittingMaster_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensFittingMaster" ADD CONSTRAINT "LensFittingMaster_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensDiaMaster" ADD CONSTRAINT "LensDiaMaster_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensDiaMaster" ADD CONSTRAINT "LensDiaMaster_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensTintingMaster" ADD CONSTRAINT "LensTintingMaster_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensTintingMaster" ADD CONSTRAINT "LensTintingMaster_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensBrandMaster" ADD CONSTRAINT "LensBrandMaster_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensBrandMaster" ADD CONSTRAINT "LensBrandMaster_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensTypeMaster" ADD CONSTRAINT "LensTypeMaster_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensTypeMaster" ADD CONSTRAINT "LensTypeMaster_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensProductMaster" ADD CONSTRAINT "LensProductMaster_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "LensBrandMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensProductMaster" ADD CONSTRAINT "LensProductMaster_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "LensCategoryMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensProductMaster" ADD CONSTRAINT "LensProductMaster_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "LensMaterialMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensProductMaster" ADD CONSTRAINT "LensProductMaster_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "LensTypeMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensProductMaster" ADD CONSTRAINT "LensProductMaster_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensProductMaster" ADD CONSTRAINT "LensProductMaster_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensPriceMaster" ADD CONSTRAINT "LensPriceMaster_coating_id_fkey" FOREIGN KEY ("coating_id") REFERENCES "LensCoatingMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensPriceMaster" ADD CONSTRAINT "LensPriceMaster_lens_id_fkey" FOREIGN KEY ("lens_id") REFERENCES "LensProductMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensPriceMaster" ADD CONSTRAINT "LensPriceMaster_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensPriceMaster" ADD CONSTRAINT "LensPriceMaster_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceMapping" ADD CONSTRAINT "PriceMapping_lensProduct_id_fkey" FOREIGN KEY ("lensProduct_id") REFERENCES "LensProductMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceMapping" ADD CONSTRAINT "PriceMapping_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceMapping" ADD CONSTRAINT "PriceMapping_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceMapping" ADD CONSTRAINT "PriceMapping_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_lens_id_fkey" FOREIGN KEY ("lens_id") REFERENCES "LensProductMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "LensCategoryMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_Type_id_fkey" FOREIGN KEY ("Type_id") REFERENCES "LensTypeMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_dia_id_fkey" FOREIGN KEY ("dia_id") REFERENCES "LensDiaMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_fitting_id_fkey" FOREIGN KEY ("fitting_id") REFERENCES "LensFittingMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_coating_id_fkey" FOREIGN KEY ("coating_id") REFERENCES "LensCoatingMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_tinting_id_fkey" FOREIGN KEY ("tinting_id") REFERENCES "LensTintingMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_assignedPerson_id_fkey" FOREIGN KEY ("assignedPerson_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

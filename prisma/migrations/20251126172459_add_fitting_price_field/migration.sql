-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "delivery_person_id" INTEGER,
ADD COLUMN     "sale_person_id" INTEGER;

-- AlterTable
ALTER TABLE "LensFittingMaster" ADD COLUMN     "fitting_price" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "LensProductMaster" ADD COLUMN     "cylinder_extra_charge" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "sphere_extra_charge" DOUBLE PRECISION DEFAULT 0;

-- CreateTable
CREATE TABLE "LocationMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location_code" TEXT NOT NULL,
    "description" TEXT,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "LocationMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrayMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tray_code" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER,
    "location_id" INTEGER,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "TrayMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocationMaster_location_code_key" ON "LocationMaster"("location_code");

-- CreateIndex
CREATE UNIQUE INDEX "TrayMaster_tray_code_key" ON "TrayMaster"("tray_code");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_sale_person_id_fkey" FOREIGN KEY ("sale_person_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_delivery_person_id_fkey" FOREIGN KEY ("delivery_person_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationMaster" ADD CONSTRAINT "LocationMaster_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationMaster" ADD CONSTRAINT "LocationMaster_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrayMaster" ADD CONSTRAINT "TrayMaster_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "LocationMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrayMaster" ADD CONSTRAINT "TrayMaster_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrayMaster" ADD CONSTRAINT "TrayMaster_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

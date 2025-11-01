-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELIVERED');

-- AlterTable
ALTER TABLE "SaleOrder" ADD COLUMN     "dispatchId" INTEGER;

-- CreateTable
CREATE TABLE "DispatchCopy" (
    "id" SERIAL NOT NULL,
    "dcNumber" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "vehicleNumber" TEXT,
    "driverName" TEXT,
    "driverContact" TEXT,
    "deliveryNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchCopy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DispatchCopy_dcNumber_key" ON "DispatchCopy"("dcNumber");

-- CreateIndex
CREATE INDEX "DispatchCopy_customerId_idx" ON "DispatchCopy"("customerId");

-- CreateIndex
CREATE INDEX "SaleOrder_dispatchId_idx" ON "SaleOrder"("dispatchId");

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "DispatchCopy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchCopy" ADD CONSTRAINT "DispatchCopy_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

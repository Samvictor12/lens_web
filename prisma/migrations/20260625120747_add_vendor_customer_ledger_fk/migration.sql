-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "ledgerId" INTEGER;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "ledgerId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_ledgerId_key" ON "Customer"("ledgerId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_ledgerId_key" ON "Vendor"("ledgerId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;


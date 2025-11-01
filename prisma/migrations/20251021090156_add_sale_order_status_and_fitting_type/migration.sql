-- CreateEnum
CREATE TYPE "SaleOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_DISPATCH', 'DELIVERED');

-- AlterTable
ALTER TABLE "SaleOrder" ADD COLUMN     "fittingType" TEXT,
ADD COLUMN     "status" "SaleOrderStatus" NOT NULL DEFAULT 'DRAFT';

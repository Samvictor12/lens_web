-- AlterEnum
CREATE TYPE "GodownType" AS ENUM ('STOCK', 'RX');

-- AlterTable
ALTER TABLE "LocationMaster" ADD COLUMN "godownType" "GodownType";

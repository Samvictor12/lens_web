-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "active_status" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT;

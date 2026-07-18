-- Make Customer.email optional
ALTER TABLE "Customer" ALTER COLUMN "email" DROP NOT NULL;

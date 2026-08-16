-- Location is optional on LocationTrayMaster (trays are not tagged to a location)
ALTER TABLE "LocationTrayMaster" ALTER COLUMN "location_id" DROP NOT NULL;

-- Convert LensDiaMaster.name from text to integer (e.g. '65mm' -> 65)
ALTER TABLE "LensDiaMaster" ALTER COLUMN "name" TYPE INTEGER USING (
  NULLIF(regexp_replace("name", '[^0-9]', '', 'g'), '')::INTEGER
);

-- Sample data for LensTintingMaster table
-- Insert multiple tinting options with various names and short names

INSERT INTO "LensTintingMaster" (name, short_name, description, tinting_price, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy")
VALUES 
  ('Clear Lens', 'CLR', 'Standard clear lens with no tint', 0.00, true, false, NOW(), NOW(), 1, NULL),
  ('Light Brown Tint', 'LBR', 'Light brown tint for outdoor use', 150.00, true, false, NOW(), NOW(), 1, NULL),
  ('Dark Brown Tint', 'DBR', 'Dark brown tint for strong sunlight', 200.00, true, false, NOW(), NOW(), 1, NULL),
  ('Gray Gradient', 'GRG', 'Gradient gray tint', 180.00, true, false, NOW(), NOW(), 1, NULL),
  ('Green Tint', 'GRN', 'Green colored tint for eye protection', 160.00, true, false, NOW(), NOW(), 1, NULL),
  ('Blue Light Filter', 'BLF', 'Blue light blocking tint for digital screens', 250.00, true, false, NOW(), NOW(), 1, NULL),
  ('Photochromic Brown', 'PCB', 'Light-adaptive brown tint', 500.00, true, false, NOW(), NOW(), 1, NULL),
  ('Photochromic Gray', 'PCG', 'Light-adaptive gray tint', 500.00, true, false, NOW(), NOW(), 1, NULL),
  ('Yellow Night Vision', 'YNV', 'Yellow tint for night driving', 220.00, true, false, NOW(), NOW(), 1, NULL),
  ('Pink Fashion Tint', 'PNK', 'Pink fashion tint', 175.00, true, false, NOW(), NOW(), 1, NULL),
  ('Purple Fashion Tint', 'PRP', 'Purple fashion tint', 175.00, true, false, NOW(), NOW(), 1, NULL),
  ('Mirror Silver', 'MSL', 'Silver mirror coating', 300.00, true, false, NOW(), NOW(), 1, NULL),
  ('Mirror Gold', 'MGD', 'Gold mirror coating', 320.00, true, false, NOW(), NOW(), 1, NULL),
  ('Polarized Gray', 'PLG', 'Polarized gray for glare reduction', 450.00, true, false, NOW(), NOW(), 1, NULL),
  ('Polarized Brown', 'PLB', 'Polarized brown for enhanced contrast', 450.00, true, false, NOW(), NOW(), 1, NULL)
ON CONFLICT (name) DO NOTHING;

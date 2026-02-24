/**
 * Test lens-tintings dropdown API with sample data
 */

import LensTintingMasterService from './src/backend/services/lensTintingMasterService.js';

console.log('🧪 Testing Lens Tinting Dropdown with Sample Data\n');

const service = new LensTintingMasterService();

// Test 1: Get all tintings
console.log('📋 Test 1: Get all tintings (no filter)');
service.getTintingDropdown({})
  .then(result => {
    console.log(`✅ Total items: ${result.length}`);
    console.log('\nSample items:');
    result.slice(0, 3).forEach(item => {
      console.log(`  - ${item.label} (${item.short_name}) - ₹${item.tinting_price}`);
    });
    console.log('');
    
    // Test 2: Filter by name "Photochromic"
    console.log('📋 Test 2: Filter by name containing "Photochromic"');
    return service.getTintingDropdown({ name: 'Photochromic' });
  })
  .then(result => {
    console.log(`✅ Filtered items: ${result.length}`);
    result.forEach(item => {
      console.log(`  - ${item.label} (${item.short_name}) - ₹${item.tinting_price}`);
    });
    console.log('');
    
    // Test 3: Filter by short_name "PL"
    console.log('📋 Test 3: Filter by short_name containing "PL" (Polarized)');
    return service.getTintingDropdown({ short_name: 'PL' });
  })
  .then(result => {
    console.log(`✅ Filtered items: ${result.length}`);
    result.forEach(item => {
      console.log(`  - ${item.label} (${item.short_name}) - ₹${item.tinting_price}`);
    });
    console.log('');
    
    // Test 4: Filter by name "Mirror"
    console.log('📋 Test 4: Filter by name containing "Mirror"');
    return service.getTintingDropdown({ name: 'Mirror' });
  })
  .then(result => {
    console.log(`✅ Filtered items: ${result.length}`);
    result.forEach(item => {
      console.log(`  - ${item.label} (${item.short_name}) - ₹${item.tinting_price}`);
    });
    console.log('');
    
    // Test 5: Filter by short_name "G" (should get Gray, Green, etc.)
    console.log('📋 Test 5: Filter by short_name containing "G"');
    return service.getTintingDropdown({ short_name: 'G' });
  })
  .then(result => {
    console.log(`✅ Filtered items: ${result.length}`);
    result.forEach(item => {
      console.log(`  - ${item.label} (${item.short_name}) - ₹${item.tinting_price}`);
    });
    console.log('');
    
    // Test 6: Price range test - find items with "Brown" in name
    console.log('📋 Test 6: Filter by name containing "Brown"');
    return service.getTintingDropdown({ name: 'Brown' });
  })
  .then(result => {
    console.log(`✅ Filtered items: ${result.length}`);
    result.forEach(item => {
      console.log(`  - ${item.label} (${item.short_name}) - ₹${item.tinting_price}`);
    });
    console.log('');
    
    console.log('✅ All tests completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });

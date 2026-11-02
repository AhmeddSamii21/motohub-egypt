// Test script to check the catalog data
import { buildDiscoveryModels } from './src/data/catalogDiscovery.js';

console.log('Testing catalog discovery models...');

try {
  const models = buildDiscoveryModels();
  console.log('Total models built:', models.length);
  
  // Check for ZONTES models
  const zontesModels = models.filter(model => model.brand === 'ZONTES');
  console.log('ZONTES models found:', zontesModels.length);
  
  if (zontesModels.length > 0) {
    console.log('First ZONTES model:', zontesModels[0]);
  }
  
  // Check all unique brands
  const uniqueBrands = [...new Set(models.map(model => model.brand))];
  console.log('Unique brands:', uniqueBrands);
  
  // Test brand filter
  const zontesFilter = models.filter(model => model.brand === 'ZONTES');
  console.log('ZONTES filter result:', zontesFilter.length);
  
} catch (error) {
  console.error('Error testing catalog data:', error);
  console.error('Stack:', error.stack);
}
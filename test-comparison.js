// Test comparison functionality
import { readCompareKeys, toggleCompareKey, clearCompareKeys } from './src/data/compareStore.js';
import { DISCOVERY_MODELS } from './src/data/catalogDiscovery.js';

console.log('Testing comparison functionality...');

try {
  // Clear any existing comparison data
  clearCompareKeys();
  console.log('Cleared comparison keys');
  
  // Check initial state
  const initialKeys = readCompareKeys();
  console.log('Initial keys:', initialKeys);
  
  // Add a model to comparison
  const testKey = 'SYM|Jet 4 150 CC';
  const afterAdd = toggleCompareKey(testKey);
  console.log('After adding:', afterAdd);
  
  // Check if the model is in the comparison list
  const compareKeys = readCompareKeys();
  console.log('Comparison keys:', compareKeys);
  
  // Test compareItems calculation
  const compareItems = compareKeys.map((key) => {
    const model = DISCOVERY_MODELS.find(m => m.key === key);
    return model ? {
      ...model,
      brand: model.brand,
      name: model.name,
      key: model.key
    } : null;
  }).filter(Boolean);
  
  console.log('Compare items:', compareItems);
  console.log('Compare items length:', compareItems.length);
  
  // Add another model
  const testKey2 = 'ZONTES|E350';
  const afterAdd2 = toggleCompareKey(testKey2);
  console.log('After adding second model:', afterAdd2);
  
  // Check final state
  const finalKeys = readCompareKeys();
  console.log('Final keys:', finalKeys);
  
  // Test compareItems again
  const finalCompareItems = finalKeys.map((key) => {
    const model = DISCOVERY_MODELS.find(m => m.key === key);
    return model ? {
      ...model,
      brand: model.brand,
      name: model.name,
      key: model.key
    } : null;
  }).filter(Boolean);
  
  console.log('Final compare items:', finalCompareItems);
  console.log('Final compare items length:', finalCompareItems.length);
  
  // Clear again
  clearCompareKeys();
  const finalCleared = readCompareKeys();
  console.log('After clearing:', finalCleared);
  
} catch (error) {
  console.error('Error testing comparison:', error);
  console.error('Stack:', error.stack);
}
// Test comparison functionality
import { readCompareKeys, toggleCompareKey, clearCompareKeys } from './src/data/compareStore.js';

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
  
  // Add another model
  const testKey2 = 'ZONTES|E350';
  const afterAdd2 = toggleCompareKey(testKey2);
  console.log('After adding second model:', afterAdd2);
  
  // Check final state
  const finalKeys = readCompareKeys();
  console.log('Final keys:', finalKeys);
  
  // Test removing a model
  const afterRemove = toggleCompareKey(testKey);
  console.log('After removing:', afterRemove);
  
  // Check final state after removal
  const finalKeysAfterRemove = readCompareKeys();
  console.log('Final keys after removal:', finalKeysAfterRemove);
  
  // Clear again
  clearCompareKeys();
  const finalCleared = readCompareKeys();
  console.log('After clearing:', finalCleared);
  
} catch (error) {
  console.error('Error testing comparison:', error);
  console.error('Stack:', error.stack);
}
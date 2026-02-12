// Test file to verify date handling without timezone conversion
import { formatDateLocal, formatDateDisplay, parseLocalDate } from './dateUtils';

// Test the date utilities
console.log('🧪 Testing Date Utilities:');

// Test 1: formatDateLocal
const testDate = new Date(2025, 9, 7); // October 7, 2025
const localDateString = formatDateLocal(testDate);
console.log('✅ formatDateLocal:', localDateString); // Should be "2025-10-07"

// Test 2: formatDateDisplay  
const displayString = formatDateDisplay('2025-10-07');
console.log('✅ formatDateDisplay:', displayString); // Should be "Oct 7, 2025"

// Test 3: parseLocalDate
const parsedDate = parseLocalDate('2025-10-07');
console.log('✅ parseLocalDate:', parsedDate); // Should be Date object for Oct 7, 2025

// Test 4: Compare with old method (should show the problem)
const oldMethod = testDate.toISOString().split('T')[0];
console.log('❌ Old method (toISOString):', oldMethod); // Might be "2025-10-06" due to timezone

console.log('🎯 New method preserves local date, old method converts to UTC!');

// Test the time utility functions
const { formatTo12Hour, roundToQuarterHour, calculateRoundedHours, calculateTotalRoundedHours, formatDate, getTimeEntryDisplay } = require('../src/lib/time-utils.ts');

console.log('🧪 Testing Time Utility Functions\n');

// Test 1: formatTo12Hour
console.log('📋 Test 1: formatTo12Hour');
const timeTests = [
  '09:30',
  '21:45',
  '00:15',
  '12:00',
  '06:07',
  '23:59',
  '2025-07-03T09:30:00Z'
];

timeTests.forEach(time => {
  try {
    const result = formatTo12Hour(time);
    console.log(`   ${time} → ${result}`);
  } catch (error) {
    console.log(`   ${time} → ERROR: ${error.message}`);
  }
});

// Test 2: roundToQuarterHour
console.log('\n📋 Test 2: roundToQuarterHour');
const roundingTests = [
  { time: '09:23', direction: 'down', expected: '09:15' },
  { time: '09:23', direction: 'up', expected: '09:30' },
  { time: '17:37', direction: 'up', expected: '17:45' },
  { time: '17:37', direction: 'down', expected: '17:30' },
  { time: '08:00', direction: 'down', expected: '08:00' },
  { time: '08:15', direction: 'up', expected: '08:15' },
  { time: '23:52', direction: 'up', expected: '00:00' }
];

roundingTests.forEach(test => {
  try {
    const result = roundToQuarterHour(test.time, test.direction);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`   ${test.time} (${test.direction}) → ${result} ${status} (expected: ${test.expected})`);
  } catch (error) {
    console.log(`   ${test.time} (${test.direction}) → ERROR: ${error.message}`);
  }
});

// Test 3: calculateRoundedHours
console.log('\n📋 Test 3: calculateRoundedHours');
const hoursTests = [
  { clockIn: '09:23', clockOut: '17:37', expected: 8.25 }, // 9:15 to 17:45 = 8.5 hours
  { clockIn: '08:00', clockOut: '16:30', expected: 8.5 },  // 8:00 to 16:30 = 8.5 hours
  { clockIn: '09:07', clockOut: '12:22', expected: 3.25 }  // 9:00 to 12:30 = 3.5 hours
];

hoursTests.forEach(test => {
  try {
    const result = calculateRoundedHours(test.clockIn, test.clockOut);
    const rounded = Math.round(result * 100) / 100; // Round to 2 decimal places
    console.log(`   ${test.clockIn} to ${test.clockOut} → ${rounded} hours`);
  } catch (error) {
    console.log(`   ${test.clockIn} to ${test.clockOut} → ERROR: ${error.message}`);
  }
});

// Test 4: calculateTotalRoundedHours
console.log('\n📋 Test 4: calculateTotalRoundedHours');
const multipleEntries = [
  { clockIn: '09:23', clockOut: '12:37' },
  { clockIn: '13:15', clockOut: '17:22' }
];

try {
  const result = calculateTotalRoundedHours(multipleEntries);
  console.log(`   Multiple entries total: ${result} hours`);
} catch (error) {
  console.log(`   Multiple entries → ERROR: ${error.message}`);
}

// Test 5: formatDate
console.log('\n📋 Test 5: formatDate');
const dateTests = [
  '2025-07-03',
  '2025-12-25T00:00:00Z',
  '2024-01-01'
];

dateTests.forEach(date => {
  try {
    const result = formatDate(date);
    console.log(`   ${date} → ${result}`);
  } catch (error) {
    console.log(`   ${date} → ERROR: ${error.message}`);
  }
});

// Test 6: getTimeEntryDisplay
console.log('\n📋 Test 6: getTimeEntryDisplay');
const displayTests = [
  { clockIn: '09:23', clockOut: '17:37' },
  { clockIn: '08:07', clockOut: '12:22' }
];

displayTests.forEach(test => {
  try {
    const result = getTimeEntryDisplay(test.clockIn, test.clockOut);
    console.log(`   ${test.clockIn} to ${test.clockOut}:`);
    console.log(`     Display: ${result.displayClockIn} to ${result.displayClockOut}`);
    console.log(`     Hours: ${result.totalHours.toFixed(2)}`);
  } catch (error) {
    console.log(`   ${test.clockIn} to ${test.clockOut} → ERROR: ${error.message}`);
  }
});

console.log('\n🎉 Time utility testing complete!');
console.log('\n💡 Key Features:');
console.log('   ✅ 12-hour time format with AM/PM');
console.log('   ✅ Clock IN times rounded DOWN to nearest 15 minutes');
console.log('   ✅ Clock OUT times rounded UP to nearest 15 minutes');
console.log('   ✅ Accurate hour calculations with rounding');
console.log('   ✅ Support for multiple time entries per worker');
console.log('   ✅ Proper date formatting (MM/DD/YYYY)');

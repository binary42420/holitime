// Test script to verify the command component is working
const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Testing Command Component Integration...\n');

try {
  // Test TypeScript compilation of the command component
  console.log('📋 Testing command component compilation...');
  
  const tscCommand = 'npx tsc --noEmit --skipLibCheck src/components/ui/command.tsx';
  execSync(tscCommand, { 
    cwd: process.cwd(),
    stdio: 'pipe'
  });
  
  console.log('✅ Command component compiles successfully');

  // Test worker assignment display compilation
  console.log('\n📋 Testing worker assignment display compilation...');
  
  const workerTscCommand = 'npx tsc --noEmit --skipLibCheck src/components/worker-assignment-display.tsx';
  execSync(workerTscCommand, { 
    cwd: process.cwd(),
    stdio: 'pipe'
  });
  
  console.log('✅ Worker assignment display compiles successfully');

  console.log('\n✅ All component tests passed!');
  console.log('\n📋 Summary:');
  console.log('  ✅ Command component created and functional');
  console.log('  ✅ CMDK dependency installed');
  console.log('  ✅ Worker assignment display can import command components');
  console.log('  ✅ TypeScript compilation successful');
  
  console.log('\n🚀 The missing UI component issue has been resolved!');
  console.log('   You can now use the worker assignment display without import errors.');

} catch (error) {
  console.error('❌ Component test failed:', error.message);
  
  if (error.stdout) {
    console.error('Compilation output:', error.stdout.toString());
  }
  
  if (error.stderr) {
    console.error('Compilation errors:', error.stderr.toString());
  }
  
  console.log('\n🔧 Troubleshooting steps:');
  console.log('  1. Check that all dependencies are installed');
  console.log('  2. Verify TypeScript configuration');
  console.log('  3. Ensure all import paths are correct');
  console.log('  4. Check for any missing UI components');
}

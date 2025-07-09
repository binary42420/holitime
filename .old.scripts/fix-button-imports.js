#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing Button import case sensitivity...');

// Find all TypeScript/JavaScript files in src directory
function findFiles(dir, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results = results.concat(findFiles(filePath, extensions));
    } else if (extensions.some(ext => file.endsWith(ext))) {
      results.push(filePath);
    }
  }
  
  return results;
}

// Fix imports in a file
function fixImportsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Replace all instances of '@/components/ui/Button' with '@/components/ui/button'
    const fixedContent = content.replace(
      /@\/components\/ui\/Button/g,
      '@/components/ui/button'
    );
    
    if (fixedContent !== originalContent) {
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      console.log(`✅ Fixed imports in: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
try {
  const srcDir = path.join(process.cwd(), 'src');
  const files = findFiles(srcDir);
  
  let fixedCount = 0;
  
  for (const file of files) {
    if (fixImportsInFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n🎉 Fixed ${fixedCount} files with Button import issues`);
  
} catch (error) {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
}

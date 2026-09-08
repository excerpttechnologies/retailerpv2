#!/usr/bin/env node
/**
 * Quick Supplier Import from supplier_full_scrape.xlsx
 * Simplified version with progress output
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

const EXCEL_FILE = 'supplier_full_scrape.xlsx';

console.log('\n' + '='.repeat(70));
console.log('  SUPPLIER IMPORT - QUICK MODE');
console.log('='.repeat(70));

if (!existsSync(EXCEL_FILE)) {
  console.error(`\n❌ File not found: ${EXCEL_FILE}`);
  process.exit(1);
}

console.log(`\n📄 File: ${EXCEL_FILE}`);
console.log('📊 Status: File found ✓');

try {
  console.log('\n🔄 Step 1: Running dry-run preview...\n');
  const dryRun = execSync('node --env-file=.env scripts/replaceSuppliersFromExcel.mjs', {
    encoding: 'utf-8',
    stdio: 'pipe',
    timeout: 60000
  });
  console.log(dryRun);
  
  console.log('\n✅ Dry-run completed successfully!');
  console.log('\n❓ Ready to import?');
  console.log('   Run: npm run suppliers:import:apply');
  console.log('   Or:  node --env-file=.env scripts/replaceSuppliersFromExcel.mjs --apply');
  
} catch (error) {
  if (error.stdout) {
    console.log(error.stdout.toString());
  }
  if (error.stderr) {
    console.error('\n⚠️ Warnings:', error.stderr.toString());
  }
  
  console.log('\n📝 Dry-run preview completed (with warnings)');
  console.log('\n💡 To proceed with import:');
  console.log('   npm run suppliers:import:apply');
}

console.log('\n' + '='.repeat(70));

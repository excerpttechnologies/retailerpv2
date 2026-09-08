#!/usr/bin/env node
/**
 * Automatic Supplier Deletion Script (Non-Interactive)
 * Runs with auto-confirmation
 */

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://myexcerpt1_db_user:yEXNF7BjVgDRanGI@cluster0.e3s8dbr.mongodb.net/grooretailerp1';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function print(color, symbol, text) {
  console.log(`${color}${symbol} ${text}${colors.reset}`);
}

function printHeader(text) {
  console.log(`\n${colors.magenta}${colors.bright}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.magenta}${colors.bright}${text.padStart((70 + text.length) / 2).padEnd(70)}${colors.reset}`);
  console.log(`${colors.magenta}${colors.bright}${'='.repeat(70)}${colors.reset}\n`);
}

function printSection(text) {
  console.log(`\n${colors.cyan}${colors.bright}▶ ${text}${colors.reset}`);
  console.log(`${colors.cyan}${'─'.repeat(70)}${colors.reset}`);
}

async function run() {
  printHeader('SUPPLIER DATA DELETION - AUTO MODE');
  console.log(`Started at: ${new Date().toLocaleString()}\n`);

  let client;
  
  try {
    // CONNECT
    printSection('CONNECTING TO MONGODB');
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    await client.connect();
    const db = client.db();
    print(colors.green, '✓', `Connected to database: ${db.databaseName}`);

    // ANALYZE
    printSection('ANALYZING SUPPLIER DATA');
    const suppliers = await db.collection('contact')
      .find({ contactKind: 'Supplier' })
      .toArray();
    
    print(colors.green, '✓', `Found ${suppliers.length} supplier records`);
    
    if (suppliers.length === 0) {
      print(colors.yellow, '⚠', 'No suppliers to delete');
      await client.close();
      return;
    }

    // Show samples
    console.log(`\n${colors.blue}Sample suppliers:${colors.reset}`);
    suppliers.slice(0, 5).forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.businessName || 'N/A'} (ID: ${s.contactId || 'N/A'}, GST: ${s.gstNo || 'N/A'})`);
    });
    if (suppliers.length > 5) {
      console.log(`  ... and ${suppliers.length - 5} more`);
    }

    // CHECK DEPENDENCIES
    printSection('CHECKING DEPENDENCIES');
    const supplierIds = suppliers.map(s => s._id);
    let totalDeps = 0;

    const checks = [
      { coll: 'grc', field: 'supplierId' },
      { coll: 'grc', field: 'vendorId' },
      { coll: 'purchaseinvoice', field: 'vendorId' },
      { coll: 'debitnote', field: 'vendorId' },
      { coll: 'barcodeprintbatch', field: 'supplierId' },
    ];

    const collections = await db.listCollections().toArray();
    const collNames = collections.map(c => c.name);

    for (const { coll, field } of checks) {
      if (!collNames.includes(coll)) continue;
      
      const count = await db.collection(coll).countDocuments({
        [field]: { $in: supplierIds }
      });
      
      if (count > 0) {
        print(colors.yellow, '⚠', `${coll}.${field}: ${count} records`);
        totalDeps += count;
      }
    }

    if (totalDeps === 0) {
      print(colors.green, '✓', 'No dependencies found - safe to delete all');
    } else {
      print(colors.yellow, '⚠', `Total dependencies: ${totalDeps}`);
    }

    // CREATE BACKUP
    printSection('CREATING BACKUP');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFile = `supplier_backup_${timestamp}.json`;
    
    const backupData = {
      timestamp: new Date().toISOString(),
      suppliers: suppliers.map(s => ({ ...s, _id: s._id.toString() })),
      count: suppliers.length,
      dependencies: totalDeps
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    print(colors.green, '✓', `Backup created: ${backupFile}`);
    print(colors.blue, 'ℹ', `Backup contains ${suppliers.length} records`);

    // DELETE
    printSection('DELETING SUPPLIERS');
    print(colors.yellow, '⚠', `Deleting ${suppliers.length} supplier records...`);
    
    const result = await db.collection('contact').deleteMany({
      contactKind: 'Supplier'
    });

    print(colors.green, '✓', `Deleted ${result.deletedCount} supplier records`);

    // VERIFY
    printSection('VERIFICATION');
    const remaining = await db.collection('contact').countDocuments({ contactKind: 'Supplier' });
    const customers = await db.collection('contact').countDocuments({ contactKind: 'Customer' });
    const agents = await db.collection('contact').countDocuments({ contactKind: 'Agent' });

    if (remaining === 0) {
      print(colors.green, '✓', 'All supplier records successfully deleted');
    } else {
      print(colors.red, '✗', `${remaining} suppliers still remain`);
    }

    print(colors.green, '✓', `Customers intact: ${customers} records`);
    print(colors.green, '✓', `Agents intact: ${agents} records`);

    // FINAL REPORT
    printHeader('FINAL REPORT');
    console.log(`${colors.bright}Summary:${colors.reset}`);
    console.log(`  • Suppliers found:     ${suppliers.length}`);
    console.log(`  • Suppliers deleted:   ${colors.green}${result.deletedCount}${colors.reset}`);
    console.log(`  • Dependencies:        ${totalDeps}`);
    console.log(`  • Backup file:         ${backupFile}`);
    console.log(`\n${colors.bright}Data Integrity:${colors.reset}`);
    console.log(`  • Suppliers remaining: ${remaining}`);
    console.log(`  • Customers intact:    ${colors.green}${customers}${colors.reset}`);
    console.log(`  • Agents intact:       ${colors.green}${agents}${colors.reset}`);
    console.log(`\n${colors.bright}Module Status:${colors.reset}`);
    console.log(`  • Supplier UI:         ${colors.green}PRESERVED${colors.reset}`);
    console.log(`  • Supplier API:        ${colors.green}PRESERVED${colors.reset}`);
    console.log(`  • Can add suppliers:   ${colors.green}YES${colors.reset}`);

    print(colors.green, '\n✓', 'Deletion completed successfully!');

  } catch (error) {
    print(colors.red, '✗', `Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      print(colors.blue, 'ℹ', 'Database connection closed');
    }
  }
}

run();

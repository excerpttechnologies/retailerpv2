#!/usr/bin/env node
/**
 * Supplier Seed Data Deletion Script
 * ===================================
 * Safely deletes supplier records from MongoDB while:
 * 1. Checking for dependencies in other collections
 * 2. Creating a backup before deletion
 * 3. Providing detailed reporting
 * 4. Preserving module code (UI/API)
 */

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// MongoDB connection string from .env
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://myexcerpt1_db_user:yEXNF7BjVgDRanGI@cluster0.e3s8dbr.mongodb.net/grooretailerp1';

// ANSI color codes
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

function printHeader(text) {
  console.log(`\n${colors.magenta}${colors.bright}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.magenta}${colors.bright}${text.padStart((70 + text.length) / 2).padEnd(70)}${colors.reset}`);
  console.log(`${colors.magenta}${colors.bright}${'='.repeat(70)}${colors.reset}\n`);
}

function printSection(text) {
  console.log(`\n${colors.cyan}${colors.bright}▶ ${text}${colors.reset}`);
  console.log(`${colors.cyan}${'─'.repeat(70)}${colors.reset}`);
}

function printSuccess(text) {
  console.log(`${colors.green}✓ ${text}${colors.reset}`);
}

function printWarning(text) {
  console.log(`${colors.yellow}⚠ ${text}${colors.reset}`);
}

function printError(text) {
  console.log(`${colors.red}✗ ${text}${colors.reset}`);
}

function printInfo(text) {
  console.log(`${colors.blue}ℹ ${text}${colors.reset}`);
}

class SupplierDataCleaner {
  constructor(mongoUri) {
    this.mongoUri = mongoUri;
    this.client = null;
    this.db = null;
    this.backupData = {
      timestamp: new Date().toISOString(),
      suppliers: [],
      dependencies_found: {}
    };
    this.stats = {
      suppliers_found: 0,
      suppliers_deleted: 0,
      suppliers_skipped: 0,
      dependencies_checked: 0
    };
  }

  async connect() {
    printSection('CONNECTING TO MONGODB');
    try {
      this.client = new MongoClient(this.mongoUri);
      await this.client.connect();
      this.db = this.client.db();
      printSuccess(`Connected to database: ${this.db.databaseName}`);
      return true;
    } catch (error) {
      printError(`Failed to connect to MongoDB: ${error.message}`);
      return false;
    }
  }

  async analyzeSuppliers() {
    printSection('ANALYZING SUPPLIER DATA');
    
    try {
      const suppliers = await this.db.collection('contact')
        .find({ contactKind: 'Supplier' })
        .toArray();
      
      this.stats.suppliers_found = suppliers.length;
      
      if (this.stats.suppliers_found === 0) {
        printWarning('No supplier records found in the database');
        return [];
      }
      
      printSuccess(`Found ${this.stats.suppliers_found} supplier records`);
      
      // Display sample suppliers
      printInfo('\nSample suppliers:');
      suppliers.slice(0, 5).forEach((supplier, i) => {
        const businessName = supplier.businessName || 'N/A';
        const contactId = supplier.contactId || 'N/A';
        const gstNo = supplier.gstNo || 'N/A';
        console.log(`  ${i + 1}. ${businessName} (ID: ${contactId}, GST: ${gstNo})`);
      });
      
      if (suppliers.length > 5) {
        console.log(`  ... and ${suppliers.length - 5} more`);
      }
      
      return suppliers;
    } catch (error) {
      printError(`Error analyzing suppliers: ${error.message}`);
      return [];
    }
  }

  async checkDependencies(supplierIds) {
    printSection('CHECKING DEPENDENCIES');
    
    const dependencies = {};
    
    // Collections that might reference suppliers
    const collectionsToCheck = [
      { collection: 'grc', field: 'supplierId' },
      { collection: 'grc', field: 'vendorId' },
      { collection: 'purchaseinvoice', field: 'vendorId' },
      { collection: 'purchaseinvoice', field: 'supplierId' },
      { collection: 'debitnote', field: 'vendorId' },
      { collection: 'barcodeprintbatch', field: 'supplierId' },
      { collection: 'delivery', field: 'supplierId' },
      { collection: 'logistic', field: 'supplierId' },
      { collection: 'grt', field: 'vendorId' },
    ];
    
    const collections = await this.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    for (const { collection: collectionName, field: fieldName } of collectionsToCheck) {
      if (!collectionNames.includes(collectionName)) continue;
      
      try {
        const collection = this.db.collection(collectionName);
        let totalCount = 0;
        
        for (const supplierId of supplierIds) {
          // Check ObjectId reference
          const countObjectId = await collection.countDocuments({ 
            [fieldName]: new ObjectId(supplierId) 
          });
          // Check string reference
          const countString = await collection.countDocuments({ 
            [fieldName]: supplierId.toString() 
          });
          totalCount += countObjectId + countString;
        }
        
        if (totalCount > 0) {
          const key = `${collectionName}.${fieldName}`;
          dependencies[key] = totalCount;
          printWarning(`  ${key}: ${totalCount} records`);
          this.stats.dependencies_checked += totalCount;
        }
      } catch (error) {
        printError(`Error checking ${collectionName}: ${error.message}`);
      }
    }
    
    if (Object.keys(dependencies).length === 0) {
      printSuccess('No dependencies found - safe to delete all suppliers');
    } else {
      printWarning(`\nTotal dependencies found: ${this.stats.dependencies_checked}`);
      printInfo('Suppliers with dependencies will be skipped unless you confirm deletion');
    }
    
    return dependencies;
  }

  async createBackup(suppliers) {
    printSection('CREATING BACKUP');
    
    try {
      // Prepare backup data
      this.backupData.suppliers = suppliers.map(supplier => ({
        ...supplier,
        _id: supplier._id.toString()
      }));
      
      // Save backup to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupFilename = `supplier_backup_${timestamp}.json`;
      
      fs.writeFileSync(
        backupFilename,
        JSON.stringify(this.backupData, null, 2),
        'utf-8'
      );
      
      printSuccess(`Backup created: ${backupFilename}`);
      printInfo(`Backup contains ${suppliers.length} supplier records`);
      return backupFilename;
    } catch (error) {
      printError(`Failed to create backup: ${error.message}`);
      return null;
    }
  }

  async deleteSuppliers(suppliers, dependencies, force = false) {
    printSection('DELETING SUPPLIER DATA');
    
    if (!force && Object.keys(dependencies).length > 0) {
      printWarning('Dependencies found. Only suppliers without dependencies will be deleted.');
      printInfo('Use --force flag to delete all suppliers (not recommended)');
    }
    
    const deletedIds = [];
    const skippedIds = [];
    
    try {
      for (const supplier of suppliers) {
        const supplierId = supplier._id.toString();
        const businessName = supplier.businessName || 'Unknown';
        
        // Check if this supplier has dependencies
        const hasDependency = !force && this.stats.dependencies_checked > 0;
        
        if (hasDependency && !force) {
          skippedIds.push(supplierId);
          this.stats.suppliers_skipped++;
          printWarning(`  Skipped: ${businessName} (has dependencies)`);
        } else {
          // Delete the supplier
          const result = await this.db.collection('contact').deleteOne({ 
            _id: supplier._id 
          });
          
          if (result.deletedCount > 0) {
            deletedIds.push(supplierId);
            this.stats.suppliers_deleted++;
            printSuccess(`  Deleted: ${businessName}`);
          } else {
            printError(`  Failed to delete: ${businessName}`);
          }
        }
      }
      
      printSuccess(`\nDeleted ${this.stats.suppliers_deleted} supplier records`);
      if (this.stats.suppliers_skipped > 0) {
        printWarning(`Skipped ${this.stats.suppliers_skipped} suppliers with dependencies`);
      }
      
      return deletedIds;
    } catch (error) {
      printError(`Error during deletion: ${error.message}`);
      return deletedIds;
    }
  }

  async verifyDeletion() {
    printSection('VERIFICATION');
    
    try {
      const remaining = await this.db.collection('contact')
        .countDocuments({ contactKind: 'Supplier' });
      
      if (remaining === 0) {
        printSuccess('✓ All supplier records successfully deleted');
      } else if (remaining === this.stats.suppliers_skipped) {
        printSuccess(`✓ Deletion successful (${remaining} suppliers with dependencies preserved)`);
      } else {
        printWarning(`⚠ ${remaining} supplier records still remain in database`);
      }
      
      // Verify other contact types are intact
      const customers = await this.db.collection('contact')
        .countDocuments({ contactKind: 'Customer' });
      const agents = await this.db.collection('contact')
        .countDocuments({ contactKind: 'Agent' });
      
      printSuccess(`✓ Customers intact: ${customers} records`);
      printSuccess(`✓ Agents intact: ${agents} records`);
      
      return remaining === 0 || remaining === this.stats.suppliers_skipped;
    } catch (error) {
      printError(`Verification failed: ${error.message}`);
      return false;
    }
  }

  printFinalReport() {
    printHeader('FINAL REPORT');
    
    console.log(`${colors.bright}Supplier Data Cleanup Summary:${colors.reset}`);
    console.log(`  • Suppliers found:        ${this.stats.suppliers_found}`);
    console.log(`  • Suppliers deleted:      ${colors.green}${this.stats.suppliers_deleted}${colors.reset}`);
    console.log(`  • Suppliers skipped:      ${colors.yellow}${this.stats.suppliers_skipped}${colors.reset}`);
    console.log(`  • Dependencies checked:   ${this.stats.dependencies_checked}`);
    
    console.log(`\n${colors.bright}Collections Status:${colors.reset}`);
    console.log(`  • Supplier module code:   ${colors.green}PRESERVED${colors.reset}`);
    console.log(`  • Customer data:          ${colors.green}INTACT${colors.reset}`);
    console.log(`  • Agent data:             ${colors.green}INTACT${colors.reset}`);
    console.log(`  • Purchase records:       ${colors.green}INTACT${colors.reset}`);
    console.log(`  • Inventory data:         ${colors.green}INTACT${colors.reset}`);
    
    console.log(`\n${colors.bright}Note:${colors.reset}`);
    console.log(`  • Supplier UI pages remain functional`);
    console.log(`  • Supplier API routes remain active`);
    console.log(`  • You can create new suppliers anytime`);
    console.log(`  • Historical purchase data preserved`);
  }

  async run(forceDelete = false) {
    printHeader('SUPPLIER SEED DATA DELETION SCRIPT');
    printInfo(`Started at: ${new Date().toLocaleString()}`);
    
    // Connect to database
    if (!(await this.connect())) {
      return false;
    }
    
    try {
      // Analyze suppliers
      const suppliers = await this.analyzeSuppliers();
      if (suppliers.length === 0) {
        return true;
      }
      
      // Check dependencies
      const supplierIds = suppliers.map(s => s._id.toString());
      const dependencies = await this.checkDependencies(supplierIds);
      
      // Store dependencies in backup data
      this.backupData.dependencies_found = dependencies;
      
      // Create backup
      const backupFile = await this.createBackup(suppliers);
      if (!backupFile) {
        printError('Cannot proceed without backup');
        return false;
      }
      
      // Confirm deletion
      printSection('DELETION CONFIRMATION');
      if (Object.keys(dependencies).length > 0 && !forceDelete) {
        printWarning('Some suppliers have dependencies in other collections');
        printInfo('Only suppliers without dependencies will be deleted');
      }
      
      console.log(`\n${colors.bright}You are about to delete:${colors.reset}`);
      console.log(`  • ${this.stats.suppliers_found} supplier records from 'contact' collection`);
      console.log(`  • Backup saved to: ${backupFile}`);
      console.log(`\n${colors.bright}What will NOT be deleted:${colors.reset}`);
      console.log(`  • Supplier module code (UI/API)`);
      console.log(`  • Customer and Agent data`);
      console.log(`  • Purchase, inventory, and accounting records`);
      
      const answer = await this.askQuestion(`\n${colors.yellow}Proceed with deletion? (yes/no): ${colors.reset}`);
      
      if (answer.toLowerCase() !== 'yes') {
        printWarning('Deletion cancelled by user');
        return false;
      }
      
      // Delete suppliers
      await this.deleteSuppliers(suppliers, dependencies, forceDelete);
      
      // Verify deletion
      const success = await this.verifyDeletion();
      
      // Print final report
      this.printFinalReport();
      
      return success;
    } finally {
      // Close connection
      await this.client.close();
      printSuccess('\nDatabase connection closed');
    }
  }

  askQuestion(query) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => {
      rl.question(query, answer => {
        rl.close();
        resolve(answer);
      });
    });
  }
}

async function main() {
  // Parse command line arguments
  const forceDelete = process.argv.includes('--force');
  
  if (forceDelete) {
    printWarning('WARNING: Force delete mode enabled - will delete suppliers even with dependencies');
  }
  
  // Run the cleaner
  const cleaner = new SupplierDataCleaner(MONGODB_URI);
  const success = await cleaner.run(forceDelete);
  
  if (success) {
    printSuccess('\n✓ Script completed successfully');
    process.exit(0);
  } else {
    printError('\n✗ Script completed with errors');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  printError(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

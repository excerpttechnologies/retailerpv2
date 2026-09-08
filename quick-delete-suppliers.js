const { MongoClient } = require('mongodb');
const fs = require('fs');

const URI = 'mongodb+srv://myexcerpt1_db_user:yEXNF7BjVgDRanGI@cluster0.e3s8dbr.mongodb.net/grooretailerp1';

(async () => {
  console.log('\n🚀 Starting supplier deletion...\n');
  
  const client = new MongoClient(URI, { serverSelectionTimeoutMS: 5000 });
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('✓ Connected to:', db.databaseName);
    
    // Count before
    const beforeCount = await db.collection('contact').countDocuments({ contactKind: 'Supplier' });
    console.log('✓ Suppliers found:', beforeCount);
    
    if (beforeCount === 0) {
      console.log('⚠ No suppliers to delete\n');
      return;
    }
    
    // Get all suppliers for backup
    console.log('📦 Creating backup...');
    const suppliers = await db.collection('contact').find({ contactKind: 'Supplier' }).toArray();
    const backupFile = `supplier_backup_${Date.now()}.json`;
    fs.writeFileSync(backupFile, JSON.stringify({ suppliers, count: beforeCount }, null, 2));
    console.log('✓ Backup saved:', backupFile);
    
    // Delete
    console.log('🗑️  Deleting suppliers...');
    const result = await db.collection('contact').deleteMany({ contactKind: 'Supplier' });
    console.log('✓ Deleted:', result.deletedCount, 'records');
    
    // Verify
    const afterCount = await db.collection('contact').countDocuments({ contactKind: 'Supplier' });
    const customers = await db.collection('contact').countDocuments({ contactKind: 'Customer' });
    const agents = await db.collection('contact').countDocuments({ contactKind: 'Agent' });
    
    console.log('\n📊 RESULTS:');
    console.log('  Suppliers remaining:', afterCount);
    console.log('  Customers intact:   ', customers);
    console.log('  Agents intact:      ', agents);
    console.log('  Backup file:        ', backupFile);
    console.log('\n✅ SUCCESS! Supplier data deleted.\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
})();

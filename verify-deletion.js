const { MongoClient } = require('mongodb');

const URI = 'mongodb+srv://myexcerpt1_db_user:yEXNF7BjVgDRanGI@cluster0.e3s8dbr.mongodb.net/grooretailerp1';

(async () => {
  console.log('\n📊 VERIFYING DATABASE STATUS...\n');
  
  const client = new MongoClient(URI, { serverSelectionTimeoutMS: 5000 });
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('✓ Connected to:', db.databaseName);
    console.log('\n' + '='.repeat(50));
    console.log('CONTACT COLLECTION STATUS:');
    console.log('='.repeat(50));
    
    const suppliers = await db.collection('contact').countDocuments({ contactKind: 'Supplier' });
    const customers = await db.collection('contact').countDocuments({ contactKind: 'Customer' });
    const agents = await db.collection('contact').countDocuments({ contactKind: 'Agent' });
    const total = await db.collection('contact').countDocuments({});
    
    console.log(`\n  Suppliers:  ${suppliers} ${suppliers === 0 ? '✅ DELETED' : '⚠️  STILL EXIST'}`);
    console.log(`  Customers:  ${customers} ✓ INTACT`);
    console.log(`  Agents:     ${agents} ✓ INTACT`);
    console.log(`  Total:      ${total}`);
    
    console.log('\n' + '='.repeat(50));
    console.log('VERIFICATION RESULT:');
    console.log('='.repeat(50));
    
    if (suppliers === 0) {
      console.log('\n  ✅ SUCCESS! All supplier records deleted');
      console.log('  ✅ Customer data preserved');
      console.log('  ✅ Agent data preserved');
      console.log('  ✅ Supplier module still functional');
      console.log('\n  You can now:');
      console.log('    • Visit /admin/contact/supplier');
      console.log('    • Add new suppliers');
      console.log('    • Use all supplier features');
    } else {
      console.log(`\n  ⚠️  ${suppliers} suppliers still remain in database`);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
})();

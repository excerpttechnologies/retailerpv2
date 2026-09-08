const { MongoClient } = require('mongodb');

const URI = 'mongodb+srv://myexcerpt1_db_user:yEXNF7BjVgDRanGI@cluster0.e3s8dbr.mongodb.net/grooretailerp1';

(async () => {
  console.log('\n📊 Checking supplier import status...\n');
  
  const client = new MongoClient(URI, { serverSelectionTimeoutMS: 5000 });
  
  try {
    await client.connect();
    const db = client.db();
    
    const count = await db.collection('contact').countDocuments({ contactKind: 'Supplier' });
    const customers = await db.collection('contact').countDocuments({ contactKind: 'Customer' });
    const agents = await db.collection('contact').countDocuments({ contactKind: 'Agent' });
    
    console.log('Current Database Status:');
    console.log('='.repeat(40));
    console.log(`  Suppliers:  ${count}`);
    console.log(`  Customers:  ${customers}`);
    console.log(`  Agents:     ${agents}`);
    console.log('='.repeat(40));
    
    if (count > 0) {
      console.log('\n✅ Suppliers have been imported!');
      
      // Show sample
      const samples = await db.collection('contact')
        .find({ contactKind: 'Supplier' })
        .limit(5)
        .toArray();
      
      console.log('\nSample suppliers:');
      samples.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.contactId || 'N/A'} - ${s.businessName || 'N/A'}`);
      });
    } else {
      console.log('\n⏳ Import may still be running...');
    }
    
    await client.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();

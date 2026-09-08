const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://myexcerpt1_db_user:yEXNF7BjVgDRanGI@cluster0.e3s8dbr.mongodb.net/grooretailerp1';

async function testConnection() {
  console.log('Testing MongoDB connection...');
  console.log('URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));
  
  try {
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    
    await client.connect();
    console.log('✓ Connected successfully');
    
    const db = client.db();
    console.log('✓ Database:', db.databaseName);
    
    const supplierCount = await db.collection('contact')
      .countDocuments({ contactKind: 'Supplier' });
    console.log('✓ Suppliers found:', supplierCount);
    
    const customerCount = await db.collection('contact')
      .countDocuments({ contactKind: 'Customer' });
    console.log('✓ Customers found:', customerCount);
    
    const agentCount = await db.collection('contact')
      .countDocuments({ contactKind: 'Agent' });
    console.log('✓ Agents found:', agentCount);
    
    await client.close();
    console.log('✓ Connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();

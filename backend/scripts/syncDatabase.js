// Script to sync database tables (create tables if they don't exist)
const { connectDB, sequelize } = require('../config/database');
const User = require('../models/User');
const Order = require('../models/Order');
const Supplier = require('../models/Supplier');
const Material = require('../models/Material');
const Product = require('../models/Product');
const FreightHandler = require('../models/FreightHandler');

async function syncDatabase() {
  try {
    console.log('🔄 Syncing database tables...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');
    
    // Sync all models (create tables if they don't exist)
    // Use { alter: true } to alter existing tables, or { force: true } to drop and recreate
    // For production, use { alter: false } to only create missing tables
    console.log('📝 Creating tables...');
    await sequelize.sync({ alter: false });
    console.log('✅ Tables synced successfully\n');
    
    // List all tables
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('📊 Tables in database:');
    tables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });
    
    console.log('\n✅ Database sync completed!');
    console.log('💡 You can now run: node scripts/seedUsers.js');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing database:', error);
    console.error('Full error:', error);
    process.exit(1);
  }
}

syncDatabase();



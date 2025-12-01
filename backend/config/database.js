const { Sequelize } = require('sequelize');
require('dotenv').config();

// PostgreSQL connection configuration
// Handle both DATABASE_URL and individual variables
let sequelize;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
  // Use DATABASE_URL if provided (for production/cloud deployments)
  // Validate that DATABASE_URL is a proper PostgreSQL URL
  const dbUrl = process.env.DATABASE_URL.trim();
  
  // Check if it's a valid PostgreSQL URL format
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    console.warn('⚠️  DATABASE_URL does not start with postgresql:// or postgres://');
    console.warn('⚠️  Falling back to individual POSTGRES_* environment variables');
    // Fall through to individual variables
  } else {
    try {
      sequelize = new Sequelize(dbUrl, {
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        },
        dialectOptions: {
          ssl: dbUrl.includes('sslmode=require') ? {
            require: true,
            rejectUnauthorized: false
          } : false
        }
      });
    } catch (error) {
      console.error('❌ Error creating Sequelize instance with DATABASE_URL:', error.message);
      console.error('⚠️  Falling back to individual POSTGRES_* environment variables');
      // Fall through to individual variables
    }
  }
}

// Use individual variables if DATABASE_URL not set or invalid
if (!sequelize) {
  // Use individual variables if DATABASE_URL not provided
  const dbName = process.env.POSTGRES_DB || 'pharma_order_management';
  const dbUser = process.env.POSTGRES_USER || 'postgres';
  const dbPassword = process.env.POSTGRES_PASSWORD;
  const dbHost = process.env.POSTGRES_HOST || 'localhost';
  const dbPort = process.env.POSTGRES_PORT || 5432;
  
  // Validate that password is set (but don't exit in serverless)
  if (!dbPassword || dbPassword.trim() === '') {
    console.error('❌ POSTGRES_PASSWORD is not set in your .env file!');
    console.error('❌ Please set POSTGRES_PASSWORD in backend/.env');
    console.error('❌ Example: POSTGRES_PASSWORD=your_actual_password');
    // Only exit in non-serverless environments
    if (process.env.VERCEL !== '1' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      process.exit(1);
    }
  }
  
  console.log(`📝 Using individual PostgreSQL variables:`);
  console.log(`   Database: ${dbName}`);
  console.log(`   User: ${dbUser}`);
  console.log(`   Host: ${dbHost}:${dbPort}`);
  console.log(`   Password: ${dbPassword ? '***' + dbPassword.slice(-2) : 'NOT SET'}`);
  
  sequelize = new Sequelize(
    dbName,
    dbUser,
    dbPassword,
    {
      host: dbHost,
      port: dbPort,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully');
    
    // Get database info
    if (process.env.DATABASE_URL) {
      // Parse DATABASE_URL to get database name
      const url = new URL(process.env.DATABASE_URL);
      const dbName = url.pathname.substring(1); // Remove leading /
      console.log(`📊 Database: ${dbName}`);
      console.log(`🌐 Host: ${url.hostname}:${url.port || 5432}`);
    } else {
      console.log(`📊 Database: ${sequelize.config.database}`);
      console.log(`🌐 Host: ${sequelize.config.host}:${sequelize.config.port}`);
    }
    
    // Import models to ensure they're registered
    require('../models/User');
    require('../models/Order');
    require('../models/Supplier');
    require('../models/Material');
    require('../models/Product');
    require('../models/FreightHandler');
    
    // Set up associations/relationships
    require('../models/associations');
    
    // Sync models (create tables if they don't exist)
    // In production, use migrations instead
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false }); // Set to true to alter tables, false to only create
      console.log('✅ Database models synchronized');
    }
    
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error.message);
    console.error('Full error:', error);
    
    // Don't exit in serverless environment - let the function handle it
    // Only exit in non-serverless environments
    if (process.env.VERCEL !== '1' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      process.exit(1);
    }
    
    // In serverless, return false so the app can still start
    // The connection will be retried on first request
    return false;
  }
};

// Handle connection errors (pool errors are caught in connectDB)
// Note: Sequelize handles pool errors internally and they're caught in connectDB

process.on('SIGINT', async () => {
  await sequelize.close();
  console.log('PostgreSQL connection closed through app termination');
  process.exit(0);
});

module.exports = { sequelize, connectDB };

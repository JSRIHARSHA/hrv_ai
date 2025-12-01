require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('../config/database');
const FreightHandler = require('../models/FreightHandler');

/**
 * Seed freight handlers from mock data
 * Usage: node backend/scripts/seedFreightHandlers.js
 */
const mockFreightHandlers = [
  {
    freightHandlerId: 'FH001',
    name: 'HRV Global',
    company: 'HRV GLOBAL LIFE SCIENCES PRIVATE LIMITED',
    address: '#8-2-269/W/4, 1st Floor, Plot No. 4, Women\'s Co-operative Society, Road No. 2, Banjara Hills, Hyderabad, Telangana, India, 500034',
    country: 'India',
    phone: '04023554992',
    gstin: 'AADCH6322C1Z0',
    isActive: true
  },
  {
    freightHandlerId: 'FH002',
    name: 'Macro Logistics',
    company: 'MACRO LOGISTICS & EXIM PVT LTD',
    address: 'Bldg. NO.5 UNIT NO A1, AKSHAY MITTAL INDL ESTATE ANDHERI, Mumbai, Maharashtra, India, 400059',
    country: 'India',
    phone: '9920029049',
    gstin: '27AAGCM2600P1ZB',
    isActive: true
  },
  {
    freightHandlerId: 'FH003',
    name: 'JWR Logistics',
    company: 'JWR LOGISTICS PVT LTD',
    address: '15-23 National Highway 4B, Panvel JNPT Highway, Village Padeghar, Panvel, Maharashtra, India, 410206',
    country: 'India',
    phone: '77018807180',
    gstin: '27AACCJ4352R1Z1',
    isActive: true
  },
  {
    freightHandlerId: 'FH004',
    name: 'Sarveshwar Logistics',
    company: 'SARVESHWAR LOGISTICS SERVICES PVT LTD',
    address: 'CFS Address: Sarveshwar CFS, Digode Circle, Village: Digode, Taluka: Uran, Raigad, Maharashtra, India, 400702',
    country: 'India',
    phone: '8424016014',
    gstin: '27AAOCS1721K1Z3',
    isActive: true
  },
  {
    freightHandlerId: 'FH005',
    name: 'Punjab Conware',
    company: 'PUNJAB CONWARE O&M GAD LOGISTICS PVT LTD',
    address: 'Plot 2, Sector 2, Dronagiri Node, Nhava Sheva, Navi Mumbai, Maharashtra, India, 400707',
    country: 'India',
    phone: '7710887180',
    gstin: '27AABCG2816N1ZG',
    isActive: true
  }
];

const seedFreightHandlers = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Sync database to create tables if they don't exist
    console.log('📋 Syncing database models...');
    await sequelize.sync({ alter: false });
    console.log('✅ Database models synchronized');

    console.log(`📦 Found ${mockFreightHandlers.length} freight handlers to import`);

    // Clear existing freight handlers (optional - comment out if you want to keep existing)
    // await FreightHandler.destroy({ where: {}, truncate: true });
    // console.log('🗑️  Cleared existing freight handlers');

    let imported = 0;
    let skipped = 0;

    for (const handler of mockFreightHandlers) {
      try {
        const [freightHandler, created] = await FreightHandler.findOrCreate({
          where: { freightHandlerId: handler.freightHandlerId },
          defaults: handler
        });

        if (created) {
          imported++;
          console.log(`✅ Imported: ${handler.name} (${handler.freightHandlerId})`);
        } else {
          skipped++;
          console.log(`⏭️  Skipped (already exists): ${handler.name} (${handler.freightHandlerId})`);
        }
      } catch (error) {
        skipped++;
        console.error(`❌ Error importing ${handler.name}:`, error.message);
      }
    }

    console.log(`\n✅ Seeding completed!`);
    console.log(`   Imported: ${imported} freight handlers`);
    console.log(`   Skipped: ${skipped} freight handlers (duplicates or errors)`);

    await sequelize.close();
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedFreightHandlers()
    .then(() => {
      console.log('✅ Seed script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed script failed:', error);
      process.exit(1);
    });
}

module.exports = seedFreightHandlers;


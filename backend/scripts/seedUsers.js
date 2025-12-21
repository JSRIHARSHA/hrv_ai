const bcrypt = require('bcryptjs');
const { connectDB, sequelize } = require('../config/database');
const User = require('../models/User');
require('dotenv').config();

const seedUsers = async () => {
  try {
    await connectDB();

    console.log('Connected to PostgreSQL');
    
    // Sync database tables (create if they don't exist)
    console.log('\n🔄 Syncing database tables...');
    await sequelize.sync({ alter: false }); // Only create missing tables, don't alter existing
    console.log('✅ Tables synced\n');

    // Clear existing users (optional - comment out if you don't want to clear)
    // await User.destroy({ where: {}, truncate: true });
    // console.log('Cleared existing users');

    const users = [
      // Mock users from frontend (for testing)
      {
        userId: 'user1',
        name: 'Test Employee 1',
        email: 'testemployee1@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        team: 'Business Development',
        isActive: true,
      },
      {
        userId: 'user2',
        name: 'Test Employee 2',
        email: 'testemployee2@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        team: 'Procurement Team 1',
        isActive: true,
      },
      {
        userId: 'user3',
        name: 'Test Employee 3',
        email: 'testemployee3@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        team: 'Procurement Team 2',
        isActive: true,
      },
      {
        userId: 'user4',
        name: 'Test Employee 4',
        email: 'testemployee4@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        team: 'Finance & Compliance',
        isActive: true,
      },
      {
        userId: 'user5',
        name: 'Test Employee 5',
        email: 'testemployee5@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        team: 'Supply Chain Logistics',
        isActive: true,
      },
      {
        userId: 'user6',
        name: 'Siva Nagaraju',
        email: 'siva.nagaraju@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Manager',
        team: 'Operations Management',
        isActive: true,
      },
      {
        userId: 'user7',
        name: 'Vedansh',
        email: 'vedansh@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Manager',
        team: 'Operations Management',
        isActive: true,
      },
      {
        userId: 'user8',
        name: 'Dr. Elizabeth Johnson',
        email: 'elizabeth.johnson@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Management',
        team: 'Executive Leadership',
        isActive: true,
      },
      // Original seeded users (keeping for backward compatibility)
      {
        userId: 'user9',
        name: 'Dr. Sarah Chen',
        email: 'sarah.chen@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        team: 'Business Development',
        isActive: true,
      },
      {
        userId: 'user10',
        name: 'Michael Rodriguez',
        email: 'michael.rodriguez@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        team: 'Procurement Team 1',
        isActive: true,
      },
      {
        userId: 'user11',
        name: 'Dr. Priya Sharma',
        email: 'priya.sharma@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        team: 'Procurement Team 2',
        isActive: true,
      },
      {
        userId: 'user12',
        name: 'Jennifer Kim',
        email: 'jennifer.kim@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        team: 'Finance & Compliance',
        isActive: true,
      },
      {
        userId: 'user13',
        name: 'David Thompson',
        email: 'david.thompson@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        team: 'Supply Chain Logistics',
        isActive: true,
      },
      {
        userId: 'user14',
        name: 'Dr. Robert Martinez',
        email: 'robert.martinez@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Manager',
        team: 'Operations Management',
        isActive: true,
      },
    ];

    for (const userData of users) {
      const existingUser = await User.findOne({ 
        where: { 
          email: userData.email 
        } 
      });
      if (!existingUser) {
        await User.create(userData);
        console.log(`✅ Created user: ${userData.name} (${userData.email})`);
      } else {
        console.log(`⏭️  User already exists: ${userData.email}`);
      }
    }

    console.log('\n✅ User seeding completed');
    console.log('📝 All users have password: password123');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();

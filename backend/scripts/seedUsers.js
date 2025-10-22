const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const seedUsers = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharma-order-management';
    await mongoose.connect(mongoURI);

    console.log('Connected to MongoDB');

    // Clear existing users (optional - comment out if you don't want to clear)
    // await User.deleteMany({});
    // console.log('Cleared existing users');

    const users = [
      {
        userId: 'user1',
        name: 'Dr. Sarah Chen',
        email: 'sarah.chen@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        team: 'Business Development',
        isActive: true,
      },
      {
        userId: 'user2',
        name: 'Michael Rodriguez',
        email: 'michael.rodriguez@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        team: 'Procurement Team 1',
        isActive: true,
      },
      {
        userId: 'user3',
        name: 'Dr. Priya Sharma',
        email: 'priya.sharma@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        team: 'Procurement Team 2',
        isActive: true,
      },
      {
        userId: 'user4',
        name: 'Jennifer Kim',
        email: 'jennifer.kim@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        team: 'Finance & Compliance',
        isActive: true,
      },
      {
        userId: 'user5',
        name: 'David Thompson',
        email: 'david.thompson@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        team: 'Supply Chain Logistics',
        isActive: true,
      },
      {
        userId: 'user6',
        name: 'Dr. Robert Martinez',
        email: 'robert.martinez@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Manager',
        team: 'Operations Management',
        isActive: true,
      },
      {
        userId: 'user7',
        name: 'Dr. Elizabeth Johnson',
        email: 'elizabeth.johnson@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Higher_Management',
        team: 'Executive Leadership',
        isActive: true,
      },
    ];

    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`✅ Created user: ${userData.name} (${userData.email})`);
      } else {
        console.log(`⏭️  User already exists: ${userData.email}`);
      }
    }

    console.log('\n✅ User seeding completed');
    console.log('📝 All users have password: password123');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();


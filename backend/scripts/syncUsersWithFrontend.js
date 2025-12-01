const bcrypt = require('bcryptjs');
const { connectDB, sequelize } = require('../config/database');
const User = require('../models/User');
require('dotenv').config();

// Users from frontend mockUsers (src/data/constants.ts)
const frontendUsers = [
  {
    userId: 'user1',
    name: 'Test Employee 1',
    email: 'testemployee1@company.com',
    role: 'Employee',
    team: 'Business Development',
  },
  {
    userId: 'user2',
    name: 'Test Employee 2',
    email: 'testemployee2@company.com',
    role: 'Employee',
    team: 'Procurement Team 1',
  },
  {
    userId: 'user3',
    name: 'Test Employee 3',
    email: 'testemployee3@company.com',
    role: 'Employee',
    team: 'Procurement Team 2',
  },
  {
    userId: 'user4',
    name: 'Test Employee 4',
    email: 'testemployee4@company.com',
    role: 'Employee',
    team: 'Finance & Compliance',
  },
  {
    userId: 'user5',
    name: 'Test Employee 5',
    email: 'testemployee5@company.com',
    role: 'Employee',
    team: 'Supply Chain Logistics',
  },
  {
    userId: 'user6',
    name: 'Siva Nagaraju',
    email: 'siva.nagaraju@company.com',
    role: 'Manager',
    team: 'Operations Management',
  },
  {
    userId: 'user7',
    name: 'Vedansh',
    email: 'vedansh@company.com',
    role: 'Manager',
    team: 'Operations Management',
  },
  {
    userId: 'user8',
    name: 'Dr. Elizabeth Johnson',
    email: 'elizabeth.johnson@company.com',
    role: 'Management',
    team: 'Executive Leadership',
  },
];

const syncUsers = async () => {
  try {
    await connectDB();
    console.log('Connected to PostgreSQL\n');
    console.log('Syncing users to match frontend login screen...\n');

    for (const userData of frontendUsers) {
      // Check if user exists by email
      let user = await User.findOne({ where: { email: userData.email } });
      
      if (user) {
        // Update existing user
        const needsUpdate = 
          user.userId !== userData.userId ||
          user.name !== userData.name ||
          user.role !== userData.role ||
          user.team !== userData.team;
        
        if (needsUpdate) {
          await user.update({
            userId: userData.userId,
            name: userData.name,
            role: userData.role,
            team: userData.team,
            isActive: true,
          });
          console.log(`✅ Updated: ${userData.name} (${userData.email}) - ${userData.role}`);
        } else {
          console.log(`⏭️  Already correct: ${userData.name} (${userData.email})`);
        }
      } else {
        // Check if userId is already taken by another user
        const existingUserId = await User.findOne({ where: { userId: userData.userId } });
        
        if (existingUserId) {
          // Update the existing user with different email to use this email
          console.log(`⚠️  userId ${userData.userId} exists with different email. Updating...`);
          await existingUserId.update({
            email: userData.email,
            name: userData.name,
            role: userData.role,
            team: userData.team,
            isActive: true,
          });
          console.log(`✅ Updated existing user: ${userData.name} (${userData.email}) - ${userData.role}`);
        } else {
          // Create new user
          const hashedPassword = await bcrypt.hash('password123', 10);
          await User.create({
            ...userData,
            password: hashedPassword,
            isActive: true,
          });
          console.log(`✅ Created: ${userData.name} (${userData.email}) - ${userData.role}`);
        }
      }
    }

    console.log('\n✅ User sync completed!');
    console.log('📝 All users have password: password123');
    console.log('\n📋 Users available for login:');
    frontendUsers.forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.name} (${u.email}) - ${u.role}`);
    });
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing users:', error);
    process.exit(1);
  }
};

syncUsers();



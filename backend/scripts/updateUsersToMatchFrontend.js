const { connectDB, sequelize } = require('../config/database');
const User = require('../models/User');
require('dotenv').config();

const updateUsers = async () => {
  try {
    await connectDB();
    console.log('Connected to PostgreSQL\n');

    // Map of email to new user data (matching frontend mock users)
    const userUpdates = [
      { 
        email: 'sarah.chen@company.com', 
        update: { 
          userId: 'user1',
          name: 'Test Employee 1', 
          email: 'testemployee1@company.com',
          role: 'Employee',
          team: 'Business Development'
        } 
      },
      { 
        email: 'michael.rodriguez@company.com', 
        update: { 
          userId: 'user2',
          name: 'Test Employee 2', 
          email: 'testemployee2@company.com',
          role: 'Employee',
          team: 'Procurement Team 1'
        } 
      },
      { 
        email: 'priya.sharma@company.com', 
        update: { 
          userId: 'user3',
          name: 'Test Employee 3', 
          email: 'testemployee3@company.com',
          role: 'Employee',
          team: 'Procurement Team 2'
        } 
      },
      { 
        email: 'jennifer.kim@company.com', 
        update: { 
          userId: 'user4',
          name: 'Test Employee 4', 
          email: 'testemployee4@company.com',
          role: 'Employee',
          team: 'Finance & Compliance'
        } 
      },
      { 
        email: 'david.thompson@company.com', 
        update: { 
          userId: 'user5',
          name: 'Test Employee 5', 
          email: 'testemployee5@company.com',
          role: 'Employee',
          team: 'Supply Chain Logistics'
        } 
      },
      { 
        email: 'robert.martinez@company.com', 
        update: { 
          userId: 'user6',
          name: 'Siva Nagaraju', 
          email: 'siva.nagaraju@company.com',
          role: 'Manager',
          team: 'Operations Management'
        } 
      },
    ];

    // First, create new users that don't exist yet
    const newUsers = [
      {
        userId: 'user7',
        name: 'Vedansh',
        email: 'vedansh@company.com',
        password: '$2a$10$placeholder', // Will need to be updated
        role: 'Manager',
        team: 'Operations Management',
        isActive: true,
      },
    ];

    for (const userData of newUsers) {
      const existing = await User.findOne({ where: { email: userData.email } });
      if (!existing) {
        // Need to hash password properly
        const bcrypt = require('bcryptjs');
        userData.password = await bcrypt.hash('password123', 10);
        await User.create(userData);
        console.log(`✅ Created user: ${userData.name} (${userData.email})`);
      }
    }

    // Update existing users
    for (const { email, update } of userUpdates) {
      const user = await User.findOne({ where: { email } });
      if (user) {
        // Check if target email already exists
        const targetUser = await User.findOne({ where: { email: update.email } });
        if (targetUser && targetUser.id !== user.id) {
          console.log(`⏭️  Target email ${update.email} already exists, skipping update of ${email}`);
          continue;
        }
        
        await user.update(update);
        console.log(`✅ Updated ${user.name} -> ${update.name} (${update.email})`);
      } else {
        console.log(`⏭️  User not found: ${email}`);
      }
    }

    // Ensure elizabeth.johnson has correct role
    const elizabeth = await User.findOne({ where: { email: 'elizabeth.johnson@company.com' } });
    if (elizabeth) {
      if (elizabeth.userId !== 'user8') {
        await elizabeth.update({ userId: 'user8', role: 'Management' });
        console.log(`✅ Updated Elizabeth Johnson to user8 with Management role`);
      } else if (elizabeth.role !== 'Management') {
        await elizabeth.update({ role: 'Management' });
        console.log(`✅ Updated Elizabeth Johnson role to Management`);
      }
    }

    console.log('\n✅ User updates completed');
    console.log('📝 All users have password: password123');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating users:', error);
    process.exit(1);
  }
};

updateUsers();



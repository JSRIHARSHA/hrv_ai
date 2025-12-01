const bcrypt = require('bcryptjs');
const { connectDB, sequelize } = require('../config/database');
const User = require('../models/User');
require('dotenv').config();

const createManagementUsers = async () => {
  try {
    await connectDB();

    console.log('🔄 Connecting to PostgreSQL...\n');

    // Management users to create
    const managementUsers = [
      {
        userId: 'admin001',
        name: 'Admin',
        email: 'sriharshajvs@gmail.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Management',
        team: 'Executive Leadership',
        isActive: true,
      },
      {
        userId: 'admin002',
        name: 'Admin 1',
        email: 'sriharsha@hrvpharma.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Management',
        team: 'Executive Leadership',
        isActive: true,
      },
      {
        userId: 'admin003',
        name: 'Sowjanya',
        email: 'sowjanya.kopperla@hrvpharma.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Management',
        team: 'Executive Leadership',
        isActive: true,
      },
    ];

    console.log('📝 Creating Management users...\n');

    for (const userData of managementUsers) {
      // Check if user exists by email
      const existingUserByEmail = await User.findOne({ 
        where: { email: userData.email } 
      });

      // Check if user exists by userId
      const existingUserById = await User.findOne({ 
        where: { userId: userData.userId } 
      });

      if (existingUserByEmail) {
        // Update existing user if found by email
        console.log(`⚠️  User with email ${userData.email} already exists. Updating...`);
        await existingUserByEmail.update({
          name: userData.name,
          role: 'Management',
          team: userData.team,
          isActive: true,
          password: userData.password, // Always update password to ensure it's correct
        });
        console.log(`✅ Updated user: ${userData.name} (${userData.email})`);
      } else if (existingUserById) {
        // Update existing user if found by userId
        console.log(`⚠️  User with userId ${userData.userId} already exists. Updating...`);
        await existingUserById.update({
          name: userData.name,
          email: userData.email,
          role: 'Management',
          team: userData.team,
          isActive: true,
          password: userData.password, // Always update password to ensure it's correct
        });
        console.log(`✅ Updated user: ${userData.name} (${userData.email})`);
      } else {
        // Create new user
        await User.create(userData);
        console.log(`✅ Created user: ${userData.name} (${userData.email})`);
      }
    }

    console.log('\n✅ Management users setup completed!');
    console.log('📝 Default password for all users: password123');
    console.log('👥 Users created/updated:');
    console.log('   - Admin (sriharshajvs@gmail.com)');
    console.log('   - Admin 1 (sriharsha@hrvpharma.com)');
    console.log('   - Sowjanya (sowjanya.kopperla@hrvpharma.com)');
    console.log('\n💡 All users have role: Management');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating management users:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('   This usually means a user with the same email or userId already exists.');
      console.error('   The script will update existing users instead.');
    }
    await sequelize.close();
    process.exit(1);
  }
};

// Run if executed directly
if (require.main === module) {
  createManagementUsers();
}

module.exports = { createManagementUsers };


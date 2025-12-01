const { connectDB, sequelize } = require('../config/database');
const User = require('../models/User');
require('dotenv').config();

const checkUsers = async () => {
  try {
    await connectDB();
    console.log('Connected to PostgreSQL\n');

    const users = await User.findAll({
      attributes: ['userId', 'name', 'email', 'role', 'isActive'],
    });

    if (users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('📝 Run: node scripts/seedUsers.js to create users\n');
    } else {
      console.log(`✅ Found ${users.length} users in database:\n`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
        console.log(`   Password: password123\n`);
      });
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking users:', error);
    process.exit(1);
  }
};

checkUsers();



const { connectDB, sequelize } = require('../config/database');
const User = require('../models/User');
require('dotenv').config();

const updateUserRoles = async () => {
  try {
    await connectDB();
    console.log('Connected to PostgreSQL\n');

    // Update existing users to match frontend roles
    const updates = [
      { email: 'elizabeth.johnson@company.com', role: 'Management' },
      // Update any other users that need role changes
    ];

    for (const update of updates) {
      const user = await User.findOne({ where: { email: update.email } });
      if (user) {
        await user.update({ role: update.role });
        console.log(`✅ Updated ${user.name} (${user.email}) role to: ${update.role}`);
      } else {
        console.log(`⏭️  User not found: ${update.email}`);
      }
    }

    // Also update any users with 'Higher_Management' to 'Management'
    const higherMgmtUsers = await User.findAll({ 
      where: { role: 'Higher_Management' } 
    });
    
    for (const user of higherMgmtUsers) {
      await user.update({ role: 'Management' });
      console.log(`✅ Updated ${user.name} (${user.email}) role from Higher_Management to Management`);
    }

    console.log('\n✅ User role updates completed');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating user roles:', error);
    process.exit(1);
  }
};

updateUserRoles();



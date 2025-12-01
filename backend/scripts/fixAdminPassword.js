const bcrypt = require('bcryptjs');
const { connectDB, sequelize } = require('../config/database');
const User = require('../models/User');
require('dotenv').config();

const fixAdminPassword = async () => {
  try {
    await connectDB();
    console.log('🔄 Connecting to PostgreSQL...\n');

    const adminEmail = 'sriharshajvs@gmail.com';
    const newPassword = 'password123';

    // Find the Admin user
    const adminUser = await User.findOne({ 
      where: { 
        email: adminEmail.toLowerCase().trim() 
      } 
    });

    if (!adminUser) {
      console.log(`❌ User with email ${adminEmail} not found!`);
      console.log('📝 Creating Admin user...');
      
      // Create the Admin user
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await User.create({
        userId: 'admin001',
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'Management',
        team: 'Executive Leadership',
        isActive: true,
      });
      
      console.log(`✅ Created Admin user: ${adminEmail}`);
    } else {
      console.log(`✅ Found Admin user: ${adminUser.name} (${adminUser.email})`);
      console.log('🔄 Updating password...');
      
      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await adminUser.update({
        password: hashedPassword,
        isActive: true,
        role: 'Management',
      });
      
      console.log(`✅ Password updated for Admin user`);
    }

    // Verify the password works
    console.log('\n🔍 Verifying password...');
    const verifyUser = await User.findOne({ 
      where: { email: adminEmail.toLowerCase().trim() } 
    });
    
    if (verifyUser) {
      const isPasswordValid = await bcrypt.compare(newPassword, verifyUser.password);
      if (isPasswordValid) {
        console.log('✅ Password verification successful!');
      } else {
        console.log('❌ Password verification failed!');
      }
    }

    console.log('\n📝 Login Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${newPassword}`);
    console.log('\n✅ Admin user is ready to use!');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing Admin password:', error);
    await sequelize.close();
    process.exit(1);
  }
};

// Run if executed directly
if (require.main === module) {
  fixAdminPassword();
}

module.exports = { fixAdminPassword };



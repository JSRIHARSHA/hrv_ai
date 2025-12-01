/**
 * Script to generate ERD documentation
 * This script queries the database and generates ERD information
 */

const { sequelize } = require('../config/database');
const User = require('../models/User');
const Order = require('../models/Order');
const Supplier = require('../models/Supplier');
const Material = require('../models/Material');

async function generateERDInfo() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get table information
    const tables = ['users', 'suppliers', 'materials', 'orders'];
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    DATABASE ERD INFORMATION                   ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const tableName of tables) {
      const [results] = await sequelize.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position;
      `);

      console.log(`┌─────────────────────────────────────────────────────────────┐`);
      console.log(`│ ${tableName.toUpperCase().padEnd(59)} │`);
      console.log(`├─────────────────────────────────────────────────────────────┤`);
      
      for (const col of results) {
        const name = col.column_name.padEnd(25);
        const type = col.data_type === 'character varying' 
          ? `VARCHAR(${col.character_maximum_length})`
          : col.data_type.toUpperCase();
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        
        console.log(`│ ${name} │ ${type.padEnd(15)} │ ${nullable.padEnd(8)}${defaultVal.padEnd(10)} │`);
      }
      
      console.log(`└─────────────────────────────────────────────────────────────┘\n`);
    }

    // Get foreign key relationships
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                      FOREIGN KEY RELATIONSHIPS                 ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const [fks] = await sequelize.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `);

    if (fks.length === 0) {
      console.log('No foreign key constraints found (relationships may be in JSONB fields)\n');
    } else {
      for (const fk of fks) {
        console.log(`• ${fk.table_name}.${fk.column_name}`);
        console.log(`  → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        console.log(`  ON UPDATE: ${fk.update_rule}, ON DELETE: ${fk.delete_rule}\n`);
      }
    }

    // Get record counts
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                         RECORD COUNTS                          ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const userCount = await User.count();
    const supplierCount = await Supplier.count();
    const materialCount = await Material.count();
    const orderCount = await Order.count();

    console.log(`Users:        ${userCount.toString().padStart(6)}`);
    console.log(`Suppliers:    ${supplierCount.toString().padStart(6)}`);
    console.log(`Materials:    ${materialCount.toString().padStart(6)}`);
    console.log(`Orders:       ${orderCount.toString().padStart(6)}\n`);

    // Get relationship statistics
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    RELATIONSHIP STATISTICS                    ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const materialsWithSuppliers = await Material.count({
      where: { supplierId: { [sequelize.Op.ne]: null } }
    });
    
    console.log(`Materials with Suppliers: ${materialsWithSuppliers} / ${materialCount}`);
    console.log(`  (${((materialsWithSuppliers / materialCount) * 100).toFixed(1)}% linked)\n`);

    await sequelize.close();
    console.log('✅ ERD information generated successfully');
  } catch (error) {
    console.error('❌ Error generating ERD info:', error);
    await sequelize.close();
    process.exit(1);
  }
}

if (require.main === module) {
  generateERDInfo();
}

module.exports = { generateERDInfo };


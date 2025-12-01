require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('../config/database');
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * Seed products from CSV file
 * Usage: node backend/scripts/seedProducts.js
 */
const seedProducts = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Sync database to create tables if they don't exist
    console.log('📋 Syncing database models...');
    await sequelize.sync({ alter: false });
    console.log('✅ Database models synchronized');

    const csvPath = path.join(__dirname, '../../public/HRV GLobal Items Master file.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found at: ${csvPath}`);
      console.log('Please ensure the CSV file is in the public folder');
      process.exit(1);
    }

    const products = [];
    let rowCount = 0;

    return new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          rowCount++;
          
          // Skip empty rows
          if (!row['Item Name'] || row['Item Name'].trim() === '') {
            return;
          }

          // Generate productId
          const productId = `PROD${String(rowCount).padStart(6, '0')}`;

          const product = {
            productId,
            itemId: row['Item ID'] || null,
            itemName: row['Item Name'] || '',
            sku: row['SKU'] || null,
            upc: row['UPC'] || null,
            hsnSac: row['HSN/SAC'] || null,
            categoryName: row['Category Name'] || null,
            productType: row['Product Type'] || null,
            unitName: row['Unit Name'] || null,
            defaultSalesUnitName: row['Default Sales Unit Name'] || null,
            defaultPurchaseUnitName: row['Default Purchase Unit Name'] || null,
            vendor: row['Vendor'] || null,
            warehouseName: row['Warehouse Name'] || null,
            status: row['Status'] || 'Active',
            taxable: row['Taxable']?.toLowerCase() === 'true' || true,
            intraStateTaxRate: row['Intra State Tax Rate'] ? parseFloat(row['Intra State Tax Rate']) : null,
            interStateTaxRate: row['Inter State Tax Rate'] ? parseFloat(row['Inter State Tax Rate']) : null,
            inventoryAccount: row['Inventory Account'] || null,
            reorderPoint: row['Reorder Point'] ? parseFloat(row['Reorder Point']) : null,
            stockOnHand: row['Stock On Hand'] ? parseFloat(row['Stock On Hand']) : 0,
            itemType: row['Item Type'] || null,
            isActive: true
          };

          products.push(product);
        })
        .on('end', async () => {
          try {
            console.log(`📦 Found ${products.length} products to import`);

            // Clear existing products (optional - comment out if you want to keep existing)
            // await Product.destroy({ where: {}, truncate: true });
            // console.log('🗑️  Cleared existing products');

            // Bulk insert products
            const batchSize = 100;
            let imported = 0;
            let skipped = 0;

            for (let i = 0; i < products.length; i += batchSize) {
              const batch = products.slice(i, i + batchSize);
              
              try {
                const created = await Product.bulkCreate(batch, {
                  ignoreDuplicates: true,
                  returning: true
                });
                imported += created.length;
                skipped += (batch.length - created.length);
                console.log(`✅ Imported batch ${Math.floor(i / batchSize) + 1}: ${created.length} products (${skipped} skipped)`);
              } catch (error) {
                console.error(`❌ Error importing batch ${Math.floor(i / batchSize) + 1}:`, error.message);
                // Try individual inserts for this batch
                for (const product of batch) {
                  try {
                    await Product.create(product);
                    imported++;
                  } catch (err) {
                    skipped++;
                    if (err.name !== 'SequelizeUniqueConstraintError') {
                      console.error(`❌ Error importing product ${product.itemName}:`, err.message);
                    }
                  }
                }
              }
            }

            console.log(`\n✅ Seeding completed!`);
            console.log(`   Imported: ${imported} products`);
            console.log(`   Skipped: ${skipped} products (duplicates or errors)`);
            
            await sequelize.close();
            resolve();
          } catch (error) {
            console.error('❌ Error during bulk insert:', error);
            await sequelize.close();
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('❌ Error reading CSV file:', error);
          reject(error);
        });
    });
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedProducts()
    .then(() => {
      console.log('✅ Seed script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed script failed:', error);
      process.exit(1);
    });
}

module.exports = seedProducts;


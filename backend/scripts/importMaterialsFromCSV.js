const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { sequelize } = require('../config/database');
const Material = require('../models/Material');
const Supplier = require('../models/Supplier');
const { Op } = require('sequelize');

// CSV file path - adjust as needed
const CSV_FILE_PATH = path.join(__dirname, '../../HRV GLobal Items Master file.csv');

// Helper function to parse boolean values
const parseBoolean = (value) => {
  if (!value) return false;
  const str = value.toString().toUpperCase().trim();
  return str === 'TRUE' || str === '1' || str === 'YES';
};

// Helper function to parse decimal values
const parseDecimal = (value) => {
  if (!value || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
};

// Helper function to parse integer values
const parseInteger = (value) => {
  if (!value || value === '') return null;
  const num = parseInt(value);
  return isNaN(num) ? null : num;
};

// Helper function to parse date values
const parseDate = (value) => {
  if (!value || value === '') return null;
  try {
    return new Date(value);
  } catch (e) {
    return null;
  }
};

// Map CSV columns to database fields
const mapCSVToMaterial = (row) => {
  return {
    itemId: row['Item ID'] || row['itemId'] || null,
    itemName: row['Item Name'] || row['itemName'] || null,
    sku: row['SKU'] || row['sku'] || null,
    upc: row['UPC'] || row['upc'] || null,
    isReturnableItem: parseBoolean(row['Is Returnable Item'] || row['isReturnableItem']),
    hsnSac: row['HSN/SAC'] || row['hsnSac'] || null,
    dimensionUnit: row['Dimension Unit'] || row['dimensionUnit'] || 'cm',
    weightUnit: row['Weight Unit'] || row['weightUnit'] || 'kg',
    isReceivableService: parseBoolean(row['Is Receivable Service'] || row['isReceivableService']),
    taxable: parseBoolean(row['Taxable'] || row['taxable']),
    taxabilityType: row['Taxability Type'] || row['taxabilityType'] || null,
    productType: row['Product Type'] || row['productType'] || null,
    categoryName: row['Category Name'] || row['categoryName'] || null,
    parentCategory: row['Parent Category'] || row['parentCategory'] || null,
    intraStateTaxName: row['Intra State Tax Name'] || row['intraStateTaxName'] || null,
    intraStateTaxRate: parseDecimal(row['Intra State Tax Rate'] || row['intraStateTaxRate']),
    intraStateTaxType: row['Intra State Tax Type'] || row['intraStateTaxType'] || null,
    interStateTaxName: row['Inter State Tax Name'] || row['interStateTaxName'] || null,
    interStateTaxRate: parseDecimal(row['Inter State Tax Rate'] || row['interStateTaxRate']),
    interStateTaxType: row['Inter State Tax Type'] || row['interStateTaxType'] || null,
    source: row['Source'] || row['source'] || null,
    referenceId: row['Reference ID'] || row['referenceId'] || null,
    lastSyncTime: parseDate(row['Last Sync Time'] || row['lastSyncTime']),
    status: row['Status'] || row['status'] || 'Active',
    usageUnit: row['Usage unit'] || row['usageUnit'] || null,
    unitName: row['Unit Name'] || row['unitName'] || null,
    defaultSalesUnitName: row['Default Sales Unit Name'] || row['defaultSalesUnitName'] || null,
    defaultSalesUnitSymbol: row['Default Sales Unit Symbol'] || row['defaultSalesUnitSymbol'] || null,
    defaultPurchaseUnitName: row['Default Purchase Unit Name'] || row['defaultPurchaseUnitName'] || null,
    defaultPurchaseUnitSymbol: row['Default Purchase Unit Symbol'] || row['defaultPurchaseUnitSymbol'] || null,
    inventoryAccount: row['Inventory Account'] || row['inventoryAccount'] || null,
    inventoryAccountCode: row['Inventory Account Code'] || row['inventoryAccountCode'] || null,
    inventoryValuationMethod: row['Inventory Valuation Method'] || row['inventoryValuationMethod'] || null,
    reorderPoint: parseInteger(row['Reorder Point'] || row['reorderPoint']),
    vendor: row['Vendor'] || row['vendor'] || null,
    warehouseName: row['Warehouse Name'] || row['warehouseName'] || null,
    openingStock: parseInteger(row['Opening Stock'] || row['openingStock']),
    openingStockValue: parseDecimal(row['Opening Stock Value'] || row['openingStockValue']),
    stockOnHand: parseInteger(row['Stock On Hand'] || row['stockOnHand']) || 0,
    itemType: row['Item Type'] || row['itemType'] || null
  };
};

// Function to find or create supplier by name
const findOrCreateSupplier = async (vendorName) => {
  if (!vendorName || vendorName.trim() === '') {
    return null;
  }

  // Try to find existing supplier by name
  let supplier = await Supplier.findOne({
    where: { name: { [Op.iLike]: vendorName.trim() } }
  });

  if (!supplier) {
    // Create a basic supplier entry if not found
    // Generate a supplierId
    const lastSupplier = await Supplier.findOne({
      order: [['id', 'DESC']]
    });
    const nextId = lastSupplier ? parseInt(lastSupplier.supplierId.replace('SUP', '')) + 1 : 1;
    const supplierId = `SUP${String(nextId).padStart(3, '0')}`;

    supplier = await Supplier.create({
      supplierId: supplierId,
      name: vendorName.trim(),
      country: 'India',
      isActive: true
    });
    console.log(`✅ Created new supplier: ${supplier.name} (${supplier.supplierId})`);
  }

  return supplier;
};

// Main import function
const importMaterialsFromCSV = async () => {
  try {
    console.log('🔄 Starting material import from CSV...');
    console.log(`📁 CSV file path: ${CSV_FILE_PATH}`);

    // Check if file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.error(`❌ CSV file not found at: ${CSV_FILE_PATH}`);
      console.error('Please ensure the CSV file exists at the specified path.');
      process.exit(1);
    }

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const materials = [];
    let rowCount = 0;
    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Read and parse CSV file
    return new Promise((resolve, reject) => {
      fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', async (row) => {
          rowCount++;
          
          try {
            const materialData = mapCSVToMaterial(row);
            
            // Validate required fields
            if (!materialData.itemId || !materialData.itemName) {
              console.warn(`⚠️  Skipping row ${rowCount}: Missing itemId or itemName`);
              errorCount++;
              return;
            }

            // Find or create supplier if vendor is provided
            if (materialData.vendor) {
              const supplier = await findOrCreateSupplier(materialData.vendor);
              if (supplier) {
                materialData.supplierId = supplier.id;
              }
            }

            // Check if material already exists
            const existingMaterial = await Material.findOne({
              where: { itemId: materialData.itemId }
            });

            if (existingMaterial) {
              // Update existing material
              await existingMaterial.update(materialData);
              updatedCount++;
              if (updatedCount % 100 === 0) {
                console.log(`📝 Updated ${updatedCount} materials...`);
              }
            } else {
              // Create new material
              materials.push(materialData);
              
              // Batch insert every 100 records
              if (materials.length >= 100) {
                await Material.bulkCreate(materials, {
                  ignoreDuplicates: true
                });
                importedCount += materials.length;
                console.log(`📦 Imported ${importedCount} materials...`);
                materials.length = 0; // Clear array
              }
            }
          } catch (error) {
            console.error(`❌ Error processing row ${rowCount}:`, error.message);
            errorCount++;
          }
        })
        .on('end', async () => {
          try {
            // Insert remaining materials
            if (materials.length > 0) {
              await Material.bulkCreate(materials, {
                ignoreDuplicates: true
              });
              importedCount += materials.length;
            }

            console.log('\n✅ Import completed!');
            console.log(`📊 Total rows processed: ${rowCount}`);
            console.log(`✅ New materials imported: ${importedCount}`);
            console.log(`🔄 Existing materials updated: ${updatedCount}`);
            console.log(`❌ Errors: ${errorCount}`);
            
            // Get total count
            const totalMaterials = await Material.count();
            console.log(`📦 Total materials in database: ${totalMaterials}`);
            
            await sequelize.close();
            resolve();
          } catch (error) {
            console.error('❌ Error during final import:', error);
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
    console.error('❌ Import failed:', error);
    await sequelize.close();
    process.exit(1);
  }
};

// Run import if script is executed directly
if (require.main === module) {
  importMaterialsFromCSV()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { importMaterialsFromCSV };


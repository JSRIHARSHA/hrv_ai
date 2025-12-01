const fs = require('fs');
const path = require('path');
const { connectDB, sequelize } = require('../config/database');
const Supplier = require('../models/Supplier');
require('dotenv').config();

/**
 * Parse CSV text into rows (handles quoted fields with commas and newlines)
 */
function parseCSV(csvText) {
  const rows = [];
  const lines = csvText.split(/\r?\n/);
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    if (!inQuotes && line.trim() === '') {
      i++;
      continue;
    }

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          j++;
        } else if (inQuotes && (nextChar === ',' || nextChar === undefined || nextChar === '\r' || nextChar === '\n')) {
          inQuotes = false;
        } else if (!inQuotes) {
          inQuotes = true;
        } else {
          currentField += char;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (inQuotes) {
      currentField += '\n';
      i++;
    } else {
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        currentField = '';
      }
      if (currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
      }
      i++;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Convert CSV rows to Supplier objects
 */
function convertCSVRowsToSuppliers(rows) {
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());
  const suppliers = [];

  const getColumnIndex = (name) => {
    return headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
  };

  const companyNameIdx = getColumnIndex('Company Name');
  const sourceOfSupplyIdx = getColumnIndex('Source of Supply');
  const gstinIdx = getColumnIndex('GST Identification Number (GSTIN)');
  const billingAddressIdx = getColumnIndex('Billing Address');
  const billingStreet2Idx = getColumnIndex('Billing Street2');
  const billingCityIdx = getColumnIndex('Billing City');
  const billingStateIdx = getColumnIndex('Billing State');
  const billingCountryIdx = getColumnIndex('Billing Country');
  const shippingAddressIdx = getColumnIndex('Shipping Address');
  const shippingStreet2Idx = getColumnIndex('Shipping Street2');
  const shippingCityIdx = getColumnIndex('Shipping City');
  const shippingStateIdx = getColumnIndex('Shipping State');
  const shippingCountryIdx = getColumnIndex('Shipping Country');

  let supplierCounter = 1;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    if (row.every(cell => !cell || !cell.trim())) continue;

    const companyName = row[companyNameIdx]?.trim();
    if (!companyName) continue;

    const sourceOfSupply = row[sourceOfSupplyIdx]?.trim() || null;
    const gstin = row[gstinIdx]?.trim() || null;

    // Billing address
    const billingAddress1 = row[billingAddressIdx]?.trim() || '';
    const billingAddress2 = row[billingStreet2Idx]?.trim() || '';
    const billingAddress = [billingAddress1, billingAddress2].filter(a => a && a.trim()).join(', ');
    const billingCity = row[billingCityIdx]?.trim() || null;
    const billingState = row[billingStateIdx]?.trim() || null;
    const billingCountry = row[billingCountryIdx]?.trim() || 'India';

    // Shipping address
    const shippingAddress1 = row[shippingAddressIdx]?.trim() || '';
    const shippingAddress2 = row[shippingStreet2Idx]?.trim() || '';
    const shippingAddress = [shippingAddress1, shippingAddress2].filter(a => a && a.trim()).join(', ');
    const shippingCity = row[shippingCityIdx]?.trim() || null;
    const shippingState = row[shippingStateIdx]?.trim() || null;
    const shippingCountry = row[shippingCountryIdx]?.trim() || 'India';

    // Use shipping address as primary address, fallback to billing
    const primaryAddress = shippingAddress || billingAddress;
    const primaryCity = shippingCity || billingCity;
    const primaryState = shippingState || billingState;
    const primaryCountry = shippingCountry || billingCountry;

    // Clean up address
    let cleanAddress = primaryAddress || companyName;
    cleanAddress = cleanAddress.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();

    // Generate email from company name
    const emailBase = companyName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '.')
      .substring(0, 50);
    const email = `${emailBase}@example.com`;

    const supplierId = `SUP${String(supplierCounter).padStart(3, '0')}`;
    supplierCounter++;

    suppliers.push({
      supplierId,
      name: companyName,
      address: cleanAddress,
      city: primaryCity,
      state: primaryState,
      country: primaryCountry,
      email: email,
      phone: 'N/A',
      gstin: gstin,
      sourceOfSupply: sourceOfSupply,
      billingAddress: billingAddress || null,
      billingStreet2: billingAddress2 || null,
      billingCity: billingCity,
      billingState: billingState,
      billingCountry: billingCountry,
      shippingAddress: shippingAddress || null,
      shippingStreet2: shippingAddress2 || null,
      shippingCity: shippingCity,
      shippingState: shippingState,
      shippingCountry: shippingCountry,
      specialties: [],
      rating: 0,
      isActive: true
    });
  }

  return suppliers;
}

const { Op } = require('sequelize');

const seedSuppliers = async () => {
  try {
    await connectDB();

    console.log('Connected to PostgreSQL');

    // Read CSV file
    const csvPath = path.join(__dirname, '../../public/HRV_Global_Life_of_Vendors.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found at: ${csvPath}`);
      console.log('Please ensure HRV_Global_Life_of_Vendors.csv is in the public folder');
      process.exit(1);
    }

    console.log(`Reading CSV file: ${csvPath}`);
    const csvText = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvText);
    const suppliers = convertCSVRowsToSuppliers(rows);

    console.log(`Found ${suppliers.length} suppliers in CSV`);

    // Clear existing suppliers (optional - comment out if you don't want to clear)
    // await Supplier.destroy({ where: {}, truncate: true });
    // console.log('Cleared existing suppliers');

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const supplierData of suppliers) {
      try {
        const existingSupplier = await Supplier.findOne({
          where: {
            [Op.or]: [
              { supplierId: supplierData.supplierId },
              { gstin: supplierData.gstin },
              { name: supplierData.name }
            ]
          }
        });

        if (existingSupplier) {
          console.log(`⏭️  Supplier already exists: ${supplierData.name} (${supplierData.supplierId})`);
          skippedCount++;
        } else {
          await Supplier.create(supplierData);
          console.log(`✅ Created supplier: ${supplierData.name} (${supplierData.supplierId})`);
          createdCount++;
        }
      } catch (error) {
        console.error(`❌ Error creating supplier ${supplierData.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n✅ Supplier seeding completed');
    console.log(`📊 Created: ${createdCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📝 Total: ${suppliers.length}`);
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding suppliers:', error);
    process.exit(1);
  }
};

seedSuppliers();


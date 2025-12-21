import { Supplier } from '../data/suppliers';

interface CSVSupplierRow {
  'Company Name': string;
  'Source of Supply': string;
  'GST Identification Number (GSTIN)': string;
  'Billing Address': string;
  'Billing Street2': string;
  'Billing City': string;
  'Billing State': string;
  'Billing Country': string;
  'Shipping Address': string;
  'Shipping Street2': string;
  'Shipping City': string;
  'Shipping State': string;
  'Shipping Country': string;
}

/**
 * Parse CSV text into rows (handles quoted fields with commas and newlines)
 */
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  const lines = csvText.split(/\r?\n/);
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    if (!inQuotes && line.trim() === '') {
      // Skip empty lines when not in quotes
      i++;
      continue;
    }

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          j++; // Skip next quote
        } else if (inQuotes && (nextChar === ',' || nextChar === undefined || nextChar === '\r' || nextChar === '\n')) {
          // End of quoted field
          inQuotes = false;
        } else if (!inQuotes) {
          // Start of quoted field
          inQuotes = true;
        } else {
          currentField += char;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        currentRow.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // Handle line breaks within quoted fields
    if (inQuotes) {
      // Field continues on next line
      currentField += '\n';
      i++;
    } else {
      // End of row
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

  // Add last field and row if exists
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
function convertCSVRowsToSuppliers(rows: string[][]): Supplier[] {
  if (rows.length < 2) return []; // Need at least header and one data row

  const headers = rows[0].map(h => h.trim());
  const suppliers: Supplier[] = [];

  // Find column indices
  const getColumnIndex = (name: string): number => {
    return headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
  };

  const companyNameIdx = getColumnIndex('Company Name');
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

  // Process data rows
  let supplierCounter = 1;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    // Skip completely empty rows
    if (row.every(cell => !cell || !cell.trim())) continue;

    const companyName = row[companyNameIdx]?.trim();
    if (!companyName) continue; // Skip rows without company name

    // Use shipping address if available, otherwise billing address
    const address1 = row[shippingAddressIdx]?.trim() || row[billingAddressIdx]?.trim() || '';
    const address2 = row[shippingStreet2Idx]?.trim() || row[billingStreet2Idx]?.trim() || '';
    const fullAddress = [address1, address2].filter(a => a && a.trim()).join(', ');

    const city = row[shippingCityIdx]?.trim() || row[billingCityIdx]?.trim() || '';
    const state = row[shippingStateIdx]?.trim() || row[billingStateIdx]?.trim() || '';
    const country = row[shippingCountryIdx]?.trim() || row[billingCountryIdx]?.trim() || 'India';

    const gstin = row[gstinIdx]?.trim() || undefined;

    // Generate Supplier ID (SUP001, SUP002, etc.)
    const supplierId = `SUP${String(supplierCounter).padStart(3, '0')}`;
    supplierCounter++;

    // Clean up address - remove extra whitespace and newlines
    let cleanAddress = fullAddress || companyName;
    cleanAddress = cleanAddress.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();

    // Generate email from company name
    const emailBase = companyName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '.')
      .substring(0, 50); // Limit length
    const email = `${emailBase}@example.com`;

    const supplier: Supplier = {
      id: supplierId,
      name: companyName,
      address: cleanAddress,
      city: city || undefined,
      country: country || 'India',
      email: email,
      phone: 'N/A',
      gstin: gstin || undefined,
      isActive: true,
      specialties: [],
      rating: 0,
    };

    suppliers.push(supplier);
  }

  return suppliers;
}

/**
 * Load suppliers from CSV file
 */
export async function loadSuppliersFromCSV(): Promise<Supplier[]> {
  try {
    const response = await fetch('/HRV_Global_Life_of_Vendors.csv');
    if (!response.ok) {
      throw new Error(`Failed to load CSV file: ${response.statusText}`);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);
    const suppliers = convertCSVRowsToSuppliers(rows);

    return suppliers;
  } catch (error) {
    console.error('Error loading suppliers from CSV:', error);
    return []; // Return empty array on error
  }
}


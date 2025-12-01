# Supplier Data Model Guide

## Overview

Suppliers are now stored in PostgreSQL database instead of being loaded from CSV files. This provides better data management, search capabilities, and CRUD operations.

## Database Schema

### Suppliers Table

The `suppliers` table includes the following fields:

- **id** (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
- **supplierId** (STRING, UNIQUE) - Format: SUP001, SUP002, etc.
- **name** (STRING) - Company name
- **address** (TEXT) - Primary address
- **city** (STRING)
- **state** (STRING)
- **country** (STRING, default: 'India')
- **email** (STRING)
- **phone** (STRING)
- **gstin** (STRING) - GST Identification Number
- **sourceOfSupply** (STRING) - Source code (e.g., TS, GJ, MH)
- **billingAddress** (TEXT)
- **billingStreet2** (STRING)
- **billingCity** (STRING)
- **billingState** (STRING)
- **billingCountry** (STRING)
- **shippingAddress** (TEXT)
- **shippingStreet2** (STRING)
- **shippingCity** (STRING)
- **shippingState** (STRING)
- **shippingCountry** (STRING)
- **specialties** (JSONB) - Array of supplier specialties
- **rating** (DECIMAL) - Supplier rating (0-5)
- **lastOrderDate** (DATE) - Date of last order
- **isActive** (BOOLEAN, default: true)
- **notes** (TEXT) - Additional notes
- **createdAt** (TIMESTAMP)
- **updatedAt** (TIMESTAMP)

### Indexes

- Unique index on `supplierId`
- Index on `name`
- Index on `gstin`
- Index on `country`
- Index on `isActive`
- Index on `sourceOfSupply`

## API Endpoints

### Get All Suppliers
```
GET /api/suppliers
Query Parameters:
  - search: Search term (searches name, address, city, gstin)
  - country: Filter by country
  - sourceOfSupply: Filter by source code
  - isActive: Filter by active status (true/false)
```

### Get Supplier by ID
```
GET /api/suppliers/:supplierId
```

### Search Suppliers
```
GET /api/suppliers/search?q=search_term
```

### Create Supplier (Manager+ only)
```
POST /api/suppliers
Body: {
  name: string,
  address: string,
  city?: string,
  state?: string,
  country?: string,
  email?: string,
  phone?: string,
  gstin?: string,
  sourceOfSupply?: string,
  // ... other fields
}
```

### Update Supplier (Manager+ only)
```
PUT /api/suppliers/:supplierId
Body: { /* fields to update */ }
```

### Delete Supplier (Manager+ only - soft delete)
```
DELETE /api/suppliers/:supplierId
Sets isActive to false
```

### Hard Delete Supplier (Admin only)
```
DELETE /api/suppliers/:supplierId/hard
Permanently deletes supplier
```

### Get Supplier Statistics (Manager+ only)
```
GET /api/suppliers/stats
Returns:
  - total: Total suppliers
  - active: Active suppliers
  - inactive: Inactive suppliers
  - byCountry: Suppliers grouped by country
```

## Seeding Suppliers from CSV

To import suppliers from the CSV file:

```bash
npm run seed:suppliers
```

Or directly:
```bash
node backend/scripts/seedSuppliers.js
```

The script will:
1. Read `public/HRV_Global_Life_of_Vendors.csv`
2. Parse CSV data
3. Create Supplier records in the database
4. Skip duplicates (based on supplierId, gstin, or name)

## Frontend Integration

The frontend automatically:
1. Tries to fetch suppliers from API first
2. Falls back to CSV if API is unavailable
3. Caches suppliers in memory for performance

### Usage in Frontend

```typescript
import { getSuppliers, searchSuppliers, addSupplier } from '../data/suppliers';

// Get all suppliers
const suppliers = await getSuppliers();

// Search suppliers
const results = searchSuppliers('pharma', suppliers);

// Add new supplier (requires Manager+ role)
const newSupplier = await addSupplier({
  name: 'New Supplier',
  address: '123 Street',
  country: 'India',
  // ... other fields
});
```

## Migration from CSV

The system maintains backward compatibility:
- If API is available, suppliers are loaded from database
- If API is unavailable, suppliers are loaded from CSV file
- This ensures the application works even if the database is temporarily unavailable

## Benefits of Database Storage

1. **Better Performance**: Database queries are faster than parsing CSV
2. **Search Capabilities**: Full-text search and filtering
3. **Data Integrity**: Unique constraints and validation
4. **CRUD Operations**: Easy to add, update, or delete suppliers
5. **Relationships**: Can link suppliers to orders in the future
6. **Audit Trail**: Timestamps track when suppliers were created/updated
7. **Soft Deletes**: Suppliers can be deactivated without losing data

## Future Enhancements

- Link suppliers to orders for better tracking
- Supplier performance metrics
- Supplier rating system based on order history
- Supplier contact management
- Supplier document storage
- Supplier payment terms management



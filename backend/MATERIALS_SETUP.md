# Materials Database Setup Guide

This document explains the materials database table, API endpoints, and relationships that have been established.

## Overview

A new `materials` table has been created to store data from the "HRV GLobal Items Master" CSV file. The table includes relationships with suppliers and is accessible via REST API endpoints.

## Database Schema

### Materials Table

The `materials` table includes the following key fields:

- `id` - Primary key (auto-increment)
- `itemId` - Unique item identifier from CSV
- `itemName` - Item name
- `sku` - Stock Keeping Unit
- `upc` - Universal Product Code
- `hsnSac` - HSN/SAC code
- `vendor` - Vendor name from CSV
- `supplierId` - Foreign key to `suppliers` table
- `categoryName` - Product category
- `productType` - Type of product
- Tax information (intra-state and inter-state)
- Unit information (sales, purchase, usage)
- Inventory information (account, valuation method, stock)
- And many more fields from the CSV

### Relationships

1. **Material → Supplier** (Many-to-One)
   - Each material can belong to one supplier
   - Foreign key: `materials.supplierId` → `suppliers.id`
   - Access via: `material.getSupplier()` or `material.supplier`

2. **Supplier → Materials** (One-to-Many)
   - Each supplier can have many materials
   - Access via: `supplier.getMaterials()` or `supplier.materials`

3. **Order → Supplier** (via JSONB)
   - Currently stored as JSONB in `orders.supplier`
   - Can be enhanced with foreign key relationship if needed

4. **Order → Materials** (via JSONB)
   - Currently stored as JSONB in `orders.materials`
   - Can be enhanced with junction table for proper many-to-many relationship if needed

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

This will install `csv-parser` which is required for the import script.

### 2. Import CSV Data

Ensure the CSV file exists at the project root:
- `HRV GLobal Items Master file.csv`

Run the import script:

```bash
cd backend
node scripts/importMaterialsFromCSV.js
```

The script will:
- Read the CSV file
- Parse each row
- Create/update materials in the database
- Link materials to suppliers (creating suppliers if they don't exist)

### 3. Verify Database

After import, verify the materials table:

```sql
-- Check total materials
SELECT COUNT(*) FROM materials;

-- Check materials with suppliers
SELECT COUNT(*) FROM materials WHERE supplier_id IS NOT NULL;

-- Check categories
SELECT DISTINCT category_name FROM materials WHERE category_name IS NOT NULL;
```

## API Endpoints

All endpoints require authentication (Bearer token).

### Get All Materials

```
GET /api/materials
```

**Query Parameters:**
- `search` - Search in itemName, sku, hsnSac, itemId
- `supplierId` - Filter by supplier ID
- `categoryName` - Filter by category
- `status` - Filter by status
- `itemType` - Filter by item type
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/materials?search=fenofibrate&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 1000,
    "page": 1,
    "limit": 20,
    "totalPages": 50
  }
}
```

### Get Material by ID

```
GET /api/materials/:id
```

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/materials/1
```

### Get Material by Item ID

```
GET /api/materials/item/:itemId
```

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/materials/item/2.34877E+18
```

### Get Categories

```
GET /api/materials/categories
```

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/materials/categories
```

**Response:**
```json
{
  "success": true,
  "data": ["Anti Hypertensive", "Antidepressant", ...]
}
```

### Create Material

```
POST /api/materials
```

**Body:**
```json
{
  "itemId": "123456",
  "itemName": "Test Material",
  "sku": "TEST-001",
  "vendor": "Test Supplier",
  "categoryName": "Test Category",
  ...
}
```

### Update Material

```
PUT /api/materials/:id
```

**Body:** Same as create, with fields to update

### Delete Material

```
DELETE /api/materials/:id
```

## Frontend Integration

The frontend API service has been updated with `materialsAPI`:

```typescript
import { materialsAPI } from '../services/apiService';

// Get all materials
const materials = await materialsAPI.getAllMaterials({
  search: 'fenofibrate',
  page: 1,
  limit: 20
});

// Get material by ID
const material = await materialsAPI.getMaterialById(1);

// Get categories
const categories = await materialsAPI.getCategories();
```

## Files Created/Modified

### New Files

1. `backend/models/Material.js` - Material model
2. `backend/models/associations.js` - Model relationships
3. `backend/controllers/materialController.js` - Material controller
4. `backend/routes/materialRoutes.js` - Material routes
5. `backend/scripts/importMaterialsFromCSV.js` - CSV import script
6. `backend/scripts/README_MATERIALS_IMPORT.md` - Import script documentation

### Modified Files

1. `backend/server.js` - Added material routes
2. `backend/config/database.js` - Added Material model import and associations
3. `backend/package.json` - Added csv-parser dependency
4. `src/services/apiService.ts` - Added materialsAPI

## Next Steps

1. **Run the import script** to populate the database
2. **Test the API endpoints** using the examples above
3. **Integrate materials into the frontend** as needed
4. **Consider adding Order-Material junction table** if you need proper many-to-many relationships
5. **Consider adding Order-Supplier foreign key** if you want to replace JSONB with proper foreign key relationship

## Notes

- The import script creates suppliers automatically if vendors don't exist
- Materials are linked to suppliers via the `vendor` field in the CSV
- The script processes materials in batches of 100 for efficiency
- Duplicate `itemId` values will update existing records
- All API endpoints require authentication


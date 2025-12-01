# Material Import Script

This script imports materials from the "HRV GLobal Items Master file.csv" into the PostgreSQL database.

## Prerequisites

1. Ensure the CSV file exists at the root of the project: `HRV GLobal Items Master file.csv`
2. Database connection is configured in `backend/.env`
3. Dependencies are installed: `npm install` (csv-parser will be installed)

## Usage

### Import Materials from CSV

```bash
cd backend
node scripts/importMaterialsFromCSV.js
```

## What the Script Does

1. **Reads the CSV file** from the project root
2. **Parses each row** and maps CSV columns to database fields
3. **Creates or updates materials** in the database:
   - If a material with the same `itemId` exists, it updates it
   - Otherwise, it creates a new material
4. **Links materials to suppliers**:
   - If a `vendor` name is provided in the CSV, it tries to find a matching supplier
   - If no supplier is found, it creates a new supplier entry
   - Links the material to the supplier via `supplierId` foreign key

## CSV Column Mapping

The script maps CSV columns to database fields:

- `Item ID` → `itemId`
- `Item Name` → `itemName`
- `SKU` → `sku`
- `UPC` → `upc`
- `HSN/SAC` → `hsnSac`
- `Vendor` → `vendor` (and creates supplier link)
- `Category Name` → `categoryName`
- `Product Type` → `productType`
- And many more fields...

## Database Relationships

After import, the following relationships are established:

1. **Material → Supplier** (Many-to-One)
   - Each material can belong to one supplier
   - Foreign key: `materials.supplierId` → `suppliers.id`

2. **Supplier → Materials** (One-to-Many)
   - Each supplier can have many materials
   - Access via: `supplier.getMaterials()`

## API Endpoints

After import, materials can be accessed via:

- `GET /api/materials` - Get all materials (with pagination and filters)
- `GET /api/materials/:id` - Get material by ID
- `GET /api/materials/item/:itemId` - Get material by itemId
- `GET /api/materials/categories` - Get all categories
- `POST /api/materials` - Create new material
- `PUT /api/materials/:id` - Update material
- `DELETE /api/materials/:id` - Delete material

## Example API Calls

```bash
# Get all materials
curl http://localhost:3001/api/materials

# Search materials
curl http://localhost:3001/api/materials?search=fenofibrate

# Get materials by supplier
curl http://localhost:3001/api/materials?supplierId=1

# Get materials by category
curl http://localhost:3001/api/materials?categoryName=Anti%20Hypertensive

# Get categories
curl http://localhost:3001/api/materials/categories
```

## Notes

- The script processes materials in batches of 100 for efficiency
- Duplicate `itemId` values will update existing records
- Supplier matching is case-insensitive
- The script will create basic supplier entries if vendors don't exist in the database


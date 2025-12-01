# Database Seeding Guide

This guide explains how to seed the PostgreSQL database with Product Master Data and Freight Handler data.

## Prerequisites

1. PostgreSQL database is set up and running
2. Database connection is configured in `backend/.env`
3. All required npm packages are installed (`npm install` in backend folder)
4. CSV file is available at `public/HRV GLobal Items Master file.csv` (for products)

## Seeding Products

The product seed script reads from the CSV file located at `public/HRV GLobal Items Master file.csv`.

### Steps:

1. Ensure the CSV file exists:
   ```
   public/HRV GLobal Items Master file.csv
   ```

2. Run the seed script:
   ```bash
   cd backend
   node scripts/seedProducts.js
   ```

3. The script will:
   - Connect to the database
   - Read the CSV file
   - Parse and import all products
   - Skip duplicates (products with existing productId)
   - Display progress and summary

### Notes:
- Products are imported in batches of 100
- Duplicate products (based on productId) are automatically skipped
- The script generates productId in the format: `PROD000001`, `PROD000002`, etc.
- To clear existing products before seeding, uncomment the truncate line in the script

## Seeding Freight Handlers

The freight handler seed script uses predefined mock data.

### Steps:

1. Run the seed script:
   ```bash
   cd backend
   node scripts/seedFreightHandlers.js
   ```

2. The script will:
   - Connect to the database
   - Import 5 predefined freight handlers
   - Skip duplicates (freight handlers with existing freightHandlerId)
   - Display progress and summary

### Notes:
- Freight handlers are imported one by one
- Duplicate freight handlers (based on freightHandlerId) are automatically skipped
- The script uses freightHandlerId: `FH001`, `FH002`, etc.
- To clear existing freight handlers before seeding, uncomment the truncate line in the script

## Troubleshooting

### CSV File Not Found
- Ensure the CSV file is in the `public` folder at the root of the project
- Check the file path: `public/HRV GLobal Items Master file.csv`

### Database Connection Error
- Verify your `.env` file has correct database credentials
- Check that PostgreSQL is running
- Test connection: `node -e "require('./config/database').connectDB()"`

### Import Errors
- Check database logs for detailed error messages
- Ensure all required fields in the models are provided
- Verify CSV format matches expected columns

## API Endpoints

After seeding, you can access the data via:

### Products:
- `GET /api/products` - Get all products
- `GET /api/products/:productId` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:productId` - Update product
- `DELETE /api/products/:productId` - Delete product
- `POST /api/products/bulk` - Bulk create products

### Freight Handlers:
- `GET /api/freight-handlers` - Get all freight handlers
- `GET /api/freight-handlers/:freightHandlerId` - Get freight handler by ID
- `POST /api/freight-handlers` - Create new freight handler
- `PUT /api/freight-handlers/:freightHandlerId` - Update freight handler
- `DELETE /api/freight-handlers/:freightHandlerId` - Delete freight handler
- `POST /api/freight-handlers/bulk` - Bulk create freight handlers

All endpoints require authentication (JWT token in Authorization header).


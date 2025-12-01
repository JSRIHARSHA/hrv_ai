# MongoDB to PostgreSQL Migration Guide

This document outlines the changes made to migrate from MongoDB to PostgreSQL.

## Changes Summary

### 1. Dependencies
- **Removed**: `mongoose` (MongoDB ODM)
- **Added**: `sequelize` (PostgreSQL ORM), `pg` (PostgreSQL client), `pg-hstore` (hstore support)

### 2. Database Connection
- **File**: `backend/config/database.js`
- **Changes**: 
  - Replaced Mongoose connection with Sequelize
  - Uses PostgreSQL connection string or individual config variables
  - Auto-syncs models in development (use migrations in production)

### 3. Models
- **User Model**: Converted from Mongoose schema to Sequelize model
  - Uses standard SQL types (INTEGER, STRING, ENUM, BOOLEAN, DATE)
  - Maintains same field structure
  
- **Order Model**: Converted from Mongoose schema to Sequelize model
  - Nested objects stored as JSONB (PostgreSQL's JSON binary format)
  - Maintains same field structure
  - ENUM types for status and entity fields

### 4. Controllers
- **authController.js**: Updated all queries
  - `User.findOne({ email })` → `User.findOne({ where: { email } })`
  - `User.findById()` → `User.findByPk()`
  - `User.create()` remains the same
  - `user.save()` remains the same

- **orderController.js**: Updated all queries
  - `Order.find()` → `Order.findAll()`
  - `Order.findOne({ orderId })` → `Order.findOne({ where: { orderId } })`
  - `Order.findOneAndUpdate()` → `Order.update()` + `Order.findOne()`
  - `Order.findOneAndDelete()` → `Order.destroy()`
  - JSONB field queries filtered in JavaScript (for simplicity)

### 5. Middleware
- **auth.js**: Updated to use `User.findByPk()` instead of `User.findById()`

### 6. Scripts
- **seedUsers.js**: Updated to use Sequelize connection and queries

### 7. Server
- **server.js**: Updated database connection import and health check

## Environment Variables

### Old (MongoDB)
```env
MONGODB_URI=mongodb://localhost:27017/pharma-order-management
```

### New (PostgreSQL)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pharma_order_management
# Or individual variables:
POSTGRES_DB=pharma_order_management
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

## Data Migration

If you have existing MongoDB data:

1. **Export from MongoDB**:
   ```bash
   mongoexport --db pharma-order-management --collection users --out users.json
   mongoexport --db pharma-order-management --collection orders --out orders.json
   ```

2. **Transform and Import to PostgreSQL**:
   - Use a script to convert JSON to SQL INSERT statements
   - Or use the API endpoints to recreate orders
   - Or manually import through the application

## Key Differences

### Query Syntax
- **MongoDB**: `Model.find({ field: value })`
- **PostgreSQL/Sequelize**: `Model.findAll({ where: { field: value } })`

### Nested Objects
- **MongoDB**: Native nested document support
- **PostgreSQL**: Uses JSONB for nested objects (similar functionality, better performance)

### IDs
- **MongoDB**: Uses `_id` (ObjectId)
- **PostgreSQL**: Uses `id` (INTEGER, auto-increment)

### Indexes
- **MongoDB**: Automatic indexing on common fields
- **PostgreSQL**: Explicit indexes defined in model (JSONB indexes can be added via migrations)

## Testing Checklist

- [ ] Database connection works
- [ ] User registration works
- [ ] User login works
- [ ] Order creation works
- [ ] Order retrieval works
- [ ] Order update works
- [ ] Order status update works
- [ ] Comments work
- [ ] Timeline events work
- [ ] Document attachment works
- [ ] User queries (my-orders, team-orders) work
- [ ] Seed script works

## Notes

- JSONB queries are currently filtered in JavaScript for simplicity
- For better performance with large datasets, consider using PostgreSQL JSONB operators
- In production, use Sequelize migrations instead of `sync()`
- Consider adding GIN indexes for JSONB fields for better query performance



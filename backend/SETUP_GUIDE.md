# Backend Setup Guide - Complete Step-by-Step Instructions

This guide will walk you through setting up the backend with PostgreSQL and the Supplier data model.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [PostgreSQL Installation](#postgresql-installation)
3. [Database Setup](#database-setup)
4. [Backend Installation](#backend-installation)
5. [Environment Configuration](#environment-configuration)
6. [Database Connection Test](#database-connection-test)
7. [Supplier Data Model Setup](#supplier-data-model-setup)
8. [Import Suppliers from CSV](#import-suppliers-from-csv)
9. [Verification](#verification)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
- **npm** (comes with Node.js)
- **Git** (optional, if cloning repository)
- **Text Editor** (VS Code recommended)

### Verify Installations

```bash
# Check Node.js version
node --version
# Should show v16.x.x or higher

# Check npm version
npm --version
# Should show 8.x.x or higher

# Check PostgreSQL version
psql --version
# Should show 12.x or higher
```

---

## PostgreSQL Installation

### Windows

1. **Download PostgreSQL**
   - Visit: https://www.postgresql.org/download/windows/
   - Download the installer (PostgreSQL 18.x)
   - Run the installer

2. **Installation Steps**
   - Click "Next" through the setup wizard
   - **Important**: Remember the password you set for the `postgres` user
   - Default port: `5432` (keep this)
   - Installation directory: `C:\Program Files\PostgreSQL\18`
   - Complete the installation

3. **Verify Installation**
   ```bash
   # Open Command Prompt or PowerShell
   psql --version
   # Should show: psql (PostgreSQL) 18.x
   ```

4. **Start PostgreSQL Service**
   - Press `Win + R`, type `services.msc`
   - Find "postgresql-x64-18" (or "PostgreSQL 18")
   - Right-click → Start (if not running)
   - Or set it to "Automatic" startup
   
   **Alternative Command:**
   ```bash
   # Open Command Prompt as Administrator
   net start postgresql-x64-18
   ```

### macOS

1. **Using Homebrew** (Recommended)
   ```bash
   # Install Homebrew if not installed
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # Install PostgreSQL
   brew install postgresql@14
   
   # Start PostgreSQL service
   brew services start postgresql@14
   ```

2. **Or Download Installer**
   - Visit: https://www.postgresql.org/download/macosx/
   - Download and install the .dmg file

### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## Database Setup

### Step 1: Access PostgreSQL

**Windows:**
```bash
# Open Command Prompt
# Navigate to PostgreSQL bin directory
cd "C:\Program Files\PostgreSQL\18\bin"
psql -U postgres

# Or add PostgreSQL to PATH and use directly:
psql -U postgres
```

**macOS/Linux:**
```bash
# Switch to postgres user
sudo -u postgres psql
# Or if you have a postgres user:
psql -U postgres
```

### Step 2: Create Database

Once in PostgreSQL prompt (`postgres=#`), run:

```sql
-- Create the database
CREATE DATABASE pharma_order_management;

-- Verify database was created
\l
-- You should see 'pharma_order_management' in the list

-- Exit psql
\q
```

### Step 3: Create Database User (Optional but Recommended)

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create a new user (replace 'your_password' with a strong password)
CREATE USER pharma_user WITH PASSWORD 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE pharma_order_management TO pharma_user;

-- Exit
\q
```

**Note**: If you skip this step, you'll use the default `postgres` user.

---

## Backend Installation

### Step 1: Navigate to Backend Directory

```bash
# From project root
cd backend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `sequelize` (PostgreSQL ORM)
- `pg` (PostgreSQL client)
- `pg-hstore` (hstore support)
- `express` (Web framework)
- `bcryptjs` (Password hashing)
- `jsonwebtoken` (JWT authentication)
- And other dependencies

**Expected Output:**
```
added 250 packages, and audited 251 packages in 15s
```

### Step 3: Verify Installation

```bash
# Check if node_modules exists
ls node_modules

# Should see folders like: express, sequelize, pg, etc.
```

---

## Environment Configuration

### Step 1: Create .env File

In the `backend` directory, create a file named `.env`:

```bash
# Windows (Command Prompt)
cd backend
type nul > .env

# Windows (PowerShell)
cd backend
New-Item -ItemType File -Name .env

# macOS/Linux
cd backend
touch .env
```

### Step 2: Configure .env File

Open `.env` in a text editor and add the following:

```env
# PostgreSQL Database Configuration
# Option 1: Using DATABASE_URL (recommended)
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/pharma_order_management

# Option 2: Using individual variables (alternative)
# POSTGRES_DB=pharma_order_management
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=your_password
# POSTGRES_HOST=localhost
# POSTGRES_PORT=5432

# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# JWT Secret (change this to a random string in production)
JWT_SECRET=your-secret-key-change-this-in-production-use-random-string

# CORS (optional)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Important Notes:**
- Replace `your_password` with your actual PostgreSQL password
- Replace `your-secret-key-change-this-in-production-use-random-string` with a strong random string
- If you created a custom user, use that username instead of `postgres`

### Step 3: Verify .env File

```bash
# Check if .env exists
ls -la .env
# or on Windows:
dir .env
```

---

## Database Connection Test

### Step 1: Test Connection

```bash
# From backend directory
node -e "require('dotenv').config(); const { sequelize } = require('./config/database'); sequelize.authenticate().then(() => { console.log('✅ Connection successful!'); process.exit(0); }).catch(err => { console.error('❌ Connection failed:', err.message); process.exit(1); });"
```

**Expected Output:**
```
✅ Connection successful!
```

**If you see an error:**
- Check PostgreSQL is running
- Verify password in `.env` file
- Check database name is correct
- Ensure database exists

### Step 2: Start Backend Server (Test)

```bash
# From backend directory
npm start
```

**Expected Output:**
```
🚀 ========================================
🚀 Backend API Server running on 0.0.0.0:3001
📊 PostgreSQL Database: pharma_order_management
📁 Upload directory: /path/to/uploads
🐍 Python script: /path/to/universal_pdf_extractor.py
🔗 Health check: http://localhost:3001/health
🌐 API Base: http://localhost:3001/api
🚀 ========================================
✅ PostgreSQL connected successfully
✅ Database models synchronized
```

**Press `Ctrl+C` to stop the server.**

---

## Supplier Data Model Setup

### Step 1: Verify Supplier Model

The Supplier model is already created at `backend/models/Supplier.js`. Verify it exists:

```bash
# From backend directory
ls models/Supplier.js
```

### Step 2: Verify Database Sync

When you start the server, Sequelize will automatically:
1. Create the `suppliers` table if it doesn't exist
2. Create all necessary indexes
3. Set up the schema

**To manually sync (optional):**

```bash
# Start the server once to create tables
npm start
# Wait for "Database models synchronized"
# Press Ctrl+C to stop
```

### Step 3: Verify Table Creation

Connect to PostgreSQL and check:

```bash
psql -U postgres -d pharma_order_management
```

```sql
-- List all tables
\dt

-- Should see: users, orders, suppliers

-- Check suppliers table structure
\d suppliers

-- Should show all columns: id, supplierId, name, address, etc.

-- Exit
\q
```

---

## Import Suppliers from CSV

### Step 1: Verify CSV File Location

Ensure your CSV file is in the correct location:

```bash
# From project root
ls public/HRV_Global_Life_of_Vendors.csv
```

**File should be at:** `public/HRV_Global_Life_of_Vendors.csv`

### Step 2: Run Seed Script

**Option A: Using npm script (from project root)**
```bash
npm run seed:suppliers
```

**Option B: Direct execution (from project root)**
```bash
node backend/scripts/seedSuppliers.js
```

**Option C: From backend directory**
```bash
cd backend
node scripts/seedSuppliers.js
```

### Step 3: Monitor Seed Process

**Expected Output:**
```
Connected to PostgreSQL
Reading CSV file: /path/to/public/HRV_Global_Life_of_Vendors.csv
Found 354 suppliers in CSV
✅ Created supplier: ARCH PHARMALABS LIMITED (SUP001)
✅ Created supplier: CTX LIFESCIENCES PVT LTD (SUP002)
✅ Created supplier: VASUDHA PHARMA CHEM LIMITED-AP (SUP003)
...
✅ Supplier seeding completed
📊 Created: 354
⏭️  Skipped: 0
❌ Errors: 0
📝 Total: 354
```

### Step 4: Handle Duplicates

If you run the seed script multiple times:
- Existing suppliers (by supplierId, gstin, or name) will be skipped
- Only new suppliers will be created
- This is safe to run multiple times

### Step 5: Verify Imported Data

```bash
psql -U postgres -d pharma_order_management
```

```sql
-- Count suppliers
SELECT COUNT(*) FROM suppliers;
-- Should show the number of suppliers imported

-- View first 10 suppliers
SELECT supplierId, name, country, gstin FROM suppliers LIMIT 10;

-- Check for specific supplier
SELECT * FROM suppliers WHERE name LIKE '%ARCH%';

-- Exit
\q
```

---

## Verification

### Step 1: Test API Endpoints

Start the backend server:

```bash
cd backend
npm start
```

In another terminal, test the API:

```bash
# Get all suppliers (requires authentication)
curl http://localhost:3001/api/suppliers

# Health check (no auth required)
curl http://localhost:3001/health
```

### Step 2: Test from Frontend

1. Start the frontend:
   ```bash
   npm start
   ```

2. Login to the application

3. Navigate to "Create Order" or "Supplier Master Data"

4. Check if suppliers load in the dropdown

### Step 3: Verify Supplier Search

Test the search functionality:

```bash
# Search suppliers (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/suppliers/search?q=pharma"
```

---

## Troubleshooting

### Issue 1: PostgreSQL Connection Failed

**Error:** `❌ PostgreSQL connection error: password authentication failed`

**Solutions:**
1. Verify password in `.env` file matches PostgreSQL password
2. Check if PostgreSQL service is running
3. Try resetting PostgreSQL password:
   ```sql
   psql -U postgres
   ALTER USER postgres PASSWORD 'new_password';
   ```
4. Update `.env` with new password

### Issue 2: Database Does Not Exist

**Error:** `database "pharma_order_management" does not exist`

**Solution:**
```sql
psql -U postgres
CREATE DATABASE pharma_order_management;
\q
```

### Issue 3: CSV File Not Found

**Error:** `❌ CSV file not found at: /path/to/public/HRV_Global_Life_of_Vendors.csv`

**Solutions:**
1. Verify CSV file exists at `public/HRV_Global_Life_of_Vendors.csv`
2. Check file permissions
3. Ensure you're running the script from the correct directory

### Issue 4: Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3001`

**Solutions:**
1. Find and kill the process:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   
   # macOS/Linux
   lsof -ti:3001 | xargs kill -9
   ```
2. Or change PORT in `.env` file

### Issue 5: Module Not Found

**Error:** `Cannot find module 'sequelize'`

**Solution:**
```bash
cd backend
npm install
```

### Issue 6: Permission Denied

**Error:** `permission denied for table suppliers`

**Solution:**
```sql
psql -U postgres -d pharma_order_management
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
\q
```

### Issue 7: Suppliers Not Loading in Frontend

**Solutions:**
1. Check browser console for errors
2. Verify backend is running on port 3001
3. Check CORS settings in `.env`
4. Verify authentication token is valid
5. Check network tab in browser DevTools

### Issue 8: Duplicate Supplier IDs

**Error:** `duplicate key value violates unique constraint`

**Solution:**
The seed script handles duplicates automatically. If you see this error:
1. Check if suppliers table already has data
2. The script will skip existing suppliers
3. Or manually delete and re-seed:
   ```sql
   DELETE FROM suppliers;
   ```

---

## Quick Reference Commands

```bash
# Start backend
cd backend
npm start

# Start backend in development mode (with auto-reload)
cd backend
npm run dev

# Seed users
npm run seed:users

# Seed suppliers
npm run seed:suppliers

# Test database connection
psql -U postgres -d pharma_order_management

# Check PostgreSQL service status
# Windows: services.msc
# macOS: brew services list
# Linux: sudo systemctl status postgresql
```

---

## Next Steps

After successful setup:

1. ✅ **Create Users**: Run `npm run seed:users` to create demo users
2. ✅ **Import Suppliers**: Run `npm run seed:suppliers` to import suppliers
3. ✅ **Start Backend**: Run `npm start` or `npm run dev`
4. ✅ **Start Frontend**: Run `npm start` from project root
5. ✅ **Test Application**: Login and verify suppliers load correctly

---

## Support

If you encounter issues not covered in this guide:

1. Check the error message carefully
2. Review the logs in the terminal
3. Verify all prerequisites are installed
4. Check PostgreSQL logs:
   - Windows: `C:\Program Files\PostgreSQL\18\data\log\`
   - macOS/Linux: `/var/log/postgresql/`
5. Review the `backend/README.md` for additional information

---

## Production Deployment Notes

For production deployment:

1. **Change JWT_SECRET** to a strong random string
2. **Use environment variables** for all sensitive data
3. **Enable SSL** for PostgreSQL connections
4. **Use connection pooling** (already configured)
5. **Set up database backups**
6. **Use migrations** instead of `sync()` for schema changes
7. **Enable logging** and monitoring
8. **Set up proper firewall rules**

---

**Setup Complete!** 🎉

Your backend is now ready with the Supplier data model. You can start using the API endpoints to manage suppliers.


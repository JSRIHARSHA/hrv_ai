# Windows Setup Guide - PostgreSQL 18

This guide is specifically tailored for Windows users with PostgreSQL 18 installed at `C:\Program Files\PostgreSQL\18`.

## Your PostgreSQL Installation

- **Location**: `C:\Program Files\PostgreSQL\18`
- **Version**: PostgreSQL 18
- **Default Port**: 5432
- **Service Name**: `postgresql-x64-18` or `PostgreSQL 18`

## Step 1: Add PostgreSQL to PATH (Recommended)

This allows you to use `psql` from any directory.

### Option A: Via System Properties

1. Press `Win + X` and select "System"
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "System variables", find "Path" and click "Edit"
5. Click "New" and add: `C:\Program Files\PostgreSQL\18\bin`
6. Click "OK" on all dialogs
7. **Close and reopen** Command Prompt/PowerShell

### Option B: Via Command (Run PowerShell as Administrator)

```powershell
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\PostgreSQL\18\bin", "Machine")
```

Then close and reopen your terminal.

### Verify PATH

```bash
# Open new Command Prompt or PowerShell
psql --version
# Should show: psql (PostgreSQL) 18.x
```

## Step 2: Start PostgreSQL Service

### Method 1: Services Manager

1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Find "PostgreSQL 18" or "postgresql-x64-18"
4. Right-click → "Start" (if not running)
5. Right-click → "Properties" → Set "Startup type" to "Automatic"

### Method 2: Command Line (Run as Administrator)

```bash
# Open Command Prompt as Administrator
net start postgresql-x64-18
```

### Verify Service is Running

```bash
sc query postgresql-x64-18
# Should show: STATE: 4 RUNNING
```

## Step 3: Access PostgreSQL

### Using Full Path (If PATH not set)

```bash
cd "C:\Program Files\PostgreSQL\18\bin"
psql -U postgres
```

### Using psql Directly (If PATH is set)

```bash
psql -U postgres
```

**Enter your PostgreSQL password when prompted.**

## Step 4: Create Database

Once in PostgreSQL prompt (`postgres=#`):

```sql
-- Create the database
CREATE DATABASE pharma_order_management;

-- Verify it was created
\l

-- You should see 'pharma_order_management' in the list

-- Exit PostgreSQL
\q
```

## Step 5: Configure Backend

### Navigate to Backend Directory

```bash
cd C:\Users\SRIHARSHA\Desktop\HRVNHG\APP\backend
```

### Create .env File

**Using PowerShell:**
```powershell
cd C:\Users\SRIHARSHA\Desktop\HRVNHG\APP\backend
@"
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/pharma_order_management
PORT=3001
JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=development
"@ | Out-File -FilePath .env -Encoding utf8
```

**Or manually create** `backend\.env` file with:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/pharma_order_management
PORT=3001
JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=development
```

**⚠️ Replace `YOUR_PASSWORD` with the password you set during PostgreSQL installation!**

## Step 6: Install Backend Dependencies

```bash
cd C:\Users\SRIHARSHA\Desktop\HRVNHG\APP\backend
npm install
```

## Step 7: Test Database Connection

```bash
cd C:\Users\SRIHARSHA\Desktop\HRVNHG\APP\backend
node -e "require('dotenv').config(); const { sequelize } = require('./config/database'); sequelize.authenticate().then(() => { console.log('✅ Connection successful!'); process.exit(0); }).catch(err => { console.error('❌ Connection failed:', err.message); process.exit(1); });"
```

**Expected Output:**
```
✅ Connection successful!
```

## Step 8: Create Database Tables

```bash
cd C:\Users\SRIHARSHA\Desktop\HRVNHG\APP\backend
npm start
```

Wait for:
```
✅ PostgreSQL connected successfully
✅ Database models synchronized
```

Then press `Ctrl+C` to stop.

## Step 9: Import Suppliers

```bash
# From project root
cd C:\Users\SRIHARSHA\Desktop\HRVNHG\APP
npm run seed:suppliers
```

## Step 10: Verify Setup

### Check Suppliers Table

```bash
# Using full path
cd "C:\Program Files\PostgreSQL\18\bin"
psql -U postgres -d pharma_order_management
```

```sql
-- Count suppliers
SELECT COUNT(*) FROM suppliers;

-- View first 5 suppliers
SELECT supplierId, name, country FROM suppliers LIMIT 5;

-- Exit
\q
```

### Start Backend

```bash
cd C:\Users\SRIHARSHA\Desktop\HRVNHG\APP\backend
npm start
```

## Common Windows Issues

### Issue 1: "psql is not recognized"

**Solution:** Add PostgreSQL to PATH (see Step 1) or use full path:
```bash
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres
```

### Issue 2: "Service not found"

**Solution:** Check service name:
```bash
sc query | findstr postgresql
```

Common names:
- `postgresql-x64-18`
- `PostgreSQL 18`
- `postgresql-x64-18-server`

### Issue 3: "Permission denied"

**Solution:** Run Command Prompt as Administrator:
1. Press `Win + X`
2. Select "Windows PowerShell (Admin)" or "Command Prompt (Admin)"

### Issue 4: "Port 5432 already in use"

**Solution:** Check what's using the port:
```bash
netstat -ano | findstr :5432
```

Kill the process if needed:
```bash
taskkill /PID <PID> /F
```

### Issue 5: "Password authentication failed"

**Solution:** Reset PostgreSQL password:
```bash
cd "C:\Program Files\PostgreSQL\18\bin"
psql -U postgres
```

```sql
ALTER USER postgres PASSWORD 'new_password';
\q
```

Then update `.env` file with the new password.

## Quick Reference - Windows Commands

```bash
# Start PostgreSQL service
net start postgresql-x64-18

# Stop PostgreSQL service
net stop postgresql-x64-18

# Check service status
sc query postgresql-x64-18

# Connect to PostgreSQL
cd "C:\Program Files\PostgreSQL\18\bin"
psql -U postgres

# Connect to specific database
psql -U postgres -d pharma_order_management

# View PostgreSQL logs
notepad "C:\Program Files\PostgreSQL\18\data\log\postgresql-*.log"
```

## Your Specific Paths

- **PostgreSQL Bin**: `C:\Program Files\PostgreSQL\18\bin`
- **PostgreSQL Data**: `C:\Program Files\PostgreSQL\18\data`
- **PostgreSQL Logs**: `C:\Program Files\PostgreSQL\18\data\log\`
- **Backend Directory**: `C:\Users\SRIHARSHA\Desktop\HRVNHG\APP\backend`
- **Project Root**: `C:\Users\SRIHARSHA\Desktop\HRVNHG\APP`

## Next Steps

1. ✅ Add PostgreSQL to PATH
2. ✅ Start PostgreSQL service
3. ✅ Create database
4. ✅ Configure backend
5. ✅ Import suppliers
6. ✅ Start backend server

**You're all set!** 🎉



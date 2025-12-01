# Commands Reference - Copy & Paste Ready

All commands you need, ready to copy and paste. Run them in order.

## 1. Verify Prerequisites

```bash
node --version
npm --version
psql --version
```

## 2. Start PostgreSQL Service

**Windows:**
```bash
# Open Services (Win+R, type: services.msc)
# Find "postgresql-x64-18" or "PostgreSQL 18" and start it
# OR use command (run as Administrator):
net start postgresql-x64-18
```

**macOS:**
```bash
brew services start postgresql@14
```

**Linux:**
```bash
sudo systemctl start postgresql
```

## 3. Create Database

```bash
psql -U postgres
```

Then in PostgreSQL prompt:
```sql
CREATE DATABASE pharma_order_management;
\l
\q
```

## 4. Install Backend Dependencies

```bash
cd backend
npm install
```

## 5. Create .env File

**Windows (PowerShell):**
```powershell
cd backend
@"
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/pharma_order_management
PORT=3001
JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=development
"@ | Out-File -FilePath .env -Encoding utf8
```

**macOS/Linux:**
```bash
cd backend
cat > .env << EOF
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/pharma_order_management
PORT=3001
JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=development
EOF
```

**Or manually create** `backend/.env` with:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/pharma_order_management
PORT=3001
JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=development
```

**⚠️ IMPORTANT:** Replace `YOUR_PASSWORD` with your actual PostgreSQL password!

## 6. Test Database Connection

```bash
cd backend
node -e "require('dotenv').config(); const { sequelize } = require('./config/database'); sequelize.authenticate().then(() => { console.log('✅ Connection successful!'); process.exit(0); }).catch(err => { console.error('❌ Connection failed:', err.message); process.exit(1); });"
```

## 7. Create Database Tables

```bash
cd backend
npm start
```

Wait for:
```
✅ PostgreSQL connected successfully
✅ Database models synchronized
```

Then press `Ctrl+C` to stop.

## 8. Verify Tables Created

```bash
psql -U postgres -d pharma_order_management
```

```sql
\dt
\d suppliers
\q
```

## 9. Seed Users (Optional but Recommended)

```bash
npm run seed:users
```

## 10. Import Suppliers from CSV

```bash
npm run seed:suppliers
```

Expected output:
```
✅ Supplier seeding completed
📊 Created: 354
⏭️  Skipped: 0
❌ Errors: 0
```

## 11. Verify Suppliers Imported

```bash
psql -U postgres -d pharma_order_management
```

```sql
SELECT COUNT(*) FROM suppliers;
SELECT supplierId, name, country FROM suppliers LIMIT 5;
\q
```

## 12. Start Backend Server

```bash
cd backend
npm start
```

Keep this terminal open. Server should show:
```
🚀 Backend API Server running on 0.0.0.0:3001
✅ PostgreSQL connected successfully
```

## 13. Test API (In New Terminal)

```bash
curl http://localhost:3001/health
```

Should return:
```json
{"status":"OK","message":"Backend API is running",...}
```

## 14. Start Frontend (In New Terminal)

```bash
# From project root
npm start
```

## 15. Verify in Browser

1. Open http://localhost:3000
2. Login (use seeded user credentials)
3. Navigate to "Create Order"
4. Check supplier dropdown loads

---

## Development Mode Commands

### Start Backend in Development (Auto-reload)
```bash
cd backend
npm run dev
```

### Start Both Frontend and Backend
```bash
# From project root
npm run dev
```

---

## Database Management Commands

### Connect to Database
```bash
psql -U postgres -d pharma_order_management
```

### View All Suppliers
```sql
SELECT * FROM suppliers;
```

### Count Suppliers
```sql
SELECT COUNT(*) FROM suppliers;
```

### Search Suppliers
```sql
SELECT * FROM suppliers WHERE name LIKE '%pharma%';
```

### View Table Structure
```sql
\d suppliers
```

### Delete All Suppliers (Re-seed)
```sql
DELETE FROM suppliers;
```

### Exit PostgreSQL
```sql
\q
```

---

## Troubleshooting Commands

### Check PostgreSQL Status
**Windows:**
```bash
sc query postgresql-x64-18
# Or check in Services:
# Win+R → services.msc → Look for "PostgreSQL 18"
```

**macOS:**
```bash
brew services list
```

**Linux:**
```bash
sudo systemctl status postgresql
```

### Find Process Using Port 3001
**Windows:**
```bash
netstat -ano | findstr :3001
```

**macOS/Linux:**
```bash
lsof -ti:3001
```

### Kill Process on Port 3001
**Windows:**
```bash
taskkill /PID <PID> /F
```

**macOS/Linux:**
```bash
lsof -ti:3001 | xargs kill -9
```

### Check PostgreSQL Logs
**Windows:**
```
C:\Program Files\PostgreSQL\18\data\log\
```

**macOS/Linux:**
```bash
tail -f /var/log/postgresql/postgresql-14-main.log
```

### Reset PostgreSQL Password
```sql
psql -U postgres
ALTER USER postgres PASSWORD 'new_password';
\q
```

---

## Quick Reset (Start Over)

If you need to start completely fresh:

```bash
# 1. Drop and recreate database
psql -U postgres
DROP DATABASE pharma_order_management;
CREATE DATABASE pharma_order_management;
\q

# 2. Restart backend (creates tables)
cd backend
npm start
# Wait for sync, then Ctrl+C

# 3. Re-seed
npm run seed:users
npm run seed:suppliers
```

---

## Production Commands

### Build Frontend
```bash
npm run build
```

### Start Production Server
```bash
cd backend
NODE_ENV=production npm start
```

---

## Useful Aliases (Optional)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# PostgreSQL shortcuts
alias pg-start='brew services start postgresql@14'  # macOS
alias pg-stop='brew services stop postgresql@14'
alias pg-status='brew services list | grep postgresql'

# Database shortcuts
alias db-connect='psql -U postgres -d pharma_order_management'
alias db-seed-suppliers='npm run seed:suppliers'
alias db-seed-users='npm run seed:users'

# Server shortcuts
alias backend-start='cd backend && npm start'
alias backend-dev='cd backend && npm run dev'
```

Then reload:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

---

**All commands are ready to copy and paste!** Just replace `YOUR_PASSWORD` with your actual PostgreSQL password.


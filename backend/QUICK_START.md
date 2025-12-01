# Quick Start Guide - Supplier Data Model Setup

## TL;DR - Fast Setup (5 minutes)

### 1. Install PostgreSQL
```bash
# Windows: Download from postgresql.org
# macOS: brew install postgresql@14 && brew services start postgresql@14
# Linux: sudo apt install postgresql && sudo systemctl start postgresql
```

### 2. Create Database
```bash
psql -U postgres
CREATE DATABASE pharma_order_management;
\q
```

### 3. Configure Backend
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/pharma_order_management
PORT=3001
JWT_SECRET=your-secret-key-change-this
NODE_ENV=development
```

### 4. Start Backend (Creates Tables)
```bash
cd backend
npm start
# Wait for "Database models synchronized"
# Press Ctrl+C
```

### 5. Import Suppliers
```bash
npm run seed:suppliers
```

### 6. Verify
```bash
# Start backend
cd backend
npm start

# In another terminal, test
curl http://localhost:3001/health
```

**Done!** ✅

For detailed instructions, see `SETUP_GUIDE.md`



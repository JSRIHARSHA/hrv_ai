# Setup Checklist - Supplier Data Model

Use this checklist to track your progress. Check off each item as you complete it.

## Pre-Setup Verification

- [ ] Node.js installed (v16+)
  ```bash
  node --version
  ```
- [ ] npm installed
  ```bash
  npm --version
  ```
- [ ] PostgreSQL installed (v12+)
  ```bash
  psql --version
  ```
- [ ] PostgreSQL service is running
  - Windows: Check Services (services.msc)
  - macOS: `brew services list`
  - Linux: `sudo systemctl status postgresql`

## Database Setup

- [ ] PostgreSQL service started
- [ ] Accessed PostgreSQL command line
  ```bash
  psql -U postgres
  ```
- [ ] Created database
  ```sql
  CREATE DATABASE pharma_order_management;
  ```
- [ ] Verified database exists
  ```sql
  \l
  ```
- [ ] Exited PostgreSQL
  ```sql
  \q
  ```

## Backend Installation

- [ ] Navigated to backend directory
  ```bash
  cd backend
  ```
- [ ] Installed dependencies
  ```bash
  npm install
  ```
- [ ] Verified node_modules exists
  ```bash
  ls node_modules
  ```

## Environment Configuration

- [ ] Created `.env` file in backend directory
- [ ] Added DATABASE_URL with correct password
- [ ] Added PORT=3001
- [ ] Added JWT_SECRET (changed from default)
- [ ] Added NODE_ENV=development
- [ ] Verified .env file exists
  ```bash
  ls -la .env
  ```

## Database Connection Test

- [ ] Tested database connection
  ```bash
  node -e "require('dotenv').config(); const { sequelize } = require('./config/database'); sequelize.authenticate().then(() => { console.log('✅ Connection successful!'); process.exit(0); }).catch(err => { console.error('❌ Connection failed:', err.message); process.exit(1); });"
  ```
- [ ] Connection successful ✅

## Supplier Model Setup

- [ ] Verified Supplier model exists
  ```bash
  ls models/Supplier.js
  ```
- [ ] Started backend server once
  ```bash
  npm start
  ```
- [ ] Saw "Database models synchronized" message
- [ ] Stopped server (Ctrl+C)
- [ ] Verified suppliers table exists
  ```bash
  psql -U postgres -d pharma_order_management
  \dt
  \d suppliers
  \q
  ```

## CSV File Verification

- [ ] Verified CSV file exists
  ```bash
  ls public/HRV_Global_Life_of_Vendors.csv
  ```
- [ ] CSV file is readable
- [ ] CSV file contains supplier data

## Import Suppliers

- [ ] Ran seed script
  ```bash
  npm run seed:suppliers
  ```
- [ ] Saw "Supplier seeding completed" message
- [ ] Verified suppliers were created
  ```sql
  SELECT COUNT(*) FROM suppliers;
  ```
- [ ] Checked a few supplier records
  ```sql
  SELECT supplierId, name, country FROM suppliers LIMIT 10;
  ```

## API Verification

- [ ] Started backend server
  ```bash
  cd backend
  npm start
  ```
- [ ] Tested health endpoint
  ```bash
  curl http://localhost:3001/health
  ```
- [ ] Health check returns OK ✅

## Frontend Integration

- [ ] Started frontend
  ```bash
  npm start
  ```
- [ ] Logged into application
- [ ] Navigated to supplier dropdown
- [ ] Verified suppliers load correctly
- [ ] Tested supplier search functionality

## Final Verification

- [ ] Backend running on port 3001
- [ ] Frontend running on port 3000
- [ ] Can create orders with suppliers
- [ ] Suppliers appear in dropdown
- [ ] No errors in browser console
- [ ] No errors in backend logs

---

## Troubleshooting Checklist

If something doesn't work:

- [ ] Checked PostgreSQL is running
- [ ] Verified password in .env is correct
- [ ] Checked database exists
- [ ] Verified CSV file path is correct
- [ ] Checked backend logs for errors
- [ ] Checked browser console for errors
- [ ] Verified port 3001 is not in use
- [ ] Checked firewall settings
- [ ] Reviewed SETUP_GUIDE.md troubleshooting section

---

## Notes

Write any issues or notes here:

```
Date: ___________
Issue: 
Solution: 

Date: ___________
Issue: 
Solution: 
```

---

**Setup Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Date Completed:** ___________

**Setup By:** ___________



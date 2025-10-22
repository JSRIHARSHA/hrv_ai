# MongoDB Integration Setup Guide

## Overview

This guide will help you set up MongoDB database integration for the Pharmaceutical Order Management System.

## 🚀 Quick Start

### Step 1: Install MongoDB

**Option A: Local MongoDB (Recommended for Development)**

1. **Download MongoDB Community Edition**
   - Visit: https://www.mongodb.com/try/download/community
   - Select your OS (Windows)
   - Download and run the installer
   - Choose "Complete" installation
   - Install MongoDB as a Windows Service (recommended)

2. **Verify Installation**
   ```bash
   # Open Command Prompt and run:
   mongod --version
   ```

**Option B: MongoDB Atlas (Cloud - Free Tier Available)**

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Configure database access (create user/password)
4. Whitelist your IP address (or use 0.0.0.0/0 for testing)
5. Get connection string
6. Update `MONGODB_URI` in backend configuration

### Step 2: Install Backend Dependencies

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install
```

### Step 3: Configure Environment

Create a `.env` file in the `backend` folder:

**For Local MongoDB:**
```env
MONGODB_URI=mongodb://localhost:27017/pharma-order-management
PORT=3001
JWT_SECRET=pharma-order-management-secret-key-2024
NODE_ENV=development
```

**For MongoDB Atlas:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pharma-order-management
PORT=3001
JWT_SECRET=pharma-order-management-secret-key-2024
NODE_ENV=production
```

### Step 4: Seed Initial Data

```bash
# From backend folder
node scripts/seedUsers.js
```

This creates demo users:
- sarah.chen@company.com (Employee)
- michael.rodriguez@company.com (Employee)
- priya.sharma@company.com (Employee)
- jennifer.kim@company.com (Employee)
- david.thompson@company.com (Employee)
- robert.martinez@company.com (Manager)
- elizabeth.johnson@company.com (Higher Management)

**All users have password:** `password123`

### Step 5: Start the Backend Server

**Option A: Using the batch file (Windows)**
```bash
# From project root
start-backend.bat
```

**Option B: Manual start**
```bash
cd backend
node server.js
```

**Option C: Development mode with auto-reload**
```bash
cd backend
npm run dev
```

### Step 6: Verify Backend is Running

1. Open browser and go to: http://localhost:3001/health
2. You should see:
   ```json
   {
     "status": "OK",
     "message": "Backend API is running",
     "timestamp": "...",
     "database": "Connected"
   }
   ```

### Step 7: Start the Frontend

In a new terminal:
```bash
# From project root
npm start
```

Frontend will run on http://localhost:3000

## 📊 Data Storage Architecture

### Before (Without MongoDB)
```
Frontend → localStorage (Browser) → Excel Export/Import
```

### After (With MongoDB)
```
Frontend → API (REST) → MongoDB (Database)
           ↓
        localStorage (Backup)
           ↓
        Excel Export/Import
```

## 🔄 How It Works

### 1. Data Flow
- **Create Order**: Frontend → API → MongoDB → Response → Frontend State → localStorage backup
- **Read Orders**: API → MongoDB → Frontend State → localStorage backup
- **Update Order**: Frontend → API → MongoDB → Response → Frontend State → localStorage backup

### 2. Fallback Mechanism
If API is not available:
- Frontend falls back to localStorage
- If localStorage is empty, uses mock data
- User can still work offline

### 3. Data Persistence
- **Primary**: MongoDB database (persistent, shared across devices)
- **Secondary**: localStorage (browser backup, device-specific)
- **Tertiary**: Excel export (manual backup)

## 🔒 Security

### Authentication Flow
1. User logs in with email/password
2. Backend verifies credentials
3. Backend returns JWT token (24h expiration)
4. Frontend stores token in localStorage
5. Token sent with every API request
6. Backend verifies token on protected routes

### Password Security
- Passwords hashed with bcryptjs (10 salt rounds)
- Never stored in plain text
- Never sent to frontend

### API Security
- JWT authentication required for all protected routes
- Rate limiting (100 requests per 15 minutes)
- Helmet.js for HTTP security headers
- CORS protection
- File upload validation

## 📱 Testing the Integration

### 1. Test Authentication
1. Go to http://localhost:3000/login
2. Login with: sarah.chen@company.com / password123
3. Check browser console for "✅ Orders loaded from API"

### 2. Test Order Creation
1. Click "Create Order with AI"
2. Upload a PDF or manually create order
3. Check MongoDB Compass to see the new order
4. Verify order appears in frontend

### 3. Test Order Updates
1. Open any order
2. Make changes to fields
3. Click Save
4. Check MongoDB to verify updates

### 4. Test Document Upload
1. Go to order with appropriate status
2. Upload a document (PDF)
3. Verify document appears in Documents section
4. Check MongoDB - document data should be stored

## 🔧 MongoDB Management

### Using MongoDB Compass (GUI Tool)

1. **Download & Install**
   - https://www.mongodb.com/products/compass

2. **Connect**
   - Connection String: `mongodb://localhost:27017`
   - Click "Connect"

3. **View Data**
   - Database: `pharma-order-management`
   - Collections: `users`, `orders`

4. **Query Data**
   ```javascript
   // Find all orders with status 'Completed'
   { status: 'Completed' }
   
   // Find orders by user
   { 'assignedTo.userId': 'user1' }
   
   // Find recent orders
   db.orders.find().sort({ createdAt: -1 }).limit(10)
   ```

### Using MongoDB Shell

```bash
# Connect to MongoDB
mongo

# Switch to database
use pharma-order-management

# View collections
show collections

# Count orders
db.orders.count()

# Find all orders
db.orders.find().pretty()

# Find orders by status
db.orders.find({ status: 'PO_Received_from_Client' })

# Update order
db.orders.updateOne(
  { orderId: 'ORD-2024-001' },
  { $set: { status: 'Completed' } }
)
```

## 🐛 Troubleshooting

### Backend won't start
- Check if MongoDB is running: `mongod --version`
- Check if port 3001 is available
- Review backend console logs

### "API not available" messages
- Ensure backend is running on port 3001
- Check health endpoint: http://localhost:3001/health
- Verify CORS settings

### MongoDB connection failed
- Check if MongoDB service is running
- Verify connection string in .env
- Check MongoDB logs

### Authentication not working
- Clear browser localStorage
- Verify users are seeded: `node scripts/seedUsers.js`
- Check JWT_SECRET is set

### Orders not saving
- Check browser console for API errors
- Verify authentication token is valid
- Check MongoDB connection status
- Review backend logs

## 📚 API Documentation

### Authentication Endpoints

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "sarah.chen@company.com",
  "password": "password123"
}

Response:
{
  "message": "Login successful",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "userId": "user8",
  "name": "John Doe",
  "email": "john.doe@company.com",
  "password": "password123",
  "role": "Employee",
  "team": "Procurement"
}
```

### Order Endpoints

#### Get User Orders
```http
GET /api/orders/my-orders
Authorization: Bearer <token>

Response:
{
  "orders": [ ... ]
}
```

#### Create Order
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "ORD-2024-100",
  "materialName": "Test Material",
  ...
}
```

#### Update Order Status
```http
PATCH /api/orders/ORD-2024-001/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "newStatus": "Completed",
  "note": "Order completed successfully"
}
```

## 🔄 Data Migration

### Migrate from localStorage to MongoDB

1. **Export existing data**:
   - In frontend, export all orders to Excel
   
2. **Create migration script** (optional):
   ```javascript
   // backend/scripts/migrateData.js
   const orders = require('./exported-orders.json');
   const Order = require('../models/Order');
   
   for (const order of orders) {
     await Order.create(order);
   }
   ```

3. **Or manually create orders**:
   - Use the frontend to recreate important orders
   - They will automatically sync to MongoDB

## 📈 Production Deployment

### Environment Variables
```env
MONGODB_URI=<production-mongodb-uri>
PORT=3001
JWT_SECRET=<strong-random-secret>
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
```

### MongoDB Atlas Setup
1. Create production cluster
2. Configure network access (whitelist IPs)
3. Create database user
4. Get connection string
5. Update environment variables

### Deployment Platforms
- **Heroku**: Add MongoDB Atlas add-on
- **Railway**: Add MongoDB service
- **Render**: Link MongoDB Atlas
- **AWS/Azure**: Use managed MongoDB service

## 📞 Support

For issues or questions:
1. Check troubleshooting section
2. Review backend logs
3. Check MongoDB logs
4. Test health endpoint

## 🎯 Next Steps

- [ ] Set up MongoDB (local or Atlas)
- [ ] Install backend dependencies
- [ ] Seed initial users
- [ ] Start backend server
- [ ] Test API endpoints
- [ ] Start frontend
- [ ] Test login and order creation
- [ ] Monitor MongoDB with Compass


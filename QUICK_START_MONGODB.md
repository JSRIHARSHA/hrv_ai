# 🚀 Quick Start with MongoDB

## Prerequisites Checklist
- [ ] Node.js installed (v16+)
- [ ] MongoDB installed OR MongoDB Atlas account
- [ ] Python 3.x installed

## 5-Minute Setup

### 1️⃣ Install MongoDB (Choose One)

**Option A: Windows Local Install (Recommended)**
```bash
# Download from: https://www.mongodb.com/try/download/community
# Run installer, choose "Complete", install as Windows Service
# MongoDB will start automatically
```

**Option B: MongoDB Atlas (Cloud)**
```bash
# 1. Go to https://www.mongodb.com/cloud/atlas
# 2. Create free account
# 3. Create free cluster
# 4. Get connection string
# 5. Update backend/.env with connection string
```

### 2️⃣ Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 3️⃣ Create Environment File

Create `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/pharma-order-management
PORT=3001
JWT_SECRET=pharma-secret-2024
NODE_ENV=development
```

### 4️⃣ Seed Users
```bash
node backend/scripts/seedUsers.js
```

Expected output:
```
✅ Created user: Dr. Sarah Chen (sarah.chen@company.com)
✅ Created user: Michael Rodriguez (michael.rodriguez@company.com)
...
✅ User seeding completed
📝 All users have password: password123
```

### 5️⃣ Start Backend
```bash
# Option A: Use batch file
start-backend.bat

# Option B: Manual
cd backend
node server.js
```

Expected output:
```
🚀 ========================================
🚀 Backend API Server running on 0.0.0.0:3001
📊 MongoDB Database: mongodb://localhost:27017/pharma-order-management
🔗 Health check: http://localhost:3001/health
🚀 ========================================
```

### 6️⃣ Test Backend
Open browser: http://localhost:3001/health

Should show:
```json
{
  "status": "OK",
  "database": "Connected"
}
```

### 7️⃣ Start Frontend
```bash
# In new terminal
npm start
```

### 8️⃣ Login & Test
1. Go to http://localhost:3000
2. Login with: `sarah.chen@company.com` / `password123`
3. Check console for: `✅ Orders loaded from API`
4. Create a test order
5. Check MongoDB Compass to see the order

## ✅ Verification Checklist

- [ ] Backend running on port 3001
- [ ] MongoDB connected (check /health endpoint)
- [ ] Frontend running on port 3000
- [ ] Can login successfully
- [ ] Console shows "Orders loaded from API"
- [ ] Can create new order
- [ ] Order visible in MongoDB Compass
- [ ] Can update order
- [ ] Can upload documents

## 🎯 What You Get

### Database Features
✅ Persistent data storage (survives browser refresh)
✅ Multi-device access (data shared across devices)
✅ User authentication with JWT
✅ Role-based permissions
✅ Audit trails and history
✅ Document storage (base64)
✅ Automatic backups to localStorage

### API Features
✅ RESTful API endpoints
✅ JWT authentication
✅ Rate limiting
✅ Error handling
✅ CORS protection
✅ File upload support

## 🔄 Fallback Mode

If MongoDB is not available:
- App automatically falls back to localStorage
- All features still work locally
- Can sync to MongoDB when available

## 📊 Viewing Your Data

### MongoDB Compass (GUI)
1. Open MongoDB Compass
2. Connect to: `mongodb://localhost:27017`
3. Select database: `pharma-order-management`
4. View collections: `users`, `orders`

### VS Code Extension
1. Install "MongoDB for VS Code"
2. Connect to local MongoDB
3. Browse collections in sidebar

## 🚨 Common Issues & Fixes

### "MongoDB not connected"
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service (Windows)
net start MongoDB

# Or restart MongoDB service
net stop MongoDB
net start MongoDB
```

### "Port 3001 already in use"
```bash
# Kill process on port 3001
npx kill-port 3001

# Or change PORT in backend/.env
PORT=3002
```

### "Cannot find module 'mongoose'"
```bash
cd backend
npm install
```

### "JWT token invalid"
- Clear localStorage in browser
- Login again

## 📞 Need Help?

Check the detailed guide: `MONGODB_SETUP_GUIDE.md`

## 🎉 Success!

If you can see orders in MongoDB Compass and the console shows "Orders loaded from API", you're all set! 

Your application now has:
- ✅ MongoDB database integration
- ✅ RESTful API backend
- ✅ JWT authentication
- ✅ Persistent data storage
- ✅ Multi-device synchronization


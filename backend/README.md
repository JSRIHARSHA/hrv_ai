# Pharmaceutical Order Management Backend

## MongoDB + Node.js + Express Backend

This backend provides a RESTful API for the Pharmaceutical Order Management System with MongoDB database integration.

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- Python 3.x (for PDF extraction)

## Installation

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install MongoDB

**Option A: Local MongoDB Installation**
- Download and install MongoDB Community Edition from https://www.mongodb.com/try/download/community
- Start MongoDB service:
  ```bash
  # Windows
  net start MongoDB
  
  # Linux/Mac
  brew services start mongodb-community (Mac)
  sudo systemctl start mongod (Linux)
  ```

**Option B: Use MongoDB Atlas (Cloud)**
- Create free account at https://www.mongodb.com/cloud/atlas
- Create a cluster
- Get connection string
- Update MONGODB_URI in config

### 3. Configure Environment

Create a `.env` file in the `backend` folder:

```env
MONGODB_URI=mongodb://localhost:27017/pharma-order-management
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pharma-order-management

PORT=3001
JWT_SECRET=your-secret-key-change-this
NODE_ENV=development
```

### 4. Seed Initial Users

```bash
node scripts/seedUsers.js
```

This will create demo users with password: `password123`

## Running the Backend

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will run on http://localhost:3001

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/logout` - Logout user (requires auth)

### Orders
- `GET /api/orders` - Get all orders (requires auth)
- `GET /api/orders/my-orders` - Get user's orders (requires auth)
- `GET /api/orders/team-orders` - Get team orders (Manager+ only)
- `GET /api/orders/:orderId` - Get order by ID (requires auth)
- `POST /api/orders` - Create new order (requires auth)
- `PUT /api/orders/:orderId` - Update order (requires auth)
- `PATCH /api/orders/:orderId/status` - Update order status (requires auth)
- `POST /api/orders/:orderId/comments` - Add comment (requires auth)
- `POST /api/orders/:orderId/timeline` - Add timeline event (requires auth)
- `POST /api/orders/:orderId/documents` - Attach document (requires auth)
- `DELETE /api/orders/:orderId` - Delete order (Manager+ only)

### Utilities
- `GET /health` - Health check endpoint
- `POST /api/extract-pdf` - Extract data from PDF

## Database Schema

### Users Collection
- userId, name, email, password (hashed), role, team, isActive
- Indexes: email, userId, role

### Orders Collection
- Complete order information including customer, supplier, materials, documents, etc.
- Indexes: orderId, status, assignedTo.userId, createdBy.userId, entity

## Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Rate limiting (100 requests per 15 minutes)
- Helmet.js for HTTP headers security
- CORS protection
- File upload validation

## Data Migration

To migrate existing localStorage data to MongoDB:
1. Export orders to Excel from the frontend
2. Import orders using the API or seed script
3. Verify data in MongoDB

## MongoDB Compass

You can use MongoDB Compass (GUI) to view and manage data:
- Download from: https://www.mongodb.com/products/compass
- Connect using: mongodb://localhost:27017

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB service is running
- Check connection string in .env
- Verify network connectivity for Atlas

### API Not Working
- Check if backend server is running on port 3001
- Verify CORS settings
- Check browser console for errors

### Authentication Issues
- Clear localStorage and login again
- Verify JWT_SECRET is set
- Check token expiration (24h)

## Production Deployment

For production deployment:
1. Set NODE_ENV=production
2. Use strong JWT_SECRET
3. Enable MongoDB authentication
4. Use environment variables
5. Set up SSL/TLS
6. Configure proper CORS origins
7. Enable MongoDB Atlas IP whitelist


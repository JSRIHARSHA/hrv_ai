# Pharmaceutical Order Management Backend

## PostgreSQL + Node.js + Express Backend

This backend provides a RESTful API for the Pharmaceutical Order Management System with PostgreSQL database integration using Sequelize ORM.

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher - local installation or cloud service)
- Python 3.x (for PDF extraction)

## Installation

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install PostgreSQL

**Option A: Local PostgreSQL Installation**
- Download and install PostgreSQL from https://www.postgresql.org/download/
- Start PostgreSQL service:
  ```bash
  # Windows
  net start postgresql-x64-14
  
  # Linux
  sudo systemctl start postgresql
  
  # Mac
  brew services start postgresql
  ```

**Option B: Use Cloud PostgreSQL (Heroku Postgres, AWS RDS, etc.)**
- Create a PostgreSQL database instance
- Get connection string
- Update DATABASE_URL in .env

### 3. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE pharma_order_management;

# Exit psql
\q
```

### 4. Configure Environment

Create a `.env` file in the `backend` folder:

```env
# PostgreSQL Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pharma_order_management
# Or use individual variables:
POSTGRES_DB=pharma_order_management
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

PORT=3001
JWT_SECRET=your-secret-key-change-this
NODE_ENV=development
```

### 5. Seed Initial Users

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

### Users Table
- id (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
- userId (STRING, UNIQUE)
- name, email (STRING, UNIQUE), password (hashed)
- role (ENUM: Employee, Manager, Higher_Management, Admin)
- team, isActive (BOOLEAN), lastLogin (DATE)
- timestamps (createdAt, updatedAt)
- Indexes: email, userId, role

### Orders Table
- id (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
- orderId (STRING, UNIQUE)
- Complete order information including:
  - customer, supplier, materials (JSONB)
  - documents, auditLogs, comments, timeline (JSONB)
  - status (ENUM with 18 statuses)
  - entity (ENUM: HRV, NHG)
  - Various other fields
- timestamps (createdAt, updatedAt)
- Indexes: orderId, status, entity, createdAt

**Note:** JSONB fields are used for nested objects (customer, supplier, materials, documents, etc.) to maintain flexibility while leveraging PostgreSQL's JSON query capabilities.

## Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Rate limiting (100 requests per 15 minutes)
- Helmet.js for HTTP headers security
- CORS protection
- File upload validation

## Data Migration

To migrate existing data to PostgreSQL:
1. Export orders to Excel from the frontend
2. Import orders using the API or seed script
3. Verify data in PostgreSQL

## PostgreSQL Tools

You can use PostgreSQL tools to view and manage data:
- **pgAdmin**: https://www.pgadmin.org/
- **DBeaver**: https://dbeaver.io/
- **psql**: Command-line tool (comes with PostgreSQL)

## Troubleshooting

### PostgreSQL Connection Issues
- Ensure PostgreSQL service is running
- Check connection string in .env
- Verify database exists: `psql -U postgres -l`
- Check user permissions

### API Not Working
- Check if backend server is running on port 3001
- Verify CORS settings
- Check browser console for errors
- Verify database connection in server logs

### Authentication Issues
- Clear localStorage and login again
- Verify JWT_SECRET is set
- Check token expiration (24h)

### Database Sync Issues
- Tables are auto-created on first run (development only)
- For production, use migrations instead of sync
- Check Sequelize logs for table creation errors

## Production Deployment

For production deployment:
1. Set NODE_ENV=production
2. Use strong JWT_SECRET
3. Enable PostgreSQL authentication
4. Use environment variables for database credentials
5. Set up SSL/TLS
6. Configure proper CORS origins
7. Use database migrations instead of sync
8. Set up connection pooling
9. Enable PostgreSQL SSL connections

## Database Migrations (Future)

For production, consider using Sequelize migrations:
```bash
npx sequelize-cli init
npx sequelize-cli migration:generate --name create-users
npx sequelize-cli migration:generate --name create-orders
```

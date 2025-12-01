# Fix PostgreSQL Password Authentication Error

## The Error

```
❌ PostgreSQL connection error: password authentication failed for user "postgres"
```

This means the password in `backend/.env` doesn't match your PostgreSQL password.

## Solution Options

### Option 1: Update .env with Correct Password (Recommended)

1. **Find your PostgreSQL password:**
   - It's the password you set when installing PostgreSQL
   - If you forgot it, use Option 2 to reset it

2. **Update `backend/.env`:**
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/pharma_order_management
   ```
   
   Replace `YOUR_ACTUAL_PASSWORD` with your actual PostgreSQL password.

3. **Restart backend:**
   ```bash
   cd backend
   npm start
   ```

### Option 2: Reset PostgreSQL Password

If you forgot your password or want to set a new one:

1. **Open Command Prompt as Administrator**

2. **Stop PostgreSQL service:**
   ```bash
   net stop postgresql-x64-18
   ```

3. **Edit pg_hba.conf:**
   - Location: `C:\Program Files\PostgreSQL\18\data\pg_hba.conf`
   - Find line: `host all all 127.0.0.1/32 scram-sha-256`
   - Change to: `host all all 127.0.0.1/32 trust`
   - Save the file

4. **Start PostgreSQL:**
   ```bash
   net start postgresql-x64-18
   ```

5. **Connect without password:**
   ```bash
   cd "C:\Program Files\PostgreSQL\18\bin"
   psql -U postgres
   ```

6. **Reset password:**
   ```sql
   ALTER USER postgres PASSWORD 'new_password_123';
   \q
   ```

7. **Revert pg_hba.conf:**
   - Change back to: `host all all 127.0.0.1/32 scram-sha-256`
   - Save the file

8. **Restart PostgreSQL:**
   ```bash
   net stop postgresql-x64-18
   net start postgresql-x64-18
   ```

9. **Update `.env` with new password:**
   ```env
   DATABASE_URL=postgresql://postgres:new_password_123@localhost:5432/pharma_order_management
   ```

### Option 3: Use Windows Authentication (Advanced)

If you want to use Windows authentication instead:

1. **Update `backend/.env`:**
   ```env
   DATABASE_URL=postgresql://localhost:5432/pharma_order_management
   ```

2. **Configure PostgreSQL for Windows auth** (requires additional setup)

**Not recommended for beginners.**

---

## Quick Fix Steps

1. **Check if you remember your PostgreSQL password**
   - Try common passwords you might have used
   - Check if you saved it somewhere

2. **If you remember it:**
   - Update `backend/.env` with the correct password
   - Restart backend

3. **If you don't remember:**
   - Use Option 2 to reset the password
   - Update `.env` with the new password
   - Restart backend

---

## Verify Password Works

After updating the password, test the connection:

```bash
cd "C:\Program Files\PostgreSQL\18\bin"
psql -U postgres -d pharma_order_management
```

If it asks for a password and accepts it, the password is correct.

Then update `backend/.env` and restart the backend.

---

## Common Passwords to Try

If you're not sure what password you set:
- `postgres` (default)
- `admin`
- `password`
- `123456`
- The password you use for other services

---

**Once the password is correct, the backend should start successfully!** ✅



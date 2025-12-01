# Quick Password Fix

## The Problem
```
password authentication failed for user "postgres"
```

## Quick Solution

### Step 1: Test Your Password

```bash
cd "C:\Program Files\PostgreSQL\18\bin"
psql -U postgres
```

Enter your password when prompted.

**If it works:** Your password is correct, just update `.env`
**If it fails:** You need to reset the password (see below)

### Step 2: Update backend/.env

Open `backend/.env` and update:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/pharma_order_management
```

Replace `YOUR_PASSWORD` with the password that worked in Step 1.

### Step 3: Restart Backend

```bash
cd backend
npm start
```

---

## If You Forgot Password - Reset It

### Method 1: Using pgAdmin (Easiest)

1. Open **pgAdmin 4** (installed with PostgreSQL)
2. Connect to server (might ask for password - try common ones)
3. Right-click "postgres" user → Properties → Change password
4. Set new password
5. Update `backend/.env` with new password

### Method 2: Using Command Line

1. **Stop PostgreSQL:**
   ```bash
   net stop postgresql-x64-18
   ```

2. **Edit:** `C:\Program Files\PostgreSQL\18\data\pg_hba.conf`
   - Find: `host all all 127.0.0.1/32 scram-sha-256`
   - Change to: `host all all 127.0.0.1/32 trust`
   - Save

3. **Start PostgreSQL:**
   ```bash
   net start postgresql-x64-18
   ```

4. **Connect without password:**
   ```bash
   cd "C:\Program Files\PostgreSQL\18\bin"
   psql -U postgres
   ```

5. **Set new password:**
   ```sql
   ALTER USER postgres PASSWORD 'MyNewPassword123';
   \q
   ```

6. **Revert pg_hba.conf:**
   - Change back to: `host all all 127.0.0.1/32 scram-sha-256`
   - Save

7. **Restart PostgreSQL:**
   ```bash
   net stop postgresql-x64-18
   net start postgresql-x64-18
   ```

8. **Update backend/.env:**
   ```env
   DATABASE_URL=postgresql://postgres:MyNewPassword123@localhost:5432/pharma_order_management
   ```

---

## Test After Fix

```bash
cd backend
npm start
```

**Should see:**
```
✅ PostgreSQL connected successfully
✅ Database models synchronized
```

---

**That's it!** Once the password is correct, everything will work. 🔑



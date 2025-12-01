# Create Management Users Script

This script creates or updates three Management-level users in the database.

## Users Created

1. **Admin**
   - Email: `sriharshajvs@gmail.com`
   - User ID: `admin001`
   - Role: `Management`

2. **Admin 1**
   - Email: `sriharsha@hrvpharma.com`
   - User ID: `admin002`
   - Role: `Management`

3. **Sowjanya**
   - Email: `sowjanya.kopperla@hrvpharma.com`
   - User ID: `admin003`
   - Role: `Management`

## Usage

### Run the Script

```bash
cd backend
node scripts/createManagementUsers.js
```

## Default Password

All users are created with the default password: **`password123`**

⚠️ **Important**: Change these passwords after first login for security!

## Behavior

- **If user exists by email**: The script will update the existing user's name, role, and team to Management
- **If user exists by userId**: The script will update the existing user's information
- **If user doesn't exist**: The script will create a new user

The script will NOT overwrite existing passwords unless you uncomment the password update line in the script.

## Verification

After running the script, you can verify the users were created:

```sql
-- Check Management users
SELECT userId, name, email, role, team, isActive 
FROM users 
WHERE role = 'Management';
```

Or use the check users script:

```bash
node scripts/checkUsers.js
```

## Notes

- All users are set to `isActive: true`
- All users are assigned to `team: 'Executive Leadership'`
- The script handles duplicate users gracefully (updates instead of failing)
- Email addresses match the approver list in the frontend


# Quick Vercel Deployment Instructions

## Prerequisites Check
- [ ] Vercel account created at https://vercel.com
- [ ] PostgreSQL database accessible from internet
- [ ] Git repository ready

## Step 1: Install Vercel CLI (if not installed)
```bash
npm install -g vercel
```

## Step 2: Login to Vercel
```bash
cd backend
vercel login
```

## Step 3: Link Project
```bash
vercel link
```
- Choose "Create a new project"
- Enter project name (e.g., `hrv-backend`)

## Step 4: Set Environment Variables
```bash
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add ALLOWED_ORIGINS
vercel env add NODE_ENV
```

Or set them in Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add:
   - `DATABASE_URL` = your PostgreSQL connection string
   - `JWT_SECRET` = generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `ALLOWED_ORIGINS` = your Netlify frontend URL (e.g., `https://your-app.netlify.app`)
   - `NODE_ENV` = `production`

## Step 5: Deploy
```bash
vercel --prod
```

## Step 6: Get Your Backend URL
After deployment, you'll get a URL like: `https://your-backend.vercel.app`

## Step 7: Update Netlify
1. Go to Netlify dashboard
2. Your site → Site settings → Environment variables
3. Add: `REACT_APP_API_URL` = `https://your-backend.vercel.app/api`
4. Redeploy frontend

## Test
```bash
curl https://your-backend.vercel.app/health
```


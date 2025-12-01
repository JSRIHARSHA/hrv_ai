# Vercel Deployment Script for Windows PowerShell
# This script will guide you through deploying the backend to Vercel

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Vercel Backend Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if logged in
Write-Host "Step 1: Checking Vercel login status..." -ForegroundColor Yellow
$loginStatus = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in. Please login to Vercel..." -ForegroundColor Red
    Write-Host "Running: vercel login" -ForegroundColor Yellow
    vercel login
} else {
    Write-Host "Already logged in as: $loginStatus" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 2: Linking project to Vercel..." -ForegroundColor Yellow
Write-Host "This will ask you to create or link a project." -ForegroundColor Gray
Write-Host "Press Enter to continue..." -ForegroundColor Gray
Read-Host

vercel link

Write-Host ""
Write-Host "Step 3: Setting up environment variables..." -ForegroundColor Yellow
Write-Host "You need to set the following environment variables:" -ForegroundColor Cyan
Write-Host "  1. DATABASE_URL - Your PostgreSQL connection string" -ForegroundColor White
Write-Host "  2. JWT_SECRET - A random secret string" -ForegroundColor White
Write-Host "  3. ALLOWED_ORIGINS - Your Netlify frontend URL" -ForegroundColor White
Write-Host "  4. NODE_ENV - Set to 'production'" -ForegroundColor White
Write-Host ""
Write-Host "You can set them now via CLI or in the Vercel dashboard." -ForegroundColor Gray
Write-Host "Press Enter to set them via CLI (or Ctrl+C to set in dashboard)..." -ForegroundColor Gray
Read-Host

Write-Host "Setting DATABASE_URL..." -ForegroundColor Yellow
vercel env add DATABASE_URL production

Write-Host "Setting JWT_SECRET..." -ForegroundColor Yellow
Write-Host "Generating a random JWT_SECRET..." -ForegroundColor Gray
$jwtSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Write-Host "Generated JWT_SECRET: $jwtSecret" -ForegroundColor Green
Write-Host "You can use this or generate your own." -ForegroundColor Gray
vercel env add JWT_SECRET production

Write-Host "Setting ALLOWED_ORIGINS..." -ForegroundColor Yellow
$netlifyUrl = Read-Host "Enter your Netlify frontend URL (e.g., https://your-app.netlify.app)"
vercel env add ALLOWED_ORIGINS production
Write-Host "You entered: $netlifyUrl" -ForegroundColor Gray

Write-Host "Setting NODE_ENV..." -ForegroundColor Yellow
vercel env add NODE_ENV production

Write-Host ""
Write-Host "Step 4: Deploying to Vercel..." -ForegroundColor Yellow
Write-Host "Press Enter to deploy..." -ForegroundColor Gray
Read-Host

vercel --prod

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy your Vercel backend URL (shown above)" -ForegroundColor White
Write-Host "2. Go to Netlify dashboard" -ForegroundColor White
Write-Host "3. Add environment variable: REACT_APP_API_URL = https://your-backend.vercel.app/api" -ForegroundColor White
Write-Host "4. Redeploy your Netlify frontend" -ForegroundColor White
Write-Host ""
Write-Host "Test your deployment:" -ForegroundColor Cyan
Write-Host "  curl https://your-backend.vercel.app/health" -ForegroundColor White


#!/bin/bash
# Vercel Deployment Script for Linux/Mac
# This script will guide you through deploying the backend to Vercel

echo "========================================"
echo "Vercel Backend Deployment Script"
echo "========================================"
echo ""

# Step 1: Check if logged in
echo "Step 1: Checking Vercel login status..."
if ! vercel whoami > /dev/null 2>&1; then
    echo "Not logged in. Please login to Vercel..."
    echo "Running: vercel login"
    vercel login
else
    echo "Already logged in as: $(vercel whoami)"
fi

echo ""
echo "Step 2: Linking project to Vercel..."
echo "This will ask you to create or link a project."
read -p "Press Enter to continue..."

vercel link

echo ""
echo "Step 3: Setting up environment variables..."
echo "You need to set the following environment variables:"
echo "  1. DATABASE_URL - Your PostgreSQL connection string"
echo "  2. JWT_SECRET - A random secret string"
echo "  3. ALLOWED_ORIGINS - Your Netlify frontend URL"
echo "  4. NODE_ENV - Set to 'production'"
echo ""
echo "You can set them now via CLI or in the Vercel dashboard."
read -p "Press Enter to set them via CLI (or Ctrl+C to set in dashboard)..."

echo "Setting DATABASE_URL..."
vercel env add DATABASE_URL production

echo "Setting JWT_SECRET..."
echo "Generating a random JWT_SECRET..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "Generated JWT_SECRET: $JWT_SECRET"
echo "You can use this or generate your own."
vercel env add JWT_SECRET production

echo "Setting ALLOWED_ORIGINS..."
read -p "Enter your Netlify frontend URL (e.g., https://your-app.netlify.app): " NETLIFY_URL
vercel env add ALLOWED_ORIGINS production
echo "You entered: $NETLIFY_URL"

echo "Setting NODE_ENV..."
vercel env add NODE_ENV production

echo ""
echo "Step 4: Deploying to Vercel..."
read -p "Press Enter to deploy..."

vercel --prod

echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Copy your Vercel backend URL (shown above)"
echo "2. Go to Netlify dashboard"
echo "3. Add environment variable: REACT_APP_API_URL = https://your-backend.vercel.app/api"
echo "4. Redeploy your Netlify frontend"
echo ""
echo "Test your deployment:"
echo "  curl https://your-backend.vercel.app/health"


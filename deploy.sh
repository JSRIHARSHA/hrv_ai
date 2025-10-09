#!/bin/bash

# PDF Extractor Deployment Script
# This script sets up the complete PDF extractor system

echo "🚀 PDF Extractor Deployment Script"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "universal_pdf_extractor.py" ]; then
    echo "❌ universal_pdf_extractor.py not found. Please run this script from the project root."
    exit 1
fi

echo "✅ Found Python extractor script"

# Step 1: Setup Python environment
echo ""
echo "1️⃣ Setting up Python environment..."
if [ -f "setup-python.sh" ]; then
    chmod +x setup-python.sh
    ./setup-python.sh
    if [ $? -ne 0 ]; then
        echo "❌ Python setup failed"
        exit 1
    fi
else
    echo "❌ setup-python.sh not found"
    exit 1
fi

# Step 2: Setup Node.js backend
echo ""
echo "2️⃣ Setting up Node.js backend..."
if [ -f "backend-package.json" ]; then
    cp backend-package.json package.json
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Node.js setup failed"
        exit 1
    fi
else
    echo "❌ backend-package.json not found"
    exit 1
fi

# Step 3: Test the setup
echo ""
echo "3️⃣ Testing the setup..."
if [ -f "test-backend.sh" ]; then
    chmod +x test-backend.sh
    echo "   Starting backend server in background..."
    npm start &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Test the API
    ./test-backend.sh
    
    # Stop the server
    kill $SERVER_PID
    echo "   Backend server stopped"
else
    echo "❌ test-backend.sh not found"
    exit 1
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Start the backend server: npm start"
echo "2. Update your frontend to use the backend API"
echo "3. Test the complete integration"
echo ""
echo "🔗 Backend API will be available at: http://localhost:3001"
echo "📖 Documentation: BACKEND_README.md"
echo ""
echo "🚀 Ready for production!"

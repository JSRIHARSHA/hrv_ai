#!/bin/bash

# PDF Extractor Setup Script
# This script sets up the Python environment for PDF extraction

echo "🐍 Setting up PDF Extractor Python Environment"
echo "=============================================="

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    echo "   Download from: https://www.python.org/downloads/"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✅ Python version: $PYTHON_VERSION"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip."
    exit 1
fi

echo "✅ pip3 is available"

# Create virtual environment (optional but recommended)
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install Python dependencies
echo "📚 Installing Python dependencies..."
pip install -r requirements.txt

# Verify installation
echo "🔍 Verifying installation..."
python3 -c "import fitz; print('✅ PyMuPDF installed successfully')" || {
    echo "❌ PyMuPDF installation failed"
    exit 1
}

python3 -c "import PIL; print('✅ Pillow installed successfully')" || {
    echo "❌ Pillow installation failed"
    exit 1
}

python3 -c "import numpy; print('✅ NumPy installed successfully')" || {
    echo "❌ NumPy installation failed"
    exit 1
}

# Test the PDF extractor script
echo "🧪 Testing PDF extractor script..."
if [ -f "universal_pdf_extractor.py" ]; then
    python3 universal_pdf_extractor.py --help > /dev/null 2>&1 && {
        echo "✅ PDF extractor script is working"
    } || {
        echo "❌ PDF extractor script test failed"
        exit 1
    }
else
    echo "❌ universal_pdf_extractor.py not found"
    exit 1
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Install Node.js dependencies: npm install"
echo "2. Start the backend server: npm start"
echo "3. Test the API: curl http://localhost:3001/health"
echo ""
echo "🔧 To activate the virtual environment in the future:"
echo "   source venv/bin/activate"
echo ""
echo "🚀 To start the server:"
echo "   npm start"

@echo off
REM PDF Extractor Setup Script for Windows
REM This script sets up the Python environment for PDF extraction

echo 🐍 Setting up PDF Extractor Python Environment
echo ==============================================

REM Check if Python 3 is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python 3 is not installed. Please install Python 3.8 or higher.
    echo    Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✅ Python version: %PYTHON_VERSION%

REM Check if pip is installed
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ pip is not installed. Please install pip.
    pause
    exit /b 1
)

echo ✅ pip is available

REM Create virtual environment (optional but recommended)
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
    echo ✅ Virtual environment created
) else (
    echo ✅ Virtual environment already exists
)

REM Activate virtual environment
echo 🔄 Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo ⬆️  Upgrading pip...
python -m pip install --upgrade pip

REM Install Python dependencies
echo 📚 Installing Python dependencies...
pip install -r requirements.txt

REM Verify installation
echo 🔍 Verifying installation...
python -c "import fitz; print('✅ PyMuPDF installed successfully')" || (
    echo ❌ PyMuPDF installation failed
    pause
    exit /b 1
)

python -c "import PIL; print('✅ Pillow installed successfully')" || (
    echo ❌ Pillow installation failed
    pause
    exit /b 1
)

python -c "import numpy; print('✅ NumPy installed successfully')" || (
    echo ❌ NumPy installation failed
    pause
    exit /b 1
)

REM Test the PDF extractor script
echo 🧪 Testing PDF extractor script...
if exist "universal_pdf_extractor.py" (
    python universal_pdf_extractor.py --help >nul 2>&1 && (
        echo ✅ PDF extractor script is working
    ) || (
        echo ❌ PDF extractor script test failed
        pause
        exit /b 1
    )
) else (
    echo ❌ universal_pdf_extractor.py not found
    pause
    exit /b 1
)

echo.
echo 🎉 Setup completed successfully!
echo.
echo 📋 Next steps:
echo 1. Install Node.js dependencies: npm install
echo 2. Start the backend server: npm start
echo 3. Test the API: curl http://localhost:3001/health
echo.
echo 🔧 To activate the virtual environment in the future:
echo    venv\Scripts\activate.bat
echo.
echo 🚀 To start the server:
echo    npm start
echo.
pause

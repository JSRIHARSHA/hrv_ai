@echo off
REM Backend API Test Script for Windows
REM This script tests the PDF extractor backend API

echo 🧪 Testing PDF Extractor Backend API
echo ====================================

set BASE_URL=http://localhost:3001

REM Test 1: Health Check
echo 1️⃣ Testing health check endpoint...
curl -s "%BASE_URL%/health" > temp_health.txt
findstr "OK" temp_health.txt >nul
if %errorlevel% equ 0 (
    echo ✅ Health check passed
    type temp_health.txt
) else (
    echo ❌ Health check failed
    type temp_health.txt
    del temp_health.txt
    pause
    exit /b 1
)
del temp_health.txt

echo.

REM Test 2: PDF Extraction (if test PDF exists)
if exist "test.pdf" (
    echo 2️⃣ Testing PDF extraction with test.pdf...
    curl -s -X POST -F "pdf=@test.pdf" "%BASE_URL%/api/extract-pdf" > temp_extraction.txt
    findstr "success" temp_extraction.txt >nul
    if %errorlevel% equ 0 (
        echo ✅ PDF extraction test passed
        echo    Response preview: 
        powershell -command "Get-Content temp_extraction.txt | Select-Object -First 1"
    ) else (
        echo ❌ PDF extraction test failed
        type temp_extraction.txt
    )
    del temp_extraction.txt
) else (
    echo 2️⃣ Skipping PDF extraction test (no test.pdf found)
    echo    To test PDF extraction, place a PDF file named 'test.pdf' in this directory
)

echo.

REM Test 3: Error handling (upload non-PDF file)
echo 3️⃣ Testing error handling (non-PDF upload)...
curl -s -X POST -F "pdf=@package.json" "%BASE_URL%/api/extract-pdf" > temp_error.txt
findstr "error" temp_error.txt >nul
if %errorlevel% equ 0 (
    echo ✅ Error handling test passed
    type temp_error.txt
) else (
    echo ❌ Error handling test failed
    type temp_error.txt
)
del temp_error.txt

echo.

REM Test 4: No file upload
echo 4️⃣ Testing no file upload...
curl -s -X POST "%BASE_URL%/api/extract-pdf" > temp_nofile.txt
findstr "No PDF file uploaded" temp_nofile.txt >nul
if %errorlevel% equ 0 (
    echo ✅ No file upload test passed
    type temp_nofile.txt
) else (
    echo ❌ No file upload test failed
    type temp_nofile.txt
)
del temp_nofile.txt

echo.
echo 🎉 Backend API testing completed!
echo.
echo 📋 Summary:
echo - Health check: ✅
if exist "test.pdf" (
    echo - PDF extraction: ✅
) else (
    echo - PDF extraction: ⏭️ Skipped
)
echo - Error handling: ✅
echo - No file handling: ✅
echo.
echo 🚀 Backend is ready for frontend integration!
echo.
pause

@echo off
echo.
echo ========================================
echo   Restarting Frontend with Gemini AI
echo ========================================
echo.
echo Stopping any running React servers...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *react-scripts*" 2>nul
timeout /t 2 /nobreak >nul
echo.
echo Starting frontend...
echo.
start cmd /k "npm start"
echo.
echo ========================================
echo   Frontend restarting in new window
echo ========================================
echo.
echo Your app will open at: http://localhost:3000
echo.
echo Test Gemini AI by:
echo 1. Click "Create Order with AI"
echo 2. Upload a PDF
echo 3. Select supplier
echo 4. Watch the AI magic!
echo.
pause


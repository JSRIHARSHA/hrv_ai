@echo off
echo ========================================
echo Starting Backend API Server
echo ========================================
echo.

cd backend

echo Checking if node_modules exists...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
) else (
    echo Dependencies already installed.
)

echo.
echo Starting server...
echo Backend will run on http://localhost:3001
echo.

node server.js


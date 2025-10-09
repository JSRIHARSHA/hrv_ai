@echo off
REM Production Deployment Script for Order Management Application (Windows)
REM This script provides multiple deployment options

echo 🚀 Order Management App - Production Deployment
echo ==============================================
echo.

REM Check if required tools are installed
echo [INFO] Checking prerequisites...

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js v14 or higher.
    pause
    exit /b 1
)

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed. Please install Python 3.7 or higher.
    pause
    exit /b 1
)

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install npm.
    pause
    exit /b 1
)

echo [SUCCESS] All prerequisites are installed
echo.

REM Show menu
:menu
echo Select deployment option:
echo 1) Local Network Deployment (Quick testing)
echo 2) Docker Deployment (Containerized)
echo 3) Heroku Deployment (Cloud - Free tier)
echo 4) Railway Deployment (Cloud - Modern)
echo 5) Vercel Deployment (Cloud - Frontend focused)
echo 6) Exit
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto local_network
if "%choice%"=="2" goto docker
if "%choice%"=="3" goto heroku
if "%choice%"=="4" goto railway
if "%choice%"=="5" goto vercel
if "%choice%"=="6" goto exit
echo [ERROR] Invalid option. Please select 1-6.
goto menu

:local_network
echo.
echo [INFO] Setting up local network deployment...

REM Get local IP address
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    set LOCAL_IP=%%i
    set LOCAL_IP=!LOCAL_IP:~1!
    goto :ip_found
)
:ip_found

echo [INFO] Your local IP address: %LOCAL_IP%
echo [INFO] Application will be accessible at: http://%LOCAL_IP%:3001

REM Install dependencies
echo [INFO] Installing dependencies...
call npm install
call pip install -r requirements.txt

REM Create uploads directory
if not exist uploads mkdir uploads

REM Start the application
echo [INFO] Starting application...
echo [WARNING] Press Ctrl+C to stop the application

REM Start backend
start /b node server.js

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
start /b npm start

echo [SUCCESS] Application started successfully!
echo [INFO] Frontend: http://%LOCAL_IP%:3000
echo [INFO] Backend API: http://%LOCAL_IP%:3001
echo [INFO] Health Check: http://%LOCAL_IP%:3001/health
echo.
echo [INFO] Press any key to stop the application...
pause >nul
goto success

:docker
echo.
echo [INFO] Setting up Docker deployment...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

REM Build and start containers
echo [INFO] Building Docker image...
docker build -t order-management-app .

echo [INFO] Starting containers with Docker Compose...
docker-compose up -d

echo [SUCCESS] Docker deployment completed!
echo [INFO] Application is running at: http://localhost
echo [INFO] Backend API: http://localhost:3001
echo [INFO] Health Check: http://localhost:3001/health

REM Show container status
docker-compose ps
goto success

:heroku
echo.
echo [INFO] Setting up Heroku deployment...

REM Check if Heroku CLI is installed
heroku --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Heroku CLI is not installed. Please install it from https://devcenter.heroku.com/articles/heroku-cli
    pause
    exit /b 1
)

echo [INFO] Please login to Heroku...
heroku login

set /p APP_NAME="Enter Heroku app name (or press Enter to auto-generate): "

if "%APP_NAME%"=="" (
    set APP_NAME=order-management-%RANDOM%
)

echo [INFO] Creating Heroku app: %APP_NAME%
heroku create %APP_NAME%

echo [INFO] Setting environment variables...
heroku config:set NODE_ENV=production -a %APP_NAME%
heroku config:set PYTHON_VERSION=3.9.0 -a %APP_NAME%

echo [INFO] Deploying to Heroku...
git add .
git commit -m "Deploy to Heroku"
git push heroku main

echo [SUCCESS] Heroku deployment completed!
echo [INFO] Application URL: https://%APP_NAME%.herokuapp.com

heroku open -a %APP_NAME%
goto success

:railway
echo.
echo [INFO] Setting up Railway deployment...

REM Check if Railway CLI is installed
railway --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Railway CLI is not installed. Please install it from https://docs.railway.app/develop/cli
    pause
    exit /b 1
)

echo [INFO] Please login to Railway...
railway login

echo [INFO] Initializing Railway project...
railway init

echo [INFO] Deploying to Railway...
railway up

echo [SUCCESS] Railway deployment completed!
echo [INFO] Check your Railway dashboard for the application URL
goto success

:vercel
echo.
echo [INFO] Setting up Vercel deployment...

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Vercel CLI is not installed. Please install it with: npm i -g vercel
    pause
    exit /b 1
)

echo [INFO] Please login to Vercel...
vercel login

echo [INFO] Deploying to Vercel...
vercel --prod

echo [SUCCESS] Vercel deployment completed!
goto success

:success
echo.
echo [SUCCESS] Deployment completed successfully! 🎉
echo.
echo [INFO] Next steps:
echo - Share the application URL with your testers
echo - Monitor the application logs
echo - Test all functionality
echo - Set up SSL certificates for production (recommended)
echo.
pause
exit /b 0

:exit
echo [INFO] Exiting...
exit /b 0

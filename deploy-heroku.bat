@echo off
echo 🚀 Deploying Order Management App to Heroku
echo ===========================================
echo.

REM Check if Heroku CLI is installed
heroku --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Heroku CLI is not installed.
    echo Please download and install from: https://devcenter.heroku.com/articles/heroku-cli
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] Heroku CLI is installed
echo.

REM Login to Heroku
echo [INFO] Please login to Heroku...
heroku login
if %errorlevel% neq 0 (
    echo [ERROR] Heroku login failed
    pause
    exit /b 1
)

echo.
echo [INFO] Login successful!
echo.

REM Get app name
set /p APP_NAME="Enter your Heroku app name (or press Enter to auto-generate): "

if "%APP_NAME%"=="" (
    set APP_NAME=order-management-%RANDOM%
    echo [INFO] Using auto-generated name: %APP_NAME%
)

echo.
echo [INFO] Creating Heroku app: %APP_NAME%

REM Create Heroku app
heroku create %APP_NAME%
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create Heroku app. The name might already be taken.
    echo Please try a different name.
    pause
    exit /b 1
)

echo [SUCCESS] Heroku app created: %APP_NAME%
echo.

REM Copy Heroku package.json
echo [INFO] Setting up Heroku configuration...
copy package-heroku.json package.json

REM Set environment variables
echo [INFO] Setting environment variables...
heroku config:set NODE_ENV=production -a %APP_NAME%
heroku config:set PYTHON_VERSION=3.9.0 -a %APP_NAME%

REM Add Python buildpack
echo [INFO] Adding Python buildpack...
heroku buildpacks:add heroku/python -a %APP_NAME%

REM Add Node.js buildpack
echo [INFO] Adding Node.js buildpack...
heroku buildpacks:add heroku/nodejs -a %APP_NAME%

REM Add all files to git
echo [INFO] Adding files to Git...
git add .

REM Commit changes
echo [INFO] Committing changes...
git commit -m "Deploy to Heroku"

REM Deploy to Heroku
echo [INFO] Deploying to Heroku... This may take a few minutes...
git push heroku main
if %errorlevel% neq 0 (
    echo [ERROR] Deployment failed
    echo Please check the logs with: heroku logs --tail -a %APP_NAME%
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Deployment completed successfully! 🎉
echo.
echo [INFO] Your application is now live at:
echo https://%APP_NAME%.herokuapp.com
echo.
echo [INFO] Useful commands:
echo - View logs: heroku logs --tail -a %APP_NAME%
echo - Open app: heroku open -a %APP_NAME%
echo - Scale dynos: heroku ps:scale web=1 -a %APP_NAME%
echo.

REM Open the app
set /p OPEN_APP="Would you like to open the app in your browser? (y/n): "
if /i "%OPEN_APP%"=="y" (
    heroku open -a %APP_NAME%
)

echo.
echo [INFO] Share this URL with your testers:
echo https://%APP_NAME%.herokuapp.com
echo.
pause

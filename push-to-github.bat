@echo off
echo.
echo ========================================
echo   Pushing Code to GitHub
echo ========================================
echo.
echo Repository: https://github.com/JSRIHARSHA/hrv_ai
echo.

echo Setting remote URL...
git remote set-url origin https://github.com/JSRIHARSHA/hrv_ai.git

echo.
echo Fetching remote changes...
git fetch origin main

echo.
echo Pulling remote changes with merge...
git pull origin main --no-rebase --allow-unrelated-histories

echo.
echo Pushing local changes to GitHub...
git push origin main

echo.
echo ========================================
echo   Push Complete!
echo ========================================
echo.
echo Check your repository at:
echo https://github.com/JSRIHARSHA/hrv_ai
echo.
pause


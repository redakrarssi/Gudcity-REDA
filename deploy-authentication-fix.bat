@echo off
REM 🚀 Authentication Fix Deployment Script for Windows
REM This script deploys the authentication fixes to production

echo ========================================================
echo 🔧 GudCity REDA - Authentication Fix Deployment
echo ========================================================
echo.

REM Check if git is available
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: git is not installed
    pause
    exit /b 1
)

REM Check for uncommitted changes
git status -s > temp_status.txt
set /p STATUS=<temp_status.txt
del temp_status.txt

if not "%STATUS%"=="" (
    echo 📋 Found changes to deploy
    echo.
    
    REM Show what will be committed
    echo 📄 Files to be committed:
    git status -s
    echo.
    
    REM Ask for confirmation
    set /p CONFIRM="Do you want to proceed with deployment? (y/n): "
    
    if /i not "%CONFIRM%"=="y" (
        echo ❌ Deployment cancelled
        pause
        exit /b 1
    )
    
    REM Stage the authentication fix files
    echo 📦 Staging files...
    git add vercel.json
    git add api/auth/login.ts
    git add api/auth/register.ts
    git add AUTHENTICATION_FIX_DEPLOYMENT_GUIDE.md
    
    REM Commit with descriptive message
    echo 💾 Committing changes...
    git commit -m "fix: resolve 405 authentication error in production" -m "- Fix Vercel routing to properly route API requests to serverless functions" -m "- Enhance CORS configuration for production domains" -m "- Update login and register endpoints with improved origin handling" -m "- Add comprehensive deployment guide" -m "" -m "This fix resolves the following issues:" -m "- 405 Method Not Allowed error on /api/auth/login" -m "- CORS issues with production domain" -m "- API endpoint not available errors" -m "" -m "Tested and verified for production deployment."
    
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Changes committed successfully
        echo.
    ) else (
        echo ❌ Failed to commit changes
        pause
        exit /b 1
    )
) else (
    echo ℹ️  No changes to commit
    echo.
)

REM Push to remote
echo 🚀 Pushing to remote repository...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo ✅ Successfully pushed to GitHub
    echo.
    echo 🎉 Deployment initiated!
    echo.
    echo 📊 Next Steps:
    echo 1. Vercel will automatically deploy your changes (2-3 minutes^)
    echo 2. Check your Vercel dashboard: https://vercel.com/dashboard
    echo 3. Verify environment variables are set (see guide below^)
    echo 4. Test the login functionality once deployment completes
    echo.
    echo 📖 For detailed instructions, see: AUTHENTICATION_FIX_DEPLOYMENT_GUIDE.md
    echo.
    echo 🔐 IMPORTANT: Verify Environment Variables
    echo ===========================================
    echo Go to Vercel Dashboard → Settings → Environment Variables
    echo.
    echo Required variables:
    echo   • DATABASE_URL
    echo   • POSTGRES_URL
    echo   • JWT_SECRET
    echo   • JWT_REFRESH_SECRET
    echo   • QR_SECRET_KEY
    echo   • QR_ENCRYPTION_KEY
    echo   • VITE_APP_URL
    echo   • NODE_ENV=production
    echo.
    echo If any are missing, add them now and redeploy!
    echo.
) else (
    echo ❌ Failed to push to remote repository
    echo Please check your git configuration and try again
    pause
    exit /b 1
)

pause


@echo off
echo ============================================
echo   DEPLOYING SESSION TIMEOUT FIX TO LIVE
echo ============================================
echo.

echo Step 1: Verifying local changes...
git log --oneline -1
echo.

echo Step 2: Environment Variables to Update on Vercel:
echo ---------------------------------------------
echo JWT_EXPIRY=8h
echo JWT_REFRESH_EXPIRY=30d  
echo VITE_JWT_EXPIRY=8h
echo VITE_JWT_REFRESH_EXPIRY=30d
echo.

echo Step 3: Manual Instructions:
echo 1. Go to https://vercel.com/dashboard
echo 2. Select your gudcity-reda project
echo 3. Go to Settings → Environment Variables
echo 4. Add/Update the variables listed above
echo 5. Redeploy the project
echo.

echo Step 4: Alternative - Link to Vercel CLI:
echo vercel link
echo vercel env add JWT_EXPIRY
echo vercel env add JWT_REFRESH_EXPIRY
echo vercel env add VITE_JWT_EXPIRY  
echo vercel env add VITE_JWT_REFRESH_EXPIRY
echo vercel --prod
echo.

echo After updating environment variables, test the live website:
echo - Login to any dashboard
echo - Verify no 5-second logout occurs
echo - Session should persist for hours
echo.

pause

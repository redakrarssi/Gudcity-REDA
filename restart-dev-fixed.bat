@echo off
echo 🔧 Restarting development server with fixes...

echo 🛑 Stopping any existing processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo 📝 Creating .env.local if needed...
if not exist .env.local (
    echo NODE_ENV=development > .env.local
    echo PORT=3000 >> .env.local
    echo VITE_PORT=5173 >> .env.local
    echo DATABASE_URL=postgresql://localhost:5432/gudcity_reda >> .env.local
    echo JWT_SECRET=local-dev-jwt-secret-key-change-in-production >> .env.local
    echo JWT_REFRESH_SECRET=local-dev-refresh-secret-key-change-in-production >> .env.local
    echo JWT_EXPIRY=15m >> .env.local
    echo JWT_REFRESH_EXPIRY=7d >> .env.local
    echo FRONTEND_URL=http://localhost:5173 >> .env.local
    echo CORS_ORIGIN=http://localhost:5173 >> .env.local
    echo ENABLE_SECURITY_AUDIT=true >> .env.local
    echo ENABLE_RATE_LIMITING=true >> .env.local
    echo ENABLE_CSRF_PROTECTION=true >> .env.local
    echo ✅ Created .env.local
) else (
    echo ✅ .env.local already exists
)

echo 🗄️  Database setup instructions:
echo    1. Connect to your PostgreSQL database
echo    2. Run: \i setup-database-manual.sql
echo    3. Or manually run the SQL commands from setup-database-manual.sql
echo.

echo 🚀 Starting development server...
echo ✅ Fixes applied:
echo    ✅ Added /api/auth/generate-tokens endpoint
echo    ✅ Added security audit logging with fallback
echo    ✅ Fixed AdminLayout component TypeError
echo    ✅ Created environment configuration
echo.

echo 📋 Manual database setup required:
echo    Run the SQL commands from setup-database-manual.sql
echo.

call npm run dev

pause

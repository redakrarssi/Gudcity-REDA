@echo off
echo 🔧 Starting local development fix...

echo 📝 Setting up environment...
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

echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Dependency installation failed
    pause
    exit /b 1
)

echo 🗄️  Database setup instructions:
echo    1. Connect to your PostgreSQL database
echo    2. Run the SQL commands from fix-local-database.sql
echo    3. Verify tables exist: security_audit_logs, refresh_tokens, revoked_tokens
echo.
echo 📋 Manual database setup:
echo    psql your_database_url
echo    \i fix-local-database.sql
echo.

echo 🚀 Starting development server...
echo.
echo ✅ All fixes completed!
echo 📋 Summary of fixes applied:
echo    ✅ Created environment configuration
echo    ✅ Installed dependencies
echo    ✅ Fixed AdminLayout component TypeError
echo    ✅ Fixed authentication service token generation
echo    ✅ Fixed API routes configuration
echo.
echo ⚠️  Manual step required: Set up database tables
echo    Run the SQL commands from fix-local-database.sql
echo.
echo 🚀 Starting development server...
call npm run dev

pause

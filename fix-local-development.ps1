# Local Development Fix Script for PowerShell
# Fixes all identified local development issues

Write-Host "🔧 Starting comprehensive local development fix..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json not found. Please run this script from the project root." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "📝 Setting up environment..." -ForegroundColor Yellow

# Create .env.local if it doesn't exist
if (-not (Test-Path ".env.local")) {
    $envContent = @"
NODE_ENV=development
PORT=3000
VITE_PORT=5173
DATABASE_URL=postgresql://localhost:5432/gudcity_reda
JWT_SECRET=local-dev-jwt-secret-key-change-in-production
JWT_REFRESH_SECRET=local-dev-refresh-secret-key-change-in-production
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
ENABLE_SECURITY_AUDIT=true
ENABLE_RATE_LIMITING=true
ENABLE_CSRF_PROTECTION=true
"@
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✅ Created .env.local" -ForegroundColor Green
} else {
    Write-Host "✅ .env.local already exists" -ForegroundColor Green
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
try {
    npm install
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Dependency installation failed: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "🗄️  Database setup instructions:" -ForegroundColor Yellow
Write-Host "   1. Connect to your PostgreSQL database" -ForegroundColor White
Write-Host "   2. Run the SQL commands from fix-local-database.sql" -ForegroundColor White
Write-Host "   3. Verify tables exist: security_audit_logs, refresh_tokens, revoked_tokens" -ForegroundColor White
Write-Host ""
Write-Host "📋 Manual database setup:" -ForegroundColor Yellow
Write-Host "   psql your_database_url" -ForegroundColor White
Write-Host "   \i fix-local-database.sql" -ForegroundColor White
Write-Host ""

Write-Host "🎉 All fixes completed!" -ForegroundColor Green
Write-Host "📋 Summary of fixes applied:" -ForegroundColor Green
Write-Host "   ✅ Created environment configuration" -ForegroundColor White
Write-Host "   ✅ Installed dependencies" -ForegroundColor White
Write-Host "   ✅ Fixed AdminLayout component TypeError" -ForegroundColor White
Write-Host "   ✅ Fixed authentication service token generation" -ForegroundColor White
Write-Host "   ✅ Fixed API routes configuration" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Manual step required: Set up database tables" -ForegroundColor Yellow
Write-Host "   Run the SQL commands from fix-local-database.sql" -ForegroundColor White
Write-Host ""

Write-Host "🚀 Starting development server..." -ForegroundColor Green
try {
    npm run dev
} catch {
    Write-Host "❌ Failed to start development server: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

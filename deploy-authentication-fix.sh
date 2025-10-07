#!/bin/bash

# 🚀 Authentication Fix Deployment Script
# This script deploys the authentication fixes to production

echo "🔧 GudCity REDA - Authentication Fix Deployment"
echo "================================================"
echo ""

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "❌ Error: git is not installed"
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "📋 Found changes to deploy"
    echo ""
    
    # Show what will be committed
    echo "📄 Files to be committed:"
    git status -s
    echo ""
    
    # Ask for confirmation
    read -p "Do you want to proceed with deployment? (y/n) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
    
    # Stage the authentication fix files
    echo "📦 Staging files..."
    git add vercel.json
    git add api/auth/login.ts
    git add api/auth/register.ts
    git add AUTHENTICATION_FIX_DEPLOYMENT_GUIDE.md
    
    # Commit with descriptive message
    echo "💾 Committing changes..."
    git commit -m "fix: resolve 405 authentication error in production

- Fix Vercel routing to properly route API requests to serverless functions
- Enhance CORS configuration for production domains
- Update login and register endpoints with improved origin handling
- Add comprehensive deployment guide

This fix resolves the following issues:
- 405 Method Not Allowed error on /api/auth/login
- CORS issues with production domain
- API endpoint not available errors

Tested and verified for production deployment."
    
    echo "✅ Changes committed successfully"
    echo ""
else
    echo "ℹ️  No changes to commit"
    echo ""
fi

# Push to remote
echo "🚀 Pushing to remote repository..."
if git push origin main; then
    echo "✅ Successfully pushed to GitHub"
    echo ""
    echo "🎉 Deployment initiated!"
    echo ""
    echo "📊 Next Steps:"
    echo "1. Vercel will automatically deploy your changes (2-3 minutes)"
    echo "2. Check your Vercel dashboard: https://vercel.com/dashboard"
    echo "3. Verify environment variables are set (see guide below)"
    echo "4. Test the login functionality once deployment completes"
    echo ""
    echo "📖 For detailed instructions, see: AUTHENTICATION_FIX_DEPLOYMENT_GUIDE.md"
    echo ""
    echo "🔐 IMPORTANT: Verify Environment Variables"
    echo "===========================================" 
    echo "Go to Vercel Dashboard → Settings → Environment Variables"
    echo ""
    echo "Required variables:"
    echo "  • DATABASE_URL"
    echo "  • POSTGRES_URL"
    echo "  • JWT_SECRET"
    echo "  • JWT_REFRESH_SECRET"
    echo "  • QR_SECRET_KEY"
    echo "  • QR_ENCRYPTION_KEY"
    echo "  • VITE_APP_URL"
    echo "  • NODE_ENV=production"
    echo ""
    echo "If any are missing, add them now and redeploy!"
    echo ""
else
    echo "❌ Failed to push to remote repository"
    echo "Please check your git configuration and try again"
    exit 1
fi


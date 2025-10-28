# Vercel Deployment Guide - GudCity Loyalty Platform

## 🚀 Quick Deployment Steps

### 1. Prerequisites
- Vercel account (free tier available)
- GitHub repository with your code
- Environment variables configured

### 2. Deploy to Vercel

#### Option A: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Option B: Deploy via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables
5. Deploy

### 3. Environment Variables Configuration

**CRITICAL**: Set these environment variables in your Vercel project settings:

#### Required Environment Variables
```bash
# JWT Authentication (REQUIRED - Generate strong secrets)
VITE_JWT_SECRET=your_secure_jwt_secret_minimum_64_characters_long
VITE_JWT_REFRESH_SECRET=your_secure_jwt_refresh_secret_minimum_64_characters_long

# QR Code Security (REQUIRED - Generate strong secrets)
VITE_QR_SECRET_KEY=your_secure_qr_secret_key_minimum_64_characters_long
VITE_QR_ENCRYPTION_KEY=your_secure_qr_encryption_key_minimum_64_characters_long

# Application Configuration
VITE_APP_ENV=production
NODE_ENV=production
VITE_DEBUG=false
```

#### Optional Environment Variables
```bash
# API Configuration
VITE_API_URL=https://your-api-domain.vercel.app
APP_URL=https://your-app-domain.vercel.app

# Security Configuration
VITE_CORS_ORIGINS=https://your-app-domain.vercel.app
VITE_CSP_ENABLED=true

# Feature Flags
VITE_ENABLE_FEEDBACK=true
VITE_ENABLE_ANIMATIONS=true
VITE_ENABLE_ANALYTICS=true
VITE_SHOW_MOCK_NOTICE=false
VITE_MOCK_AUTH=false
VITE_MOCK_DATA=false

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
```

### 4. Generate Strong Secrets

#### Generate JWT Secrets (64+ characters)
```bash
# Generate JWT Secret
openssl rand -base64 64

# Generate JWT Refresh Secret
openssl rand -base64 64
```

#### Generate QR Secrets (64+ characters)
```bash
# Generate QR Secret Key
openssl rand -base64 64

# Generate QR Encryption Key
openssl rand -base64 64
```

### 5. Build Configuration

The project is configured with:
- **Build Command**: `npm run build:vercel`
- **Output Directory**: `dist`
- **Install Command**: `npm ci`

### 6. Common Deployment Issues & Solutions

#### Issue 1: Build Fails with "Module not found"
**Solution**: Ensure all dependencies are in `package.json`
```bash
npm install --save <missing-package>
```

#### Issue 2: Environment Variables Not Loading
**Solution**: 
1. Check variable names start with `VITE_`
2. Redeploy after adding variables
3. Verify in Vercel dashboard

#### Issue 3: "crypto.randomBytes is not a function"
**Solution**: Already fixed in the codebase with browser-compatible crypto functions

#### Issue 4: Build Timeout
**Solution**: 
1. Optimize dependencies
2. Use `npm ci` instead of `npm install`
3. Check for circular dependencies

#### Issue 5: Static File Serving Issues
**Solution**: Verify `vercel.json` configuration is correct

### 7. Post-Deployment Verification

#### Check Application
1. Visit your Vercel URL
2. Verify page loads without errors
3. Check browser console for errors
4. Test authentication flow

#### Security Checklist
- [ ] All environment variables set
- [ ] Strong secrets generated (64+ characters)
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] No sensitive data in client code

### 8. Performance Optimization

#### Build Optimization
- Use `npm ci` for faster installs
- Enable Vercel's automatic optimizations
- Configure proper caching headers

#### Runtime Optimization
- Enable Vercel Analytics
- Use Vercel Edge Functions for API routes
- Configure CDN caching

### 9. Monitoring & Maintenance

#### Vercel Dashboard
- Monitor deployment status
- Check function logs
- View analytics

#### Environment Management
- Use different environments for staging/production
- Rotate secrets regularly
- Monitor for security updates

### 10. Troubleshooting

#### Build Logs
```bash
# Check build logs in Vercel dashboard
# Look for specific error messages
# Common issues:
# - Missing environment variables
# - Build timeout
# - Dependency conflicts
```

#### Local Testing
```bash
# Test build locally
npm run build:vercel

# Test production build
npm run preview
```

#### Debug Mode
```bash
# Enable debug mode (development only)
VITE_DEBUG=true npm run build
```

### 11. Security Best Practices

#### Environment Variables
- Never commit secrets to repository
- Use Vercel's environment variable encryption
- Rotate secrets regularly
- Use different secrets for different environments

#### Build Security
- Enable Vercel's security features
- Use HTTPS only
- Configure proper CORS
- Implement rate limiting

### 12. Support & Resources

#### Documentation
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vitejs.dev/guide/)
- [React Documentation](https://react.dev/)

#### Community
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [GitHub Issues](https://github.com/your-repo/issues)

## ✅ Deployment Checklist

- [ ] Vercel account created
- [ ] Repository connected
- [ ] Environment variables configured
- [ ] Strong secrets generated
- [ ] Build successful
- [ ] Application accessible
- [ ] Security headers working
- [ ] Authentication functional
- [ ] Performance optimized
- [ ] Monitoring configured

## 🎉 Success!

Your GudCity Loyalty Platform should now be successfully deployed on Vercel with:
- ✅ Secure authentication
- ✅ QR code functionality
- ✅ Responsive design
- ✅ Performance optimization
- ✅ Security hardening
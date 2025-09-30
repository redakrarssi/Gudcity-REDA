# Domain Update Summary

## Overview
Updated all domain references from `vcarda.com` to `https://www.vcarda.com` across the codebase.

## Files Updated

### Android App
1. **android-app/app/src/main/res/values/strings.xml**
   - Updated `web_base_url` from `https://vcarda.com` to `https://www.vcarda.com`

2. **android-app/app/src/main/AndroidManifest.xml**
   - Updated deep link hosts from `vcarda.com` to `www.vcarda.com`

3. **android-app/app/src/androidTest/java/com/gudcity/app/DeepLinkInstrumentedTest.kt**
   - Updated test deep link URL from `https://vcarda.com/cards` to `https://www.vcarda.com/cards`

4. **android-app/README.md**
   - Updated documentation to reflect new domain

5. **android-app/DIGITAL_ASSET_LINKS.md**
   - Updated Digital Asset Links URL to `https://www.vcarda.com/.well-known/assetlinks.json`
   - Updated instructions to reference `www.vcarda.com`

### iOS App
6. **ios/README.md**
   - Updated example domain from `vcarda.com` to `www.vcarda.com`

### Frontend Configuration
7. **env.example**
   - Updated `FRONTEND_URL` from `https://your-production-domain.com` to `https://www.vcarda.com`

### Email Addresses (Not Changed)
The following email addresses remain unchanged as they don't use www subdomain:
- `contact@vcarda.com` (Footer)
- `support@vcarda.com` (Admin settings)
- Demo credentials using `@vcarda.com` and `@example.com` domains

## Next Steps

### For Android App
1. Host the Digital Asset Links file at:
   ```
   https://www.vcarda.com/.well-known/assetlinks.json
   ```

2. Update your release keystore fingerprint in the assetlinks.json file

3. Build and test the app with the new domain

### For iOS App
1. Update `Vcarda/Config/AppConfig.swift` or Info.plist with:
   - `VCARDA_DOMAIN_PROD` = `www.vcarda.com`
   - `VCARDA_DOMAIN_DEV` = `dev.www.vcarda.com` (or your dev subdomain)
   - `VCARDA_DOMAIN_STAGING` = `staging.www.vcarda.com` (or your staging subdomain)

2. Update Associated Domains in Xcode:
   - Add `applinks:www.vcarda.com`

3. Host the AASA file at:
   ```
   https://www.vcarda.com/.well-known/apple-app-site-association
   ```

### For Production Deployment
1. Update your `.env` file with:
   ```bash
   FRONTEND_URL=https://www.vcarda.com
   VITE_CORS_ORIGINS=https://www.vcarda.com
   ```

2. Configure your DNS to point `www.vcarda.com` to your hosting provider

3. Set up SSL certificate for the domain

4. Update CORS settings on your backend to allow `https://www.vcarda.com`

## Verification Checklist
- [ ] DNS configured for www.vcarda.com
- [ ] SSL certificate installed
- [ ] Digital Asset Links hosted (Android)
- [ ] AASA file hosted (iOS)
- [ ] Environment variables updated
- [ ] CORS origins configured
- [ ] Deep links tested on both platforms
- [ ] All API endpoints accessible from new domain

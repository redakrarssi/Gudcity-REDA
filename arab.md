# Website Translation Guide for Arabic, Spanish, and French

## Overview
This guide provides comprehensive instructions for AI models to accurately translate the Vcarda loyalty platform website into Arabic (العربية), Spanish (Español), and French (Français). The website is a React-based application using i18next for internationalization.

## Current Translation Infrastructure
- **Framework**: React with i18next and react-i18next
- **Translation file**: `src/i18n/index.ts`
- **Current languages**: English (en), Arabic (ar), Spanish (es), French (fr)
- **Current translation keys**: ~8 basic keys (severely incomplete)
- **Usage**: 584+ translation calls across 30+ files using `t()` function

## Application Structure & Content Scope

### 1. Customer-Facing Pages
**Landing Page (`src/pages/LandingPage.tsx`)**
- Hero section with main value proposition
- Feature cards (QR Code, Earn Points, Get Rewards, Digital Wallet)
- Call-to-action buttons (Register, Login)
- Footer with copyright and navigation

**Authentication Pages**
- Login form with email/password fields
- Registration form with personal details
- Password reset functionality
- Error messages and validation feedback

**Customer Dashboard & Features**
- QR Card display and management
- Loyalty program enrollment
- Points and rewards tracking
- Transaction history
- Profile settings
- Promotions and nearby offers

### 2. Business Owner Interface
**Business Dashboard**
- Analytics charts and metrics
- Customer management interface
- QR code scanning functionality
- Loyalty program creation wizard
- Promotion management
- Revenue tracking and reports



## Translation Guidelines

### Language-Specific Considerations

#### Arabic (العربية)
1. **Text Direction**: RTL (Right-to-Left) - ensure UI layouts accommodate this
2. **Formal vs. Informal**: Use formal Arabic for professional business context
3. **Technical Terms**: 
   - "QR Code" → "رمز الاستجابة السريعة" or "رمز QR"
   - "Loyalty Program" → "برنامج الولاء"
   - "Points" → "نقاط"
   - "Rewards" → "مكافآت"
   - "Dashboard" → "لوحة التحكم"
4. **Cultural Adaptation**: Consider Islamic business practices and cultural norms
5. **Number Formatting**: Use Arabic-Indic numerals where culturally appropriate

#### Spanish (Español)
1. **Regional Considerations**: Use neutral Latin American Spanish
2. **Formal Address**: Use "usted" for business interactions
3. **Business Terms**:
   - "Loyalty Program" → "Programa de Lealtad"
   - "Points" → "Puntos"
   - "Rewards" → "Recompensas"
   - "Dashboard" → "Panel de Control"
4. **Gender Agreement**: Ensure proper noun-adjective gender agreement
5. **Currency**: Adapt for various Spanish-speaking markets

#### French (Français)
1. **Formality Level**: Use formal register for business context
2. **Technical Translations**:
   - "QR Code" → "Code QR"
   - "Loyalty Program" → "Programme de Fidélité"
   - "Points" → "Points"
   - "Rewards" → "Récompenses"
   - "Dashboard" → "Tableau de Bord"
3. **Gender Agreement**: Maintain proper masculine/feminine agreements
4. **Canadian vs. European French**: Prioritize European French with Canadian alternatives noted

### Content Categories to Translate

#### 1. Navigation & UI Elements
```javascript
// Examples from current limited translations
{
  "welcome": "Welcome to Vcarda",
  "login": "Login",
  "register": "Register",
  "dashboard": "Dashboard",
  "myQRCard": "My QR Card",
  "myPrograms": "My Programs",
  "rewardsHistory": "Rewards History",
  "codeWallet": "Code Wallet"
}
```

#### 2. Forms & Input Labels
- Field labels (Name, Email, Password, Phone, etc.)
- Placeholder text
- Validation error messages
- Success confirmations
- Help text and tooltips

#### 3. Business Process Terms
- Program creation wizard steps
- Point awarding terminology
- Redemption processes
- Analytics and reporting terms
- Customer enrollment flow

#### 4. Error Messages & System Feedback
- Network connection errors
- Database fallback messages
- Form validation errors
- Success notifications
- Loading states

#### 5. Help & Instructional Text
- Onboarding wizard content
- Feature explanations
- How-to guides
- FAQ content
- Terms of service elements

## Translation Process Instructions

### Step 1: Audit Current Content
1. Search for all `t('key')` calls in the codebase
2. Identify hardcoded English text that should be translated
3. Create comprehensive key inventory

### Step 2: Expand Translation File Structure
```javascript
const resources = {
  en: {
    translation: {
      // Navigation
      nav: {
        home: "Home",
        dashboard: "Dashboard",
        programs: "Programs",
        // ... more nav items
      },
      
      // Forms
      forms: {
        labels: {
          email: "Email",
          password: "Password",
          // ... more labels
        },
        placeholders: {
          enterEmail: "Enter your email",
          // ... more placeholders
        },
        validation: {
          required: "This field is required",
          // ... more validation messages
        }
      },
      
      // Business terms
      business: {
        loyaltyProgram: "Loyalty Program",
        pointsAwarded: "Points Awarded",
        // ... more business terms
      }
    }
  },
  ar: {
    // Arabic translations with same structure
  },
  es: {
    // Spanish translations with same structure
  },
  fr: {
    // French translations with same structure
  }
};
```

### Step 3: Component-by-Component Translation
Focus on these high-priority components in order:

1. **Authentication Flow** - Login, Register, Password Reset
2. **Landing Page** - Main marketing content
3. **Customer QR Card** - Core functionality
4. **Business Program Creation** - Key business feature
5. **Dashboards** - Both customer and business
6. **Error Handling** - All error states
7. **Settings Pages** - User preferences

### Step 4: Dynamic Content Considerations
Some content comes from the database and needs special handling:
- Business names (keep original)
- User-generated program descriptions
- Custom reward names
- System-generated timestamps and IDs

### Step 5: Testing Requirements
1. **Visual Testing**: Ensure translated text fits UI layouts
2. **Functional Testing**: Verify all features work in each language
3. **Cultural Testing**: Confirm cultural appropriateness
4. **RTL Testing**: Special attention to Arabic layout

## Implementation Checklist

### Before Starting Translation
- [ ] Install and configure i18next-browser-languagedetector for automatic language detection
- [ ] Set up proper font support for Arabic script
- [ ] Configure CSS for RTL support
- [ ] Create fallback handling for missing translations

### During Translation
- [ ] Maintain consistent terminology across all pages
- [ ] Preserve HTML markup and interpolation variables
- [ ] Test character limits for buttons and small UI elements
- [ ] Validate special characters and encoding
- [ ] Ensure currency symbols and number formats are appropriate

### After Translation
- [ ] Implement language switcher component
- [ ] Configure proper URL routing for different languages
- [ ] Set up SEO meta tags in each language
- [ ] Test accessibility with screen readers in each language
- [ ] Validate form submissions work in all languages

## Technical Implementation Notes

### File Modifications Required
1. **Enhanced i18n configuration** in `src/i18n/index.ts`
2. **Component updates** to use translation keys instead of hardcoded text
3. **CSS additions** for RTL support (Arabic)
4. **Router configuration** for language-specific routes (optional)

### Key Components Needing Translation
Based on codebase analysis, prioritize these files:
- `src/pages/LandingPage.tsx` - Main entry point
- `src/pages/auth/Login.tsx` - User authentication
- `src/components/QRCard.tsx` - Core functionality
- `src/components/business/ProgramBuilder.tsx` - Business features
- `src/components/onboarding/` - User onboarding flows
- `src/pages/business/Dashboard.tsx` - Business management
- `src/pages/customer/Dashboard.tsx` - Customer interface

### Quality Assurance Standards
1. **Accuracy**: Technical terms must be consistently translated
2. **Completeness**: No untranslated text visible to users
3. **Context**: Translations must make sense within the loyalty program domain
4. **Consistency**: Same terms translated identically throughout
5. **Localization**: Dates, numbers, and currencies properly formatted

## Maintenance Guidelines
1. **New Features**: Always add translation keys for new text
2. **Key Naming**: Use hierarchical naming convention (nav.home, forms.labels.email)
3. **Documentation**: Maintain translation key documentation
4. **Version Control**: Track translation updates with code changes

## Success Criteria
The translation is complete when:
- All user-visible text is properly translated
- UI layouts work correctly in all languages
- Forms and interactions function properly
- Cultural appropriateness is maintained
- No English text appears when using Arabic, Spanish, or French language settings
- The application maintains full functionality across all supported languages

---

**Note**: This is a comprehensive, production-ready loyalty platform with complex business logic. Ensure all translations maintain the professional tone appropriate for business-to-business and business-to-consumer interactions.

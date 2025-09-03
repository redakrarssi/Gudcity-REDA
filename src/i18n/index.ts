import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Navigation & Core UI
      welcome: 'Welcome to Vcarda',
      login: 'Login',
      register: 'Register',
      dashboard: 'Dashboard',
      home: 'Home',
      settings: 'Settings',
      logout: 'Logout',
      profile: 'Profile',
      
      // QR & Cards
      myQRCard: 'My QR Card',
      myPrograms: 'My Programs',
      rewardsHistory: 'Rewards History',
      codeWallet: 'Code Wallet',
      'Scan QR': 'Scan QR',
      'QR Code': 'QR Code',
      
      // Business Terms
      loyaltyProgram: 'Loyalty Program',
      points: 'Points',
      rewards: 'Rewards',
      customers: 'Customers',
      programs: 'Programs',
      analytics: 'Analytics',
      
      // Common Actions
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      view: 'View',
      back: 'Back',
      next: 'Next',
      continue: 'Continue',
      submit: 'Submit',
      loading: 'Loading...',
      
      // Customer Dashboard
      customerDashboard: {
        title: 'Customer Dashboard',
        defaultName: 'Customer',
        totalPoints: 'Total Points',
        recentActivity: 'Recent Activity',
        upcomingRewards: 'Upcoming Rewards',
        noActivity: 'No recent activity',
        pointsAwarded: 'Points Awarded',
        welcomeBack: 'Welcome back'
      },
      
      // Dashboard Tabs
      enrolledPrograms: 'Enrolled Programs',
      browsePrograms: 'Browse Programs',
      transactions: 'Transactions',
      
      // Program Messages
      noPrograms: 'No programs enrolled',
      noProgramsDescription: 'Browse available programs to start earning rewards',
      
      // Time References
      today: 'Today',
      yesterday: 'Yesterday',
      daysAgo: '{{days}} days ago',
      
      // Dashboard Content
      welcomeBack: 'Welcome back',
      scanQRCode: 'Scan your QR code to earn rewards',
      programs: 'Programs',
      rewardsReady: 'Rewards Ready',
      tapToEnlarge: 'Tap to enlarge',
      recentActivity: 'Recent Activity',
      last7Days: 'Last 7 days',
      noRecentActivity: 'No recent activity found',
      nextRewards: 'Next Rewards',
      viewAll: 'View all',
      noUpcomingRewards: 'No upcoming rewards found',
      pointsMore: 'points more',
      complete: 'complete',
      trendingRewards: 'Trending Rewards',
      popularNow: 'Popular now',
      redeemed: 'redeemed',
      limitedTimeOffer: 'Limited time offer',
      withAnyMealPurchase: 'With any meal purchase',
      earnedPoints: 'Earned {{points}} points',
      redeemedPoints: 'Redeemed {{points}} points',
      
      // Program Browser
      searchPrograms: 'Search programs...',
      filterByCategory: 'Filter by category',
      allCategories: 'All Categories',
      enroll: 'Enroll',
      enrolled: 'Enrolled',
      joinProgram: 'Join Program',
      
      // Transaction History
      transactionHistory: 'Transaction History',
      filterByType: 'Filter by type',
      allTypes: 'All Types',
      earn: 'Earn',
      redeem: 'Redeem',
      filterByDate: 'Filter by date',
      allDates: 'All Dates',
      week: 'Week',
      month: 'Month',
      year: 'Year',
      exportCSV: 'Export CSV',
      noTransactions: 'No transactions found',
      searchTransactions: 'Search transactions...',
      export: 'Export',
      allTypes: 'All Types',
      pointsEarned: 'Points Earned',
      pointsRedeemed: 'Points Redeemed',
      allTime: 'All Time',
      lastWeek: 'Last Week',
      lastMonth: 'Last Month',
      lastYear: 'Last Year',
      retrying: 'Retrying...',
      
      // Loyalty Card
      availableRewards: 'Available Rewards!',
      rewards: 'Rewards',
      viewCard: 'View Card',
      allRewardsEarned: 'All rewards earned!',
      noRewardsAvailable: 'No rewards available',
      
      // Loyalty Card Additional
      loyaltyProgram: 'Loyalty Program',
      business: 'Business',
      pointsMoreToNextTier: '{{points}} more points to {{nextTier}}',
      maximumTierReached: 'Maximum tier reached',
      collectPointsForRewards: 'Collect points for rewards',
      silver: 'Silver',
      gold: 'Gold',
      platinum: 'Platinum',
      automaticBenefit: 'Automatic benefit',
      needMorePoints: 'Need {{points}} more points',
      yourPoints: 'Your Points',
      multiplier: '{{multiplier}}× multiplier',
      availableRewardsExclamation: 'Available Rewards!',
      redeemNow: 'Redeem now!',
      points: '{{points}} points',
      redeem: 'Redeem',
      showQRCode: 'Show QR Code',
      retry: 'Retry',
      generatingQRCode: 'Generating QR code...',
      cardBenefits: 'Card Benefits',
      yourReferralCode: 'Your Referral Code',
      shareToGiveFriendsBonus: 'Share to give friends 100 bonus points',
      copied: 'Copied!',
      shareCode: 'Share Code',
      showLess: 'Show Less',
      showMore: 'Show More',
      cardDetails: 'Card Details',
      cardNumber: 'Card Number',
      cardType: 'Card Type',
      issuedOn: 'Issued On',
      expiresOn: 'Expires On',
      pointsMultiplier: 'Points Multiplier',
      
      // Business Dashboard
      business: {
        dashboard: 'Business Dashboard',
        'Welcome to your Dashboard': 'Welcome to your Dashboard',
        'New Program': 'New Program',
        customers: 'Customers',
        programs: 'Programs',
        analytics: 'Analytics',
        settings: 'Settings',
        'Send Promo Code': 'Send Promo Code',
        'Send Surprise Gift': 'Send Surprise Gift',
        'Send Message': 'Send Message',
        'Enter your message to the customer:': 'Enter your message to the customer:'
      },
      
      // Forms & Validation
      forms: {
        labels: {
          email: 'Email',
          password: 'Password',
          name: 'Name',
          phone: 'Phone',
          address: 'Address',
          language: 'Language',
          currency: 'Currency'
        },
        placeholders: {
          enterEmail: 'Enter your email',
          enterPassword: 'Enter your password',
          enterName: 'Enter your name'
        },
        validation: {
          required: 'This field is required',
          emailInvalid: 'Please enter a valid email',
          passwordTooShort: 'Password must be at least 8 characters'
        }
      },
      
      // Settings Page
      settings: {
        title: 'Settings',
        personalInfo: 'Personal Information',
        preferences: 'Preferences',
        security: 'Security',
        language: 'Language',
        currency: 'Currency',
        notifications: 'Notifications',
        privacy: 'Privacy',
        help: 'Help & Support'
      },
      
      // Authentication Pages
      auth: {
        // Login Page
        'Sign in to your account': 'Sign in to your account',
        'Access the Vcarda platform': 'Access the Vcarda platform',
        'Demo Credentials': 'Demo Credentials',
        'Admin': 'Admin',
        'Customer': 'Customer',
        'Business': 'Business',
        'Email address': 'Email address',
        'Password': 'Password',
        'Remember me': 'Remember me',
        'Forgot your password?': 'Forgot your password?',
        'Sign in': 'Sign in',
        'Signing in...': 'Signing in...',
        "Don't have an account?": "Don't have an account?",
        'Create an account': 'Create an account',
        'Back to Homepage': 'Back to Homepage',
        
        // Register Page
        'Create your account': 'Create your account',
        'Join Vcarda and connect with your community': 'Join Vcarda and connect with your community',
        'Full Name': 'Full Name',
        'Enter your full name': 'Enter your full name',
        'Email Address': 'Email Address',
        'Enter your email': 'Enter your email',
        'Create a password': 'Create a password',
        'Confirm Password': 'Confirm Password',
        'Confirm your password': 'Confirm your password',
        'Business Name': 'Business Name',
        'Enter your business name': 'Enter your business name',
        'Business Phone': 'Business Phone',
        'Enter your business phone': 'Enter your business phone',
        'I accept the': 'I accept the',
        'Terms of Service': 'Terms of Service',
        'and': 'and',
        'Privacy Policy': 'Privacy Policy',
        'Creating account...': 'Creating account...',
        'Already have an account?': 'Already have an account?',
        
        // Validation Messages
        'Please enter both email and password': 'Please enter both email and password',
        'Invalid email or password. Please check your credentials and try again.': 'Invalid email or password. Please check your credentials and try again.',
        'An error occurred during login. Please try again later.': 'An error occurred during login. Please try again later.',
        'If you continue to experience issues, try using one of the demo accounts above.': 'If you continue to experience issues, try using one of the demo accounts above.',
        'Please fill in all required fields': 'Please fill in all required fields',
        'Please enter a valid email address': 'Please enter a valid email address',
        'Password must be more than 6 characters': 'Password must be more than 6 characters',
        'Passwords do not match': 'Passwords do not match',
        'Business name is required': 'Business name is required',
        'Business phone is required': 'Business phone is required',
        'You must accept the terms and conditions': 'You must accept the terms and conditions',
        'Registration failed. Email address may already be in use. Please try a different email or contact support.': 'Registration failed. Email address may already be in use. Please try a different email or contact support.',
        'An error occurred during registration. Please try again later.': 'An error occurred during registration. Please try again later.',
        'Make sure to use a unique email address that is not already registered. If problems persist, you can try logging in with the demo accounts instead.': 'Make sure to use a unique email address that is not already registered. If problems persist, you can try logging in with the demo accounts instead.'
      },
      
      // Additional common translations
      'Language changes will be applied immediately': 'Language changes will be applied immediately',
      'Regional Settings': 'Regional Settings',
      'Preferred Currency': 'Preferred Currency',
      
      // Language Selection
      language: {
        select: 'Select Language',
        english: 'English',
        arabic: 'Arabic',
        spanish: 'Spanish',
        french: 'French'
      },
      
      // Landing Page
      landing: {
        hero: {
          title: 'Welcome to Vcarda',
          subtitle: 'The ultimate loyalty platform for businesses and customers'
        },
        features: {
          qrCode: {
            title: 'Easy QR Code',
            description: 'Show your QR code to collect points at your favorite stores'
          },
          earnPoints: {
            title: 'Earn Points',
            description: 'Collect points and stamps from participating businesses'
          },
          getRewards: {
            title: 'Get Rewards',
            description: 'Redeem your points for amazing rewards and discounts'
          },
          digitalWallet: {
            title: 'Digital Wallet',
            description: 'Keep all your loyalty cards in one place'
          }
        },
        footer: {
          allRightsReserved: 'All rights reserved.',
          pricing: 'Pricing',
          comments: 'Comments'
        }
      }
    },
  },
  ar: {
    translation: {
      // Navigation & Core UI
      welcome: 'مرحباً بكم في Vcarda',
      login: 'تسجيل الدخول',
      register: 'التسجيل',
      dashboard: 'لوحة التحكم',
      home: 'الرئيسية',
      settings: 'الإعدادات',
      logout: 'تسجيل الخروج',
      profile: 'الملف الشخصي',
      
      // QR & Cards
      myQRCard: 'بطاقة QR الخاصة بي',
      myPrograms: 'برامجي',
      rewardsHistory: 'سجل المكافآت',
      codeWallet: 'محفظة الرموز',
      'Scan QR': 'مسح رمز QR',
      'QR Code': 'رمز QR',
      
      // Business Terms
      loyaltyProgram: 'برنامج الولاء',
      points: 'نقاط',
      rewards: 'مكافآت',
      customers: 'العملاء',
      programs: 'البرامج',
      analytics: 'التحليلات',
      
      // Common Actions
      save: 'حفظ',
      cancel: 'إلغاء',
      edit: 'تعديل',
      delete: 'حذف',
      view: 'عرض',
      back: 'رجوع',
      next: 'التالي',
      continue: 'متابعة',
      submit: 'إرسال',
      loading: 'جاري التحميل...',
      
      // Customer Dashboard
      customerDashboard: {
        title: 'لوحة تحكم العميل',
        defaultName: 'العميل',
        totalPoints: 'إجمالي النقاط',
        recentActivity: 'النشاط الحديث',
        upcomingRewards: 'المكافآت القادمة',
        noActivity: 'لا يوجد نشاط حديث',
        pointsAwarded: 'نقاط ممنوحة',
        welcomeBack: 'مرحباً بعودتك'
      },
      
      // Dashboard Tabs
      enrolledPrograms: 'البرامج المسجلة',
      browsePrograms: 'تصفح البرامج',
      transactions: 'المعاملات',
      
      // Program Messages
      noPrograms: 'لا توجد برامج مسجلة',
      noProgramsDescription: 'تصفح البرامج المتاحة لبدء كسب المكافآت',
      
      // Time References
      today: 'اليوم',
      yesterday: 'أمس',
      daysAgo: 'منذ {{days}} أيام',
      
      // Dashboard Content
      welcomeBack: 'مرحباً بعودتك',
      scanQRCode: 'امسح رمز QR الخاص بك لكسب المكافآت',
      programs: 'البرامج',
      rewardsReady: 'المكافآت جاهزة',
      tapToEnlarge: 'اضغط للتكبير',
      recentActivity: 'النشاط الحديث',
      last7Days: 'آخر 7 أيام',
      noRecentActivity: 'لا يوجد نشاط حديث',
      nextRewards: 'المكافآت التالية',
      viewAll: 'عرض الكل',
      noUpcomingRewards: 'لا توجد مكافآت قادمة',
      pointsMore: 'نقاط إضافية',
      complete: 'مكتمل',
      trendingRewards: 'المكافآت الرائجة',
      popularNow: 'شائع الآن',
      redeemed: 'مستبدل',
      limitedTimeOffer: 'عرض لفترة محدودة',
      withAnyMealPurchase: 'مع أي وجبة',
      earnedPoints: 'كسب {{points}} نقاط',
      redeemedPoints: 'استبدل {{points}} نقاط',
      
      // Program Browser
      searchPrograms: 'البحث في البرامج...',
      filterByCategory: 'تصفية حسب الفئة',
      allCategories: 'جميع الفئات',
      enroll: 'التسجيل',
      enrolled: 'مسجل',
      joinProgram: 'انضم للبرنامج',
      
      // Transaction History
      transactionHistory: 'سجل المعاملات',
      filterByType: 'تصفية حسب النوع',
      allTypes: 'جميع الأنواع',
      earn: 'كسب',
      redeem: 'استبدال',
      filterByDate: 'تصفية حسب التاريخ',
      allDates: 'جميع التواريخ',
      week: 'أسبوع',
      month: 'شهر',
      year: 'سنة',
      exportCSV: 'تصدير CSV',
      noTransactions: 'لا توجد معاملات',
      searchTransactions: 'البحث في المعاملات...',
      export: 'تصدير',
      allTypes: 'جميع الأنواع',
      pointsEarned: 'نقاط مكسبة',
      pointsRedeemed: 'نقاط مستبدلة',
      allTime: 'كل الوقت',
      lastWeek: 'الأسبوع الماضي',
      lastMonth: 'الشهر الماضي',
      lastYear: 'السنة الماضية',
      retrying: 'إعادة المحاولة...',
      
      // Loyalty Card
      availableRewards: 'المكافآت متاحة!',
      rewards: 'المكافآت',
      viewCard: 'عرض البطاقة',
      allRewardsEarned: 'تم كسب جميع المكافآت!',
      noRewardsAvailable: 'لا توجد مكافآت متاحة',
      
      // Loyalty Card Additional
      loyaltyProgram: 'برنامج الولاء',
      business: 'الشركة',
      pointsMoreToNextTier: '{{points}} نقاط إضافية للوصول إلى {{nextTier}}',
      maximumTierReached: 'تم الوصول للدرجة القصوى',
      collectPointsForRewards: 'اجمع النقاط للحصول على المكافآت',
      silver: 'فضي',
      gold: 'ذهبي',
      platinum: 'بلاتيني',
      automaticBenefit: 'ميزة تلقائية',
      needMorePoints: 'تحتاج {{points}} نقاط إضافية',
      yourPoints: 'نقاطك',
      multiplier: '{{multiplier}}× مضاعف',
      availableRewardsExclamation: 'المكافآت متاحة!',
      redeemNow: 'استبدل الآن!',
      points: '{{points}} نقاط',
      redeem: 'استبدال',
      showQRCode: 'عرض رمز QR',
      retry: 'إعادة المحاولة',
      generatingQRCode: 'جاري إنشاء رمز QR...',
      cardBenefits: 'مزايا البطاقة',
      yourReferralCode: 'رمز الإحالة الخاص بك',
      shareToGiveFriendsBonus: 'شارك لإعطاء الأصدقاء 100 نقطة إضافية',
      copied: 'تم النسخ!',
      shareCode: 'مشاركة الرمز',
      showLess: 'عرض أقل',
      showMore: 'عرض المزيد',
      cardDetails: 'تفاصيل البطاقة',
      cardNumber: 'رقم البطاقة',
      cardType: 'نوع البطاقة',
      issuedOn: 'صدر في',
      expiresOn: 'ينتهي في',
      pointsMultiplier: 'مضاعف النقاط',
      
      // Business Dashboard
      business: {
        dashboard: 'لوحة تحكم الأعمال',
        'Welcome to your Dashboard': 'مرحباً بك في لوحة التحكم',
        'New Program': 'برنامج جديد',
        customers: 'العملاء',
        programs: 'البرامج',
        analytics: 'التحليلات',
        settings: 'الإعدادات',
        'Send Promo Code': 'إرسال رمز ترويجي',
        'Send Surprise Gift': 'إرسال هدية مفاجئة',
        'Send Message': 'إرسال رسالة',
        'Enter your message to the customer:': 'أدخل رسالتك للعميل:'
      },
      
      // Forms & Validation
      forms: {
        labels: {
          email: 'البريد الإلكتروني',
          password: 'كلمة المرور',
          name: 'الاسم',
          phone: 'رقم الهاتف',
          address: 'العنوان',
          language: 'اللغة',
          currency: 'العملة'
        },
        placeholders: {
          enterEmail: 'أدخل بريدك الإلكتروني',
          enterPassword: 'أدخل كلمة المرور',
          enterName: 'أدخل اسمك'
        },
        validation: {
          required: 'هذا الحقل مطلوب',
          emailInvalid: 'يرجى إدخال بريد إلكتروني صحيح',
          passwordTooShort: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل'
        }
      },
      
      // Settings Page
      settings: {
        title: 'الإعدادات',
        personalInfo: 'المعلومات الشخصية',
        preferences: 'التفضيلات',
        security: 'الأمان',
        language: 'اللغة',
        currency: 'العملة',
        notifications: 'الإشعارات',
        privacy: 'الخصوصية',
        help: 'المساعدة والدعم'
      },
      
      // Authentication Pages
      auth: {
        // Login Page
        'Sign in to your account': 'تسجيل الدخول إلى حسابك',
        'Access the Vcarda platform': 'الوصول إلى منصة Vcarda',
        'Demo Credentials': 'بيانات تجريبية',
        'Admin': 'مدير',
        'Customer': 'عميل',
        'Business': 'شركة',
        'Email address': 'عنوان البريد الإلكتروني',
        'Password': 'كلمة المرور',
        'Remember me': 'تذكرني',
        'Forgot your password?': 'نسيت كلمة المرور؟',
        'Sign in': 'تسجيل الدخول',
        'Signing in...': 'جارٍ تسجيل الدخول...',
        "Don't have an account?": 'ليس لديك حساب؟',
        'Create an account': 'إنشاء حساب',
        'Back to Homepage': 'العودة للصفحة الرئيسية',
        
        // Register Page  
        'Create your account': 'إنشاء حسابك',
        'Join Vcarda and connect with your community': 'انضم إلى Vcarda وتواصل مع مجتمعك',
        'Full Name': 'الاسم الكامل',
        'Enter your full name': 'أدخل اسمك الكامل',
        'Email Address': 'عنوان البريد الإلكتروني',
        'Enter your email': 'أدخل بريدك الإلكتروني',
        'Create a password': 'إنشاء كلمة مرور',
        'Confirm Password': 'تأكيد كلمة المرور',
        'Confirm your password': 'أكد كلمة المرور',
        'Business Name': 'اسم الشركة',
        'Enter your business name': 'أدخل اسم شركتك',
        'Business Phone': 'هاتف الشركة',
        'Enter your business phone': 'أدخل هاتف شركتك',
        'I accept the': 'أوافق على',
        'Terms of Service': 'شروط الخدمة',
        'and': 'و',
        'Privacy Policy': 'سياسة الخصوصية',
        'Creating account...': 'جارٍ إنشاء الحساب...',
        'Already have an account?': 'لديك حساب بالفعل؟',
        
        // Validation Messages
        'Please enter both email and password': 'يرجى إدخال البريد الإلكتروني وكلمة المرور',
        'Invalid email or password. Please check your credentials and try again.': 'بريد إلكتروني أو كلمة مرور غير صحيحة. يرجى التحقق من بياناتك والمحاولة مرة أخرى.',
        'An error occurred during login. Please try again later.': 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة لاحقاً.',
        'If you continue to experience issues, try using one of the demo accounts above.': 'إذا استمرت المشاكل، جرب استخدام أحد الحسابات التجريبية أعلاه.',
        'Please fill in all required fields': 'يرجى ملء جميع الحقول المطلوبة',
        'Please enter a valid email address': 'يرجى إدخال عنوان بريد إلكتروني صحيح',
        'Password must be more than 6 characters': 'يجب أن تكون كلمة المرور أكثر من 6 أحرف',
        'Passwords do not match': 'كلمات المرور غير متطابقة',
        'Business name is required': 'اسم الشركة مطلوب',
        'Business phone is required': 'هاتف الشركة مطلوب',
        'You must accept the terms and conditions': 'يجب قبول الشروط والأحكام',
        'Registration failed. Email address may already be in use. Please try a different email or contact support.': 'فشل التسجيل. قد يكون البريد الإلكتروني مُستخدم بالفعل. جرب بريداً آخر أو تواصل مع الدعم.',
        'An error occurred during registration. Please try again later.': 'حدث خطأ أثناء التسجيل. يرجى المحاولة لاحقاً.',
        'Make sure to use a unique email address that is not already registered. If problems persist, you can try logging in with the demo accounts instead.': 'تأكد من استخدام بريد إلكتروني فريد غير مُسجل مسبقاً. إذا استمرت المشاكل، يمكنك تسجيل الدخول بالحسابات التجريبية.'
      },
      
      // Additional common translations
      'Language changes will be applied immediately': 'سيتم تطبيق تغييرات اللغة فوراً',
      'Regional Settings': 'الإعدادات الإقليمية',
      'Preferred Currency': 'العملة المفضلة',
      
      // Language Selection
      language: {
        select: 'اختر اللغة',
        english: 'الإنجليزية',
        arabic: 'العربية',
        spanish: 'الإسبانية',
        french: 'الفرنسية'
      },
      
      // Landing Page
      landing: {
        hero: {
          title: 'مرحباً بكم في Vcarda',
          subtitle: 'منصة الولاء الأمثل للأعمال والعملاء'
        },
        features: {
          qrCode: {
            title: 'رمز QR سهل',
            description: 'اعرض رمز QR الخاص بك لجمع النقاط في متاجرك المفضلة'
          },
          earnPoints: {
            title: 'اكسب النقاط',
            description: 'اجمع النقاط والطوابع من الأعمال المشاركة'
          },
          getRewards: {
            title: 'احصل على المكافآت',
            description: 'استبدل نقاطك بمكافآت وخصومات رائعة'
          },
          digitalWallet: {
            title: 'محفظة رقمية',
            description: 'احتفظ بجميع بطاقات الولاء في مكان واحد'
          }
        },
        footer: {
          allRightsReserved: 'جميع الحقوق محفوظة.',
          pricing: 'التسعير',
          comments: 'التعليقات'
        }
      }
    },
  },
  es: {
    translation: {
      // Navigation & Core UI
      welcome: 'Bienvenido a Vcarda',
      login: 'Iniciar sesión',
      register: 'Registrarse',
      dashboard: 'Panel',
      home: 'Inicio',
      settings: 'Configuración',
      logout: 'Cerrar sesión',
      profile: 'Perfil',
      
      // QR & Cards
      myQRCard: 'Mi tarjeta QR',
      myPrograms: 'Mis programas',
      rewardsHistory: 'Historial de recompensas',
      codeWallet: 'Cartera de códigos',
      'Scan QR': 'Escanear QR',
      'QR Code': 'Código QR',
      
      // Business Terms
      loyaltyProgram: 'Programa de Lealtad',
      points: 'Puntos',
      rewards: 'Recompensas',
      customers: 'Clientes',
      programs: 'Programas',
      analytics: 'Análisis',
      
      // Common Actions
      save: 'Guardar',
      cancel: 'Cancelar',
      edit: 'Editar',
      delete: 'Eliminar',
      view: 'Ver',
      back: 'Atrás',
      next: 'Siguiente',
      continue: 'Continuar',
      submit: 'Enviar',
      loading: 'Cargando...',
      
      // Customer Dashboard
      customerDashboard: {
        title: 'Panel del Cliente',
        defaultName: 'Cliente',
        totalPoints: 'Puntos Totales',
        recentActivity: 'Actividad Reciente',
        upcomingRewards: 'Próximas Recompensas',
        noActivity: 'Sin actividad reciente',
        pointsAwarded: 'Puntos Otorgados',
        welcomeBack: 'Bienvenido de vuelta'
      },
      
      // Dashboard Tabs
      enrolledPrograms: 'Programas Inscritos',
      browsePrograms: 'Explorar Programas',
      transactions: 'Transacciones',
      
      // Program Messages
      noPrograms: 'Sin programas inscritos',
      noProgramsDescription: 'Explora programas disponibles para comenzar a ganar recompensas',
      
      // Time References
      today: 'Hoy',
      yesterday: 'Ayer',
      daysAgo: 'Hace {{days}} días',
      
      // Dashboard Content
      welcomeBack: 'Bienvenido de vuelta',
      scanQRCode: 'Escanea tu código QR para ganar recompensas',
      programs: 'Programas',
      rewardsReady: 'Recompensas Listas',
      tapToEnlarge: 'Toca para ampliar',
      recentActivity: 'Actividad Reciente',
      last7Days: 'Últimos 7 días',
      noRecentActivity: 'Sin actividad reciente',
      nextRewards: 'Próximas Recompensas',
      viewAll: 'Ver todo',
      noUpcomingRewards: 'Sin recompensas próximas',
      pointsMore: 'puntos más',
      complete: 'completo',
      trendingRewards: 'Recompensas Populares',
      popularNow: 'Popular ahora',
      redeemed: 'canjeado',
      limitedTimeOffer: 'Oferta por tiempo limitado',
      withAnyMealPurchase: 'Con cualquier compra de comida',
      earnedPoints: 'Ganó {{points}} puntos',
      redeemedPoints: 'Canjeó {{points}} puntos',
      
      // Program Browser
      searchPrograms: 'Buscar programas...',
      filterByCategory: 'Filtrar por categoría',
      allCategories: 'Todas las Categorías',
      enroll: 'Inscribirse',
      enrolled: 'Inscrito',
      joinProgram: 'Unirse al Programa',
      
      // Transaction History
      transactionHistory: 'Historial de Transacciones',
      filterByType: 'Filtrar por tipo',
      allTypes: 'Todos los Tipos',
      earn: 'Ganar',
      redeem: 'Canjear',
      filterByDate: 'Filtrar por fecha',
      allDates: 'Todas las Fechas',
      week: 'Semana',
      month: 'Mes',
      year: 'Año',
      exportCSV: 'Exportar CSV',
      noTransactions: 'No se encontraron transacciones',
      searchTransactions: 'Buscar transacciones...',
      export: 'Exportar',
      allTypes: 'Todos los Tipos',
      pointsEarned: 'Puntos Ganados',
      pointsRedeemed: 'Puntos Canjeados',
      allTime: 'Todo el Tiempo',
      lastWeek: 'Última Semana',
      lastMonth: 'Último Mes',
      lastYear: 'Último Año',
      retrying: 'Reintentando...',
      
      // Loyalty Card
      availableRewards: '¡Recompensas Disponibles!',
      rewards: 'Recompensas',
      viewCard: 'Ver Tarjeta',
      allRewardsEarned: '¡Todas las recompensas ganadas!',
      noRewardsAvailable: 'No hay recompensas disponibles',
      
      // Loyalty Card Additional
      loyaltyProgram: 'Programa de Lealtad',
      business: 'Negocio',
      pointsMoreToNextTier: '{{points}} puntos más para {{nextTier}}',
      maximumTierReached: 'Nivel máximo alcanzado',
      collectPointsForRewards: 'Recolecta puntos para recompensas',
      silver: 'Plata',
      gold: 'Oro',
      platinum: 'Platino',
      automaticBenefit: 'Beneficio automático',
      needMorePoints: 'Necesitas {{points}} puntos más',
      yourPoints: 'Tus Puntos',
      multiplier: '{{multiplier}}× multiplicador',
      availableRewardsExclamation: '¡Recompensas Disponibles!',
      redeemNow: '¡Canjear ahora!',
      points: '{{points}} puntos',
      redeem: 'Canjear',
      showQRCode: 'Mostrar Código QR',
      retry: 'Reintentar',
      generatingQRCode: 'Generando código QR...',
      cardBenefits: 'Beneficios de la Tarjeta',
      yourReferralCode: 'Tu Código de Referencia',
      shareToGiveFriendsBonus: 'Comparte para dar a amigos 100 puntos bonus',
      copied: '¡Copiado!',
      shareCode: 'Compartir Código',
      showLess: 'Mostrar Menos',
      showMore: 'Mostrar Más',
      cardDetails: 'Detalles de la Tarjeta',
      cardNumber: 'Número de Tarjeta',
      cardType: 'Tipo de Tarjeta',
      issuedOn: 'Emitida el',
      expiresOn: 'Expira el',
      pointsMultiplier: 'Multiplicador de Puntos',
      
      // Business Dashboard
      business: {
        dashboard: 'Panel de Negocios',
        'Welcome to your Dashboard': 'Bienvenido a su Panel',
        'New Program': 'Nuevo Programa',
        customers: 'Clientes',
        programs: 'Programas',
        analytics: 'Análisis',
        settings: 'Configuración',
        'Send Promo Code': 'Enviar Código Promocional',
        'Send Surprise Gift': 'Enviar Regalo Sorpresa',
        'Send Message': 'Enviar Mensaje',
        'Enter your message to the customer:': 'Ingrese su mensaje para el cliente:'
      },
      
      // Forms & Validation
      forms: {
        labels: {
          email: 'Correo Electrónico',
          password: 'Contraseña',
          name: 'Nombre',
          phone: 'Teléfono',
          address: 'Dirección',
          language: 'Idioma',
          currency: 'Moneda'
        },
        placeholders: {
          enterEmail: 'Ingrese su correo electrónico',
          enterPassword: 'Ingrese su contraseña',
          enterName: 'Ingrese su nombre'
        },
        validation: {
          required: 'Este campo es requerido',
          emailInvalid: 'Por favor ingrese un correo válido',
          passwordTooShort: 'La contraseña debe tener al menos 8 caracteres'
        }
      },
      
      // Settings Page
      settings: {
        title: 'Configuración',
        personalInfo: 'Información Personal',
        preferences: 'Preferencias',
        security: 'Seguridad',
        language: 'Idioma',
        currency: 'Moneda',
        notifications: 'Notificaciones',
        privacy: 'Privacidad',
        help: 'Ayuda y Soporte'
      },
      
      // Authentication Pages
      auth: {
        // Login Page
        'Sign in to your account': 'Iniciar sesión en tu cuenta',
        'Access the Vcarda platform': 'Acceder a la plataforma Vcarda',
        'Demo Credentials': 'Credenciales de Demostración',
        'Admin': 'Administrador',
        'Customer': 'Cliente',
        'Business': 'Negocio',
        'Email address': 'Dirección de correo electrónico',
        'Password': 'Contraseña',
        'Remember me': 'Recordarme',
        'Forgot your password?': '¿Olvidaste tu contraseña?',
        'Sign in': 'Iniciar sesión',
        'Signing in...': 'Iniciando sesión...',
        "Don't have an account?": '¿No tienes una cuenta?',
        'Create an account': 'Crear una cuenta',
        'Back to Homepage': 'Volver al inicio',
        
        // Register Page
        'Create your account': 'Crear tu cuenta',
        'Join Vcarda and connect with your community': 'Únete a Vcarda y conéctate con tu comunidad',
        'Full Name': 'Nombre Completo',
        'Enter your full name': 'Ingresa tu nombre completo',
        'Email Address': 'Dirección de Correo Electrónico',
        'Enter your email': 'Ingresa tu correo electrónico',
        'Create a password': 'Crear una contraseña',
        'Confirm Password': 'Confirmar Contraseña',
        'Confirm your password': 'Confirma tu contraseña',
        'Business Name': 'Nombre del Negocio',
        'Enter your business name': 'Ingresa el nombre de tu negocio',
        'Business Phone': 'Teléfono del Negocio',
        'Enter your business phone': 'Ingresa el teléfono de tu negocio',
        'I accept the': 'Acepto los',
        'Terms of Service': 'Términos de Servicio',
        'and': 'y',
        'Privacy Policy': 'Política de Privacidad',
        'Creating account...': 'Creando cuenta...',
        'Already have an account?': '¿Ya tienes una cuenta?',
        
        // Validation Messages
        'Please enter both email and password': 'Por favor ingresa el correo y la contraseña',
        'Invalid email or password. Please check your credentials and try again.': 'Correo o contraseña incorrectos. Verifica tus datos e intenta nuevamente.',
        'An error occurred during login. Please try again later.': 'Ocurrió un error durante el inicio de sesión. Inténtalo más tarde.',
        'If you continue to experience issues, try using one of the demo accounts above.': 'Si continúas experimentando problemas, prueba con una de las cuentas de demostración.',
        'Please fill in all required fields': 'Por favor completa todos los campos requeridos',
        'Please enter a valid email address': 'Por favor ingresa una dirección de correo válida',
        'Password must be more than 6 characters': 'La contraseña debe tener más de 6 caracteres',
        'Passwords do not match': 'Las contraseñas no coinciden',
        'Business name is required': 'El nombre del negocio es requerido',
        'Business phone is required': 'El teléfono del negocio es requerido',
        'You must accept the terms and conditions': 'Debes aceptar los términos y condiciones',
        'Registration failed. Email address may already be in use. Please try a different email or contact support.': 'Registro fallido. El correo puede estar en uso. Prueba con otro correo o contacta soporte.',
        'An error occurred during registration. Please try again later.': 'Ocurrió un error durante el registro. Inténtalo más tarde.',
        'Make sure to use a unique email address that is not already registered. If problems persist, you can try logging in with the demo accounts instead.': 'Asegúrate de usar un correo único que no esté registrado. Si persisten los problemas, puedes usar las cuentas de demostración.'
      },
      
      // Additional common translations
      'Language changes will be applied immediately': 'Los cambios de idioma se aplicarán inmediatamente',
      'Regional Settings': 'Configuración Regional',
      'Preferred Currency': 'Moneda Preferida',
      
      // Language Selection
      language: {
        select: 'Seleccionar Idioma',
        english: 'Inglés',
        arabic: 'Árabe',
        spanish: 'Español',
        french: 'Francés'
      },
      
      // Landing Page
      landing: {
        hero: {
          title: 'Bienvenido a Vcarda',
          subtitle: 'La plataforma de lealtad definitiva para negocios y clientes'
        },
        features: {
          qrCode: {
            title: 'Código QR Fácil',
            description: 'Muestra tu código QR para recoger puntos en tus tiendas favoritas'
          },
          earnPoints: {
            title: 'Ganar Puntos',
            description: 'Recolecta puntos y sellos de negocios participantes'
          },
          getRewards: {
            title: 'Obtener Recompensas',
            description: 'Canjea tus puntos por increíbles recompensas y descuentos'
          },
          digitalWallet: {
            title: 'Cartera Digital',
            description: 'Mantén todas tus tarjetas de lealtad en un lugar'
          }
        },
        footer: {
          allRightsReserved: 'Todos los derechos reservados.',
          pricing: 'Precios',
          comments: 'Comentarios'
        }
      }
    },
  },
  fr: {
    translation: {
      // Navigation & Core UI
      welcome: 'Bienvenue sur Vcarda',
      login: 'Connexion',
      register: 'Inscription',
      dashboard: 'Tableau de bord',
      home: 'Accueil',
      settings: 'Paramètres',
      logout: 'Déconnexion',
      profile: 'Profil',
      
      // QR & Cards
      myQRCard: 'Ma carte QR',
      myPrograms: 'Mes programmes',
      rewardsHistory: 'Historique des récompenses',
      codeWallet: 'Portefeuille de codes',
      'Scan QR': 'Scanner QR',
      'QR Code': 'Code QR',
      
      // Business Terms
      loyaltyProgram: 'Programme de Fidélité',
      points: 'Points',
      rewards: 'Récompenses',
      customers: 'Clients',
      programs: 'Programmes',
      analytics: 'Analyses',
      
      // Common Actions
      save: 'Enregistrer',
      cancel: 'Annuler',
      edit: 'Modifier',
      delete: 'Supprimer',
      view: 'Voir',
      back: 'Retour',
      next: 'Suivant',
      continue: 'Continuer',
      submit: 'Soumettre',
      loading: 'Chargement...',
      
      // Customer Dashboard
      customerDashboard: {
        title: 'Tableau de Bord Client',
        defaultName: 'Client',
        totalPoints: 'Points Totaux',
        recentActivity: 'Activité Récente',
        upcomingRewards: 'Récompenses à Venir',
        noActivity: 'Aucune activité récente',
        pointsAwarded: 'Points Accordés',
        welcomeBack: 'Bon retour'
      },
      
      // Dashboard Tabs
      enrolledPrograms: 'Programmes Inscrits',
      browsePrograms: 'Parcourir Programmes',
      transactions: 'Transactions',
      
      // Program Messages
      noPrograms: 'Aucun programme inscrit',
      noProgramsDescription: 'Parcourez les programmes disponibles pour commencer à gagner des récompenses',
      
      // Time References
      today: 'Aujourd\'hui',
      yesterday: 'Hier',
      daysAgo: 'Il y a {{days}} jours',
      
      // Dashboard Content
      welcomeBack: 'Bon retour',
      scanQRCode: 'Scannez votre code QR pour gagner des récompenses',
      programs: 'Programmes',
      rewardsReady: 'Récompenses Prêtes',
      tapToEnlarge: 'Appuyez pour agrandir',
      recentActivity: 'Activité Récente',
      last7Days: '7 derniers jours',
      noRecentActivity: 'Aucune activité récente',
      nextRewards: 'Prochaines Récompenses',
      viewAll: 'Voir tout',
      noUpcomingRewards: 'Aucune récompense à venir',
      pointsMore: 'points de plus',
      complete: 'complet',
      trendingRewards: 'Récompenses Tendance',
      popularNow: 'Populaire maintenant',
      redeemed: 'échangé',
      limitedTimeOffer: 'Offre limitée dans le temps',
      withAnyMealPurchase: 'Avec tout achat de repas',
      earnedPoints: 'Gagné {{points}} points',
      redeemedPoints: 'Échangé {{points}} points',
      
      // Program Browser
      searchPrograms: 'Rechercher des programmes...',
      filterByCategory: 'Filtrer par catégorie',
      allCategories: 'Toutes les Catégories',
      enroll: 'S\'inscrire',
      enrolled: 'Inscrit',
      joinProgram: 'Rejoindre le Programme',
      
      // Transaction History
      transactionHistory: 'Historique des Transactions',
      filterByType: 'Filtrer par type',
      allTypes: 'Tous les Types',
      earn: 'Gagner',
      redeem: 'Échanger',
      filterByDate: 'Filtrer par date',
      allDates: 'Toutes les Dates',
      week: 'Semaine',
      month: 'Mois',
      year: 'Année',
      exportCSV: 'Exporter CSV',
      noTransactions: 'Aucune transaction trouvée',
      searchTransactions: 'Rechercher des transactions...',
      export: 'Exporter',
      allTypes: 'Tous les Types',
      pointsEarned: 'Points Gagnés',
      pointsRedeemed: 'Points Échangés',
      allTime: 'Tout le Temps',
      lastWeek: 'Semaine Dernière',
      lastMonth: 'Mois Dernier',
      lastYear: 'Année Dernière',
      retrying: 'Nouvelle tentative...',
      
      // Loyalty Card
      availableRewards: 'Récompenses Disponibles!',
      rewards: 'Récompenses',
      viewCard: 'Voir la Carte',
      allRewardsEarned: 'Toutes les récompenses gagnées!',
      noRewardsAvailable: 'Aucune récompense disponible',
      
      // Loyalty Card Additional
      loyaltyProgram: 'Programme de Fidélité',
      business: 'Entreprise',
      pointsMoreToNextTier: '{{points}} points de plus pour {{nextTier}}',
      maximumTierReached: 'Niveau maximum atteint',
      collectPointsForRewards: 'Collectez des points pour des récompenses',
      silver: 'Argent',
      gold: 'Or',
      platinum: 'Platine',
      automaticBenefit: 'Avantage automatique',
      needMorePoints: 'Besoin de {{points}} points de plus',
      yourPoints: 'Vos Points',
      multiplier: '{{multiplier}}× multiplicateur',
      availableRewardsExclamation: 'Récompenses Disponibles!',
      redeemNow: 'Échanger maintenant!',
      points: '{{points}} points',
      redeem: 'Échanger',
      showQRCode: 'Afficher le Code QR',
      retry: 'Réessayer',
      generatingQRCode: 'Génération du code QR...',
      cardBenefits: 'Avantages de la Carte',
      yourReferralCode: 'Votre Code de Parrainage',
      shareToGiveFriendsBonus: 'Partagez pour donner aux amis 100 points bonus',
      copied: 'Copié!',
      shareCode: 'Partager le Code',
      showLess: 'Afficher Moins',
      showMore: 'Afficher Plus',
      cardDetails: 'Détails de la Carte',
      cardNumber: 'Numéro de Carte',
      cardType: 'Type de Carte',
      issuedOn: 'Émise le',
      expiresOn: 'Expire le',
      pointsMultiplier: 'Multiplicateur de Points',
      
      // Business Dashboard
      business: {
        dashboard: 'Tableau de Bord Entreprise',
        'Welcome to your Dashboard': 'Bienvenue sur votre Tableau de Bord',
        'New Program': 'Nouveau Programme',
        customers: 'Clients',
        programs: 'Programmes',
        analytics: 'Analyses',
        settings: 'Paramètres',
        'Send Promo Code': 'Envoyer Code Promo',
        'Send Surprise Gift': 'Envoyer Cadeau Surprise',
        'Send Message': 'Envoyer Message',
        'Enter your message to the customer:': 'Entrez votre message pour le client:'
      },
      
      // Forms & Validation
      forms: {
        labels: {
          email: 'E-mail',
          password: 'Mot de passe',
          name: 'Nom',
          phone: 'Téléphone',
          address: 'Adresse',
          language: 'Langue',
          currency: 'Devise'
        },
        placeholders: {
          enterEmail: 'Entrez votre e-mail',
          enterPassword: 'Entrez votre mot de passe',
          enterName: 'Entrez votre nom'
        },
        validation: {
          required: 'Ce champ est requis',
          emailInvalid: 'Veuillez entrer un e-mail valide',
          passwordTooShort: 'Le mot de passe doit contenir au moins 8 caractères'
        }
      },
      
      // Settings Page
      settings: {
        title: 'Paramètres',
        personalInfo: 'Informations Personnelles',
        preferences: 'Préférences',
        security: 'Sécurité',
        language: 'Langue',
        currency: 'Devise',
        notifications: 'Notifications',
        privacy: 'Confidentialité',
        help: 'Aide et Support'
      },
      
      // Authentication Pages
      auth: {
        // Login Page
        'Sign in to your account': 'Connectez-vous à votre compte',
        'Access the Vcarda platform': 'Accéder à la plateforme Vcarda',
        'Demo Credentials': 'Identifiants de Démonstration',
        'Admin': 'Administrateur',
        'Customer': 'Client',
        'Business': 'Entreprise',
        'Email address': 'Adresse e-mail',
        'Password': 'Mot de passe',
        'Remember me': 'Se souvenir de moi',
        'Forgot your password?': 'Mot de passe oublié?',
        'Sign in': 'Se connecter',
        'Signing in...': 'Connexion en cours...',
        "Don't have an account?": "Vous n'avez pas de compte?",
        'Create an account': 'Créer un compte',
        'Back to Homepage': "Retour à l'accueil",
        
        // Register Page
        'Create your account': 'Créer votre compte',
        'Join Vcarda and connect with your community': 'Rejoignez Vcarda et connectez-vous à votre communauté',
        'Full Name': 'Nom Complet',
        'Enter your full name': 'Entrez votre nom complet',
        'Email Address': 'Adresse E-mail',
        'Enter your email': 'Entrez votre e-mail',
        'Create a password': 'Créer un mot de passe',
        'Confirm Password': 'Confirmer le Mot de Passe',
        'Confirm your password': 'Confirmez votre mot de passe',
        'Business Name': "Nom de l'Entreprise",
        'Enter your business name': "Entrez le nom de votre entreprise",
        'Business Phone': "Téléphone de l'Entreprise",
        'Enter your business phone': "Entrez le téléphone de votre entreprise",
        'I accept the': "J'accepte les",
        'Terms of Service': 'Conditions de Service',
        'and': 'et',
        'Privacy Policy': 'Politique de Confidentialité',
        'Creating account...': 'Création du compte...',
        'Already have an account?': 'Vous avez déjà un compte?',
        
        // Validation Messages
        'Please enter both email and password': 'Veuillez saisir le e-mail et le mot de passe',
        'Invalid email or password. Please check your credentials and try again.': 'E-mail ou mot de passe incorrect. Vérifiez vos données et réessayez.',
        'An error occurred during login. Please try again later.': 'Une erreur est survenue lors de la connexion. Réessayez plus tard.',
        'If you continue to experience issues, try using one of the demo accounts above.': 'Si vous continuez à rencontrer des problèmes, essayez un des comptes de démonstration.',
        'Please fill in all required fields': 'Veuillez remplir tous les champs requis',
        'Please enter a valid email address': 'Veuillez entrer une adresse e-mail valide',
        'Password must be more than 6 characters': 'Le mot de passe doit contenir plus de 6 caractères',
        'Passwords do not match': 'Les mots de passe ne correspondent pas',
        'Business name is required': "Le nom de l'entreprise est requis",
        'Business phone is required': "Le téléphone de l'entreprise est requis",
        'You must accept the terms and conditions': 'Vous devez accepter les termes et conditions',
        'Registration failed. Email address may already be in use. Please try a different email or contact support.': "L'inscription a échoué. L'e-mail est peut-être déjà utilisé. Essayez un autre e-mail ou contactez le support.",
        'An error occurred during registration. Please try again later.': "Une erreur est survenue lors de l'inscription. Réessayez plus tard.",
        'Make sure to use a unique email address that is not already registered. If problems persist, you can try logging in with the demo accounts instead.': "Assurez-vous d'utiliser un e-mail unique non enregistré. Si les problèmes persistent, vous pouvez utiliser les comptes de démonstration."
      },
      
      // Additional common translations
      'Language changes will be applied immediately': 'Les changements de langue seront appliqués immédiatement',
      'Regional Settings': 'Paramètres Régionaux',
      'Preferred Currency': 'Devise Préférée',
      
      // Language Selection
      language: {
        select: 'Sélectionner la Langue',
        english: 'Anglais',
        arabic: 'Arabe',
        spanish: 'Espagnol',
        french: 'Français'
      },
      
      // Landing Page
      landing: {
        hero: {
          title: 'Bienvenue sur Vcarda',
          subtitle: 'La plateforme de fidélité ultime pour les entreprises et les clients'
        },
        features: {
          qrCode: {
            title: 'Code QR Facile',
            description: 'Montrez votre code QR pour collecter des points dans vos magasins favoris'
          },
          earnPoints: {
            title: 'Gagner des Points',
            description: 'Collectez des points et des timbres des entreprises participantes'
          },
          getRewards: {
            title: 'Obtenir des Récompenses',
            description: 'Échangez vos points contre des récompenses et des réductions incroyables'
          },
          digitalWallet: {
            title: 'Portefeuille Numérique',
            description: 'Gardez toutes vos cartes de fidélité en un seul endroit'
          }
        },
        footer: {
          allRightsReserved: 'Tous droits réservés.',
          pricing: 'Tarifs',
          comments: 'Commentaires'
        }
      }
    },
  },
};

// Initialize i18n with language detection
const initI18n = () => {
  // Get stored language preference or default to 'en'
  const storedLanguage = localStorage.getItem('language') || 'en';
  
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: storedLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });

  // Apply RTL for Arabic language
  const applyLanguageDirection = (language: string) => {
    if (language === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', language);
    }
  };

  // Apply initial direction
  applyLanguageDirection(storedLanguage);

  // Listen for language changes
  i18n.on('languageChanged', (language) => {
    applyLanguageDirection(language);
  });
};

// Initialize on load
if (typeof window !== 'undefined') {
  initI18n();
} else {
  // Fallback for server-side rendering
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: 'en',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });
}

export default i18n;
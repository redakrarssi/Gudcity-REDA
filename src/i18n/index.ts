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
      pointsEarned: 'Points Earned',
      pointsRedeemed: 'Points Redeemed',
      allTime: 'All Time',
      lastWeek: 'Last Week',
      lastMonth: 'Last Month',
      lastYear: 'Last Year',
      retrying: 'Retrying...',
      
      // Loyalty Card
      availableRewards: 'Available Rewards!',
      viewCard: 'View Card',
      allRewardsEarned: 'All rewards earned!',
      noRewardsAvailable: 'No rewards available',
      
      // Loyalty Card Additional
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
      
      // Additional Dashboard Keys
      userIDRequired: 'User ID is required',
      unknownError: 'Unknown error',
      failedToLoadTransactionHistory: 'Failed to load transaction history: {{error}}',
      date: 'Date',
      type: 'Type',
      details: 'Details',
              earned: 'Earned',
        program: 'Program',
        reward: 'Reward',
      noTransactionsYet: 'No Transactions Yet',
      transactionHistoryWillAppear: 'Your transaction history will appear here once you start earning or redeeming points.',
      tryAdjustingSearch: 'Try adjusting your search or filter criteria',
      hideDetails: 'Hide details',
      showDetails: 'Show details',
      programEnrollmentRequest: 'Program Enrollment Request',
      pointsDeductionRequest: 'Points Deduction Request',
      failedToGenerateQRCode: 'Failed to generate QR code',
      errorCreatingQRCodeData: 'Error creating QR code data',
      missingRequiredCardInformation: 'Missing required card information',
      hideTechnicalDetails: 'Hide technical details',
      showTechnicalDetails: 'Show technical details',
      
      // Cards Page
      cards: {
        myCards: 'My Cards',
        noCards: 'No cards found',
        refreshCards: 'Refresh Cards',
        refreshing: 'Refreshing...',
        expiryDate: 'Expiry Date',
        lastUsed: 'Last Used',
        cardId: 'Card ID',
        cardActivity: 'Card Activity',
        noRecentActivity: 'No recent activity',
        availableRewards: 'Available Rewards',
        noRewardsAvailableForProgram: 'No rewards available for this program',
        processing: 'Processing...',
        decline: 'Decline',
        joinProgram: 'Join Program',
        close: 'Close',
        viewPromoCode: 'View promo code',
        refreshCardsAria: 'Refresh cards',
        failedToSyncEnrollments: 'Failed to sync enrollments to cards',
        errorParsingNotification: 'Error parsing notification data',
        pointsAwardedMessage: 'Points awarded message received via BroadcastChannel',
        failedToProcessResponse: 'Failed to process your response',
        errorProcessingResponse: 'An error occurred while processing your response',
        business: 'Business',
        promoCodeCopied: 'Promo code copied to clipboard',
        failedToCopyPromoCode: 'Failed to copy promo code',
        redeemedPoints: 'Redeemed {{points}} points',
        cardUsed: 'Card used'
      },
      
      // Nearby Page
      nearby: {
        comingSoon: 'COMING SOON',
        nearbyRewardsFeature: '🗺️ Nearby Rewards Feature',
        buildingSomethingAmazing: 'We\'re building something amazing! Soon you\'ll be able to discover loyalty programs, exclusive offers, and instant rewards from businesses right around you.',
        whatsComingYourWay: 'What\'s Coming Your Way',
        locationBasedDiscovery: 'Location-Based Discovery',
        locationBasedDiscoveryDesc: 'Find loyalty programs and rewards near your current location',
        smartRecommendations: 'Smart Recommendations',
        smartRecommendationsDesc: 'Get personalized suggestions based on your preferences',
        exclusiveOffers: 'Exclusive Offers',
        exclusiveOffersDesc: 'Access special deals only available to nearby customers',
        instantRewards: 'Instant Rewards',
        instantRewardsDesc: 'Discover and redeem rewards from businesses around you',
        previewBusinessesNearYou: 'Preview: Businesses Near You',
        sneakPeekDescription: 'Here\'s a sneak peek of what you\'ll discover in your area',
        cityCoffee: 'City Coffee',
        fashionHub: 'Fashion Hub',
        gourmetBistro: 'Gourmet Bistro',
        cafe: 'Cafe',
        retail: 'Retail',
        restaurant: 'Restaurant',
        loyaltyProgram: 'Loyalty Program',
        getReadyForLaunch: 'Get Ready for Launch! 🚀',
        beFirstToExplore: 'Be the first to explore nearby rewards and discover amazing deals from local businesses when we launch this exciting feature.',
        proudlyCreatedWith: '© 2024 by VCarda • Proudly created with',
        heart: '♥'
      },
      
      // Promotions Page
      promotions: {
        exclusivePromotions: 'Exclusive Promotions',
        discoverSpecialOffers: 'Discover special offers from your favorite places',
        searchPromotions: 'Search promotions...',
        all: 'All',
        favorites: 'Favorites',
        expiringSoon: 'Expiring Soon',
        discounts: 'Discounts',
        points: 'Points',
        featuredOffers: 'Featured Offers',
        copied: 'Copied!',
        copy: 'Copy',
        expires: 'Expires: {{time}}',
        neverExpires: 'Never expires',
        used: 'used',
        unlimited: 'Unlimited',
        noFavoritesYet: 'No favorites yet',
        noPromotionsFound: 'No promotions found',
        favoritePromotionsYouLike: 'Favorite promotions you like to find them here later',
        tryAdjustingSearchTerms: 'Try adjusting your search terms or filters',
        checkBackLaterForNewOffers: 'Check back later for new offers!',
        failedToLoadPromotions: 'Failed to load promotions',
        neverExpiresText: 'Never expires',
        monthsLeft: '{{months}} months left',
        daysLeft: '{{days}} days left',
        lastDay: 'Last day!',
        discount: 'DISCOUNT',
        pointsType: 'POINTS',
        cashback: 'CASHBACK',
        gift: 'GIFT'
      },
      
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
        help: 'Help & Support',
        loadingSettings: 'Loading settings...',
        errorLoadingSettings: 'Error Loading Settings',
        couldNotLoadSettings: 'We couldn\'t load your settings. Please try refreshing the page or contact support if the problem persists.',
        personalInformation: 'Personal Information',
        edit: 'Edit',
        cancel: 'Cancel',
        save: 'Save',
        settingsUpdatedSuccessfully: 'Your settings have been successfully updated',
        errorUpdatingSettings: 'There was an error updating your settings. Please try again.',
        fullName: 'Full Name',
        emailAddress: 'Email Address',
        phoneNumber: 'Phone Number',
        notSpecified: 'Not specified',
        memberSince: 'Member Since',
        regionalSettings: 'Regional Settings',
        languageChangesApplied: 'Language changes will be applied immediately',
        preferredCurrency: 'Preferred Currency',
        notificationSettings: 'Notification Settings',
        communicationChannels: 'Communication Channels',
        emailNotifications: 'Email Notifications',
        pushNotifications: 'Push Notifications',
        smsNotifications: 'SMS Notifications',
        notificationTypes: 'Notification Types',
        promotionsAndOffers: 'Promotions and Offers',
        rewardsAndPointsUpdates: 'Rewards and Points Updates',
        systemNotifications: 'System Notifications',
        saving: 'Saving...',
        savePreferences: 'Save Preferences',
        securitySettings: 'Security Settings',
        changePassword: 'Change Password',
        updateYourPassword: 'Update your password',
        loginNotifications: 'Login Notifications',
        getNotifiedOfNewLogins: 'Get notified of new logins to your account',
        enabled: 'Enabled',
        connectedAccounts: 'Connected Accounts',
        connectYourGoogleAccount: 'Connect your Google account',
        connect: 'Connect',
        connectYourFacebookAccount: 'Connect your Facebook account',
        accountActions: 'Account Actions',
        deleteAccount: 'Delete Account',
        permanentlyDeleteAccount: 'Permanently delete your account and data',
        manageAccountSettings: 'Manage your account settings and preferences',
        personalSettings: 'Personal Settings',
        account: 'Account',
        needHelp: 'Need Help?',
        supportTeamHelp: 'If you have any questions about your account or settings, our support team is here to help.',
        contactSupport: 'Contact Support'
      },
      
      // Customer Menu & Navigation
      menu: {
        dashboard: 'Dashboard',
        myCards: 'My Cards',
        nearbyRewards: 'Nearby Rewards',
        promotions: 'Promotions',
        qrCard: 'QR Card',
        settings: 'Settings',
        logout: 'Logout',
        rewards: 'Rewards'
      },
      
      // Notification Center
      notifications: {
        notifications: 'Notifications',
        closeNotifications: 'Close notifications',
        all: 'All',
        approvals: 'Approvals',
        noNotificationsYet: 'No notifications yet',
        noPendingApprovals: 'No pending approvals',
        clearAll: 'Clear All',
        clearing: 'Clearing...',
        deleteNotification: 'Delete notification',
        programEnrollmentRequest: 'Program Enrollment Request',
        pointsDeductionRequest: 'Points Deduction Request',
        wantsToEnrollYou: 'wants to enroll you in',
        wantsToDeduct: 'wants to deduct',
        points: 'points',
        benefits: 'Benefits',
        reason: 'Reason',
        processing: 'Processing',
        approved: 'Approved',
        approve: 'Approve',
        declined: 'Declined',
        decline: 'Decline',
        successfullyEnrolledIn: 'Successfully enrolled in',
        declinedEnrollmentIn: 'Declined enrollment in',
        theProgram: 'the program',
        enrollmentProcessInterrupted: 'The enrollment process was interrupted',
        // Time-related messages
        justNow: 'just now',
        minuteAgo: 'minute ago',
        minutesAgo: 'minutes ago',
        hourAgo: 'hour ago',
        hoursAgo: 'hours ago',
        dayAgo: 'day ago',
        daysAgo: 'days ago',
        // Action messages
        actionRequired: 'Action required - check your notifications',
        // Promo code messages
        promoCode: 'Promo Code',
        // Program messages
        aProgram: 'a program'
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
      pointsEarned: 'نقاط مكسبة',
      pointsRedeemed: 'نقاط مستبدلة',
      allTime: 'كل الوقت',
      lastWeek: 'الأسبوع الماضي',
      lastMonth: 'الشهر الماضي',
      lastYear: 'السنة الماضية',
      retrying: 'إعادة المحاولة...',
      
      // Loyalty Card
      availableRewards: 'المكافآت متاحة!',
      viewCard: 'عرض البطاقة',
      allRewardsEarned: 'تم كسب جميع المكافآت!',
      noRewardsAvailable: 'لا توجد مكافآت متاحة',
      
      // Loyalty Card Additional
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
      
      // Additional Dashboard Keys
      userIDRequired: 'معرف المستخدم مطلوب',
      unknownError: 'خطأ غير معروف',
      failedToLoadTransactionHistory: 'فشل في تحميل سجل المعاملات: {{error}}',
      date: 'التاريخ',
      type: 'النوع',
      details: 'التفاصيل',
              earned: 'مكسب',
        program: 'البرنامج',
        reward: 'المكافأة',
      noTransactionsYet: 'لا توجد معاملات بعد',
      transactionHistoryWillAppear: 'سجل المعاملات الخاص بك سيظهر هنا بمجرد أن تبدأ في كسب أو استبدال النقاط.',
      tryAdjustingSearch: 'حاول تعديل معايير البحث أو التصفية',
      hideDetails: 'إخفاء التفاصيل',
      showDetails: 'عرض التفاصيل',
      programEnrollmentRequest: 'طلب تسجيل في البرنامج',
      pointsDeductionRequest: 'طلب خصم النقاط',
      failedToGenerateQRCode: 'فشل في إنشاء رمز QR',
      errorCreatingQRCodeData: 'خطأ في إنشاء بيانات رمز QR',
      missingRequiredCardInformation: 'معلومات البطاقة المطلوبة مفقودة',
      hideTechnicalDetails: 'إخفاء التفاصيل التقنية',
      showTechnicalDetails: 'عرض التفاصيل التقنية',
      
      // Cards Page
      cards: {
        myCards: 'بطاقاتي',
        noCards: 'لا توجد بطاقات',
        refreshCards: 'تحديث البطاقات',
        refreshing: 'جاري التحديث...',
        expiryDate: 'تاريخ الانتهاء',
        lastUsed: 'آخر استخدام',
        cardId: 'معرف البطاقة',
        cardActivity: 'نشاط البطاقة',
        noRecentActivity: 'لا يوجد نشاط حديث',
        availableRewards: 'المكافآت المتاحة',
        noRewardsAvailableForProgram: 'لا توجد مكافآت متاحة لهذا البرنامج',
        processing: 'جاري المعالجة...',
        decline: 'رفض',
        joinProgram: 'انضم للبرنامج',
        close: 'إغلاق',
        viewPromoCode: 'عرض رمز الخصم',
        refreshCardsAria: 'تحديث البطاقات',
        failedToSyncEnrollments: 'فشل في مزامنة التسجيلات مع البطاقات',
        errorParsingNotification: 'خطأ في تحليل بيانات الإشعار',
        pointsAwardedMessage: 'تم استلام رسالة منح النقاط عبر BroadcastChannel',
        failedToProcessResponse: 'فشل في معالجة استجابتك',
        errorProcessingResponse: 'حدث خطأ أثناء معالجة استجابتك',
        business: 'الشركة',
        promoCodeCopied: 'تم نسخ رمز الخصم إلى الحافظة',
        failedToCopyPromoCode: 'فشل في نسخ رمز الخصم',
        redeemedPoints: 'تم استبدال {{points}} نقاط',
        cardUsed: 'تم استخدام البطاقة'
      },
      
      // Nearby Page
      nearby: {
        comingSoon: 'قريباً',
        nearbyRewardsFeature: '🗺️ ميزة المكافآت القريبة',
        buildingSomethingAmazing: 'نحن نبني شيئاً مذهلاً! قريباً ستتمكن من اكتشاف برامج الولاء والعروض الحصرية والمكافآت الفورية من الشركات حولك.',
        whatsComingYourWay: 'ما سيأتي في طريقك',
        locationBasedDiscovery: 'الاكتشاف القائم على الموقع',
        locationBasedDiscoveryDesc: 'اعثر على برامج الولاء والمكافآت بالقرب من موقعك الحالي',
        smartRecommendations: 'التوصيات الذكية',
        smartRecommendationsDesc: 'احصل على اقتراحات مخصصة بناءً على تفضيلاتك',
        exclusiveOffers: 'العروض الحصرية',
        exclusiveOffersDesc: 'احصل على صفقات خاصة متاحة فقط للعملاء القريبين',
        instantRewards: 'المكافآت الفورية',
        instantRewardsDesc: 'اكتشف واستبدل المكافآت من الشركات حولك',
        previewBusinessesNearYou: 'معاينة: الشركات القريبة منك',
        sneakPeekDescription: 'إليك نظرة خاطفة على ما ستكتشفه في منطقتك',
        cityCoffee: 'مقهى المدينة',
        fashionHub: 'مركز الموضة',
        gourmetBistro: 'مطعم الذواقة',
        cafe: 'مقهى',
        retail: 'بيع بالتجزئة',
        restaurant: 'مطعم',
        loyaltyProgram: 'برنامج الولاء',
        getReadyForLaunch: 'استعد للإطلاق! 🚀',
        beFirstToExplore: 'كن أول من يستكشف المكافآت القريبة ويكتشف صفقات مذهلة من الشركات المحلية عندما نطلق هذه الميزة المثيرة.',
        proudlyCreatedWith: '© 2024 بواسطة VCarda • تم إنشاؤه بفخر باستخدام',
        heart: '♥'
      },
      
      // Promotions Page
      promotions: {
        exclusivePromotions: 'العروض الحصرية',
        discoverSpecialOffers: 'اكتشف العروض الخاصة من الأماكن المفضلة لديك',
        searchPromotions: 'البحث في العروض...',
        all: 'الكل',
        favorites: 'المفضلة',
        expiringSoon: 'تنتهي قريباً',
        discounts: 'الخصومات',
        points: 'النقاط',
        featuredOffers: 'العروض المميزة',
        copied: 'تم النسخ!',
        copy: 'نسخ',
        expires: 'تنتهي: {{time}}',
        neverExpires: 'لا تنتهي أبداً',
        used: 'مستخدم',
        unlimited: 'غير محدود',
        noFavoritesYet: 'لا توجد مفضلة بعد',
        noPromotionsFound: 'لم يتم العثور على عروض',
        favoritePromotionsYouLike: 'أضف العروض التي تعجبك إلى المفضلة لتجدها هنا لاحقاً',
        tryAdjustingSearchTerms: 'حاول تعديل مصطلحات البحث أو المرشحات',
        checkBackLaterForNewOffers: 'تحقق لاحقاً للحصول على عروض جديدة!',
        failedToLoadPromotions: 'فشل في تحميل العروض',
        neverExpiresText: 'لا تنتهي أبداً',
        monthsLeft: '{{months}} أشهر متبقية',
        daysLeft: '{{days}} أيام متبقية',
        lastDay: 'اليوم الأخير!',
        discount: 'خصم',
        pointsType: 'نقاط',
        cashback: 'استرداد نقدي',
        gift: 'هدية'
      },
      
      // QR Card Page
      qrCard: {
        pleaseSignInToView: 'يرجى تسجيل الدخول لعرض بطاقة QR الخاصة بك.',
        yourLoyaltyCard: 'بطاقة الولاء الخاصة بك',
        useThisCardToCollect: 'استخدم هذه البطاقة لجمع واستبدال النقاط في الشركات المشاركة',
        copied: 'تم النسخ!',
        copyCardNumber: 'نسخ رقم البطاقة',
        shareCard: 'مشاركة البطاقة',
        printCard: 'طباعة البطاقة',
        myPrograms: 'برامجي',
        points: 'النقاط',
        joined: 'انضممت',
        youHaveNotJoinedAnyPrograms: 'لم تنضم إلى أي برامج بعد',
        showYourQrCardToJoin: 'اعرض بطاقة QR الخاصة بك في الشركات المشاركة للانضمام إلى برامج الولاء الخاصة بهم',
        availablePromos: 'العروض المتاحة',
        expires: 'تنتهي',
        claim: 'استلام',
        claimed: 'تم الاستلام',
        noPromoCodesAvailable: 'لا توجد أكواد خصم متاحة في الوقت الحالي',
        showYourQrCardToReceive: 'اعرض بطاقة QR الخاصة بك في الشركات المشاركة للحصول على عروض خاصة',
        securityInformation: 'معلومات الأمان',
        yourQrCodeIsUnique: 'رمز QR الخاص بك فريد لك ومُوقَّع بأمان. يتم تحديثه تلقائياً لحماية حسابك.',
        failedToLoadLoyaltyCard: 'فشل في تحميل معلومات بطاقة الولاء الخاصة بك',
        successfullyJoinedProgram: 'تم الانضمام إلى البرنامج بنجاح!',
        failedToJoinProgram: 'فشل في الانضمام إلى البرنامج',
        successfullyClaimedPromo: 'تم استلام رمز الخصم بنجاح!',
        failedToClaimPromo: 'فشل في استلام رمز الخصم',
        myLoyaltyCard: 'بطاقة الولاء الخاصة بي',
        scanMyLoyaltyCard: 'امسح بطاقة الولاء الخاصة بي (المعرف: {{cardNumber}})',
        specialDiscountOffer: 'عرض خصم خاص',
        customer: 'عميل'
      },
      
      // Customer Menu & Navigation
      menu: {
        dashboard: 'لوحة التحكم',
        myCards: 'بطاقاتي',
        nearbyRewards: 'المكافآت القريبة',
        promotions: 'العروض',
        qrCard: 'بطاقة QR',
        settings: 'الإعدادات',
        logout: 'تسجيل الخروج',
        rewards: 'المكافآت'
      },
      
      // Notification Center
      notifications: {
        notifications: 'الإشعارات',
        closeNotifications: 'إغلاق الإشعارات',
        all: 'الكل',
        approvals: 'الموافقات',
        noNotificationsYet: 'لا توجد إشعارات بعد',
        noPendingApprovals: 'لا توجد موافقات معلقة',
        clearAll: 'مسح الكل',
        clearing: 'جاري المسح...',
        deleteNotification: 'حذف الإشعار',
        programEnrollmentRequest: 'طلب انضمام للبرنامج',
        pointsDeductionRequest: 'طلب خصم النقاط',
        wantsToEnrollYou: 'يريد انضمامك إلى',
        wantsToDeduct: 'يريد خصم',
        points: 'نقاط',
        benefits: 'الفوائد',
        reason: 'السبب',
        processing: 'جاري المعالجة',
        approved: 'تم الموافقة',
        approve: 'موافقة',
        declined: 'تم الرفض',
        decline: 'رفض',
        successfullyEnrolledIn: 'تم الانضمام بنجاح إلى',
        declinedEnrollmentIn: 'تم رفض الانضمام إلى',
        theProgram: 'البرنامج',
        enrollmentProcessInterrupted: 'تم مقاطعة عملية الانضمام',
        // Time-related messages
        justNow: 'الآن',
        minuteAgo: 'منذ دقيقة',
        minutesAgo: 'منذ دقائق',
        hourAgo: 'منذ ساعة',
        hoursAgo: 'منذ ساعات',
        dayAgo: 'منذ يوم',
        daysAgo: 'منذ أيام',
        // Action messages
        actionRequired: 'إجراء مطلوب - تحقق من إشعاراتك',
        // Promo code messages
        promoCode: 'كود الخصم',
        // Program messages
        aProgram: 'برنامج'
      },
      
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
        help: 'المساعدة والدعم',
        loadingSettings: 'جاري تحميل الإعدادات...',
        errorLoadingSettings: 'خطأ في تحميل الإعدادات',
        couldNotLoadSettings: 'لم نتمكن من تحميل إعداداتك. يرجى تحديث الصفحة أو الاتصال بالدعم إذا استمرت المشكلة.',
        personalInformation: 'المعلومات الشخصية',
        edit: 'تعديل',
        cancel: 'إلغاء',
        save: 'حفظ',
        settingsUpdatedSuccessfully: 'تم تحديث إعداداتك بنجاح',
        errorUpdatingSettings: 'حدث خطأ في تحديث إعداداتك. يرجى المحاولة مرة أخرى.',
        fullName: 'الاسم الكامل',
        emailAddress: 'عنوان البريد الإلكتروني',
        phoneNumber: 'رقم الهاتف',
        notSpecified: 'غير محدد',
        memberSince: 'عضو منذ',
        regionalSettings: 'الإعدادات الإقليمية',
        languageChangesApplied: 'سيتم تطبيق تغييرات اللغة فوراً',
        preferredCurrency: 'العملة المفضلة',
        notificationSettings: 'إعدادات الإشعارات',
        communicationChannels: 'قنوات التواصل',
        emailNotifications: 'إشعارات البريد الإلكتروني',
        pushNotifications: 'الإشعارات الفورية',
        smsNotifications: 'إشعارات الرسائل النصية',
        notificationTypes: 'أنواع الإشعارات',
        promotionsAndOffers: 'العروض والترقيات',
        rewardsAndPointsUpdates: 'تحديثات المكافآت والنقاط',
        systemNotifications: 'إشعارات النظام',
        saving: 'جاري الحفظ...',
        savePreferences: 'حفظ التفضيلات',
        securitySettings: 'إعدادات الأمان',
        changePassword: 'تغيير كلمة المرور',
        updateYourPassword: 'تحديث كلمة المرور الخاصة بك',
        loginNotifications: 'إشعارات تسجيل الدخول',
        getNotifiedOfNewLogins: 'احصل على إشعار عند تسجيل دخول جديد إلى حسابك',
        enabled: 'مفعل',
        connectedAccounts: 'الحسابات المتصلة',
        connectYourGoogleAccount: 'اتصل بحساب جوجل الخاص بك',
        connect: 'اتصال',
        connectYourFacebookAccount: 'اتصل بحساب فيسبوك الخاص بك',
        accountActions: 'إجراءات الحساب',
        deleteAccount: 'حذف الحساب',
        permanentlyDeleteAccount: 'حذف حسابك وبياناتك نهائياً',
        manageAccountSettings: 'إدارة إعدادات وتفضيلات حسابك',
        personalSettings: 'الإعدادات الشخصية',
        account: 'الحساب',
        needHelp: 'تحتاج مساعدة؟',
        supportTeamHelp: 'إذا كان لديك أي أسئلة حول حسابك أو إعداداتك، فريق الدعم لدينا هنا لمساعدتك.',
        contactSupport: 'اتصل بالدعم'
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
      pointsEarned: 'Puntos Ganados',
      pointsRedeemed: 'Puntos Canjeados',
      allTime: 'Todo el Tiempo',
      lastWeek: 'Última Semana',
      lastMonth: 'Último Mes',
      lastYear: 'Último Año',
      retrying: 'Reintentando...',
      
      // Loyalty Card
      availableRewards: '¡Recompensas Disponibles!',
      viewCard: 'Ver Tarjeta',
      allRewardsEarned: '¡Todas las recompensas ganadas!',
      noRewardsAvailable: 'No hay recompensas disponibles',
      
      // Loyalty Card Additional
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
      
      // Additional Dashboard Keys
      userIDRequired: 'Se requiere ID de usuario',
      unknownError: 'Error desconocido',
      failedToLoadTransactionHistory: 'Error al cargar el historial de transacciones: {{error}}',
      date: 'Fecha',
      type: 'Tipo',
      details: 'Detalles',
              earned: 'Ganado',
        program: 'Programa',
        reward: 'Recompensa',
      noTransactionsYet: 'Sin Transacciones Aún',
      transactionHistoryWillAppear: 'Tu historial de transacciones aparecerá aquí una vez que comiences a ganar o canjear puntos.',
      tryAdjustingSearch: 'Intenta ajustar tus criterios de búsqueda o filtro',
      hideDetails: 'Ocultar detalles',
      showDetails: 'Mostrar detalles',
      programEnrollmentRequest: 'Solicitud de Inscripción al Programa',
      pointsDeductionRequest: 'Solicitud de Deducción de Puntos',
      failedToGenerateQRCode: 'Error al generar código QR',
      errorCreatingQRCodeData: 'Error al crear datos del código QR',
      missingRequiredCardInformation: 'Falta información requerida de la tarjeta',
      hideTechnicalDetails: 'Ocultar detalles técnicos',
      showTechnicalDetails: 'Mostrar detalles técnicos',
      
      // Cards Page
      cards: {
        myCards: 'Mis Tarjetas',
        noCards: 'No se encontraron tarjetas',
        refreshCards: 'Actualizar Tarjetas',
        refreshing: 'Actualizando...',
        expiryDate: 'Fecha de Vencimiento',
        lastUsed: 'Último Uso',
        cardId: 'ID de Tarjeta',
        cardActivity: 'Actividad de la Tarjeta',
        noRecentActivity: 'Sin actividad reciente',
        availableRewards: 'Recompensas Disponibles',
        noRewardsAvailableForProgram: 'No hay recompensas disponibles para este programa',
        processing: 'Procesando...',
        decline: 'Rechazar',
        joinProgram: 'Unirse al Programa',
        close: 'Cerrar',
        viewPromoCode: 'Ver código promocional',
        refreshCardsAria: 'Actualizar tarjetas',
        failedToSyncEnrollments: 'Error al sincronizar inscripciones con tarjetas',
        errorParsingNotification: 'Error al analizar datos de notificación',
        pointsAwardedMessage: 'Mensaje de puntos otorgados recibido vía BroadcastChannel',
        failedToProcessResponse: 'Error al procesar tu respuesta',
        errorProcessingResponse: 'Ocurrió un error al procesar tu respuesta',
        business: 'Negocio',
        promoCodeCopied: 'Código promocional copiado al portapapeles',
        failedToCopyPromoCode: 'Error al copiar código promocional',
        redeemedPoints: '{{points}} puntos canjeados',
        cardUsed: 'Tarjeta utilizada'
      },
      
      // Nearby Page
      nearby: {
        comingSoon: 'PRÓXIMAMENTE',
        nearbyRewardsFeature: '🗺️ Función de Recompensas Cercanas',
        buildingSomethingAmazing: '¡Estamos construyendo algo increíble! Pronto podrás descubrir programas de lealtad, ofertas exclusivas y recompensas instantáneas de negocios cerca de ti.',
        whatsComingYourWay: 'Lo Que Viene en Tu Camino',
        locationBasedDiscovery: 'Descubrimiento Basado en Ubicación',
        locationBasedDiscoveryDesc: 'Encuentra programas de lealtad y recompensas cerca de tu ubicación actual',
        smartRecommendations: 'Recomendaciones Inteligentes',
        smartRecommendationsDesc: 'Obtén sugerencias personalizadas basadas en tus preferencias',
        exclusiveOffers: 'Ofertas Exclusivas',
        exclusiveOffersDesc: 'Accede a ofertas especiales disponibles solo para clientes cercanos',
        instantRewards: 'Recompensas Instantáneas',
        instantRewardsDesc: 'Descubre y canjea recompensas de negocios a tu alrededor',
        previewBusinessesNearYou: 'Vista Previa: Negocios Cerca de Ti',
        sneakPeekDescription: 'Aquí tienes una vista previa de lo que descubrirás en tu área',
        cityCoffee: 'Café de la Ciudad',
        fashionHub: 'Centro de Moda',
        gourmetBistro: 'Bistró Gourmet',
        cafe: 'Café',
        retail: 'Venta al Por Menor',
        restaurant: 'Restaurante',
        loyaltyProgram: 'Programa de Lealtad',
        getReadyForLaunch: '¡Prepárate para el Lanzamiento! 🚀',
        beFirstToExplore: 'Sé el primero en explorar recompensas cercanas y descubrir ofertas increíbles de negocios locales cuando lancemos esta emocionante función.',
        proudlyCreatedWith: '© 2024 por VCarda • Creado con orgullo usando',
        heart: '♥'
      },
      
      // Promotions Page
      promotions: {
        exclusivePromotions: 'Promociones Exclusivas',
        discoverSpecialOffers: 'Descubre ofertas especiales de tus lugares favoritos',
        searchPromotions: 'Buscar promociones...',
        all: 'Todas',
        favorites: 'Favoritas',
        expiringSoon: 'Expiran Pronto',
        discounts: 'Descuentos',
        points: 'Puntos',
        featuredOffers: 'Ofertas Destacadas',
        copied: '¡Copiado!',
        copy: 'Copiar',
        expires: 'Expira: {{time}}',
        neverExpires: 'Nunca expira',
        used: 'usado',
        unlimited: 'Ilimitado',
        noFavoritesYet: 'Sin favoritas aún',
        noPromotionsFound: 'No se encontraron promociones',
        favoritePromotionsYouLike: 'Marca como favoritas las promociones que te gusten para encontrarlas aquí más tarde',
        tryAdjustingSearchTerms: 'Intenta ajustar tus términos de búsqueda o filtros',
        checkBackLaterForNewOffers: '¡Vuelve más tarde para nuevas ofertas!',
        failedToLoadPromotions: 'Error al cargar promociones',
        neverExpiresText: 'Nunca expira',
        monthsLeft: '{{months}} meses restantes',
        daysLeft: '{{days}} días restantes',
        lastDay: '¡Último día!',
        discount: 'DESCUENTO',
        pointsType: 'PUNTOS',
        cashback: 'REEMBOLSO',
        gift: 'REGALO'
      },
      
      // QR Card Page
      qrCard: {
        pleaseSignInToView: 'Por favor inicia sesión para ver tu tarjeta QR.',
        yourLoyaltyCard: 'Tu Tarjeta de Lealtad',
        useThisCardToCollect: 'Usa esta tarjeta para acumular y canjear puntos en negocios participantes',
        copied: '¡Copiado!',
        copyCardNumber: 'Copiar Número de Tarjeta',
        shareCard: 'Compartir Tarjeta',
        printCard: 'Imprimir Tarjeta',
        myPrograms: 'Mis Programas',
        points: 'Puntos',
        joined: 'Unido',
        youHaveNotJoinedAnyPrograms: 'Aún no te has unido a ningún programa',
        showYourQrCardToJoin: 'Muestra tu tarjeta QR en negocios participantes para unirte a sus programas de lealtad',
        availablePromos: 'Promociones Disponibles',
        expires: 'Expira',
        claim: 'Reclamar',
        claimed: 'Reclamado',
        noPromoCodesAvailable: 'No hay códigos promocionales disponibles en este momento',
        showYourQrCardToReceive: 'Muestra tu tarjeta QR en negocios participantes para recibir ofertas especiales',
        securityInformation: 'Información de Seguridad',
        yourQrCodeIsUnique: 'Tu código QR es único para ti y está firmado de forma segura. Se actualiza automáticamente para proteger tu cuenta.',
        failedToLoadLoyaltyCard: 'Error al cargar la información de tu tarjeta de lealtad',
        successfullyJoinedProgram: '¡Te uniste al programa exitosamente!',
        failedToJoinProgram: 'Error al unirse al programa',
        successfullyClaimedPromo: '¡Código promocional reclamado exitosamente!',
        failedToClaimPromo: 'Error al reclamar código promocional',
        myLoyaltyCard: 'Mi Tarjeta de Lealtad',
        scanMyLoyaltyCard: 'Escanea mi tarjeta de lealtad (ID: {{cardNumber}})',
        specialDiscountOffer: 'Oferta de descuento especial',
        customer: 'Cliente'
      },
      
      // Customer Menu & Navigation
      menu: {
        dashboard: 'Panel',
        myCards: 'Mis Tarjetas',
        nearbyRewards: 'Recompensas Cercanas',
        promotions: 'Promociones',
        qrCard: 'Tarjeta QR',
        settings: 'Configuración',
        logout: 'Cerrar Sesión',
        rewards: 'Recompensas'
      },
      
      // Notification Center
      notifications: {
        notifications: 'Notificaciones',
        closeNotifications: 'Cerrar notificaciones',
        all: 'Todas',
        approvals: 'Aprobaciones',
        noNotificationsYet: 'Aún no hay notificaciones',
        noPendingApprovals: 'No hay aprobaciones pendientes',
        clearAll: 'Limpiar Todo',
        clearing: 'Limpiando...',
        deleteNotification: 'Eliminar notificación',
        programEnrollmentRequest: 'Solicitud de Inscripción al Programa',
        pointsDeductionRequest: 'Solicitud de Deducción de Puntos',
        wantsToEnrollYou: 'quiere inscribirte en',
        wantsToDeduct: 'quiere deducir',
        points: 'puntos',
        benefits: 'Beneficios',
        reason: 'Razón',
        processing: 'Procesando',
        approved: 'Aprobado',
        approve: 'Aprobar',
        declined: 'Rechazado',
        decline: 'Rechazar',
        successfullyEnrolledIn: 'Inscrito exitosamente en',
        declinedEnrollmentIn: 'Rechazada la inscripción en',
        theProgram: 'el programa',
        enrollmentProcessInterrupted: 'El proceso de inscripción fue interrumpido',
        // Time-related messages
        justNow: 'ahora mismo',
        minuteAgo: 'hace un minuto',
        minutesAgo: 'hace minutos',
        hourAgo: 'hace una hora',
        hoursAgo: 'hace horas',
        dayAgo: 'hace un día',
        daysAgo: 'hace días',
        // Action messages
        actionRequired: 'Acción requerida - revisa tus notificaciones',
        // Promo code messages
        promoCode: 'Código Promocional',
        // Program messages
        aProgram: 'un programa'
      },
      
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
        help: 'Ayuda y Soporte',
        loadingSettings: 'Cargando configuración...',
        errorLoadingSettings: 'Error al Cargar la Configuración',
        couldNotLoadSettings: 'No pudimos cargar tu configuración. Por favor, actualiza la página o contacta soporte si el problema persiste.',
        personalInformation: 'Información Personal',
        edit: 'Editar',
        cancel: 'Cancelar',
        save: 'Guardar',
        settingsUpdatedSuccessfully: 'Tu configuración se ha actualizado exitosamente',
        errorUpdatingSettings: 'Hubo un error al actualizar tu configuración. Por favor, inténtalo de nuevo.',
        fullName: 'Nombre Completo',
        emailAddress: 'Dirección de Correo Electrónico',
        phoneNumber: 'Número de Teléfono',
        notSpecified: 'No especificado',
        memberSince: 'Miembro desde',
        regionalSettings: 'Configuración Regional',
        languageChangesApplied: 'Los cambios de idioma se aplicarán inmediatamente',
        preferredCurrency: 'Moneda Preferida',
        notificationSettings: 'Configuración de Notificaciones',
        communicationChannels: 'Canales de Comunicación',
        emailNotifications: 'Notificaciones por Correo',
        pushNotifications: 'Notificaciones Push',
        smsNotifications: 'Notificaciones SMS',
        notificationTypes: 'Tipos de Notificaciones',
        promotionsAndOffers: 'Promociones y Ofertas',
        rewardsAndPointsUpdates: 'Actualizaciones de Recompensas y Puntos',
        systemNotifications: 'Notificaciones del Sistema',
        saving: 'Guardando...',
        savePreferences: 'Guardar Preferencias',
        securitySettings: 'Configuración de Seguridad',
        changePassword: 'Cambiar Contraseña',
        updateYourPassword: 'Actualiza tu contraseña',
        loginNotifications: 'Notificaciones de Inicio de Sesión',
        getNotifiedOfNewLogins: 'Recibe notificaciones de nuevos inicios de sesión en tu cuenta',
        enabled: 'Habilitado',
        connectedAccounts: 'Cuentas Conectadas',
        connectYourGoogleAccount: 'Conecta tu cuenta de Google',
        connect: 'Conectar',
        connectYourFacebookAccount: 'Conecta tu cuenta de Facebook',
        accountActions: 'Acciones de Cuenta',
        deleteAccount: 'Eliminar Cuenta',
        permanentlyDeleteAccount: 'Eliminar permanentemente tu cuenta y datos',
        manageAccountSettings: 'Gestiona la configuración y preferencias de tu cuenta',
        personalSettings: 'Configuración Personal',
        account: 'Cuenta',
        needHelp: '¿Necesitas Ayuda?',
        supportTeamHelp: 'Si tienes alguna pregunta sobre tu cuenta o configuración, nuestro equipo de soporte está aquí para ayudarte.',
        contactSupport: 'Contactar Soporte'
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
      pointsEarned: 'Points Gagnés',
      pointsRedeemed: 'Points Échangés',
      allTime: 'Tout le Temps',
      lastWeek: 'Semaine Dernière',
      lastMonth: 'Mois Dernier',
      lastYear: 'Année Dernière',
      retrying: 'Nouvelle tentative...',
      
      // Loyalty Card
      availableRewards: 'Récompenses Disponibles!',
      viewCard: 'Voir la Carte',
      allRewardsEarned: 'Toutes les récompenses gagnées!',
      noRewardsAvailable: 'Aucune récompense disponible',
      
      // Loyalty Card Additional
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
      
      // Additional Dashboard Keys
      userIDRequired: 'ID utilisateur requis',
      unknownError: 'Erreur inconnue',
      failedToLoadTransactionHistory: 'Échec du chargement de l\'historique des transactions: {{error}}',
      date: 'Date',
      type: 'Type',
      details: 'Détails',
              earned: 'Gagné',
        program: 'Programme',
        reward: 'Récompense',
      noTransactionsYet: 'Aucune Transaction Encore',
      transactionHistoryWillAppear: 'Votre historique de transactions apparaîtra ici une fois que vous commencerez à gagner ou échanger des points.',
      tryAdjustingSearch: 'Essayez d\'ajuster vos critères de recherche ou de filtrage',
      hideDetails: 'Masquer les détails',
      showDetails: 'Afficher les détails',
      programEnrollmentRequest: 'Demande d\'Inscription au Programme',
      pointsDeductionRequest: 'Demande de Déduction de Points',
      failedToGenerateQRCode: 'Échec de la génération du code QR',
      errorCreatingQRCodeData: 'Erreur lors de la création des données du code QR',
      missingRequiredCardInformation: 'Informations de carte requises manquantes',
      hideTechnicalDetails: 'Masquer les détails techniques',
      showTechnicalDetails: 'Afficher les détails techniques',
      
      // Cards Page
      cards: {
        myCards: 'Mes Cartes',
        noCards: 'Aucune carte trouvée',
        refreshCards: 'Actualiser les Cartes',
        refreshing: 'Actualisation...',
        expiryDate: 'Date d\'Expiration',
        lastUsed: 'Dernière Utilisation',
        cardId: 'ID de la Carte',
        cardActivity: 'Activité de la Carte',
        noRecentActivity: 'Aucune activité récente',
        availableRewards: 'Récompenses Disponibles',
        noRewardsAvailableForProgram: 'Aucune récompense disponible pour ce programme',
        processing: 'Traitement...',
        decline: 'Refuser',
        joinProgram: 'Rejoindre le Programme',
        close: 'Fermer',
        viewPromoCode: 'Voir le code promotionnel',
        refreshCardsAria: 'Actualiser les cartes',
        failedToSyncEnrollments: 'Échec de la synchronisation des inscriptions avec les cartes',
        errorParsingNotification: 'Erreur lors de l\'analyse des données de notification',
        pointsAwardedMessage: 'Message de points attribués reçu via BroadcastChannel',
        failedToProcessResponse: 'Échec du traitement de votre réponse',
        errorProcessingResponse: 'Une erreur s\'est produite lors du traitement de votre réponse',
        business: 'Entreprise',
        promoCodeCopied: 'Code promotionnel copié dans le presse-papiers',
        failedToCopyPromoCode: 'Échec de la copie du code promotionnel',
        redeemedPoints: '{{points}} points échangés',
        cardUsed: 'Carte utilisée'
      },
      
      // Nearby Page
      nearby: {
        comingSoon: 'BIENTÔT DISPONIBLE',
        nearbyRewardsFeature: '🗺️ Fonctionnalité de Récompenses à Proximité',
        buildingSomethingAmazing: 'Nous construisons quelque chose d\'incroyable ! Bientôt vous pourrez découvrir des programmes de fidélité, des offres exclusives et des récompenses instantanées d\'entreprises près de chez vous.',
        whatsComingYourWay: 'Ce Qui Vous Attend',
        locationBasedDiscovery: 'Découverte Basée sur la Localisation',
        locationBasedDiscoveryDesc: 'Trouvez des programmes de fidélité et des récompenses près de votre emplacement actuel',
        smartRecommendations: 'Recommandations Intelligentes',
        smartRecommendationsDesc: 'Obtenez des suggestions personnalisées basées sur vos préférences',
        exclusiveOffers: 'Offres Exclusives',
        exclusiveOffersDesc: 'Accédez à des offres spéciales disponibles uniquement pour les clients à proximité',
        instantRewards: 'Récompenses Instantanées',
        instantRewardsDesc: 'Découvrez et échangez des récompenses d\'entreprises autour de vous',
        previewBusinessesNearYou: 'Aperçu : Entreprises Près de Vous',
        sneakPeekDescription: 'Voici un aperçu de ce que vous découvrirez dans votre région',
        cityCoffee: 'Café de la Ville',
        fashionHub: 'Centre de Mode',
        gourmetBistro: 'Bistrot Gastronomique',
        cafe: 'Café',
        retail: 'Vente au Détail',
        restaurant: 'Restaurant',
        loyaltyProgram: 'Programme de Fidélité',
        getReadyForLaunch: 'Préparez-vous au Lancement ! 🚀',
        beFirstToExplore: 'Soyez le premier à explorer les récompenses à proximité et découvrez des offres incroyables d\'entreprises locales lorsque nous lancerons cette fonctionnalité passionnante.',
        proudlyCreatedWith: '© 2024 par VCarda • Créé avec fierté en utilisant',
        heart: '♥'
      },
      
      // Promotions Page
      promotions: {
        exclusivePromotions: 'Promotions Exclusives',
        discoverSpecialOffers: 'Découvrez des offres spéciales de vos endroits préférés',
        searchPromotions: 'Rechercher des promotions...',
        all: 'Toutes',
        favorites: 'Favoris',
        expiringSoon: 'Expirent Bientôt',
        discounts: 'Remises',
        points: 'Points',
        featuredOffers: 'Offres en Vedette',
        copied: 'Copié !',
        copy: 'Copier',
        expires: 'Expire : {{time}}',
        neverExpires: 'N\'expire jamais',
        used: 'utilisé',
        unlimited: 'Illimité',
        noFavoritesYet: 'Pas encore de favoris',
        noPromotionsFound: 'Aucune promotion trouvée',
        favoritePromotionsYouLike: 'Marquez comme favoris les promotions que vous aimez pour les retrouver ici plus tard',
        tryAdjustingSearchTerms: 'Essayez d\'ajuster vos termes de recherche ou filtres',
        checkBackLaterForNewOffers: 'Revenez plus tard pour de nouvelles offres !',
        failedToLoadPromotions: 'Échec du chargement des promotions',
        neverExpiresText: 'N\'expire jamais',
        monthsLeft: '{{months}} mois restants',
        daysLeft: '{{days}} jours restants',
        lastDay: 'Dernier jour !',
        discount: 'REMISE',
        pointsType: 'POINTS',
        cashback: 'REMBOURSEMENT',
        gift: 'CADEAU'
      },
      
      // QR Card Page
      qrCard: {
        pleaseSignInToView: 'Veuillez vous connecter pour voir votre carte QR.',
        yourLoyaltyCard: 'Votre Carte de Fidélité',
        useThisCardToCollect: 'Utilisez cette carte pour collecter et échanger des points chez les entreprises participantes',
        copied: 'Copié !',
        copyCardNumber: 'Copier le Numéro de Carte',
        shareCard: 'Partager la Carte',
        printCard: 'Imprimer la Carte',
        myPrograms: 'Mes Programmes',
        points: 'Points',
        joined: 'Rejoint',
        youHaveNotJoinedAnyPrograms: 'Vous n\'avez encore rejoint aucun programme',
        showYourQrCardToJoin: 'Montrez votre carte QR aux entreprises participantes pour rejoindre leurs programmes de fidélité',
        availablePromos: 'Promotions Disponibles',
        expires: 'Expire',
        claim: 'Réclamer',
        claimed: 'Réclamé',
        noPromoCodesAvailable: 'Aucun code promotionnel disponible pour le moment',
        showYourQrCardToReceive: 'Montrez votre carte QR aux entreprises participantes pour recevoir des offres spéciales',
        securityInformation: 'Informations de Sécurité',
        yourQrCodeIsUnique: 'Votre code QR vous est unique et est signé de manière sécurisée. Il se met à jour automatiquement pour protéger votre compte.',
        failedToLoadLoyaltyCard: 'Échec du chargement des informations de votre carte de fidélité',
        successfullyJoinedProgram: 'Programme rejoint avec succès !',
        failedToJoinProgram: 'Échec de l\'adhésion au programme',
        successfullyClaimedPromo: 'Code promotionnel réclamé avec succès !',
        failedToClaimPromo: 'Échec de la réclamation du code promotionnel',
        myLoyaltyCard: 'Ma Carte de Fidélité',
        scanMyLoyaltyCard: 'Scannez ma carte de fidélité (ID : {{cardNumber}})',
        specialDiscountOffer: 'Offre de remise spéciale',
        customer: 'Client'
      },
      
      // Customer Menu & Navigation
      menu: {
        dashboard: 'Tableau de Bord',
        myCards: 'Mes Cartes',
        nearbyRewards: 'Récompenses à Proximité',
        promotions: 'Promotions',
        qrCard: 'Carte QR',
        settings: 'Paramètres',
        logout: 'Déconnexion',
        rewards: 'Récompenses'
      },
      
      // Notification Center
      notifications: {
        notifications: 'Notifications',
        closeNotifications: 'Fermer les notifications',
        all: 'Toutes',
        approvals: 'Approbations',
        noNotificationsYet: 'Aucune notification pour le moment',
        noPendingApprovals: 'Aucune approbation en attente',
        clearAll: 'Tout Effacer',
        clearing: 'Effacement...',
        deleteNotification: 'Supprimer la notification',
        programEnrollmentRequest: 'Demande d\'Inscription au Programme',
        pointsDeductionRequest: 'Demande de Déduction de Points',
        wantsToEnrollYou: 'souhaite vous inscrire à',
        wantsToDeduct: 'souhaite déduire',
        points: 'points',
        benefits: 'Avantages',
        reason: 'Raison',
        processing: 'Traitement',
        approved: 'Approuvé',
        approve: 'Approuver',
        declined: 'Refusé',
        decline: 'Refuser',
        successfullyEnrolledIn: 'Inscrit avec succès à',
        declinedEnrollmentIn: 'Inscription refusée à',
        theProgram: 'le programme',
        enrollmentProcessInterrupted: 'Le processus d\'inscription a été interrompu',
        // Time-related messages
        justNow: 'à l\'instant',
        minuteAgo: 'il y a une minute',
        minutesAgo: 'il y a minutes',
        hourAgo: 'il y a une heure',
        hoursAgo: 'il y a heures',
        dayAgo: 'il y a un jour',
        daysAgo: 'il y a jours',
        // Action messages
        actionRequired: 'Action requise - vérifiez vos notifications',
        // Promo code messages
        promoCode: 'Code Promo',
        // Program messages
        aProgram: 'un programme'
      },
      
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
        help: 'Aide et Support',
        loadingSettings: 'Chargement des paramètres...',
        errorLoadingSettings: 'Erreur lors du Chargement des Paramètres',
        couldNotLoadSettings: 'Nous n\'avons pas pu charger vos paramètres. Veuillez actualiser la page ou contacter le support si le problème persiste.',
        personalInformation: 'Informations Personnelles',
        edit: 'Modifier',
        cancel: 'Annuler',
        save: 'Enregistrer',
        settingsUpdatedSuccessfully: 'Vos paramètres ont été mis à jour avec succès',
        errorUpdatingSettings: 'Une erreur s\'est produite lors de la mise à jour de vos paramètres. Veuillez réessayer.',
        fullName: 'Nom Complet',
        emailAddress: 'Adresse E-mail',
        phoneNumber: 'Numéro de Téléphone',
        notSpecified: 'Non spécifié',
        memberSince: 'Membre depuis',
        regionalSettings: 'Paramètres Régionaux',
        languageChangesApplied: 'Les changements de langue seront appliqués immédiatement',
        preferredCurrency: 'Devise Préférée',
        notificationSettings: 'Paramètres de Notifications',
        communicationChannels: 'Canaux de Communication',
        emailNotifications: 'Notifications E-mail',
        pushNotifications: 'Notifications Push',
        smsNotifications: 'Notifications SMS',
        notificationTypes: 'Types de Notifications',
        promotionsAndOffers: 'Promotions et Offres',
        rewardsAndPointsUpdates: 'Mises à jour des Récompenses et Points',
        systemNotifications: 'Notifications Système',
        saving: 'Enregistrement...',
        savePreferences: 'Enregistrer les Préférences',
        securitySettings: 'Paramètres de Sécurité',
        changePassword: 'Changer le Mot de Passe',
        updateYourPassword: 'Mettez à jour votre mot de passe',
        loginNotifications: 'Notifications de Connexion',
        getNotifiedOfNewLogins: 'Soyez notifié des nouvelles connexions à votre compte',
        enabled: 'Activé',
        connectedAccounts: 'Comptes Connectés',
        connectYourGoogleAccount: 'Connectez votre compte Google',
        connect: 'Connecter',
        connectYourFacebookAccount: 'Connectez votre compte Facebook',
        accountActions: 'Actions du Compte',
        deleteAccount: 'Supprimer le Compte',
        permanentlyDeleteAccount: 'Supprimer définitivement votre compte et vos données',
        manageAccountSettings: 'Gérez les paramètres et préférences de votre compte',
        personalSettings: 'Paramètres Personnels',
        account: 'Compte',
        needHelp: 'Besoin d\'Aide ?',
        supportTeamHelp: 'Si vous avez des questions sur votre compte ou vos paramètres, notre équipe de support est là pour vous aider.',
        contactSupport: 'Contacter le Support'
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
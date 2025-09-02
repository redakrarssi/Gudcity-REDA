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
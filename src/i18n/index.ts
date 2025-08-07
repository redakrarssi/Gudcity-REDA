import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      welcome: 'Welcome to Vcarda',
      login: 'Login',
      register: 'Register',
      dashboard: 'Dashboard',
      myQRCard: 'My QR Card',
      myPrograms: 'My Programs',
      rewardsHistory: 'Rewards History',
      codeWallet: 'Code Wallet',
    },
  },
  ar: {
    translation: {
      welcome: 'مرحباً بكم في Vcarda',
      login: 'تسجيل الدخول',
      register: 'التسجيل',
      dashboard: 'لوحة التحكم',
      myQRCard: 'بطاقة QR الخاصة بي',
      myPrograms: 'برامجي',
      rewardsHistory: 'سجل المكافآت',
      codeWallet: 'محفظة الرموز',
    },
  },
  es: {
    translation: {
      welcome: 'Bienvenido a Vcarda',
      login: 'Iniciar sesión',
      register: 'Registrarse',
      dashboard: 'Panel',
      myQRCard: 'Mi tarjeta QR',
      myPrograms: 'Mis programas',
      rewardsHistory: 'Historial de recompensas',
      codeWallet: 'Cartera de códigos',
    },
  },
  fr: {
    translation: {
      welcome: 'Bienvenue sur Vcarda',
      login: 'Connexion',
      register: 'Inscription',
      dashboard: 'Tableau de bord',
      myQRCard: 'Ma carte QR',
      myPrograms: 'Mes programmes',
      rewardsHistory: 'Historique des récompenses',
      codeWallet: 'Portefeuille de codes',
    },
  },
};

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

export default i18n;
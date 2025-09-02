import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Gift, Star, QrCode, Wallet } from 'lucide-react';
import LanguageSelector from '../components/LanguageSelector';

const LandingPage = () => {
  const { t, i18n } = useTranslation();
  
  // Create safe translation function with fallbacks
  const safeT = (key: string, fallback: string) => {
    try {
      const translated = t(key);
      return translated === key ? fallback : translated;
    } catch (err) {
      // Silent fail with fallback
      return fallback;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow text-center py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('landing.hero.title')}</h1>
          <p className="text-xl text-gray-600 mb-8">{t('landing.hero.subtitle')}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <FeatureCard
              icon={<QrCode className="w-8 h-8 text-blue-500" />}
              title={t('landing.features.qrCode.title')}
              description={t('landing.features.qrCode.description')}
            />
            <FeatureCard
              icon={<Star className="w-8 h-8 text-yellow-500" />}
              title={t('landing.features.earnPoints.title')}
              description={t('landing.features.earnPoints.description')}
            />
            <FeatureCard
              icon={<Gift className="w-8 h-8 text-purple-500" />}
              title={t('landing.features.getRewards.title')}
              description={t('landing.features.getRewards.description')}
            />
            <FeatureCard
              icon={<Wallet className="w-8 h-8 text-green-500" />}
              title={t('landing.features.digitalWallet.title')}
              description={t('landing.features.digitalWallet.description')}
            />
          </div>
        </div>

        <div className="container mx-auto px-4">
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {t('register')}
            </Link>
            <Link
              to="/login"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors"
            >
              {t('login')}
            </Link>
          </div>
        </div>
      </main>
      
      <footer className="py-6 bg-gray-100 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} Vcarda. {t('landing.footer.allRightsReserved')}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                vcarda 20
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Navigation Links */}
              <div className="flex space-x-6">
                <Link to="/pricing" className="text-sm text-gray-500 hover:text-gray-700">
                  {t('landing.footer.pricing')}
                </Link>
                <Link to="/comments" className="text-sm text-gray-500 hover:text-gray-700">
                  {t('landing.footer.comments')}
                </Link>
                <span className="text-sm text-gray-300">|</span>
                <Link to="/access-admin" className="text-sm text-gray-300 hover:text-gray-500" aria-label="Admin access">
                  •
                </Link>
              </div>
              
              {/* Language Selector */}
              <div className="hidden md:block">
                <LanguageSelector variant="footer" showIcon={false} />
              </div>
            </div>
            
            {/* Mobile Language Selector */}
            <div className="block md:hidden w-full flex justify-center">
              <LanguageSelector variant="footer" showIcon={true} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-center mb-4">{icon}</div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default LandingPage;
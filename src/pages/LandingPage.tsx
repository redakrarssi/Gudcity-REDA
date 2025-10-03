import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Gift, Star, QrCode, Wallet, ArrowRight } from 'lucide-react';
import LanguageSelector from '../components/LanguageSelector';
import logoImage from '../../0975ff86-7f95-4f61-84aa-2d19e687d9c5.webp';

const LandingPage = () => {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  
  // Create safe translation function with fallbacks
  const safeT = (key: string, fallback: string) => {
    try {
      const translated = t(key);
      return translated === key ? fallback : translated;
    } catch (err) {
      return fallback;
    }
  };

  // Handle scroll for navbar shadow
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animate cards on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setVisibleCards(prev => [...prev, index]);
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.feature-card').forEach((card) => {
      observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Top Navigation */}
      <nav className={`bg-white transition-all duration-300 ${scrolled ? 'shadow-sm' : ''}`}>
        <div className="container mx-auto px-4 py-4">
          <div className={`flex items-center ${i18n.language === 'ar' ? 'flex-row-reverse' : ''} ${i18n.language === 'ar' ? 'justify-start' : 'justify-between'}`}>
            <div className="flex items-center gap-2">
              <img src={logoImage} alt="Vcarda" className="h-[106px] w-auto" />
            </div>
            <div className={`flex items-center gap-4 ${i18n.language === 'ar' ? 'flex-row-reverse ml-auto' : ''}`}>
              {/* Language Selector - Hidden on mobile */}
              <div className="hidden md:block">
                <LanguageSelector />
              </div>
              
              {/* Sign In - Always visible */}
              <Link
                to="/login"
                className="text-gray-700 hover:text-blue-600 transition-colors px-4 py-2 font-medium"
              >
                {t('signIn')}
              </Link>
              
              {/* Sign Up - Hidden on mobile */}
              <Link
                to="/register"
                className="hidden md:inline-flex bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30"
              >
                {t('register')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow">
        <div className="container mx-auto px-4 pt-8 pb-20">
          {/* Hero Content */}
          <div className="text-center mb-20 max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              {safeT('landing.hero.title', 'Modern Loyalty Platform')}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              {safeT('landing.hero.subtitle', 'The Ultimate Loyalty platform for Businesses and Customers')}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 hover:shadow-xl hover:shadow-blue-500/40"
              >
                {t('getStartedFree')}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                {t('signIn')}
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            <FeatureCard
              icon={<QrCode className="w-10 h-10" />}
              title={safeT('landing.features.qrCode.title', 'Easy QR Code')}
              description={safeT('landing.features.qrCode.description', 'Scan and earn instantly')}
              gradient="from-emerald-400 to-green-500"
              index={0}
              visible={visibleCards.includes(0)}
            />
            <FeatureCard
              icon={<Star className="w-10 h-10" />}
              title={safeT('landing.features.earnPoints.title', 'Earn Points')}
              description={safeT('landing.features.earnPoints.description', 'Every purchase counts')}
              gradient="from-yellow-400 to-orange-500"
              index={1}
              visible={visibleCards.includes(1)}
            />
            <FeatureCard
              icon={<Gift className="w-10 h-10" />}
              title={safeT('landing.features.getRewards.title', 'Get Rewards')}
              description={safeT('landing.features.getRewards.description', 'Redeem amazing prizes')}
              gradient="from-pink-400 to-rose-500"
              index={2}
              visible={visibleCards.includes(2)}
            />
            <FeatureCard
              icon={<Wallet className="w-10 h-10" />}
              title={safeT('landing.features.digitalWallet.title', 'Digital Wallet')}
              description={safeT('landing.features.digitalWallet.description', 'All cards in one place')}
              gradient="from-purple-400 to-violet-500"
              index={3}
              visible={visibleCards.includes(3)}
            />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-50 py-8 border-t border-gray-200 mt-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="mb-4 md:mb-0 text-center md:text-left">
              <p className="text-sm text-gray-600">
                &copy; {new Date().getFullYear()} Vcarda. {t('landing.footer.allRightsReserved')}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex space-x-6">
                <Link to="/pricing" className="text-sm text-gray-600 hover:text-blue-600 transition-colors font-medium">
                  {t('landing.footer.pricing')}
                </Link>
                <Link to="/comments" className="text-sm text-gray-600 hover:text-blue-600 transition-colors font-medium">
                  {t('landing.footer.comments')}
                </Link>
                <span className="text-sm text-gray-300">|</span>
                <Link to="/access-admin" className="text-sm text-gray-300 hover:text-gray-500 transition-colors" aria-label="Admin access">
                  •
                </Link>
              </div>
              
              <div className="hidden md:block">
                <LanguageSelector variant="footer" showIcon={false} />
              </div>
            </div>
            
            <div className="block md:hidden w-full flex justify-center">
              <LanguageSelector variant="footer" showIcon={true} />
            </div>
          </div>
        </div>
      </footer>

      {/* Custom Animations */}
      <style>{`
        @keyframes fadeInUp {
          from { 
            opacity: 0; 
            transform: translateY(30px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
      `}</style>
    </div>
  );
};

const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  gradient,
  index,
  visible 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  gradient: string;
  index: number;
  visible: boolean;
}) => (
  <div 
    data-index={index}
    className={`feature-card group bg-gradient-to-br from-gray-50 to-blue-50/30 p-8 rounded-2xl border-2 border-gray-100 hover:border-blue-300 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    style={{ transitionDelay: `${index * 100}ms` }}
  >
    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${gradient} mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/30`}>
      <div className="text-white">
        {icon}
      </div>
    </div>
    <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </div>
);

export default LandingPage;

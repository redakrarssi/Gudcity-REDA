import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const { t, i18n } = useTranslation();
  
  // Debug logging
  useEffect(() => {
    console.log('LandingPage component mounted and rendering');
    console.log('Current pathname:', window.location.pathname);
    console.log('Document body:', document.body);
  }, []);
  
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
    <div className="flex flex-col min-h-screen bg-red-100">
      <main className="flex-grow text-center py-12">
        <h1 className="text-4xl font-bold text-red-900 mb-8">TEST PAGE - Welcome to Vcarda</h1>
        <p className="text-lg text-red-700 mb-8">If you can see this, React is working!</p>
        
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Simple Test</h2>
          <p className="text-gray-600 mb-6">This is a simple test to see if the app is rendering.</p>
          
          <div className="space-y-4">
            <Link
              to="/register"
              className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
            >
              Register
            </Link>
            <Link
              to="/login"
              className="block w-full bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors text-center"
            >
              Login
            </Link>
          </div>
        </div>
      </main>
      
      <footer className="py-6 bg-red-200 border-t border-red-300">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-red-700">
            &copy; {new Date().getFullYear()} Vcarda Test Page
          </p>
        </div>
      </footer>
    </div>
  );
};



export default LandingPage;
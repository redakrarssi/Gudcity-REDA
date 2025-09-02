import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { 
  Map, 
  MapPin, 
  Navigation, 
  Star, 
  Gift, 
  Coffee, 
  ShoppingBag, 
  Utensils,
  Sparkles
} from 'lucide-react';

const NearbyComingSoon = () => {
  const { t } = useTranslation();
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // Animated decorations for the background
  const decorations = [
    { type: 'line', color: 'bg-yellow-400', rotation: 'rotate-45', position: 'top-16 left-20', size: 'w-8 h-1' },
    { type: 'line', color: 'bg-cyan-400', rotation: 'rotate-12', position: 'top-24 right-24', size: 'w-6 h-1' },
    { type: 'line', color: 'bg-pink-400', rotation: '-rotate-45', position: 'top-32 left-32', size: 'w-7 h-1' },
    { type: 'line', color: 'bg-orange-400', rotation: 'rotate-90', position: 'top-20 right-32', size: 'w-5 h-1' },
    { type: 'line', color: 'bg-purple-400', rotation: 'rotate-[135deg]', position: 'top-40 right-20', size: 'w-6 h-1' },
    { type: 'line', color: 'bg-green-400', rotation: '-rotate-12', position: 'bottom-32 left-24', size: 'w-8 h-1' },
    { type: 'line', color: 'bg-blue-400', rotation: 'rotate-45', position: 'bottom-40 right-28', size: 'w-5 h-1' },
    { type: 'line', color: 'bg-red-400', rotation: '-rotate-45', position: 'bottom-24 left-36', size: 'w-4 h-1' },
    { type: 'line', color: 'bg-indigo-400', rotation: 'rotate-12', position: 'bottom-36 right-36', size: 'w-7 h-1' },
    { type: 'plus', color: 'text-yellow-400', position: 'top-48 left-48', size: 'text-2xl' },
    { type: 'plus', color: 'text-green-400', position: 'top-56 right-56', size: 'text-lg' },
    { type: 'plus', color: 'text-purple-400', position: 'bottom-48 left-56', size: 'text-xl' },
    { type: 'plus', color: 'text-pink-400', position: 'bottom-56 right-48', size: 'text-2xl' },
    { type: 'dot', color: 'bg-cyan-400', position: 'top-60 left-60', size: 'w-3 h-3' },
    { type: 'dot', color: 'bg-orange-400', position: 'top-52 right-52', size: 'w-2 h-2' },
    { type: 'dot', color: 'bg-blue-400', position: 'bottom-60 left-52', size: 'w-3 h-3' },
    { type: 'dot', color: 'bg-red-400', position: 'bottom-52 right-60', size: 'w-2 h-2' },
    { type: 'x', color: 'text-indigo-400', position: 'top-64 right-64', size: 'text-lg' },
    { type: 'x', color: 'text-pink-400', position: 'bottom-64 left-64', size: 'text-2xl' }
  ];

  const features = [
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Location-Based Discovery",
      description: "Find loyalty programs and rewards near your current location"
    },
    {
      icon: <Navigation className="w-6 h-6" />,
      title: "Smart Recommendations",
      description: "Get personalized suggestions based on your preferences"
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "Exclusive Offers",
      description: "Access special deals only available to nearby customers"
    },
    {
      icon: <Gift className="w-6 h-6" />,
      title: "Instant Rewards",
      description: "Discover and redeem rewards from businesses around you"
    }
  ];

  const mockBusinesses = [
    { name: "City Coffee", category: "Cafe", icon: <Coffee className="w-5 h-5" />, distance: "0.2 km", color: "bg-amber-100 text-amber-600" },
    { name: "Fashion Hub", category: "Retail", icon: <ShoppingBag className="w-5 h-5" />, distance: "0.5 km", color: "bg-purple-100 text-purple-600" },
    { name: "Gourmet Bistro", category: "Restaurant", icon: <Utensils className="w-5 h-5" />, distance: "0.8 km", color: "bg-green-100 text-green-600" }
  ];

  return (
    <CustomerLayout>
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated background decorations */}
        {decorations.map((decoration, index) => (
          <div
            key={index}
            className={`absolute ${decoration.position} ${decoration.rotation} animate-pulse opacity-30`}
            style={{ animationDelay: `${index * 0.3}s`, animationDuration: '3s' }}
          >
            {decoration.type === 'line' && (
              <div className={`${decoration.color} ${decoration.size} rounded-full`}></div>
            )}
            {decoration.type === 'plus' && (
              <div className={`${decoration.color} ${decoration.size} font-bold`}>+</div>
            )}
            {decoration.type === 'dot' && (
              <div className={`${decoration.color} ${decoration.size} rounded-full`}></div>
            )}
            {decoration.type === 'x' && (
              <div className={`${decoration.color} ${decoration.size} font-bold`}>×</div>
            )}
          </div>
        ))}

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className={`text-center mb-16 transition-all duration-1000 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-6 shadow-2xl transform hover:scale-110 transition-transform">
                <Map className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-6xl font-black text-gray-800 mb-4 tracking-tight">
                COMING
              </h1>
              <h1 className="text-6xl font-black text-gray-800 -mt-4 tracking-tight">
                SOON
              </h1>
            </div>
            
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl font-bold text-gray-700 mb-4">
                🗺️ Nearby Rewards Feature
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                We're building something amazing! Soon you'll be able to discover loyalty programs, 
                exclusive offers, and instant rewards from businesses right around you.
              </p>
              

            </div>
          </div>

          {/* Features Preview */}
          <div className={`mb-16 transition-all duration-1000 ease-out transform delay-300 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <h3 className="text-3xl font-bold text-center text-gray-800 mb-12">
              What's Coming Your Way
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all transform hover:-translate-y-2"
                  style={{ animationDelay: `${600 + index * 200}ms` }}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white mb-6 shadow-lg">
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-bold text-gray-800 mb-3">
                    {feature.title}
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Mock Business Preview */}
          <div className={`mb-16 transition-all duration-1000 ease-out transform delay-600 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl p-12 border border-blue-200">
              <h3 className="text-3xl font-bold text-center text-gray-800 mb-4">
                Preview: Businesses Near You
              </h3>
              <p className="text-center text-gray-600 mb-8 text-lg">
                Here's a sneak peek of what you'll discover in your area
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {mockBusinesses.map((business, index) => (
                  <div 
                    key={index}
                    className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-10 h-10 rounded-lg ${business.color} flex items-center justify-center`}>
                        {business.icon}
                      </div>
                      <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                        {business.distance}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-800 mb-1">
                      {business.name}
                    </h4>
                    <p className="text-gray-600 text-sm mb-3">
                      {business.category}
                    </p>
                    <div className="flex items-center text-amber-500 text-sm">
                      <Star className="w-4 h-4 fill-current mr-1" />
                      <span className="font-medium">4.8</span>
                      <span className="text-gray-400 ml-2">• Loyalty Program</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className={`text-center transition-all duration-1000 ease-out transform delay-900 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-3xl p-12 text-white shadow-2xl">
              <Sparkles className="w-16 h-16 mx-auto mb-6 text-yellow-400" />
              <h3 className="text-3xl font-bold mb-4">
                Get Ready for Launch! 🚀
              </h3>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Be the first to explore nearby rewards and discover amazing deals 
                from local businesses when we launch this exciting feature.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-16 opacity-70">
            <p className="text-sm text-gray-500 flex items-center justify-center">
              © 2024 by VCarda • Proudly created with{' '}
              <span className="ml-1 text-red-500">♥</span>
            </p>
            <div className="flex justify-center space-x-3 mt-3">
              <div className="w-5 h-5 bg-gray-400 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs font-bold">f</span>
              </div>
              <div className="w-5 h-5 bg-gray-400 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs font-bold">t</span>
              </div>
              <div className="w-5 h-5 bg-gray-400 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs font-bold">@</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default NearbyComingSoon;

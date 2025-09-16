import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Facebook, Twitter, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  
  const currentYear = new Date().getFullYear();
  
  const companyLinks = [
    { name: t('About Us'), path: '/about' },
    { name: t('Careers'), path: '/careers' },
    { name: t('Blog'), path: '/blog' },
    { name: t('Press'), path: '/press' },
  ];
  
  const productLinks = [
    { name: t('Features'), path: '/features' },
    { name: t('Pricing'), path: '/pricing' },
    { name: t('Testimonials'), path: '/testimonials' },
    { name: t('Case Studies'), path: '/case-studies' },
  ];
  
  const resourceLinks = [
    { name: t('Support Center'), path: '/support' },
    { name: t('Documentation'), path: '/docs' },
    { name: t('Privacy Policy'), path: '/privacy' },
    { name: t('Terms of Service'), path: '/terms' },
  ];
  
  const socialLinks = [
    { icon: <Facebook className="h-5 w-5" />, url: 'https://facebook.com' },
    { icon: <Twitter className="h-5 w-5" />, url: 'https://twitter.com' },
    { icon: <Instagram className="h-5 w-5" />, url: 'https://instagram.com' },
    { icon: <Linkedin className="h-5 w-5" />, url: 'https://linkedin.com' },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block">
              <span className="text-2xl font-bold text-white">Vcarda</span>
            </Link>
            <p className="mt-4 text-gray-400 max-w-md">
              {t('Connecting businesses with their local community. Find the best services in your city.')}
            </p>
            
            <div className="mt-6 space-y-2">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">
                  123 Business Avenue, Suite 100<br />
                  New York, NY 10001
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-blue-400" />
                <span className="text-gray-400">contact@vcarda.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-blue-400" />
                <span className="text-gray-400">+1 (555) 123-4567</span>
              </div>
            </div>
            
            <div className="mt-6 flex space-x-4">
              {socialLinks.map((social, index) => (
                <a 
                  key={index}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
          
          {/* Company Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('Company')}</h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path} 
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Product Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('Product')}</h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path} 
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Resources Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('Resources')}</h3>
            <ul className="space-y-2">
              {resourceLinks.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path} 
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            &copy; {currentYear} Vcarda. {t('All rights reserved.')}
          </p>
          <div className="mt-4 md:mt-0">
            <select 
              className="bg-gray-800 text-gray-400 py-1 px-2 rounded-md text-sm border border-gray-700"
              defaultValue="en"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 
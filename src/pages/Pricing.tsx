import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import Layout from '../components/layout/Layout';
import PricingPlans from '../components/pricing/PricingPlans';
import { Shield, Users, Award, ThumbsUp, Clock, Gift } from 'lucide-react';

const Pricing = () => {
  const { t } = useTranslation();

  const benefits = [
    {
      icon: <Shield className="h-10 w-10 text-blue-500" />,
      title: t('Verified Businesses'),
      description: t('All businesses on our platform are verified for authenticity')
    },
    {
      icon: <Users className="h-10 w-10 text-blue-500" />,
      title: t('Community Support'),
      description: t('Connect with other business owners in your community')
    },
    {
      icon: <Award className="h-10 w-10 text-blue-500" />,
      title: t('Premium Features'),
      description: t('Access to exclusive tools and analytics to grow your business')
    },
    {
      icon: <ThumbsUp className="h-10 w-10 text-blue-500" />,
      title: t('Customer Trust'),
      description: t('Build credibility with customers through our trusted platform')
    },
    {
      icon: <Clock className="h-10 w-10 text-blue-500" />,
      title: t('24/7 Support'),
      description: t('Our team is always available to help with any questions')
    },
    {
      icon: <Gift className="h-10 w-10 text-blue-500" />,
      title: t('Special Offers'),
      description: t('Regular promotions and discounts for our members')
    }
  ];

  const faqs = [
    {
              question: t('How do I get started with Vcarda?'),
      answer: t('Getting started is easy! Simply sign up for a free account, create your business profile, and start connecting with the community. If you need more features, you can upgrade to one of our premium plans anytime.')
    },
    {
      question: t('Can I change my plan later?'),
      answer: t('Yes, you can upgrade, downgrade, or cancel your plan at any time. Changes to your subscription will take effect immediately.')
    },
    {
      question: t('Is there a contract or commitment?'),
      answer: t('No long-term contracts. Our premium plans are available on monthly or yearly billing cycles, and you can cancel anytime.')
    },
    {
      question: t('Do you offer discounts for non-profits?'),
      answer: t('Yes, we offer special pricing for non-profit organizations. Please contact our sales team for more information.')
    },
    {
      question: t('What payment methods do you accept?'),
      answer: t('We accept all major credit cards, PayPal, and bank transfers for yearly plans.')
    },
    {
      question: t('How do refunds work?'),
      answer: t('If you\'re not satisfied with our service, you can request a refund within 14 days of your initial purchase or renewal.')
    }
  ];

  return (
    <Layout>
      <Helmet>
        <title>{t('Pricing Plans')} | Vcarda</title>
        <meta name="description" content={t('Choose from our flexible pricing plans designed to fit businesses of all sizes')} />
      </Helmet>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
            {t('Simple, Transparent Pricing')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            {t('Choose the plan that works best for your business. No hidden fees or surprises.')}
          </p>
        </div>
      </section>

      {/* Pricing Plans */}
      <PricingPlans />

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            {t('Why Choose Vcarda?')}
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="p-6 bg-gray-50 rounded-xl">
                <div className="mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            {t('Frequently Asked Questions')}
          </h2>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-sm">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">{t('Ready to grow your business?')}</h2>
          <p className="text-xl mb-8 text-blue-100 max-w-3xl mx-auto">
            {t('Join thousands of businesses that trust Vcarda to help them connect with their community.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="py-3 px-8 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50">
              {t('Get Started')}
            </button>
            <button className="py-3 px-8 bg-transparent border border-white text-white rounded-lg font-medium hover:bg-blue-700">
              {t('Contact Sales')}
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Pricing; 
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function App() {
  const { t } = useTranslation();
  
  // Debug logging
  useEffect(() => {
    console.log('App component mounted and rendering');
    console.log('Current pathname:', window.location.pathname);
    console.log('Document body:', document.body);
  }, []);
  
  // CRITICAL FIX: Simple test render to debug the issue
  return (
    <div className="min-h-screen bg-red-100 p-8">
      <h1 className="text-4xl font-bold text-red-900 mb-4">APP COMPONENT TEST</h1>
      <p className="text-lg text-red-700 mb-4">If you can see this, the App component is working!</p>
      
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Simple Test</h2>
        <p className="text-gray-600 mb-4">This is a minimal test to see if React is rendering.</p>
        
        <button 
          onClick={() => alert('Button clicked! React is working!')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Test Button
        </button>
      </div>
      
      <div className="mt-8 text-sm text-red-600">
        <p>Current pathname: {window.location.pathname}</p>
        <p>User agent: {navigator.userAgent}</p>
      </div>
    </div>
  );
}

export default App;
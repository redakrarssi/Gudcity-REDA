import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './i18n';
import './index.css';
import initDb from './utils/initDb';

// Initialize the database when the app starts
initDb();

console.log('🚀 Starting GudCity application...');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
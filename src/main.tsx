import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './i18n';
import './index.css';
import initDb from './utils/initDb';
import { ThemeProvider } from './contexts/ThemeContext';

// Initialize the database when the app starts
initDb();

console.log('🚀 Starting GudCity application...');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>
);
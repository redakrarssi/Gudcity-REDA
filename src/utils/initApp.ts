/**
 * Initialize the application
 * SECURITY: Database initialization moved to server-side API endpoints
 */
export async function initializeApp(): Promise<boolean> {
  try {
    console.log('Initializing application...');
    
    // SECURITY: Database initialization is now handled server-side only
    // In production: Database is initialized via /api/db/initialize endpoint
    // In development: Database is initialized by the local API server
    const isProduction = !import.meta.env.DEV && import.meta.env.MODE !== 'development';
    
    if (isProduction) {
      console.log('Production mode: Database initialization handled by server-side API endpoints');
    } else {
      console.log('Development mode: Database initialization handled by local API server');
    }
    
    console.log('Application initialization complete');
    return true;
  } catch (error) {
    console.error('Error initializing application:', error);
    return false;
  }
}

// Helper to safely call the initialization function
export async function safeInitializeApp() {
  try {
    await initializeApp();
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
}

// Export a function that can be called from main.ts
export function startAppInitialization() {
  // Delay initialization to ensure app is mounted
  setTimeout(() => {
    safeInitializeApp();
  }, 1000);
} 
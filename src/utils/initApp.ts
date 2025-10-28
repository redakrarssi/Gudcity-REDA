import initDb, { initializeDatabase } from './initDb';

/**
 * Initialize the application
 * - Creates database tables if they don't exist
 * - Performs other startup tasks
 */
export async function initializeApp(): Promise<boolean> {
  try {
    console.log('Initializing application...');
    
    // Initialize database schema
    try {
      await initializeDatabase();
      console.log('Database schema initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database schema:', error);
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
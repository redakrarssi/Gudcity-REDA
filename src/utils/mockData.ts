/**
 * Mock data for fallback behavior when database is unavailable
 * This provides a standardized way to access mock data for queries
 */

// Define the mock data interface with indexing by table/key
const mockData: Record<string, any[]> = {
  // Add empty placeholders for common tables
  users: [],
  loyalty_programs: [],
  loyalty_cards: [],
  promotions: [],
  transactions: [],
  businesses: [],
  system_logs: [],
  analytics_data: []
};

export default mockData; 